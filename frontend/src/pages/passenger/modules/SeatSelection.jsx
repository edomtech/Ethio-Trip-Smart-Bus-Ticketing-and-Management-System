import React, { useState } from 'react';
import { FaChair, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const SeatSelection = ({ schedule, onBookingComplete, onClose }) => {
  const { user } = useAuth();
  const totalSeats = schedule?.bus?.totalSeats || 45;
  const booked = schedule?.bookedSeats || [];
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSeat = (num) => {
    if (booked.includes(num)) return;
    setSelected(prev => prev.includes(num) ? prev.filter(s => s !== num) : [...prev, num]);
  };

  const handleBook = async () => {
    if (!selected.length) { toast.error('Please select at least one seat'); return; }
    setLoading(true);
    try {
      const res = await bookingAPI.create({ scheduleId: schedule._id, selectedSeats: selected, passengers: selected.length });
      toast.success('Booking created! Proceed to payment.');
      onBookingComplete?.(res.booking || res);
    } catch (err) { toast.error(err.message || 'Booking failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Select Your Seat</h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>{schedule?.route?.from} → {schedule?.route?.to} · {schedule?.departureTime}</p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
        {[{ color: '#f0fdf4', border: '#16a34a', label: 'Available' }, { color: '#fef2f2', border: '#dc2626', label: 'Booked' }, { color: '#fef3c7', border: '#d97706', label: 'Selected' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#64748b' }}>
            <div style={{ width: 20, height: 20, background: l.color, border: `2px solid ${l.border}`, borderRadius: 4 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Bus grid */}
      <div style={{ background: '#f8fafc', borderRadius: 16, padding: 20, marginBottom: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ background: '#dcfce7', borderRadius: 8, padding: '8px 24px', fontSize: '0.78rem', fontWeight: 800, color: '#047857', letterSpacing: '0.5px' }}>
            🚌 FRONT CABIN · DRIVER SEAT
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 24px 1fr 1fr', gap: 8, maxWidth: 360, margin: '0 auto' }}>
          {Array.from({ length: totalSeats }, (_, i) => i + 1).map((num, idx) => {
            const isBooked = booked.includes(num);
            const isSelected = selected.includes(num);
            const isAisleGap = (idx % 4 === 1);
            return (
              <React.Fragment key={num}>
                <button onClick={() => toggleSeat(num)} disabled={isBooked}
                  style={{
                    padding: '10px 6px', borderRadius: 10,
                    border: `1.5px solid ${isBooked ? '#e2e8f0' : isSelected ? '#059669' : '#cbd5e1'}`,
                    background: isBooked ? '#f1f5f9' : isSelected ? 'linear-gradient(135deg,#059669,#047857)' : '#ffffff',
                    color: isBooked ? '#94a3b8' : isSelected ? '#ffffff' : '#0f172a',
                    fontWeight: 800, fontSize: '0.8rem', cursor: isBooked ? 'not-allowed' : 'pointer',
                    transition: 'all .15s', transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isSelected ? '0 4px 12px rgba(5,150,105,0.3)' : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
                  }}>
                  <FaChair style={{ opacity: isBooked ? 0.35 : 1, fontSize: '0.85rem' }} />
                  <span>{num}</span>
                </button>
                {isAisleGap && <div style={{ background: 'transparent' }} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {selected.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#16a34a' }}>Seats: {selected.join(', ')}</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{selected.length} passenger(s)</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#078930' }}>ETB {(schedule?.price || 0) * selected.length}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '12px 0', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleBook} disabled={!selected.length || loading}
          style={{ flex: 2, padding: '12px 0', background: selected.length ? 'linear-gradient(135deg,#078930,#056325)' : '#e2e8f0', color: selected.length ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontWeight: 700, cursor: selected.length ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading ? 'Processing...' : <><FaCheckCircle /> Confirm & Proceed to Payment</>}
        </button>
      </div>
    </div>
  );
};

export default SeatSelection;
