import React, { useState } from 'react';
import {
  FaTimes, FaBus, FaCalendarAlt, FaTag, FaShieldAlt,
  FaArrowRight, FaUserTie
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bookingAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const SeatSelectorModal = ({ schedule, onClose, onBookingComplete }) => {
  const { user } = useAuth();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerName, setPassengerName] = useState(user?.name || '');
  const [passengerPhone, setPassengerPhone] = useState(user?.phone || '0911234567');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!schedule) return null;

  const pricePerSeat = schedule.price || 750;
  const routeFrom = schedule.route?.from || 'ADDIS ABABA';
  const fromTerminal = 'Meskel Square';
  const routeTo = schedule.route?.to || 'BAHIR DAR';
  const toTerminal = 'Bahir Dar Terminal';
  const travelDate = schedule.date || '15 Aug 2026';
  const travelTime = `${schedule.departureTime || '07:30 AM'} - ${schedule.arrivalTime || '03:30 PM'}`;
  const busType = schedule.bus?.type || 'Luxury';
  const busNumber = schedule.bus?.busNumber || 'ETB 1010';

  // Rows A through J
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  // Preset status mapping for initial demo layout
  const seatStates = {
    // Booked seats (Red)
    A3: 'booked', C3: 'booked', E1: 'booked', E2: 'booked', H3: 'booked',
    // Reserved Ladies (Grey)
    F1: 'reserved_ladies', F2: 'reserved_ladies', F3: 'reserved_ladies', F4: 'reserved_ladies',
    // Reserved Gents (Pink)
    I1: 'reserved_gents', I2: 'reserved_gents', I3: 'reserved_gents', I4: 'reserved_gents',
  };

  const toggleSeat = (seatId) => {
    if (seatStates[seatId] === 'booked') return;
    // Only one seat allowed — clicking same seat deselects it, clicking another replaces
    setSelectedSeats(prev =>
      prev.includes(seatId) ? [] : [seatId]
    );
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    setIsSubmitting(true);
    try {
      const newBooking = await bookingAPI.create({
        scheduleId: schedule._id,
        selectedSeats,
        totalAmount: pricePerSeat * selectedSeats.length,
        passengerDetails: { name: passengerName, phone: passengerPhone, email: user?.email || 'passenger@example.com' },
      });
      toast.success('Seats reserved successfully!');
      if (onBookingComplete) onBookingComplete(newBooking);
    } catch (err) {
      toast.error(err.message || 'Seat reservation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '12px'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#f8fafc', width: '100%', maxWidth: '860px',
        borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif'
      }}>

        {/* ══ HEADER BAR WITH 5-STEP PROGRESS ══ */}
        <div style={{
          background: '#062b1e', padding: '10px 20px', color: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#fff'
            }}>
              <FaBus />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, lineHeight: 1.1 }}>
                ETHIO <span style={{ color: '#facc15' }}>BUS</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                Smart Bus Ticketing System
              </div>
            </div>
          </div>

          {/* 5 Progress Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {[
              { num: '1', label: 'Search', status: 'done' },
              { num: '2', label: 'Seat', status: 'active' },
              { num: '3', label: 'Passenger', status: 'next' },
              { num: '4', label: 'Payment', status: 'next' },
              { num: '5', label: 'Confirm', status: 'next' },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.num}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: step.status === 'active' ? '#16a34a' : step.status === 'done' ? 'rgba(22, 163, 74, 0.4)' : 'rgba(255, 255, 255, 0.15)',
                    border: step.status === 'active' ? '2px solid #4ade80' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 800, color: '#fff'
                  }}>
                    {step.num}
                  </div>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: step.status === 'active' ? 800 : 600,
                    color: step.status === 'active' ? '#ffffff' : '#94a3b8'
                  }}>
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{ width: 20, height: 2, background: 'rgba(255, 255, 255, 0.2)' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
          }}>
            <FaTimes />
          </button>
        </div>

        {/* ══ TRIP INFORMATION BANNER ══ */}
        <div style={{ padding: '8px 20px 0' }}>
          <div style={{
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '9px', background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#0f172a'
              }}>
                <FaBus />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{routeFrom}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{fromTerminal}</div>
              </div>
              <div style={{ fontSize: '1.1rem', color: '#64748b', margin: '0 6px' }}>&rarr;</div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{routeTo}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{toTerminal}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{travelDate}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{travelTime}</div>
            </div>
          </div>
        </div>

        {/* ══ MAIN BODY 2-COLUMN LAYOUT ══ */}
        <div style={{
          padding: '10px 20px', display: 'grid', gridTemplateColumns: '200px 1fr',
          gap: '14px'
        }}>

          {/* LEFT COLUMN: Trip Details + Legend + Security */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Trip Details Card */}
            <div style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              padding: '10px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                Trip Details
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaBus style={{ color: '#64748b', fontSize: '0.85rem' }} />
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Bus Type</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{busType}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaCalendarAlt style={{ color: '#64748b', fontSize: '0.85rem' }} />
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Bus Number</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{busNumber}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaTag style={{ color: '#64748b', fontSize: '0.85rem' }} />
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Price/Seat</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{pricePerSeat} ETB</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seat Legend Card */}
            <div style={{
              background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
              padding: '10px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}>
              <h4 style={{ margin: '0 0 7px', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                Seat Legend
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                {[['#22c55e','Available'],['#2563eb','Selected'],['#dc2626','Booked'],['#94a3b8','Ladies'],['#f472b6','Gents']].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: '#334155' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Secure Booking Card */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px',
              padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px'
            }}>
              <FaShieldAlt style={{ color: '#16a34a', fontSize: '1.1rem', marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#14532d' }}>Secure Booking</div>
                <div style={{ fontSize: '0.68rem', color: '#166534', marginTop: '2px', lineHeight: 1.3 }}>Your data is safe.</div>
              </div>
            </div>

          </div>

          {/* CENTER COLUMN: BUS CHASSIS SEAT GRID */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
              Select Your Seat
            </h3>

            {/* BUS CHASSIS FRAME */}
            <div style={{
              width: '100%', maxWidth: '380px', background: '#334155', borderRadius: '32px 32px 20px 20px',
              padding: '10px', border: '3px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              position: 'relative'
            }}>

              {/* Front Driver Cap */}
              <div style={{
                background: '#1e293b', borderRadius: '22px 22px 8px 8px', padding: '7px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ffffff',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
                  <FaUserTie /> <span>Driver</span>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '1px', color: '#94a3b8' }}>FRONT</span>
              </div>

              {/* Seat Matrix Grid Container (Rows A-J) */}
              <div style={{
                background: '#f8fafc', borderRadius: '14px', padding: '10px 8px',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                {rows.map((row) => (
                  <div key={row} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Left Row Label */}
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', width: '14px' }}>
                      {row}
                    </span>

                    {/* Seats Left Side (1, 2) */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['1', '2'].map((col) => {
                        const seatId = `${row}${col}`;
                        const isSelected = selectedSeats.includes(seatId);
                        const state = seatStates[seatId];

                        let bg = '#22c55e';
                        let textColor = '#ffffff';

                        if (isSelected) {
                          bg = '#2563eb';
                        } else if (state === 'booked') {
                          bg = '#dc2626';
                        } else if (state === 'reserved_ladies') {
                          bg = '#94a3b8';
                        } else if (state === 'reserved_gents') {
                          bg = '#f472b6';
                        }

                        return (
                          <button
                            key={seatId}
                            onClick={() => toggleSeat(seatId)}
                            style={{
                              width: '36px', height: '28px', borderRadius: '6px',
                              background: bg, color: textColor, border: 'none',
                              fontWeight: 800, fontSize: '0.68rem', cursor: state === 'booked' ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.15s ease',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                            }}
                          >
                            {seatId}
                          </button>
                        );
                      })}
                    </div>

                    {/* Center Aisle Spacer */}
                    <div style={{ width: '24px' }} />

                    {/* Seats Right Side (3, 4) */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {['3', '4'].map((col) => {
                        const seatId = `${row}${col}`;
                        const isSelected = selectedSeats.includes(seatId);
                        const state = seatStates[seatId];

                        let bg = '#22c55e';
                        let textColor = '#ffffff';

                        if (isSelected) {
                          bg = '#2563eb';
                        } else if (state === 'booked') {
                          bg = '#dc2626';
                        } else if (state === 'reserved_ladies') {
                          bg = '#94a3b8';
                        } else if (state === 'reserved_gents') {
                          bg = '#f472b6';
                        }

                        return (
                          <button
                            key={seatId}
                            onClick={() => toggleSeat(seatId)}
                            style={{
                              width: '36px', height: '28px', borderRadius: '6px',
                              background: bg, color: textColor, border: 'none',
                              fontWeight: 800, fontSize: '0.68rem', cursor: state === 'booked' ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.15s ease',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                            }}
                          >
                            {seatId}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Row Label */}
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', width: '14px', textAlign: 'right' }}>
                      {row}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rear Taillights Cap */}
              <div style={{
                marginTop: '8px', background: '#1e293b', borderRadius: '8px 8px 14px 14px',
                padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '1px' }}>BACK</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ══ BOTTOM SUMMARY & ACTION BAR ══ */}
        <div style={{
          background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
        }}>
          {/* Selected Seat Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Selected Seat</span>
            <div style={{
              background: '#2563eb', color: '#ffffff', fontWeight: 800,
              fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px'
            }}>
              {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
            </div>
          </div>

          {/* Total Amount & CTA Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Total Amount</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#16a34a' }}>
                {pricePerSeat * selectedSeats.length} ETB
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isSubmitting || selectedSeats.length === 0}
              style={{
                background: selectedSeats.length > 0 ? '#16a34a' : '#cbd5e1',
                color: '#ffffff', border: 'none', borderRadius: '10px',
                padding: '9px 20px', fontWeight: 800, fontSize: '0.82rem',
                cursor: selectedSeats.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: selectedSeats.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Reserving...' : <><span>Continue to Payment</span> <FaArrowRight /></>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SeatSelectorModal;
