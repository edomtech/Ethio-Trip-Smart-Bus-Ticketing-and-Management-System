import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaSearch, FaTimesCircle, FaSpinner, FaDownload } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import TicketModal from '../../../components/TicketModal';
import '../../../components/ModernTable.css';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setBookings(data.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)));
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel and refund this booking?')) return;
    setCancellingId(id);
    try { await bookingAPI.cancel(id); toast.success('Booking cancelled'); load(); }
    catch (err) { toast.error(err.message || 'Failed'); }
    finally { setCancellingId(null); }
  };

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (b.ticketNumber?.toLowerCase().includes(q) || b.passenger?.name?.toLowerCase().includes(q) || b.passenger?.email?.toLowerCase().includes(q));
  });

  const totalRevenue = bookings.filter(b => b.paymentStatus === 'completed').reduce((s, b) => s + b.totalPrice, 0);

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total Bookings', value: bookings.length, color: '#0284c7', bg: '#e0f2fe' },
          { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: '#ca8a04', bg: '#fef9c3' },
          { label: 'Total Revenue', value: `ETB ${totalRevenue.toLocaleString()}`, color: '#078930', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table Toolbar */}
      <div className="eb-table-toolbar">
        <div className="eb-search-input-box" style={{ width: '100%', maxWidth: '400px' }}>
          <FaSearch className="eb-search-icon" />
          <input
            type="text"
            placeholder="Search by ticket #, passenger name, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: '#64748b' }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Loading bookings...
        </div>
      ) : (
        <div className="eb-table-card">
          <table className="eb-modern-table">
            <thead>
              <tr>
                <th>Ticket Number</th>
                <th>Passenger</th>
                <th>Route</th>
                <th>Travel Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 600 }}>
                    No bookings found matching your search.
                  </td>
                </tr>
              ) : filtered.map(b => {
                const statusClass = (b.status || 'pending').toLowerCase();
                return (
                  <tr key={b._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#078930' }}>
                      {b.ticketNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.passenger?.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{b.passenger?.phone}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {b.schedule?.route?.from} → {b.schedule?.route?.to}
                    </td>
                    <td style={{ color: '#64748b' }}>{b.schedule?.date}</td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>ETB {b.totalPrice}</td>
                    <td>
                      <span className={`eb-badge eb-badge-${statusClass}`}>{b.status}</span>
                    </td>
                    <td>
                      <div className="eb-action-group">
                        <button onClick={() => setSelectedBooking(b)} className="eb-btn-action eb-btn-view">
                          <FaDownload /> Ticket
                        </button>
                        {b.status === 'confirmed' && (
                          <button onClick={() => handleCancel(b._id)} disabled={cancellingId === b._id} className="eb-btn-action eb-btn-delete">
                            <FaTimesCircle /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && <TicketModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </div>
  );
};

export default AdminBookings;
