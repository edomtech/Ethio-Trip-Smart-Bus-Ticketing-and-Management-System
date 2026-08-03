import React, { useState, useEffect } from 'react';
import { FaTimesCircle, FaTicketAlt, FaCheckCircle } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const CancelBooking = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    bookingAPI.getMyBookings().then(res => {
      const active = (res || []).filter(b => b.status !== 'cancelled');
      setBookings(active); setLoading(false);
    }).catch(() => { toast.error('Failed to load bookings'); setLoading(false); });
  }, []);

  const handleCancel = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      await bookingAPI.cancel(selected._id);
      setBookings(prev => prev.filter(b => b._id !== selected._id));
      toast.success('Booking cancelled successfully. Refund will be processed within 3-5 days.');
      setSelected(null); setConfirming(false);
    } catch (err) { toast.error(err.message || 'Cancellation failed'); }
    finally { setCancelling(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>Loading bookings...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Cancel Booking</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 0' }}>Select a booking to cancel</p>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <FaCheckCircle style={{ fontSize: '3rem', color: '#16a34a', marginBottom: 16 }} />
          <p style={{ fontWeight: 700 }}>No active bookings to cancel</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Booking List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.map(bk => (
              <div key={bk._id} onClick={() => { setSelected(bk); setConfirming(false); }}
                style={{ background: '#fff', border: `2px solid ${selected?._id === bk._id ? '#dc2626' : '#e2e8f0'}`, borderRadius: 14, padding: '16px 20px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, background: '#fef2f2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '1.1rem' }}>
                      <FaTicketAlt />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{bk.schedule?.route?.from} → {bk.schedule?.route?.to}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>#{bk.ticketNumber} · {bk.schedule?.date} · {bk.schedule?.departureTime}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#078930' }}>ETB {bk.totalPrice}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirmation Panel */}
          {selected && (
            <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 24, alignSelf: 'start' }}>
              <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Cancel This Booking?</h4>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{selected.schedule?.route?.from} → {selected.schedule?.route?.to}</div>
                <div style={{ color: '#64748b' }}>Date: {selected.schedule?.date}</div>
                <div style={{ color: '#64748b' }}>Time: {selected.schedule?.departureTime}</div>
                <div style={{ color: '#64748b' }}>Seats: {Array.isArray(selected.selectedSeats) ? selected.selectedSeats.join(', ') : selected.selectedSeats}</div>
                <div style={{ fontWeight: 800, color: '#078930', marginTop: 8 }}>Fare: ETB {selected.totalPrice}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={handleCancel} disabled={cancelling}
                  style={{ padding: '12px 0', background: cancelling ? '#e2e8f0' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: cancelling ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: cancelling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <FaTimesCircle /> {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
                <button onClick={() => setSelected(null)}
                  style={{ padding: '12px 0', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                  Keep Booking
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CancelBooking;
