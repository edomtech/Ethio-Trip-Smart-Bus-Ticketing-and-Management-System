import React, { useState, useEffect, useMemo } from 'react';
import {
  FaChartLine, FaFilePdf, FaFileExcel, FaMoneyBillWave, FaTicketAlt,
  FaUserCheck, FaCalendarAlt, FaSearch, FaFilter, FaSync, FaUndoAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import { bookingAPI } from '../../../utils/api';
import { isRevenueBearing, isCancelled, bookingAmount } from '../../../utils/bookingStatus';
import DataTable from '../../../components/DataTable';
import { useTranslation } from '../../../i18n';

const AgentReports = ({ company, user }) => {
  const { t } = useTranslation();
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
      toast.error(t('agent.reportLoadFailed', 'Failed to load agent reporting data'));
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

  const metrics = useMemo(() => {
    const total = filteredBookings.length;
    const paidBookings = filteredBookings.filter(isRevenueBearing);
    const totalRevenue = paidBookings.reduce((sum, b) => sum + bookingAmount(b), 0);
    const verifiedCount = filteredBookings.filter(b => b.isVerified || b.status === 'boarded' || b.status === 'used').length;
    const cancelledCount = filteredBookings.filter(isCancelled).length;

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
    const compName = company?.companyName || user?.companyId?.companyName || 'Ethio Trip';

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
    toast.success(t('agent.pdfSuccess', 'Agent PDF report downloaded successfully!'));
  };

  const handleExportCSV = () => {
    const headers = ['Ticket Number', 'Passenger Name', 'Phone', 'From', 'To', 'Date', 'Seats', 'Fare (ETB)', 'Payment Method', 'Payment Status', 'Ticket Status'];
    const rows = filteredBookings.map(b => {
      const seatsArr = b.selectedSeats || b.seats || b.outboundLeg?.seats || [];
      const seatsStr = Array.isArray(seatsArr) ? seatsArr.join(';') : String(seatsArr);
      const method = (b.paymentMethod || b.payment?.method || b.method || 'Chapa').toUpperCase();
      const pStatus = String(b.paymentStatus || b.status || '').toUpperCase();
      const isPaid = pStatus === 'PAID' || pStatus === 'CONFIRMED' || pStatus === 'COMPLETED';

      return [
        `"${b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}"`,
        `"${b.passenger?.name || ''}"`,
        `"${b.passenger?.phone || ''}"`,
        `"${b.schedule?.route?.from || ''}"`,
        `"${b.schedule?.route?.to || ''}"`,
        `"${b.schedule?.date || ''}"`,
        `"${seatsStr}"`,
        b.totalPrice || b.totalAmount || 0,
        `"${method}"`,
        `"${isPaid ? 'PAID' : 'PENDING'}"`,
        `"${b.status || 'confirmed'}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Agent_Bookings_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('agent.csvSuccess', 'Agent CSV report exported!'));
  };

  const columns = [
    {
      header: t('ticket.ticketNumber', 'Ticket No'),
      render: (b) => (
        <span className="text-emerald-600 font-mono font-extrabold">
          {b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: t('booking.passengerDetails', 'Passenger Details'),
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900">{b.passenger?.name || t('passenger.passenger', 'Passenger')}</div>
          <div className="text-xs text-slate-500">{b.passenger?.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: t('agent.routeAndDate', 'Route & Schedule'),
      render: (b) => (
        <div>
          <div className="font-semibold text-slate-800">
            {t(b.schedule?.route?.from, b.schedule?.route?.from)} &rarr; {t(b.schedule?.route?.to, b.schedule?.route?.to)}
          </div>
          <div className="text-xs text-slate-500">
            {b.schedule?.date} | {b.schedule?.departureTime || '06:00 AM'}
          </div>
        </div>
      ),
    },
    {
      header: t('booking.seats', 'Seats'),
      render: (b) => {
        const rawSeats = b.selectedSeats || b.seats || b.outboundLeg?.seats || [];
        const seatList = Array.isArray(rawSeats) ? rawSeats : [rawSeats].filter(Boolean);
        if (seatList.length === 0) {
          return <span className="text-slate-400 text-[0.78rem]">{t('booking.unassigned', 'Unassigned')}</span>;
        }
        return (
          <div className="flex gap-1 flex-wrap">
            {seatList.map((s, idx) => (
              <span
                key={idx}
                className="text-[0.74rem] font-extrabold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md border border-indigo-200"
              >
                #{s}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: t('ticket.fareStatus', 'Fare (ETB)'),
      render: (b) => (
        <div>
          <span className="font-extrabold text-slate-900">
            ETB {(Number(b.totalPrice) || Number(b.totalAmount) || 0).toLocaleString()}
          </span>
          {b.discountAmount > 0 && (
            <span className="block text-[0.7rem] text-emerald-600 font-semibold">
              -ETB {b.discountAmount} {t('admin.off', 'Off')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t('payment.paymentMethod', 'Payment Method & Status'),
      render: (b) => {
        const method = (b.paymentMethod || b.payment?.method || b.method || 'Chapa').toUpperCase();
        const pStatus = String(b.paymentStatus || b.status || '').toUpperCase();
        const isPaid = pStatus === 'PAID' || pStatus === 'CONFIRMED' || pStatus === 'COMPLETED';

        return (
          <div className="flex flex-col gap-1">
            <span
              className={`text-[0.75rem] font-extrabold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 w-fit ${
                isPaid
                  ? 'bg-emerald-50 text-green-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              💳 {method}
            </span>
            <span className={`text-[0.7rem] font-bold pl-0.5 ${isPaid ? 'text-green-700' : 'text-amber-600'}`}>
              ● {isPaid ? t('payment.paid', 'PAID') : t('payment.pending', 'PENDING PAYMENT')}
            </span>
          </div>
        );
      },
    },
    {
      header: t('common.status', 'Status'),
      render: (b) => {
        const s = (b.status || 'confirmed').toLowerCase();
        let badgeClass = 'bg-blue-100 text-blue-800';
        if (s === 'cancelled') {
          badgeClass = 'bg-red-100 text-red-800';
        } else if (s === 'boarded' || s === 'used' || b.isVerified) {
          badgeClass = 'bg-emerald-100 text-green-700';
        }
        return (
          <span className={`text-[0.72rem] font-extrabold px-2.5 py-1 rounded-full ${badgeClass}`}>
            {b.isVerified ? t('booking.verified', 'VERIFIED') : t(s, s.toUpperCase())}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="m-0 text-[1.4rem] font-extrabold text-slate-900 flex items-center gap-2">
            <FaChartLine className="text-emerald-600" /> {t('agent.ticketingReportsTitle', 'Ticketing & Operational Reports')}
          </h2>
          <p className="mt-1 mb-0 text-[0.84rem] text-slate-500">
            {t('agent.ticketingReportsSub', 'Detailed breakdown of counter bookings, payment channels, passenger volumes, and verification audit logs.')}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white border-none rounded-lg font-bold text-[0.84rem] cursor-pointer shadow-[0_2px_4px_rgba(5,150,105,0.2)] hover:bg-emerald-700 transition-colors"
          >
            <FaFilePdf /> {t('admin.exportPDF', 'Export PDF')}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-bold text-[0.84rem] cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <FaFileExcel className="text-green-600" /> {t('admin.exportCSV', 'Export CSV')}
          </button>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-1.5 p-2 px-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors"
            title={t('common.refresh', 'Refresh')}
          >
            <FaSync />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[0.78rem] font-bold text-slate-500 uppercase">{t('booking.totalBookings', 'TOTAL TICKETS')}</span>
            <div className="w-8.5 h-8.5 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FaTicketAlt />
            </div>
          </div>
          <div className="text-[1.5rem] font-black text-slate-900 mt-2.5">
            {metrics.total}
          </div>
          <div className="text-[0.74rem] text-slate-500 mt-1">{t('agent.inFilteredScope', 'In current filtered scope')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[0.78rem] font-bold text-slate-500 uppercase">{t('admin.totalRevenue', 'TOTAL REVENUE')}</span>
            <div className="w-8.5 h-8.5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FaMoneyBillWave />
            </div>
          </div>
          <div className="text-[1.5rem] font-black text-emerald-600 mt-2.5">
            ETB {metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[0.74rem] text-slate-500 mt-1">{t('agent.fromPaidTickets', 'From paid tickets')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[0.78rem] font-bold text-slate-500 uppercase">{t('agent.verifiedBoardings', 'VERIFIED BOARDINGS')}</span>
            <div className="w-8.5 h-8.5 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FaUserCheck />
            </div>
          </div>
          <div className="text-[1.5rem] font-black text-indigo-600 mt-2.5">
            {metrics.verifiedCount}
          </div>
          <div className="text-[0.74rem] text-slate-500 mt-1">{t('agent.checkinComplete', 'Passenger check-in complete')}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[0.78rem] font-bold text-slate-500 uppercase">{t('booking.cancelled', 'CANCELLED / VOID')}</span>
            <div className="w-8.5 h-8.5 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <FaUndoAlt />
            </div>
          </div>
          <div className="text-[1.5rem] font-black text-red-600 mt-2.5">
            {metrics.cancelledCount}
          </div>
          <div className="text-[0.74rem] text-slate-500 mt-1">{t('agent.releasedReservations', 'Released reservations')}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3.5 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('agent.searchReportPlaceholder', 'Search ticket #, passenger name, phone, or route...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pr-3 pl-9 border border-slate-300 rounded-lg text-[0.84rem] focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <FaCalendarAlt className="text-slate-500 text-[0.85rem]" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-[0.84rem] text-slate-700 focus:outline-none focus:border-emerald-600"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="bg-transparent border-none text-red-500 text-[0.8rem] cursor-pointer font-bold hover:underline"
            >
              {t('common.clear', 'Clear')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <FaFilter className="text-slate-500 text-[0.85rem]" />
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-[0.84rem] text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">{t('common.allPaymentMethods', 'All Payment Methods')}</option>
            <option value="CASH">{t('payment.cash', 'Cash Counter')}</option>
            <option value="TELEBIRR">Telebirr</option>
            <option value="CBE_BIRR">CBE Birr</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-[0.84rem] text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="confirmed">{t('booking.confirmed', 'Confirmed')}</option>
            <option value="cancelled">{t('booking.cancelled', 'Cancelled')}</option>
            <option value="boarded">{t('booking.boarded', 'Boarded / Used')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={filteredBookings}
          loading={loading}
          emptyMessage={t('agent.noTicketsMatch', 'No tickets found matching your report criteria.')}
        />
      </div>
    </div>
  );
};

export default AgentReports;
