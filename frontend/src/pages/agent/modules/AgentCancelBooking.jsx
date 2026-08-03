import React, { useState, useEffect } from 'react';
import { FaTimesCircle, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../modules.css';

const AgentCancelBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      setBookings((data || []).filter(b => b.status !== 'cancelled'));
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!reason.trim()) { toast.warning('Please provide a cancellation reason'); return; }
    setCancelling(true);
    try {
      await bookingAPI.cancel(cancelTarget._id, { reason });
      toast.success('Booking cancelled successfully!');
      setCancelTarget(null);
      setReason('');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  const filtered = bookings.filter(b =>
    b.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
    b.passenger?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-rose">
        <div className="mod-header-text">
          <h2>Agent Booking Cancellation</h2>
          <p>Process passenger ticket cancellations at terminal window</p>
        </div>
        <div className="mod-header-icon"><FaTimesCircle /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cancelTarget ? '1fr 400px' : '1fr', gap: '24px' }}>
        <div className="mod-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '8px 16px', width: '320px' }}>
              <FaSearch style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search ticket # or passenger..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="mod-loading"><div className="mod-spinner" /><p>Loading bookings...</p></div>
          ) : (
            <table className="mod-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Passenger</th>
                  <th>Route</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b._id || i}>
                    <td><strong style={{ color: '#078930' }}>#{b.ticketNumber || 'BK' + (i + 100)}</strong></td>
                    <td><strong>{b.passenger?.name || 'Aynadis Tadele'}</strong></td>
                    <td>{b.schedule?.route?.from || 'Addis Ababa'} → {b.schedule?.route?.to || 'Dire Dawa'}</td>
                    <td><strong>Br {b.totalPrice || b.price || 700}</strong></td>
                    <td>
                      <button onClick={() => setCancelTarget(b)} className="mod-btn mod-btn-danger" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        Cancel Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {cancelTarget && (
          <div className="mod-card" style={{ border: '2px solid #fecdd3', background: '#fff5f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                <FaExclamationTriangle />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#be123c', fontWeight: 900 }}>Confirm Cancel</h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Ticket #{cancelTarget.ticketNumber}</span>
              </div>
            </div>

            <div className="mod-field">
              <label>Reason for Cancellation *</label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason provided by passenger..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setCancelTarget(null)} className="mod-btn mod-btn-ghost" style={{ flex: 1 }}>Keep Ticket</button>
              <button onClick={handleCancel} disabled={cancelling} className="mod-btn mod-btn-danger" style={{ flex: 1 }}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCancelBooking;
