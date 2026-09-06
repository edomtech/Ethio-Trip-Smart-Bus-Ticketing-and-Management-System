import React, { useState, useEffect } from 'react';
import { FaCalendarDay, FaCalendarAlt, FaTimes } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import DataTable from '../../../components/DataTable';

const DailyBookings = () => {
  const [dailyBookings, setDailyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => { fetchDaily(); }, []);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setDailyBookings(data || []);
    } catch {
      toast.error('Failed to load daily bookings');
    } finally {
      setLoading(false);
    }
  };

  const filtered = dailyBookings.filter((b) => {
    if (searchDate && b.schedule?.date !== searchDate) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.ticketNumber || '').toLowerCase().includes(q) ||
      (b.passenger?.name || '').toLowerCase().includes(q) ||
      (b.passenger?.phone || '').includes(q) ||
      (`${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`).toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: 'Ticket No',
      render: (b) => (
        <span style={{ color: '#078930', fontFamily: 'monospace', fontWeight: 800 }}>
          {b.ticketNumber || 'TKT-' + b._id?.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Passenger',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.passenger?.name || 'Passenger'}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.passenger?.phone || '0911998877'}</div>
        </div>
      ),
    },
    {
      header: 'Route & Departure',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a' }}>
            {b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            ⏱ {b.schedule?.departureTime || '08:00 AM'}
          </span>
        </div>
      ),
    },
    {
      header: 'Seat No',
      render: (b) => (
        <span className="eb-badge eb-badge-vip" style={{ background: '#e0f2fe', color: '#0284c7' }}>
          {Array.isArray(b.selectedSeats) ? b.selectedSeats.join(', ') : b.selectedSeats || '01'}
        </span>
      ),
    },
    {
      header: 'Trip Type',
      render: (b) => (
        <span style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          padding: '2px 6px',
          borderRadius: 4,
          background: b.tripType === 'round' ? '#fef3c7' : '#f1f5f9',
          color: b.tripType === 'round' ? '#92400e' : '#475569',
          border: `1px solid ${b.tripType === 'round' ? '#fde68a' : '#e2e8f0'}`
        }}>
          {b.tripType === 'round' ? '🔁 Round' : 'One-Way'}
        </span>
      ),
    },
    {
      header: 'Boarding Status',
      render: (b) => {
        const isBrd = b.boardingStatus === 'BOARDED' || b.isBoarded;
        const isPart = b.boardingStatus === 'PARTIALLY_BOARDED';
        const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed' || b.status === 'confirmed' || b.status === 'CONFIRMED');
        const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled');

        if (isCancelled) return <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>Cancelled</span>;
        if (!isPaid) return <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic' }}>Unpaid</span>;

        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            borderRadius: 5,
            fontSize: '0.72rem',
            fontWeight: 800,
            background: isBrd ? '#ecfdf5' : isPart ? '#fffbeb' : '#f8fafc',
            color: isBrd ? '#059669' : isPart ? '#d97706' : '#64748b',
            border: `1px solid ${isBrd ? '#a7f3d0' : isPart ? '#fde68a' : '#cbd5e1'}`
          }}>
            {isBrd ? '✓ BOARDED' : isPart ? '⏳ PARTIAL' : '○ NOT BOARDED'}
          </span>
        );
      },
    },
    {
      header: 'Status',
      render: (b, i) => (
        <span className={`eb-badge ${b.status === 'confirmed' ? 'eb-badge-active' : 'eb-badge-pending'}`}>
          {b.status === 'confirmed' ? 'Confirmed' : 'Pending'}
        </span>
      ),
    },
  ];

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-teal">
        <div className="mod-header-text">
          <h2>Daily Departure Manifest</h2>
          <p>Passenger list, trip type &amp; live boarding status for departures</p>
        </div>
        <div className="mod-header-icon"><FaCalendarDay /></div>
      </div>

      <div className="mod-stats-row">
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>🚌</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.length}</span>
            <span className="lbl">Total Bookings</span>
          </div>
        </div>
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#ecfdf5', color: '#059669' }}>✓</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.filter((b) => b.boardingStatus === 'BOARDED' || b.isBoarded).length}</span>
            <span className="lbl">Boarded</span>
          </div>
        </div>
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#fffbeb', color: '#d97706' }}>○</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.filter((b) => (b.status === 'confirmed' || b.status === 'CONFIRMED') && !b.isBoarded).length}</span>
            <span className="lbl">Awaiting Boarding</span>
          </div>
        </div>
        <div className="mod-stat-pill">
          <div className="mod-stat-pill-icon" style={{ background: '#fef3c7', color: '#d97706' }}>⏳</div>
          <div className="mod-stat-pill-text">
            <span className="val">{dailyBookings.filter((b) => b.status === 'pending').length}</span>
            <span className="lbl">Awaiting Payment</span>
          </div>
        </div>
      </div>

      {/* Date Search Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
          border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '7px 14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <FaCalendarAlt style={{ color: '#078930', fontSize: '0.9rem' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>Search Departure Date:</span>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', cursor: 'pointer' }}
          />
          {searchDate && (
            <button
              type="button"
              onClick={() => setSearchDate('')}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 4, color: '#64748b', cursor: 'pointer', padding: '2px 6px', fontSize: '0.72rem', fontWeight: 800 }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search manifest by ticket number, passenger name, phone..."
        emptyMessage="No departure bookings recorded for today."
      />
    </div>
  );
};

export default DailyBookings;
