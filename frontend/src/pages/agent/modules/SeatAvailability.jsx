import React, { useState, useEffect } from 'react';
import {
  FaBus, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaClock,
  FaTimes, FaCouch, FaChair, FaEye, FaSync, FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { scheduleAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';

// ── Exact 45-seat bus layout (same as SeatSelectorModal) ──
const ROWS = [
  { key: 1,  left: [1],       right: [2, 3] },
  { key: 2,  left: [4, 5],    right: [6, 7] },
  { key: 3,  left: [8, 9],    right: [10, 11] },
  { key: 4,  left: [12, 13],  right: [14, 15] },
  { key: 5,  left: [16, 17],  right: [18, 19] },
  { key: 6,  left: [20, 21],  right: [22, 23] },
  { key: 7,  left: [24, 25],  right: [26, 27] },
  { key: 8,  left: [28, 29],  right: [30, 31] },
  { key: 9,  left: [32, 33],  right: [34, 35] },
  { key: 10, left: [36, 37],  right: [38, 39] },
  { key: 11, left: [40, 41],  right: [42, 43] },
  { key: 12, left: [44],      right: [45], isBack: true },
];

const DEFAULT_CITIES = [
  'All Cities', 'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa',
  'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga',
];

// ── Read-only seat button ──
const SeatView = ({ num, bookedSeats }) => {
  const isBooked = bookedSeats.includes(num) || bookedSeats.includes(String(num));
  return (
    <div
      title={isBooked ? `Seat ${num} – Reserved` : `Seat ${num} – Available`}
      style={{
        width: 38, height: 34, borderRadius: 8,
        border: `1.5px solid ${isBooked ? '#94a3b8' : '#d1d5db'}`,
        background: isBooked ? '#cbd5e1' : '#ffffff',
        color: isBooked ? '#64748b' : '#1e293b',
        fontWeight: 800, fontSize: '0.82rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: 'default',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {num}
    </div>
  );
};

// ── Seat Layout Modal (view-only grid) ──
const SeatLayoutModal = ({ schedule, onClose }) => {
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const fresh = await scheduleAPI.getById(schedule._id);
        const raw = fresh?.bookedSeats || schedule?.bookedSeats || [];
        setBookedSeats(raw.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
      } catch {
        const raw = schedule?.bookedSeats || [];
        setBookedSeats(raw.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schedule._id]);

  const cap = schedule?.bus?.totalSeats || schedule?.bus?.capacity || 45;
  const reserved = bookedSeats.length;
  const available = Math.max(0, cap - reserved);
  const pct = Math.min(100, Math.round((reserved / cap) * 100));

  const renderSeatCol = (seats) =>
    seats.map(n => <SeatView key={n} num={n} bookedSeats={bookedSeats} />);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
          maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg,#064e3b,#065f46)',
          padding: '18px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,.65)', fontWeight: 700, marginBottom: 4 }}>
              SEAT AVAILABILITY · VIEW ONLY
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
              {schedule?.route?.from || '—'} → {schedule?.route?.to || '—'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,.7)', marginTop: 3 }}>
              Bus {schedule?.bus?.busNumber} ({schedule?.bus?.type || 'Luxury'}) · {schedule?.date} · {schedule?.departureTime}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.12)', border: 'none',
              color: '#fff', borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '1rem', flexShrink: 0,
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Capacity Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
            <span style={{ color: '#64748b' }}>
              Reserved: <span style={{ color: '#dc2626', fontWeight: 900 }}>{reserved}</span>
            </span>
            <span style={{ color: '#64748b' }}>
              Available: <span style={{ color: '#16a34a', fontWeight: 900 }}>{available}</span>
            </span>
            <span style={{ color: '#64748b' }}>
              Total: <strong>{cap}</strong>
            </span>
          </div>
          <div style={{ height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: pct + '%',
              background: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981',
              borderRadius: 4, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Legend */}
        <div style={{ padding: '10px 20px', display: 'flex', gap: 16, flexShrink: 0 }}>
          {[
            { color: '#fff', border: '#d1d5db', label: 'Available' },
            { color: '#cbd5e1', border: '#94a3b8', label: 'Reserved' },
          ].map(({ color, border, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 16, height: 14, borderRadius: 4,
                background: color, border: `1.5px solid ${border}`,
              }} />
              <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Bus Layout */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading seat map...</div>
          ) : (
            <div style={{
              background: '#f8fafc', borderRadius: 16, border: '1.5px solid #e2e8f0',
              padding: 16, display: 'flex', flexDirection: 'column', gap: 0,
            }}>
              {/* Driver Area */}
              <div style={{
                background: 'linear-gradient(90deg,#064e3b,#065f46)',
                borderRadius: '12px 12px 0 0', padding: '10px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12,
              }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.82rem' }}>🚌 DRIVER</span>
                <div style={{
                  width: 36, height: 28, background: 'rgba(255,255,255,.2)',
                  borderRadius: 8, border: '1.5px solid rgba(255,255,255,.3)',
                }} />
              </div>

              {/* Seat rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ROWS.map(row => (
                  <div key={row.key} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 4,
                  }}>
                    <div style={{ display: 'flex', gap: 4 }}>{renderSeatCol(row.left)}</div>
                    <div style={{ width: 28, textAlign: 'center', fontSize: '0.6rem', color: '#94a3b8' }}>
                      {row.isBack ? '━━' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>{renderSeatCol(row.right)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main SeatAvailability Component ──
const SeatAvailability = () => {
  const { user } = useAuth();
  const companyId = user?.companyId?._id || user?.companyId;

  const [from, setFrom] = useState('All Cities');
  const [to, setTo] = useState('All Cities');
  const [date, setDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewSchedule, setViewSchedule] = useState(null);

  const [cityList, setCityList] = useState(DEFAULT_CITIES);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await scheduleAPI.getAll();
      const all = Array.isArray(data) ? data : (data?.schedules || []);
      const companySchedules = companyId
        ? all.filter(s => {
            const sCompId = s.companyId?._id || s.companyId;
            return String(sCompId) === String(companyId);
          })
        : all;

      setSchedules(companySchedules);

      const origins = new Set();
      const destinations = new Set();
      companySchedules.forEach(s => {
        if (s.route?.from) origins.add(s.route.from);
        if (s.route?.to) destinations.add(s.route.to);
      });
      const merged = Array.from(new Set(['All Cities', ...DEFAULT_CITIES.slice(1), ...origins, ...destinations]));
      setCityList(merged);
    } catch (err) {
      toast.error('Failed to load schedules: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [companyId]);

  const handleDeleteSchedule = (id) => {
    if (!window.confirm('Are you sure you want to remove this schedule from your seat availability monitor?')) return;
    setSchedules(prev => prev.filter(s => s._id !== id));
    toast.success('Schedule removed from seat availability list');
  };

  const filteredSchedules = schedules.filter(s => {
    const q = searchKeyword.toLowerCase().trim();

    const busNum = (s.bus?.busNumber || '').toLowerCase();
    const busPlate = (s.bus?.plateNumber || '').toLowerCase();
    const busType = (s.bus?.type || '').toLowerCase();
    const busName = (s.bus?.name || '').toLowerCase();

    const rFrom = (s.route?.from || '').toLowerCase();
    const rTo = (s.route?.to || '').toLowerCase();
    const pickup = (s.pickupStation || s.route?.pickupStation || '').toLowerCase();
    const dropoff = (s.dropoffStation || s.route?.dropoffStation || '').toLowerCase();

    const sDate = (s.date || '').toLowerCase();
    const sTime = (s.departureTime || '').toLowerCase();

    const matchesKeyword = !q ||
      busNum.includes(q) ||
      busPlate.includes(q) ||
      busType.includes(q) ||
      busName.includes(q) ||
      rFrom.includes(q) ||
      rTo.includes(q) ||
      pickup.includes(q) ||
      dropoff.includes(q) ||
      sDate.includes(q) ||
      sTime.includes(q);

    const matchesFrom = from === 'All Cities' || s.route?.from?.toLowerCase() === from.toLowerCase();
    const matchesTo = to === 'All Cities' || s.route?.to?.toLowerCase() === to.toLowerCase();
    const matchesDate = !date || s.date === date;

    return matchesKeyword && matchesFrom && matchesTo && matchesDate;
  });

  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: 800,
    color: '#475569', marginBottom: 4,
  };
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #cbd5e1', fontSize: '0.87rem',
    outline: 'none', boxSizing: 'border-box', background: '#fff'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Clean Top Title Bar (No bulky green banner background) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.35rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaEye style={{ color: '#078930' }} /> Seat Availability Monitor
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
            Monitor real-time seat reservation layout and capacity across scheduled company buses.
          </p>
        </div>
        <button
          onClick={fetchSchedules}
          disabled={loading}
          style={{
            padding: '9px 18px', background: '#078930', color: '#fff',
            border: 'none', borderRadius: 9, fontWeight: 800,
            fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 2px 8px rgba(7,137,48,0.2)'
          }}
        >
          <FaSync className={loading ? 'fa-spin' : ''} /> Refresh Availability
        </button>
      </div>

      {/* Search & Filters Card */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          {/* Search Input */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search by Bus Name / Number / Plate / Route</label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search bus number, plate, route or departure time..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 34 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Origin</label>
            <select value={from} onChange={e => setFrom(e.target.value)} style={inputStyle}>
              {cityList.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Destination</label>
            <select value={to} onChange={e => setTo(e.target.value)} style={inputStyle}>
              {cityList.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Departure Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchKeyword || from !== 'All Cities' || to !== 'All Cities' || date) && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setSearchKeyword('');
                setFrom('All Cities');
                setTo('All Cities');
                setDate('');
              }}
              style={{
                background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6,
                padding: '5px 12px', fontSize: '0.78rem', color: '#475569',
                cursor: 'pointer', fontWeight: 700
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div>
        <div style={{ marginBottom: 12, fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
          {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? 's' : ''} available
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#64748b' }}>
            <FaSync className="fa-spin" style={{ fontSize: '2rem', color: '#078930', marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading seat availability data...</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '50px 20px',
            background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', color: '#64748b',
          }}>
            <FaBus style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 4px', color: '#334155' }}>No schedules match search</h4>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>
              Try searching with a different bus name, route, or clear your filters.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredSchedules.map(sch => {
              const cap = sch.bus?.totalSeats || sch.bus?.capacity || 45;
              const booked = (sch.bookedSeats || []).length;
              const available = Math.max(0, cap - booked);
              const pct = Math.min(100, Math.round((booked / cap) * 100));
              const barColor = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';

              return (
                <div
                  key={sch._id}
                  style={{
                    background: '#fff', borderRadius: 14,
                    border: '1.5px solid #e2e8f0', padding: 18,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    {/* Bus Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12,
                        background: '#f0fdf4', color: '#078930',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem', flexShrink: 0,
                      }}>
                        <FaBus />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Bus {sch.bus?.busNumber}</span>
                          <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                            {sch.bus?.type || 'Luxury'}
                          </span>
                          {sch.bus?.plateNumber && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Plate: {sch.bus.plateNumber}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.78rem', color: '#64748b',
                          display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 3,
                        }}>
                          <span><FaMapMarkerAlt style={{ color: '#078930', marginRight: 3 }} />
                            {sch.route?.from || 'Origin'} → {sch.route?.to || 'Destination'}
                          </span>
                          <span><FaCalendarAlt style={{ color: '#078930', marginRight: 3 }} />{sch.date}</span>
                          <span><FaClock style={{ color: '#078930', marginRight: 3 }} />{sch.departureTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats + Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>{booked}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>RESERVED</div>
                        </div>
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>{available}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>AVAILABLE</div>
                        </div>
                        <div style={{ width: 1, background: '#e2e8f0' }} />
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#334155', lineHeight: 1 }}>{cap}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>TOTAL</div>
                        </div>
                      </div>

                      {/* Action buttons (View Layout + Delete / Remove) */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setViewSchedule(sch)}
                          style={{
                            padding: '8px 16px', background: '#0f172a', color: '#fff',
                            border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.82rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <FaEye /> View Layout
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sch._id)}
                          style={{
                            padding: '8px 12px', background: '#fff', color: '#dc2626',
                            border: '1.5px solid #fecaca', borderRadius: 8, fontWeight: 800, fontSize: '0.82rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          <FaTrash /> Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>
                      <span>0%</span>
                      <span style={{ fontWeight: 700, color: barColor }}>{pct}% Occupied</span>
                      <span>100%</span>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: pct + '%',
                        background: barColor, borderRadius: 4, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seat Layout View Modal */}
      {viewSchedule && (
        <SeatLayoutModal
          schedule={viewSchedule}
          onClose={() => setViewSchedule(null)}
        />
      )}
    </div>
  );
};

export default SeatAvailability;
