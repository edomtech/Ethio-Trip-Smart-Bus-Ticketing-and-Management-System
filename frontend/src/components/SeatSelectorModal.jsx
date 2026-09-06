import React, { useState, useEffect } from 'react';
import {
  FaTimes, FaBus, FaShieldAlt, FaArrowRight, FaArrowLeft, FaPhone,
  FaCheck, FaCouch, FaChevronRight, FaEdit, FaUser, FaEnvelope, FaIdCard, FaCreditCard
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bookingAPI, scheduleAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

// Map bus type / operator to high-quality coach bus image
const BUS_IMAGES = {
  VIP: '/images/bus_selam_vip.jpg',
  Luxury: '/images/bus_selam_luxury.jpg',
  Executive: '/images/bus_abay_standard.jpg',
  Standard: '/images/bus_habesha_luxury.jpg',
  default: '/images/hero_bus_clean.jpg',
};

// Exact 45-Seat Bus Layout matching the reference screenshot
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

const SeatSelectorModal = ({
  schedule,
  onClose,
  onBookingComplete,
  onConfirmBooking,
  onSeatsSelectedOnly, // Optional callback for multi-step round trip
  requiredSeatsCount,
  titlePrefix = '',
  isAgentBooking = false,
  onAgentBookingComplete,
  prefilledPassenger = null,
}) => {
  const { user } = useAuth();
  const [modalStep, setModalStep] = useState('seats'); // 'seats' | 'passenger_info'
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Passenger Information State
  const [passengerForm, setPassengerForm] = useState({
    fullName: isAgentBooking ? (prefilledPassenger?.fullName || '') : (user?.name || ''),
    phone: isAgentBooking ? (prefilledPassenger?.phone || '') : (user?.phone || ''),
    email: isAgentBooking ? (prefilledPassenger?.email || '') : (user?.email || ''),
    gender: isAgentBooking ? (prefilledPassenger?.gender || 'Male') : 'Male',
    age: isAgentBooking ? (prefilledPassenger?.age || '') : '',
    emergencyContact: '',
    notes: '',
    bookingChannel: 'walk_in', // 'walk_in' | 'phone_call'
    paymentStatus: 'PAID', // 'PAID' | 'PENDING'
    paymentMethod: 'Cash', // 'Cash' | 'CBE Birr' | 'Telebirr' | 'Online Banking'
  });

  // Per-passenger detail list if multiple seats selected
  const [passengersList, setPassengersList] = useState([]);

  useEffect(() => {
    if (isAgentBooking && prefilledPassenger) {
      setPassengerForm(prev => ({
        ...prev,
        fullName: prefilledPassenger.fullName || prev.fullName,
        phone: prefilledPassenger.phone || prev.phone,
        email: prefilledPassenger.email || prev.email,
        gender: prefilledPassenger.gender || prev.gender,
        age: prefilledPassenger.age || prev.age,
      }));
    } else if (user && !isAgentBooking) {
      setPassengerForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user, isAgentBooking, prefilledPassenger]);

  // Sync passengersList when selectedSeats change
  useEffect(() => {
    setPassengersList(
      selectedSeats.map((seatNum, idx) => ({
        seatNumber: String(seatNum),
        name: idx === 0 ? (passengerForm.fullName || (!isAgentBooking ? user?.name : '') || '') : '',
        gender: 'Male',
        age: '',
      }))
    );
  }, [selectedSeats, isAgentBooking]);

  const isRoundTrip  = schedule?.tripType === 'round';
  const basePrice    = schedule?.price || 600;
  const singleLegFare = basePrice * (selectedSeats.length || 1);
  const grossSubtotal = isRoundTrip ? singleLegFare * 2 : singleLegFare;
  const roundTripDiscount = isRoundTrip ? Math.round(grossSubtotal * 0.10) : 0; // 10% round-trip discount
  const totalPayable = grossSubtotal - roundTripDiscount;
  const pricePerSeat = isRoundTrip ? basePrice * 2 : basePrice;
  const routeFrom    = schedule?.route?.from || 'Addis Ababa';
  const routeTo      = schedule?.route?.to   || 'Bahir Dar';
  const fromStation  = schedule?.pickupStation || schedule?.route?.pickupStation || 'Mekelle Square';
  const toStation    = schedule?.dropoffStation || schedule?.route?.dropoffStation || 'Main Station';
  const travelDate   = schedule?.date || 'May 24, 2025';
  const travelTime   = schedule?.departureTime || '08:00 AM';
  const arrivalTime  = schedule?.arrivalTime || '02:30 PM';
  const operatorName = schedule?.companyId?.companyName || schedule?.company?.companyName || schedule?.companyName || 'Ethio Express';
  const busType      = schedule?.bus?.type || 'Luxury';
  const busImage     = schedule?.bus?.image || schedule?.image || BUS_IMAGES[busType] || BUS_IMAGES.default;
  const contactPhone = schedule?.companyId?.phone || schedule?.companyPhone || '090 121 1211';

  // Load live booked seats and reset selections on schedule change
  useEffect(() => {
    setSelectedSeats([]);
    setModalStep('seats');
    const fetchLatestSchedule = async () => {
      if (schedule?._id) {
        try {
          const fresh = await scheduleAPI.getById(schedule._id);
          const rawSeats = fresh?.bookedSeats || schedule?.bookedSeats || [];
          setBookedSeats(rawSeats.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
        } catch {
          const rawSeats = schedule?.bookedSeats || [];
          setBookedSeats(rawSeats.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
        }
      } else if (schedule?.bookedSeats) {
        setBookedSeats(schedule.bookedSeats.map(s => Number(String(s).replace(/\D/g, ''))).filter(n => !isNaN(n) && n > 0));
      } else {
        setBookedSeats([]);
      }
    };
    fetchLatestSchedule();
  }, [schedule?._id, schedule]);

  if (!schedule) return null;

  const toggleSeat = (seatNum) => {
    if (bookedSeats.includes(seatNum) || bookedSeats.includes(String(seatNum))) {
      toast.warning(`Seat ${seatNum} is already reserved`);
      return;
    }
    const maxAllowed = Number(requiredSeatsCount || schedule?.requiredSeatsCount) || 1;
    setSelectedSeats(prev => {
      if (prev.includes(seatNum)) {
        return prev.filter(s => s !== seatNum);
      }
      if (prev.length >= maxAllowed) {
        if (maxAllowed === 1) {
          // If limit is 1, replace previous seat with the newly selected seat
          return [seatNum];
        } else {
          toast.info(`You have chosen ${maxAllowed} passenger(s). You can only select up to ${maxAllowed} seat(s).`);
          return prev;
        }
      }
      return [...prev, seatNum];
    });
  };

  const handleContinueToPassengerInfo = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }
    if (requiredSeatsCount && selectedSeats.length < requiredSeatsCount) {
      toast.warning(`Please select ${requiredSeatsCount} seats for your passengers`);
      return;
    }

    if (onSeatsSelectedOnly) {
      onSeatsSelectedOnly(selectedSeats, schedule);
      return;
    }

    setModalStep('passenger_info');
  };

  const handleCreateBookingAndPay = async (e) => {
    if (e) e.preventDefault();

    const resolvedName = (passengerForm.fullName || '').trim() || user?.name || '';
    const resolvedPhone = (passengerForm.phone || '').trim() || user?.phone || '';
    const resolvedEmail = (passengerForm.email || '').trim() || user?.email || '';

    if (!resolvedName?.trim()) {
      toast.error('Passenger name is required.');
      return;
    }
    if (!resolvedPhone?.trim()) {
      toast.error('Passenger phone number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentSeatsCount = selectedSeats.length || 1;
      const currentGross = isRoundTrip ? (basePrice * 2 * currentSeatsCount) : (basePrice * currentSeatsCount);
      const currentDiscount = isRoundTrip ? Math.round(currentGross * 0.10) : 0;
      const currentFinalTotal = currentGross - currentDiscount;

      const payload = {
        scheduleId: schedule._id,
        selectedSeats: selectedSeats.map(String),
        tripType: schedule.tripType || (isRoundTrip ? 'round' : 'oneway'),
        returnScheduleId: schedule.returnScheduleId || undefined,
        returnSeats: schedule.returnSeats || undefined,
        paymentStatus: isAgentBooking ? (passengerForm.paymentStatus || 'PAID') : undefined,
        paymentMethod: isAgentBooking ? (passengerForm.paymentMethod || 'Cash') : undefined,
        bookingChannel: isAgentBooking ? passengerForm.bookingChannel : undefined,
        discountAmount: currentDiscount,
        discountCode: isRoundTrip ? 'ROUNDTRIP10' : undefined,
        totalPrice: currentFinalTotal,
        passengerDetails: {
          name: resolvedName.trim(),
          phone: resolvedPhone.trim(),
          email: resolvedEmail?.trim() || `${resolvedPhone.trim().replace(/\D/g, '')}@ethiotrip.com`,
          gender: passengerForm.gender,
          age: passengerForm.age,
          passengers: passengersList.map((p, i) => ({
            seatNumber: p.seatNumber,
            name: p.name || (i === 0 ? resolvedName.trim() : `Passenger ${i + 1}`),
            gender: p.gender || 'Male',
            age: p.age || undefined,
          })),
        },
      };

      const res = await bookingAPI.create(payload);
      const booking = res.booking || res;

      if (isAgentBooking) {
        toast.success(`Ticket successfully issued for ${resolvedName}!`);
        if (onAgentBookingComplete) {
          onAgentBookingComplete(booking, res.tickets || []);
        }
      } else {
        toast.success('Seats reserved! Please complete your payment.');
      }

      if (onConfirmBooking) onConfirmBooking(booking);
      if (onBookingComplete) onBookingComplete(booking);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Booking failed. Seat may already be reserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const SeatBtn = ({ num }) => {
    const isBooked   = bookedSeats.includes(num) || bookedSeats.includes(String(num));
    const isSelected = selectedSeats.includes(num);

    let bg = '#ffffff';
    let border = '#d1d5db';
    let color = '#1e293b';

    if (isBooked) {
      bg = '#cbd5e1';
      border = '#94a3b8';
      color = '#64748b';
    } else if (isSelected) {
      bg = '#22c55e';
      border = '#16a34a';
      color = '#ffffff';
    }

    return (
      <button
        type="button"
        onClick={() => toggleSeat(num)}
        disabled={isBooked}
        title={isBooked ? `Seat ${num} – Occupied` : isSelected ? `Seat ${num} – Selected` : `Seat ${num} – Available`}
        style={{
          width: 38,
          height: 34,
          borderRadius: 8,
          border: `1.5px solid ${border}`,
          background: bg,
          color,
          fontWeight: 800,
          fontSize: '0.82rem',
          cursor: isBooked ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isSelected ? '0 4px 12px rgba(34,197,94,0.35)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        {num}
      </button>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: 1040,
          maxHeight: '94vh',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* ── TOP HEADER (ETHIO TRIP Branding + Operator + Stepper + Support) ── */}
        <div
          style={{
            padding: '18px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Platform Branding: ETHIO TRIP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e40af', letterSpacing: '-0.5px' }}>
                ETHIO<span style={{ color: '#059669' }}>TRIP</span>
              </span>
              <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.65rem', fontWeight: 900, padding: '2px 6px', borderRadius: 4, marginLeft: 3 }}>
                .ET
              </span>
            </div>

            {/* Selected Bus Company Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#1e40af',
              }}
            >
              <FaBus style={{ color: '#2563eb' }} />
              <span>{titlePrefix ? `${titlePrefix}: ${operatorName}` : operatorName}</span>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(isAgentBooking ? [
              { n: 1, lbl: 'Schedules', state: 'done' },
              { n: 2, lbl: 'Seat Selection', state: modalStep === 'seats' ? 'active' : 'done' },
              { n: 3, lbl: 'Passenger & Payment', state: modalStep === 'passenger_info' ? 'active' : 'next' },
            ] : [
              { n: 1, lbl: 'Search', state: 'done' },
              { n: 2, lbl: 'Trips', state: 'done' },
              { n: 3, lbl: 'Seat Selection', state: modalStep === 'seats' ? 'active' : 'done' },
              { n: 4, lbl: 'Passenger Info', state: modalStep === 'passenger_info' ? 'active' : 'next' },
              { n: 5, lbl: 'Payment', state: 'next' },
            ]).map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: s.state === 'active' ? (isAgentBooking ? '#078930' : '#2563eb') : s.state === 'done' ? '#22c55e' : '#ffffff',
                      color: s.state === 'next' ? '#94a3b8' : '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: s.state === 'next' ? '1.5px solid #cbd5e1' : 'none',
                    }}
                  >
                    {s.state === 'done' ? <FaCheck style={{ fontSize: '0.6rem' }} /> : s.n}
                  </div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: s.state === 'active' ? 800 : 600,
                      color: s.state === 'active' ? (isAgentBooking ? '#078930' : '#2563eb') : s.state === 'done' ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    {s.lbl}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 14, height: 1.5, background: s.state === 'done' ? '#22c55e' : '#e2e8f0' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Support Phone & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              Need help? <strong style={{ color: '#0f172a', fontWeight: 800 }}><FaPhone style={{ color: '#0f172a', fontSize: '0.75rem' }} /> {contactPhone}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                width: 28,
                height: 28,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
              }}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* ── TRIP DETAILS BANNER ── */}
        <div style={{ padding: '18px 28px 0' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '16px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            {/* Bus Photo + Departure & Arrival Stations */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <img
                src={busImage}
                alt={`${operatorName} Bus`}
                style={{
                  width: 108,
                  height: 64,
                  objectFit: 'cover',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                }}
                onError={(e) => { e.target.src = BUS_IMAGES.default; }}
              />

              {/* Origin */}
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>{routeFrom}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>{fromStation}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{travelTime}</div>
              </div>

              <div style={{ fontSize: '1.2rem', color: '#94a3b8', padding: '0 8px' }}>
                <FaChevronRight style={{ fontSize: '0.9rem' }} />
              </div>

              {/* Destination */}
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>{routeTo}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>{toStation}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginTop: 3 }}>{arrivalTime}</div>
              </div>
            </div>

            {/* Date, Bus Company, Seat Count, and Change Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Date</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{travelDate}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Bus</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{operatorName}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Total Seats</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>45</div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  color: '#2563eb',
                  border: '1.5px solid #2563eb',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FaEdit /> Change Trip
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 3: SEAT SELECTION VIEW
            ══════════════════════════════════════════════════════════════════════ */}
        {modalStep === 'seats' && (
          <div
            style={{
              padding: '22px 28px',
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* ── LEFT COLUMN: BUS CHASSIS SEAT MAP ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px',
              }}
            >
              {/* Legend (Selected, Available, Occupied) */}
              <div
                style={{
                  display: 'flex',
                  gap: 22,
                  marginBottom: 20,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                {[
                  { bg: '#22c55e', border: '#16a34a', label: 'Selected' },
                  { bg: '#ffffff', border: '#cbd5e1', label: 'Available' },
                  { bg: '#cbd5e1', border: '#94a3b8', label: 'Occupied' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                    <div style={{ width: 15, height: 15, background: l.bg, border: `1.5px solid ${l.border}`, borderRadius: 3 }} />
                    {l.label}
                  </div>
                ))}
              </div>

              {/* Bus Graphic Chassis */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    border: '2.5px solid #2563eb',
                    borderRadius: '38px 38px 24px 24px',
                    background: '#ffffff',
                    boxShadow: '0 10px 25px rgba(37,99,235,0.08)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Windshield / FRONT */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderBottom: '2px solid #e2e8f0',
                      padding: '8px 12px',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      letterSpacing: '3px',
                      color: '#475569',
                    }}
                  >
                    FRONT
                  </div>

                  {/* Seat Grid with Center Dark Rubber Aisle */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                      padding: '12px 14px',
                      background: '#ffffff',
                    }}
                  >
                    {ROWS.map(row => (
                      <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Left seats */}
                        <div style={{ display: 'flex', gap: 6, minWidth: 82 }}>
                          {row.left.map(n => (
                            <SeatBtn key={n} num={n} />
                          ))}
                        </div>

                        {/* Dark Rubber Aisle */}
                        <div
                          style={{
                            flex: 1,
                            margin: '0 8px',
                            height: 34,
                            background: '#334155',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        />

                        {/* Right seats */}
                        <div style={{ display: 'flex', gap: 6, minWidth: 82, justifyContent: 'flex-end' }}>
                          {row.right.map(n => (
                            <SeatBtn key={n} num={n} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BACK */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderTop: '2px solid #e2e8f0',
                      padding: '8px 12px',
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      letterSpacing: '3px',
                      color: '#475569',
                    }}
                  >
                    BACK
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: SUMMARY CARD ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: '#2563eb', fontSize: '1.2rem' }}>
                  <FaCouch />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Your Selected Seats
                </h3>
              </div>

              {/* Selected Seats Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minHeight: 34 }}>
                {selectedSeats.length > 0 ? (
                  selectedSeats
                    .sort((a, b) => a - b)
                    .map(s => (
                      <span
                        key={s}
                        onClick={() => toggleSeat(s)}
                        style={{
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        title="Click to deselect"
                      >
                        {s} <span style={{ fontWeight: 900, fontSize: '0.8rem', color: '#16a34a' }}>×</span>
                      </span>
                    ))
                ) : (
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Click available seats on the bus map to select
                  </span>
                )}
              </div>

              {/* Breakdown */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, fontSize: '0.88rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Seat(s)</span>
                  <strong style={{ color: '#0f172a' }}>{selectedSeats.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ticket Price (per seat)</span>
                  <strong style={{ color: '#0f172a' }}>ETB {pricePerSeat.toLocaleString()}</strong>
                </div>
              </div>

              {/* Total Amount */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Total Amount</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
                  ETB {(pricePerSeat * selectedSeats.length).toFixed(2)}
                </span>
              </div>

              {/* Secure Booking Notice Box */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #e0f2fe',
                  borderRadius: 12,
                  padding: '14px 16px',
                  fontSize: '0.8rem',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <FaShieldAlt style={{ fontSize: '1.3rem', flexShrink: 0, color: '#0284c7', marginTop: 2 }} />
                <div>
                  <strong style={{ color: '#0c4a6e', fontSize: '0.84rem' }}>Secure Booking</strong>
                  <div style={{ color: '#0369a1', marginTop: 2, fontSize: '0.78rem', lineHeight: 1.4 }}>
                    Your payment information is safe and encrypted.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleContinueToPassengerInfo}
                  disabled={selectedSeats.length === 0}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedSeats.length > 0 ? '#1d4ed8' : '#93c5fd',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: selectedSeats.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: selectedSeats.length > 0 ? '0 4px 12px rgba(29,78,216,0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Continue to Passenger Info</span> <FaArrowRight />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <FaArrowLeft /> Back to Trip Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            STEP 4: PASSENGER INFO VIEW
            ══════════════════════════════════════════════════════════════════════ */}
        {modalStep === 'passenger_info' && (
          <div
            style={{
              padding: '22px 28px',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* ── LEFT COLUMN: PASSENGER PERSONAL INFO & PAYMENT SETUP FORM ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: isAgentBooking ? '#ecfdf5' : '#eff6ff', color: isAgentBooking ? '#078930' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <FaUser />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    {isAgentBooking ? 'Agent Counter & Passenger Booking Details' : 'Passenger Contact & Details'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {isAgentBooking ? 'Enter passenger contact info, booking channel, and configure payment status' : 'Please enter accurate personal information for ticketing and verification'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateBookingAndPay} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isAgentBooking ? (
                  /* Agent Booking Channel Selector */
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Booking Channel / Source <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setPassengerForm({ ...passengerForm, bookingChannel: 'walk_in' })}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${passengerForm.bookingChannel === 'walk_in' ? '#078930' : '#cbd5e1'}`,
                          background: passengerForm.bookingChannel === 'walk_in' ? '#f0fdf4' : '#ffffff',
                          color: passengerForm.bookingChannel === 'walk_in' ? '#078930' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        🚶 Walk-In (Terminal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassengerForm({ ...passengerForm, bookingChannel: 'phone_call' })}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${passengerForm.bookingChannel === 'phone_call' ? '#078930' : '#cbd5e1'}`,
                          background: passengerForm.bookingChannel === 'phone_call' ? '#f0fdf4' : '#ffffff',
                          color: passengerForm.bookingChannel === 'phone_call' ? '#078930' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        📞 Phone Call Booking
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Passenger Full Name <span style={{ color: '#ef4444' }}>*</span>
                    <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>Editable</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FaUser style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', fontSize: '0.85rem' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abebe Kebede"
                      value={passengerForm.fullName}
                      onChange={e => setPassengerForm({ ...passengerForm, fullName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 36px',
                        borderRadius: 8,
                        border: '1.5px solid #86efac',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#ffffff',
                        color: '#0f172a',
                        cursor: 'text',
                      }}
                    />
                  </div>
                </div>

                {/* Phone & Email Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Phone <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <FaPhone style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', fontSize: '0.85rem' }} />
                      <input
                        type="tel"
                        required
                        placeholder="0911234567"
                        value={passengerForm.phone}
                        onChange={e => setPassengerForm({ ...passengerForm, phone: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '11px 12px 11px 36px',
                          borderRadius: 8,
                          border: '1.5px solid #86efac',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#ffffff',
                          color: '#0f172a',
                          cursor: 'text',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Email {isAgentBooking ? '(Optional)' : ''}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <FaEnvelope style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8', fontSize: '0.85rem' }} />
                      <input
                        type="email"
                        placeholder="passenger@example.com"
                        value={passengerForm.email}
                        onChange={e => setPassengerForm({ ...passengerForm, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '11px 12px 11px 36px',
                          borderRadius: 8,
                          border: '1.5px solid #86efac',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          background: '#ffffff',
                          color: '#0f172a',
                          cursor: 'text',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Gender & Age Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Gender
                    </label>
                    <select
                      value={passengerForm.gender}
                      onChange={e => setPassengerForm({ ...passengerForm, gender: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #86efac',
                        fontSize: '0.9rem',
                        outline: 'none',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Age (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="e.g. 28"
                      value={passengerForm.age}
                      onChange={e => setPassengerForm({ ...passengerForm, age: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #86efac',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Agent Payment Status & Method Setup */}
                {isAgentBooking && (
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FaCreditCard style={{ color: '#078930' }} /> Agent Payment Status Setup
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Payment Status *
                        </label>
                        <select
                          value={passengerForm.paymentStatus}
                          onChange={e => setPassengerForm({ ...passengerForm, paymentStatus: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: passengerForm.paymentStatus === 'PAID' ? '#166534' : '#b45309',
                            background: passengerForm.paymentStatus === 'PAID' ? '#f0fdf4' : '#fefce8',
                            outline: 'none',
                          }}
                        >
                          <option value="PAID">Paid / Completed (Confirmed)</option>
                          <option value="PENDING">Pending / Reserved (5h Hold)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Payment Method *
                        </label>
                        <select
                          value={passengerForm.paymentMethod}
                          onChange={e => setPassengerForm({ ...passengerForm, paymentMethod: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 8,
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.85rem',
                            outline: 'none',
                            background: '#ffffff',
                          }}
                        >
                          <option value="Cash">Cash (Counter)</option>
                          <option value="CBE Birr">CBE Birr</option>
                          <option value="Telebirr">Telebirr</option>
                          <option value="Online Banking">Online Banking / Direct Transfer</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multi-Passenger Cards if > 1 seat */}
                {selectedSeats.length > 1 && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                      Passenger Names for Assigned Seats:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {passengersList.map((p, idx) => (
                        <div
                          key={p.seatNumber}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span style={{ background: '#22c55e', color: '#fff', padding: '4px 8px', borderRadius: 6, fontWeight: 900, fontSize: '0.78rem' }}>
                            Seat {p.seatNumber}
                          </span>
                          <input
                            type="text"
                            placeholder={`Passenger ${idx + 1} Name`}
                            value={p.name}
                            onChange={e => {
                              const updated = [...passengersList];
                              updated[idx].name = e.target.value;
                              setPassengersList(updated);
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              fontSize: '0.85rem',
                              outline: 'none',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* ── RIGHT COLUMN: SUMMARY & ISSUE ACTION ── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '24px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: isAgentBooking ? '#078930' : '#2563eb', fontSize: '1.2rem' }}>
                  <FaCreditCard />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAgentBooking ? 'Counter Booking Summary' : 'Booking Summary'}
                </h3>
              </div>

              {/* Selected Seats Chips */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>ASSIGNED SEATS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedSeats.sort((a, b) => a - b).map(s => (
                    <span key={s} style={{ background: '#22c55e', color: '#fff', padding: '3px 8px', borderRadius: 6, fontWeight: 900, fontSize: '0.8rem' }}>
                      Seat {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, fontSize: '0.88rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bus Operator</span>
                  <strong style={{ color: '#0f172a' }}>{operatorName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Seat(s) Count</span>
                  <strong style={{ color: '#0f172a' }}>{selectedSeats.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Single Leg Fare</span>
                  <strong style={{ color: '#0f172a' }}>ETB {basePrice.toLocaleString()} / seat</strong>
                </div>
                {isRoundTrip && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Round-Trip Fare (2 Legs)</span>
                      <strong style={{ color: '#0f172a' }}>ETB {(basePrice * 2).toLocaleString()} / seat</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gross Subtotal</span>
                      <strong style={{ color: '#0f172a' }}>ETB {grossSubtotal.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <span>Round-Trip Saver (10% OFF)</span>
                      <strong style={{ color: '#16a34a' }}>- ETB {roundTripDiscount.toLocaleString()}</strong>
                    </div>
                  </>
                )}
                {isAgentBooking && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Payment Method</span>
                    <strong style={{ color: '#078930' }}>{passengerForm.paymentMethod}</strong>
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>Total Fare</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: isAgentBooking ? '#078930' : '#1d4ed8' }}>
                  ETB {totalPayable.toFixed(2)}
                </span>
              </div>

              {/* Notice Box */}
              <div
                style={{
                  background: isAgentBooking ? '#f0fdf4' : '#f0f9ff',
                  border: `1px solid ${isAgentBooking ? '#bbf7d0' : '#e0f2fe'}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.78rem',
                  color: isAgentBooking ? '#166534' : '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <FaShieldAlt style={{ fontSize: '1.2rem', flexShrink: 0, color: isAgentBooking ? '#16a34a' : '#0284c7' }} />
                <span>
                  {isAgentBooking
                    ? 'Direct staff counter booking. Digital ticket & printable boarding pass issued immediately.'
                    : 'Encrypted payment. Instant digital QR ticket confirmation.'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleCreateBookingAndPay}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 8,
                    border: 'none',
                    background: isAgentBooking ? '#078930' : '#1d4ed8',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: isAgentBooking ? '0 4px 14px rgba(7,137,48,0.35)' : '0 4px 14px rgba(29,78,216,0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSubmitting ? (
                    'Processing Booking…'
                  ) : isAgentBooking ? (
                    passengerForm.paymentStatus === 'PAID' ? (
                      <><span>Confirm & Issue Ticket (ETB {(pricePerSeat * selectedSeats.length).toFixed(2)})</span> <FaCheck /></>
                    ) : (
                      <><span>Reserve Seats on Hold (ETB {(pricePerSeat * selectedSeats.length).toFixed(2)})</span> <FaArrowRight /></>
                    )
                  ) : (
                    <><span>Pay ETB {(pricePerSeat * selectedSeats.length).toFixed(2)}</span> <FaArrowRight /></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setModalStep('seats')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <FaArrowLeft /> Back to Seat Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatSelectorModal;
