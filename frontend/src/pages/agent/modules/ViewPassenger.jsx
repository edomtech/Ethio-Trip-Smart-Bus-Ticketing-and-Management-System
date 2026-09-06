import React, { useState, useEffect } from 'react';
import {
  FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaClock,
  FaBus, FaCouch, FaCreditCard, FaTicketAlt, FaTimes, FaPrint, FaQrcode,
  FaCheckCircle, FaExclamationTriangle, FaSearch, FaSync, FaEye, FaUsers
} from 'react-icons/fa';
import { bookingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import TicketModal from '../../../components/TicketModal';

const ViewPassenger = () => {
  const { user } = useAuth();
  const companyId = user?.companyId?._id || user?.companyId;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected booking for full details modal
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Selected booking for QR Ticket Modal
  const [ticketModalBooking, setTicketModalBooking] = useState(null);

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const data = await bookingAPI.getAll();
      const list = Array.isArray(data) ? data : (data?.bookings || []);
      // Filter by agent company
      const companyBookings = companyId
        ? list.filter(b => {
            const bCompId = b.companyId?._id || b.companyId || b.schedule?.companyId?._id || b.schedule?.companyId;
            return String(bCompId) === String(companyId);
          })
        : list;

      setBookings(companyBookings);
    } catch (err) {
      toast.error('Failed to load passenger list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, [companyId]);

  // Filtered list
  const filtered = bookings.filter(b => {
    if (searchDate && b.schedule?.date !== searchDate) return false;

    const q = filterQuery.toLowerCase().trim();
    const nameMatch = (b.passenger?.name || '').toLowerCase().includes(q);
    const phoneMatch = (b.passenger?.phone || '').includes(q);
    const ticketMatch = (b.ticketNumber || '').toLowerCase().includes(q);
    const routeMatch = `${b.schedule?.route?.from || ''} ${b.schedule?.route?.to || ''}`.toLowerCase().includes(q);
    const matchesQuery = !q || nameMatch || phoneMatch || ticketMatch || routeMatch;

    if (statusFilter === 'ALL') return matchesQuery;
    if (statusFilter === 'PAID') return matchesQuery && (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed');
    if (statusFilter === 'PENDING') return matchesQuery && (b.paymentStatus === 'PENDING' || b.paymentStatus === 'pending');
    if (statusFilter === 'CANCELLED') return matchesQuery && (b.status === 'CANCELLED' || b.status === 'cancelled');
    return matchesQuery;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
        borderRadius: 16, padding: '22px 26px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaUsers /> Passenger Directory
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
            View all registered passenger bookings, travel schedules, assigned seats, and payment details.
          </p>
        </div>
        <button
          onClick={fetchPassengers}
          disabled={loading}
          style={{
            padding: '8px 16px', background: 'rgba(255,255,255,0.15)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, fontWeight: 700,
            fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <FaSync className={loading ? 'fa-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* ── Controls Bar ── */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '7px 12px', minWidth: 240, flex: 1, maxWidth: 360 }}>
          <FaSearch style={{ color: '#94a3b8', fontSize: '0.85rem' }} />
          <input
            type="text"
            placeholder="Search by passenger, phone, ticket..."
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.86rem', width: '100%', color: '#0f172a' }}
          />
          {filterQuery && (
            <button onClick={() => setFilterQuery('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <FaTimes />
            </button>
          )}
        </div>

        {/* Date Filter Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 8, padding: '7px 12px' }}>
          <FaCalendarAlt style={{ color: '#078930', fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Date:</span>
          <input
            type="date"
            title="Filter by travel date"
            value={searchDate}
            onChange={e => setSearchDate(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}
          />
          {searchDate && (
            <button onClick={() => setSearchDate('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <FaTimes />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          {[
            { id: 'ALL', label: `All (${bookings.length})` },
            { id: 'PAID', label: 'Paid / Confirmed' },
            { id: 'PENDING', label: 'Pending Hold' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none',
                background: statusFilter === t.id ? '#fff' : 'transparent',
                color: statusFilter === t.id ? '#078930' : '#64748b',
                fontWeight: statusFilter === t.id ? 800 : 600,
                fontSize: '0.78rem', cursor: 'pointer',
                boxShadow: statusFilter === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Passenger List Table ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <FaSync className="fa-spin" style={{ fontSize: '2rem', color: '#078930', marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Loading passenger directory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <FaUsers style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 4px', color: '#334155' }}>No Passengers Found</h4>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>
              {filterQuery ? 'No records match your search query.' : 'No passenger bookings registered yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 18px' }}>Passenger</th>
                  <th style={{ padding: '12px 18px' }}>Phone Number</th>
                  <th style={{ padding: '12px 18px' }}>Route & Date</th>
                  <th style={{ padding: '12px 18px' }}>Seat(s)</th>
                  <th style={{ padding: '12px 18px' }}>Ticket No</th>
                  <th style={{ padding: '12px 18px' }}>Fare & Payment</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, idx) => {
                  const isPaid = (b.paymentStatus === 'PAID' || b.paymentStatus === 'completed');
                  const isCancelled = (b.status === 'CANCELLED' || b.status === 'cancelled');
                  const seatsList = Array.isArray(b.selectedSeats) ? b.selectedSeats : [b.selectedSeats];

                  return (
                    <tr
                      key={b._id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* Passenger Name & Email */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: '#e0f2fe', color: '#0284c7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 900, fontSize: '0.85rem', flexShrink: 0
                          }}>
                            {(b.passenger?.name || 'P')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.passenger?.name || 'Passenger'}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{b.passenger?.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 18px', fontWeight: 600, color: '#334155' }}>
                        {b.passenger?.phone || '—'}
                      </td>

                      {/* Route & Date */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {b.schedule?.route?.from || 'Origin'} ➔ {b.schedule?.route?.to || 'Destination'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span>{b.schedule?.date || '—'}</span>
                          <span>•</span>
                          <span>{b.schedule?.departureTime || '—'}</span>
                          {b.tripType === 'round' && (
                            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>
                              Round-Trip
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Seats */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {seatsList.map(s => (
                            <span key={s} style={{ background: '#dcfce7', color: '#166534', padding: '2px 7px', borderRadius: 5, fontWeight: 800, fontSize: '0.76rem' }}>
                              Seat {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Ticket No */}
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 800, color: '#078930' }}>
                        {b.ticketNumber || '—'}
                      </td>

                      {/* Fare & Payment */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>ETB {b.totalPrice || b.baseFare || 0}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{b.paymentMethod || 'Cash'}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        {isCancelled ? (
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>
                            Cancelled
                          </span>
                        ) : isPaid ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>
                            ✓ Paid & Active
                          </span>
                        ) : (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>
                            Pending (5h)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedBooking(b)}
                          style={{
                            padding: '6px 14px', background: '#0f172a', color: '#fff',
                            border: 'none', borderRadius: 7, fontWeight: 700,
                            fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex',
                            alignItems: 'center', gap: 5
                          }}
                        >
                          <FaEye /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PASSENGER FULL DETAILS MODAL ── */}
      {selectedBooking && (
        <div
          onClick={() => setSelectedBooking(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
              maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)', border: '1px solid #e2e8f0'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b, #065f46)',
              padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', color: '#fff', flexShrink: 0
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800, letterSpacing: 1 }}>
                  PASSENGER REGISTRATION & BOOKING PROFILE
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
                  {selectedBooking.passenger?.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                  Ticket No: <strong>{selectedBooking.ticketNumber}</strong>
                </div>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                  borderRadius: 8, width: 32, height: 32, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* 1. Registration & Contact Details */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaUser style={{ color: '#078930' }} /> Passenger Information (At Registration / Booking)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>FULL NAME</span>
                    <strong style={{ color: '#0f172a' }}>{selectedBooking.passenger?.name || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>PHONE NUMBER</span>
                    <strong style={{ color: '#0f172a' }}>{selectedBooking.passenger?.phone || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>EMAIL ADDRESS</span>
                    <strong style={{ color: '#0f172a' }}>{selectedBooking.passenger?.email || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>GENDER / AGE</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedBooking.passenger?.gender || 'Male'} {selectedBooking.passenger?.age ? `· ${selectedBooking.passenger.age} yrs` : ''}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. Schedule & Bus Trip Information */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaBus style={{ color: '#078930' }} /> Schedule & Trip Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>JOURNEY ROUTE</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedBooking.schedule?.route?.from || 'Origin'} ➔ {selectedBooking.schedule?.route?.to || 'Destination'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>TRAVEL DATE & TIME</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedBooking.schedule?.date} · {selectedBooking.schedule?.departureTime}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>BUS FLEET / OPERATOR</span>
                    <strong style={{ color: '#0f172a' }}>
                      Bus {selectedBooking.schedule?.bus?.busNumber || 'EB-101'} ({selectedBooking.schedule?.bus?.type || 'Luxury'}) · {selectedBooking.companyId?.companyName || 'Ethio Trip'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>ASSIGNED SEATS</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {(Array.isArray(selectedBooking.selectedSeats) ? selectedBooking.selectedSeats : [selectedBooking.selectedSeats]).map(s => (
                        <span key={s} style={{ background: '#22c55e', color: '#fff', padding: '1px 7px', borderRadius: 4, fontWeight: 900, fontSize: '0.78rem' }}>
                          Seat {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>PICKUP STATION</span>
                    <span style={{ color: '#334155' }}>
                      {selectedBooking.schedule?.pickupStation || selectedBooking.schedule?.route?.pickupStation || 'Main Terminal'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>DROPOFF STATION</span>
                    <span style={{ color: '#334155' }}>
                      {selectedBooking.schedule?.dropoffStation || selectedBooking.schedule?.route?.dropoffStation || 'Arrival Terminal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Fare, Discounts & Payment Status */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaCreditCard style={{ color: '#078930' }} /> Fare, Discount & Payment Settlement
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>TOTAL FARE PAID</span>
                    <strong style={{ color: '#166534', fontSize: '1.05rem' }}>ETB {selectedBooking.totalPrice || selectedBooking.baseFare || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>PAYMENT STATUS</span>
                    <strong style={{ color: selectedBooking.paymentStatus === 'PAID' ? '#16a34a' : '#b45309' }}>
                      {selectedBooking.paymentStatus || 'PAID'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>PAYMENT METHOD</span>
                    <strong style={{ color: '#0f172a' }}>{selectedBooking.paymentMethod || 'Cash'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>BOOKING CHANNEL / TRIP TYPE</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedBooking.bookingChannel || 'Walk-In'} ({selectedBooking.tripType === 'round' ? 'Round-Trip' : 'One-Way'})
                    </strong>
                  </div>
                  {selectedBooking.discountAmount > 0 && (
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, display: 'block' }}>DISCOUNT APPLIED</span>
                      <strong style={{ color: '#16a34a' }}>
                        - ETB {selectedBooking.discountAmount} ({selectedBooking.discountCode || 'PROMO'})
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {(() => {
                  const isPaid = (selectedBooking.paymentStatus === 'PAID' || selectedBooking.paymentStatus === 'completed' || selectedBooking.status === 'CONFIRMED' || selectedBooking.status === 'confirmed');
                  const isCancelled = (selectedBooking.status === 'CANCELLED' || selectedBooking.status === 'cancelled' || selectedBooking.paymentStatus === 'FAILED');
                  const canViewTicket = isPaid && !isCancelled;

                  if (canViewTicket) {
                    return (
                      <button
                        type="button"
                        onClick={() => setTicketModalBooking(selectedBooking)}
                        style={{
                          padding: '10px 20px', background: '#078930', color: '#fff',
                          border: 'none', borderRadius: 9, fontWeight: 800, fontSize: '0.85rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                          boxShadow: '0 2px 8px rgba(7,137,48,0.25)'
                        }}
                      >
                        <FaQrcode /> View Ticket & QR Code
                      </button>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.78rem', color: isCancelled ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                        {isCancelled ? '✕ Booking Cancelled — Ticket Inactive' : '⏳ Payment Pending — Ticket Inactive'}
                      </span>
                      <button
                        type="button"
                        disabled
                        style={{
                          padding: '10px 16px', background: '#f1f5f9', color: '#94a3b8',
                          border: '1px solid #cbd5e1', borderRadius: 9, fontWeight: 700,
                          fontSize: '0.82rem', cursor: 'not-allowed', display: 'flex',
                          alignItems: 'center', gap: 6
                        }}
                      >
                        <FaQrcode /> Ticket Unavailable
                      </button>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '10px 18px', background: '#fff', color: '#334155',
                    border: '1.5px solid #cbd5e1', borderRadius: 9, fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 6
                  }}
                >
                  <FaPrint /> Print Summary
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── QR TICKET MODAL ── */}
      {ticketModalBooking && (
        <TicketModal
          booking={ticketModalBooking}
          onClose={() => setTicketModalBooking(null)}
        />
      )}
    </div>
  );
};

export default ViewPassenger;
