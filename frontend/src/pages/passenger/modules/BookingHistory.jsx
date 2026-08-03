import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaFilter, FaDownload, FaTimes, FaQrcode, FaMapMarkerAlt } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const STATUS_COLORS = { confirmed: { bg: '#dcfce7', c: '#16a34a' }, pending: { bg: '#fef3c7', c: '#d97706' }, cancelled: { bg: '#fee2e2', c: '#dc2626' } };

const BookingHistory = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    bookingAPI.getMyBookings().then(res => { setBookings(res || []); setLoading(false); }).catch(() => { toast.error('Failed to load bookings'); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? bookings.filter(b => b.status !== 'cancelled') : bookings.filter(b => b.status === filter);

  const stats = [
    { label: 'Total Bookings', val: bookings.filter(b => b.status !== 'cancelled').length, color: '#7c3aed', bg: '#f3e8ff' },
    { label: 'Confirmed',      val: bookings.filter(b => b.status === 'confirmed').length,  color: '#16a34a', bg: '#dcfce7' },
    { label: 'Pending',        val: bookings.filter(b => b.status === 'pending').length,    color: '#d97706', bg: '#fef3c7' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Booking History</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>All your past and active bookings</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all','confirmed','pending'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: 20, border: '1.5px solid', borderColor: filter === f ? '#078930' : '#e2e8f0', background: filter === f ? '#f0fdf4' : '#fff', color: filter === f ? '#078930' : '#64748b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <FaTicketAlt style={{ fontSize: '3rem', opacity: 0.3, marginBottom: 16 }} />
          <p>No {filter === 'all' ? '' : filter} bookings found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(bk => {
            const sc = STATUS_COLORS[bk.status] || STATUS_COLORS.pending;
            return (
              <div key={bk._id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, background: sc.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sc.c, fontSize: '1.2rem' }}>
                    <FaTicketAlt />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', marginBottom: 3 }}>
                      {bk.schedule?.route?.from} → {bk.schedule?.route?.to}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      #{bk.ticketNumber} · {bk.schedule?.date} · Seat {Array.isArray(bk.selectedSeats) ? bk.selectedSeats.join(', ') : bk.selectedSeats}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ background: sc.bg, color: sc.c, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.78rem', textTransform: 'capitalize' }}>{bk.status}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#078930' }}>ETB {bk.totalPrice}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
