import React, { useState, useEffect, useMemo } from 'react';
import {
  FaChartLine, FaFilePdf, FaFileExcel, FaMoneyBillWave, FaTicketAlt,
  FaUserCheck, FaCalendarAlt, FaSearch, FaFilter, FaSync, FaBus, FaUndoAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import { bookingAPI } from '../../../utils/api';
import DataTable from '../../../components/DataTable';

const AgentReports = ({ company, user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load agent reporting data');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (dateFilter) {
        const bookingDate = b.schedule?.date || (b.createdAt ? b.createdAt.split('T')[0] : '');
        if (bookingDate !== dateFilter) return false;
      }
      if (paymentFilter !== 'ALL') {
        const method = (b.paymentMethod || '').toUpperCase();
        if (method !== paymentFilter) return false;
      }
      if (statusFilter !== 'ALL') {
        const status = (b.status || '').toLowerCase();
        if (status !== statusFilter.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tkt = (b.ticketNumber || '').toLowerCase();
        const name = (b.passenger?.name || '').toLowerCase();
        const phone = (b.passenger?.phone || '');
        const route = `${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`.toLowerCase();
        return tkt.includes(q) || name.includes(q) || phone.includes(q) || route.includes(q);
      }
      return true;
    });
  }, [bookings, dateFilter, paymentFilter, statusFilter, searchQuery]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const total = filteredBookings.length;
    const paidBookings = filteredBookings.filter(b => b.paymentStatus === 'paid' || b.status === 'confirmed');
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    const verifiedCount = filteredBookings.filter(b => b.isVerified || b.status === 'boarded' || b.status === 'used').length;
    const cancelledCount = filteredBookings.filter(b => b.status === 'cancelled').length;

    // Payment breakdown
    const cashCount = filteredBookings.filter(b => (b.paymentMethod || '').toLowerCase() === 'cash').length;
    const telebirrCount = filteredBookings.filter(b => (b.paymentMethod || '').toLowerCase() === 'telebirr').length;
    const cbeCount = filteredBookings.filter(b => (b.paymentMethod || '').toLowerCase() === 'cbe_birr' || (b.paymentMethod || '').toLowerCase() === 'cbe').length;

    return {
      total,
      totalRevenue,
      verifiedCount,
      cancelledCount,
      cashCount,
      telebirrCount,
      cbeCount
    };
  }, [filteredBookings]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const compName = company?.companyName || user?.companyId?.companyName || 'Ethio Bus';

    doc.setFillColor(6, 47, 34);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${compName} - Agent Sales & Operations Report`, 105, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()} | Filter: ${dateFilter || 'All Time'}`, 105, 26, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 20, 48);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryRows = [
      ['Total Tickets Processed', `${metrics.total} tickets`],
      ['Total Sales Volume', `ETB ${metrics.totalRevenue.toLocaleString()}`],
      ['Verified / Boarded Tickets', `${metrics.verifiedCount} passengers`],
      ['Cancelled Reservations', `${metrics.cancelledCount}`],
      ['Cash Payments', `${metrics.cashCount}`],
      ['Digital Payments (Telebirr & CBE)', `${metrics.telebirrCount + metrics.cbeCount}`]
    ];

    summaryRows.forEach(([k, v], idx) => {
      doc.text(k, 25, 58 + idx * 9);
      doc.setFont('helvetica', 'bold');
      doc.text(v, 140, 58 + idx * 9);
      doc.setFont('helvetica', 'normal');
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 118, 190, 118);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Ticket Breakdown (First 15 items)', 20, 128);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    let y = 138;
    const sample = filteredBookings.slice(0, 15);
    sample.forEach((b, i) => {
      const tkt = b.ticketNumber || `TKT-${b._id?.slice(-6).toUpperCase()}`;
      const passenger = b.passenger?.name || 'Passenger';
      const route = `${b.schedule?.route?.from || ''} -> ${b.schedule?.route?.to || ''}`;
      const fare = `ETB ${b.totalPrice || 0}`;
      const status = (b.status || 'confirmed').toUpperCase();

      doc.text(`${i + 1}. ${tkt} | ${passenger} | ${route} | ${fare} | ${status}`, 20, y);
      y += 8;
    });

    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('Ethio Smart Ticketing System - Agent Daily Shift Report', 105, 285, { align: 'center' });

    doc.save(`Agent_Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('Agent PDF report downloaded successfully!');
  };

  const handleExportCSV = () => {
    const headers = ['Ticket Number', 'Passenger Name', 'Phone', 'From', 'To', 'Date', 'Seats', 'Fare (ETB)', 'Payment Method', 'Payment Status', 'Ticket Status'];
    const rows = filteredBookings.map(b => [
      `"${b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}"`,
      `"${b.passenger?.name || ''}"`,
      `"${b.passenger?.phone || ''}"`,
      `"${b.schedule?.route?.from || ''}"`,
      `"${b.schedule?.route?.to || ''}"`,
      `"${b.schedule?.date || ''}"`,
      `"${(b.seats || []).join(';')}"`,
      b.totalPrice || 0,
      `"${b.paymentMethod || 'CASH'}"`,
      `"${b.paymentStatus || 'unpaid'}"`,
      `"${b.status || 'confirmed'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Agent_Bookings_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Agent CSV report exported!');
  };

  const columns = [
    {
      header: 'Ticket No',
      render: (b) => (
        <span style={{ color: '#059669', fontFamily: 'monospace', fontWeight: 800 }}>
          {b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Passenger Details',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.passenger?.name || 'Passenger'}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.passenger?.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Route & Schedule',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {b.schedule?.route?.from} &rarr; {b.schedule?.route?.to}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {b.schedule?.date} | {b.schedule?.departureTime || '06:00 AM'}
          </div>
        </div>
      ),
    },
    {
      header: 'Seats',
      render: (b) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(b.seats || []).map((s, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: '#e0e7ff',
                color: '#3730a3',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              #{s}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Fare (ETB)',
      render: (b) => (
        <div>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>
            ETB {(Number(b.totalPrice) || 0).toLocaleString()}
          </span>
          {b.discountAmount > 0 && (
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
              -ETB {b.discountAmount} Off
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment',
      render: (b) => {
        const isPaid = b.paymentStatus === 'paid';
        return (
          <div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '50px',
                background: isPaid ? '#d1fae5' : '#fef3c7',
                color: isPaid ? '#065f46' : '#92400e',
                display: 'inline-block'
              }}
            >
              {(b.paymentMethod || 'CASH').toUpperCase()} · {isPaid ? 'PAID' : 'UNPAID'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      render: (b) => {
        const s = (b.status || 'confirmed').toLowerCase();
        let bg = '#dbeafe';
        let color = '#1e40af';
        if (s === 'cancelled') {
          bg = '#fee2e2';
          color = '#991b1b';
        } else if (s === 'boarded' || s === 'used' || b.isVerified) {
          bg = '#dcfce7';
          color = '#15803d';
        }
        return (
          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '50px', background: bg, color }}>
            {b.isVerified ? 'VERIFIED' : s.toUpperCase()}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaChartLine style={{ color: '#059669' }} /> Ticketing &amp; Operational Reports
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            Detailed breakdown of counter bookings, payment channels, passenger volumes, and verification audit logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
            }}
          >
            <FaFilePdf /> Export PDF
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            <FaFileExcel style={{ color: '#16a34a' }} /> Export CSV
          </button>
          <button
            onClick={fetchBookings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 12px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            title="Refresh Report"
          >
            <FaSync />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>TOTAL TICKETS</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaTicketAlt />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>In current filtered scope</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>TOTAL REVENUE</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaMoneyBillWave />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', marginTop: '10px' }}>
            ETB {metrics.totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>From paid tickets</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>VERIFIED BOARDINGS</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserCheck />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4f46e5', marginTop: '10px' }}>
            {metrics.verifiedCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>Passenger check-in complete</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>CANCELLED / VOID</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUndoAlt />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626', marginTop: '10px' }}>
            {metrics.cancelledCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>Released reservations</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search ticket #, passenger name, phone, or route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaCalendarAlt style={{ color: '#64748b', fontSize: '0.85rem' }} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              color: '#334155'
            }}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFilter style={{ color: '#64748b', fontSize: '0.85rem' }} />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              color: '#334155'
            }}
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash Counter</option>
            <option value="TELEBIRR">Telebirr</option>
            <option value="CBE_BIRR">CBE Birr</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.84rem',
              color: '#334155'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="boarded">Boarded / Used</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={filteredBookings}
          loading={loading}
          emptyMessage="No tickets found matching your report criteria."
        />
      </div>
    </div>
  );
};

export default AgentReports;
