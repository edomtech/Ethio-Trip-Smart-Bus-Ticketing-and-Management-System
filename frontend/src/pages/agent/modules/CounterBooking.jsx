import React, { useState } from 'react';
import {
  FaBus, FaSearch, FaUser, FaCalendarAlt, FaArrowRight, FaTimes,
  FaCheckCircle, FaPrint, FaArrowLeft, FaMapMarkerAlt, FaClock, FaCouch,
  FaQrcode, FaTag, FaPhone, FaEnvelope, FaCreditCard
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { scheduleAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import SeatSelectorModal from '../../../components/SeatSelectorModal';
import TicketModal from '../../../components/TicketModal';

const CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar',
  'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga'
];
const TODAY = new Date().toISOString().split('T')[0];

const STEPS = [
  { id: 1, label: 'Passenger Info' },
  { id: 2, label: 'Find Bus' },
  { id: 3, label: 'Select Seat' },
  { id: 4, label: 'Ticket' },
];

const CounterBooking = () => {
  const { user } = useAuth();

  // Wizard step: 'form' | 'results' | 'seat_modal' | 'ticket'
  const [step, setStep] = useState('form');

  // Passenger state
  const [pax, setPax] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    age: '',
  });

  // Search parameters
  const [tripType, setTripType] = useState('oneway');
  const [from, setFrom] = useState('Addis Ababa');
  const [to, setTo] = useState('Bahir Dar');
  const [date, setDate] = useState(TODAY);
  const [returnDate, setReturnDate] = useState('');

  // Search results
  const [schedules, setSchedules] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [issuedBooking, setIssuedBooking] = useState(null);

  // QR Code Ticket Modal trigger
  const [showTicketModalBooking, setShowTicketModalBooking] = useState(null);

  const companyId = user?.companyId?._id || user?.companyId;

  const handleSearch = async () => {
    if (!from || !to || from === to) {
      toast.warn('Please select different origin and destination cities.');
      return;
    }
    if (!date) {
      toast.warn('Please select a departure date.');
      return;
    }
    if (tripType === 'round' && !returnDate) {
      toast.warn('Please select a return date for round trip.');
      return;
    }
    if (!pax.fullName.trim()) {
      toast.warn('Please enter passenger full name.');
      return;
    }
    if (!pax.phone.trim()) {
      toast.warn('Please enter passenger phone number.');
      return;
    }

    setSearching(true);
    try {
      const data = await scheduleAPI.getAll({ from, to, date });
      const all = Array.isArray(data) ? data : (data?.schedules || []);
      const filtered = companyId
        ? all.filter(s => (s.companyId?._id || s.companyId) === companyId)
        : all;
      setSchedules(filtered);
      setStep('results');
      if (filtered.length === 0) {
        toast.info('No scheduled trips found for your company on this route and date.');
      }
    } catch (err) {
      toast.error('Search failed: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAgentBookingComplete = (booking) => {
    setIssuedBooking(booking);
    setSelectedSchedule(null);
    setShowTicketModalBooking(booking); // Open new E-Ticket modal with QR code
    setStep('ticket');
  };

  const resetAll = () => {
    setIssuedBooking(null);
    setShowTicketModalBooking(null);
    setSchedules([]);
    setPax({ fullName: '', phone: '', email: '', gender: 'Male', age: '' });
    setStep('form');
  };

  const stepNum = { form: 1, results: 2, seat_modal: 3, ticket: 4 }[step] || 1;

  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 800,
    color: '#475569', marginBottom: 4,
  };
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #cbd5e1', fontSize: '0.87rem',
    outline: 'none', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Progress Bar ── */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        padding: '14px 22px', display: 'flex', alignItems: 'center',
        overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {STEPS.map((s, i) => {
          const done = stepNum > s.id;
          const active = stepNum === s.id;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: done ? '#22c55e' : active ? '#078930' : '#e2e8f0',
                  color: done || active ? '#fff' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.73rem', fontWeight: 900,
                }}>
                  {done ? '✓' : s.id}
                </div>
                <span style={{
                  fontSize: '0.78rem', whiteSpace: 'nowrap',
                  fontWeight: active ? 800 : 600,
                  color: active ? '#0f172a' : done ? '#16a34a' : '#94a3b8',
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, minWidth: 20, height: 2, margin: '0 8px',
                  background: done ? '#22c55e' : '#e2e8f0',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1 & 2: Passenger Form & Bus Search ── */}
      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Passenger Information */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
            padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{
              margin: '0 0 16px', fontSize: '1rem', fontWeight: 900, color: '#0f172a',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <FaUser style={{ color: '#078930' }} /> Passenger Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Abebe Kebede"
                  value={pax.fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, fullName: val }));
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  type="text"
                  placeholder="+251 9__ __ __ __"
                  value={pax.phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, phone: val }));
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  placeholder="passenger@email.com"
                  value={pax.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, email: val }));
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Gender</label>
                <select
                  value={pax.gender}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, gender: val }));
                  }}
                  style={inputStyle}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Age</label>
                <input
                  type="number"
                  placeholder="e.g. 28"
                  min="1" max="120"
                  value={pax.age}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, age: val }));
                  }}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Bus Search */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
            padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{
              margin: '0 0 16px', fontSize: '1rem', fontWeight: 900, color: '#0f172a',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <FaBus style={{ color: '#078930' }} /> Search Available Bus
            </h3>

            {/* Trip Type Toggle */}
            <div style={{
              display: 'flex', gap: 6, marginBottom: 18,
              background: '#f8fafc', borderRadius: 10, padding: 4, width: 'fit-content',
            }}>
              {['oneway', 'round'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTripType(t)}
                  style={{
                    padding: '7px 18px', borderRadius: 7, border: 'none',
                    background: tripType === t ? '#078930' : 'transparent',
                    color: tripType === t ? '#fff' : '#64748b',
                    fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  }}
                >
                  {t === 'oneway' ? 'One-Way' : 'Round Trip (10% Discount)'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 14 }}>
              <div>
                <label style={labelStyle}>From (Origin)</label>
                <select value={from} onChange={e => setFrom(e.target.value)} style={inputStyle}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>To (Destination)</label>
                <select value={to} onChange={e => setTo(e.target.value)} style={inputStyle}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Departure Date</label>
                <input
                  type="date" value={date} min={TODAY}
                  onChange={e => setDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {tripType === 'round' && (
                <div>
                  <label style={labelStyle}>Return Date *</label>
                  <input
                    type="date" value={returnDate} min={date || TODAY}
                    onChange={e => setReturnDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !pax.fullName.trim() || !pax.phone.trim()}
              style={{
                marginTop: 18, padding: '11px 26px',
                background: !pax.fullName.trim() || !pax.phone.trim() ? '#94a3b8' : '#078930',
                color: '#fff', border: 'none', borderRadius: 10,
                fontWeight: 900, fontSize: '0.9rem',
                cursor: !pax.fullName.trim() || !pax.phone.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: !pax.fullName.trim() || !pax.phone.trim() ? 'none' : '0 2px 8px rgba(7,137,48,0.25)',
              }}
            >
              <FaSearch /> {searching ? 'Searching...' : 'Search Buses'}
            </button>
            {(!pax.fullName.trim() || !pax.phone.trim()) && (
              <p style={{ margin: '8px 0 0', fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700 }}>
                Fill passenger name and phone above before searching.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Schedules List ── */}
      {step === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>
                {from} → {to} · {date} {tripType === 'round' ? `· Return: ${returnDate}` : ''}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Passenger: <strong>{pax.fullName}</strong> · {pax.phone} {tripType === 'round' ? '· Round-Trip (10% Discount)' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('form')}
              style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1',
                background: '#fff', color: '#334155', fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <FaArrowLeft /> Modify Search
            </button>
          </div>

          {schedules.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '50px 20px',
              background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#64748b',
            }}>
              <FaBus style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
              <h4 style={{ margin: '0 0 4px', color: '#334155' }}>No trips found</h4>
              <p style={{ margin: 0, fontSize: '0.82rem' }}>
                Your company has no schedules on this route and date.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {schedules.map(sch => {
                const cap = sch.bus?.totalSeats || 45;
                const booked = (sch.bookedSeats || []).length;
                const left = Math.max(0, cap - booked);
                const pct = Math.min(100, Math.round((booked / cap) * 100));

                const isRound = tripType === 'round';
                const baseRate = sch.price || 600;
                const grossRate = isRound ? baseRate * 2 : baseRate;
                const discountAmt = isRound ? Math.round(grossRate * 0.10) : 0;
                const finalRate = grossRate - discountAmt;

                return (
                  <div
                    key={sch._id}
                    style={{
                      background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0',
                      padding: 18, display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', flexWrap: 'wrap', gap: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                      {sch.companyId?.logo || sch.company?.logo ? (
                        <img
                          src={sch.companyId?.logo || sch.company?.logo}
                          alt={sch.companyId?.companyName || 'Company Logo'}
                          style={{
                            width: 48, height: 48, borderRadius: 12, objectFit: 'cover',
                            border: '1.5px solid #e2e8f0', flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 48, height: 48, borderRadius: 12,
                          background: 'linear-gradient(135deg, #078930, #065f46)', color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', fontWeight: 900, flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(7,137,48,0.2)'
                        }}>
                          <FaBus />
                        </div>
                      )}

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.73rem', color: '#078930', fontWeight: 800, marginBottom: 2 }}>
                          {sch.companyId?.companyName || sch.company?.companyName || user?.companyId?.companyName || 'Ethio Trip'}
                        </div>
                        <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Bus {sch.bus?.busNumber} — {sch.bus?.type || 'Luxury'}</span>
                          {isRound && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                              Round-Trip Saver
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.78rem', color: '#64748b',
                          display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8,
                        }}>
                          <span><FaCalendarAlt style={{ color: '#078930', marginRight: 3 }} />{sch.date}</span>
                          <span><FaClock style={{ color: '#078930', marginRight: 3 }} />{sch.departureTime} → {sch.arrivalTime || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 3 }}>
                          <span>{booked} Reserved</span>
                          <span style={{ color: left > 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
                            {left} Available
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: pct + '%',
                            background: pct > 80 ? '#ef4444' : '#10b981', borderRadius: 4,
                          }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {isRound ? (
                        <div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#078930' }}>
                            ETB {finalRate}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', textDecoration: 'line-through' }}>
                            ETB {grossRate} (2 Legs)
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 800 }}>
                            10% Round-Trip Discount
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#078930', marginBottom: 8 }}>
                          ETB {baseRate}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={left === 0}
                        onClick={() => {
                          setSelectedSchedule({ ...sch, tripType, returnDate });
                          setStep('seat_modal');
                        }}
                        style={{
                          marginTop: 8,
                          padding: '9px 18px',
                          background: left > 0 ? '#078930' : '#94a3b8',
                          color: '#fff', border: 'none', borderRadius: 8,
                          fontWeight: 800, fontSize: '0.83rem',
                          cursor: left > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <FaCouch /> {left > 0 ? 'Select Seats' : 'Fully Booked'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: Success Ticket Card ── */}
      {step === 'ticket' && (
        <div style={{
          background: '#f0fdf4', border: '2px solid #86efac',
          borderRadius: 20, padding: 28, textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#22c55e',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', margin: '0 auto 16px',
          }}>
            <FaCheckCircle />
          </div>
          <h2 style={{ margin: '0 0 6px', color: '#166534', fontWeight: 900, fontSize: '1.35rem' }}>
            Ticket Successfully Issued!
          </h2>
          <p style={{ margin: '0 0 20px', color: '#15803d', fontSize: '0.88rem' }}>
            Reference: <strong>{issuedBooking?.ticketNumber || issuedBooking?._id}</strong>
          </p>

          <div style={{
            background: '#fff', border: '1px solid #bbf7d0', borderRadius: 14, padding: 18,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: 14, textAlign: 'left', marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>PASSENGER</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{issuedBooking?.passenger?.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{issuedBooking?.passenger?.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>ROUTE</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>
                {issuedBooking?.schedule?.route?.from} ➔ {issuedBooking?.schedule?.route?.to}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {issuedBooking?.schedule?.date} · {issuedBooking?.schedule?.departureTime}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>SEATS</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {(issuedBooking?.selectedSeats || []).map(s => (
                  <span
                    key={s}
                    style={{
                      background: '#22c55e', color: '#fff',
                      padding: '2px 8px', borderRadius: 5,
                      fontWeight: 900, fontSize: '0.8rem',
                    }}
                  >
                    Seat {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>FARE / STATUS</div>
              <div style={{ fontWeight: 900, color: '#166534', fontSize: '1.05rem' }}>
                ETB {issuedBooking?.totalPrice || issuedBooking?.baseFare}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                {issuedBooking?.paymentStatus || 'PAID'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowTicketModalBooking(issuedBooking)}
              style={{
                padding: '10px 22px', background: '#078930', color: '#fff',
                border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7
              }}
            >
              <FaQrcode /> View Digital Ticket with QR Code
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '10px 22px', background: '#166534', color: '#fff',
                border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '0.85rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <FaPrint /> Print Boarding Pass
            </button>
            <button
              type="button"
              onClick={resetAll}
              style={{
                padding: '10px 22px', background: '#fff', color: '#334155',
                border: '1.5px solid #cbd5e1', borderRadius: 9, fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Book Another Ticket
            </button>
          </div>
        </div>
      )}

      {/* ── Seat Selection Modal ── */}
      {step === 'seat_modal' && selectedSchedule && (
        <SeatSelectorModal
          schedule={selectedSchedule}
          isAgentBooking={true}
          onClose={() => setStep('results')}
          onAgentBookingComplete={handleAgentBookingComplete}
          prefilledPassenger={pax}
        />
      )}

      {/* ── QR Code Ticket Modal (Exact Match with Reference Image) ── */}
      {showTicketModalBooking && (
        <TicketModal
          booking={showTicketModalBooking}
          onClose={() => setShowTicketModalBooking(null)}
        />
      )}
    </div>
  );
};

export default CounterBooking;
