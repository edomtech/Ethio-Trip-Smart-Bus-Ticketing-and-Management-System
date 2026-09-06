import React, { useState, useEffect } from 'react';
import {
  FaSearch, FaExchangeAlt, FaBus, FaClock, FaCouch, FaStar,
  FaShieldAlt, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaCheckCircle,
  FaArrowRight, FaArrowLeft, FaTicketAlt, FaDownload, FaPrint,
  FaCreditCard, FaLock, FaExclamationTriangle, FaTimes, FaTag
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { scheduleAPI, companyAPI, bookingAPI, paymentAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';
import PaymentModal from '../../../components/PaymentModal';
import SeatSelectorModal from '../../../components/SeatSelectorModal';
import TicketModal from '../../../components/TicketModal';

const CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar',
  'Gondar', 'Jimma', 'Jijiga', 'Adama', 'Dessie', 'Arba Minch', 'Harar'
];

// Seat layout constants (45 seats)
const ROWS = [
  { key: 1,  left: [1],       right: [],       isDoor: true },
  { key: 2,  left: [4, 5],    right: [2, 3] },
  { key: 3,  left: [6, 7],    right: [8, 9] },
  { key: 4,  left: [10, 11],  right: [12, 13] },
  { key: 5,  left: [14, 15],  right: [16, 17] },
  { key: 6,  left: [18, 19],  right: [20, 21] },
  { key: 7,  left: [22, 23],  right: [24, 25] },
  { key: 8,  left: [26, 27],  right: [28, 29] },
  { key: 9,  left: [30, 31],  right: [32, 33] },
  { key: 10, left: [34, 35],  right: [36, 37] },
  { key: 11, left: [38, 39],  right: [40, 41] },
  { key: 12, left: [42, 43],  right: [44, 45], isBack: true },
];

export const getCompanyLogo = (companyName, customLogo) => {
  if (customLogo && typeof customLogo === 'string' && !customLogo.startsWith('http') && customLogo.startsWith('/')) {
    return customLogo;
  }
  const name = (companyName || '').toLowerCase();
  if (name.includes('selam')) return '/logos/selam_bus.png';
  if (name.includes('abay')) return '/logos/abay_bus.png';
  if (name.includes('ethio')) return '/logos/ethio_bus.png';
  if (name.includes('zemen')) return '/logos/zemen_bus.png';
  if (name.includes('habesha')) return '/logos/habesha_bus.png';
  if (customLogo && typeof customLogo === 'string' && customLogo.startsWith('/')) return customLogo;
  return '/logos/ethio_bus.png';
};

export const CompanyLogoBadge = ({ companyName, logo, size = 46 }) => {
  const [imgError, setImgError] = useState(false);
  const logoSrc = getCompanyLogo(companyName, logo);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 3,
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      {!imgError ? (
        <img
          src={logoSrc}
          alt={companyName || 'Bus Operator'}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45 }}>
          <FaBus />
        </div>
      )}
    </div>
  );
};

const BusSearch = ({ onSelectSchedule }) => {
  const { user } = useAuth();

  const getFutureDateString = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Search parameters (matching home page search bar)
  const [tripType, setTripType] = useState('oneway'); // default to oneway or round
  const [fromCity, setFromCity] = useState('Addis Ababa');
  const [toCity, setToCity] = useState('Bahir Dar');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(getFutureDateString(3));
  const [passengers, setPassengers] = useState(1);

  // Flow State:
  // For 'oneway': 'search' -> 'oneway_results'
  // For 'round': 'search' -> 'company_select' -> 'outbound_select' -> 'return_select' -> 'review'
  const [flowStep, setFlowStep] = useState('search');

  // Search Results Data
  const [loading, setLoading] = useState(false);
  const [outboundSchedules, setOutboundSchedules] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  // Selection States
  const [lockedCompany, setLockedCompany] = useState(null);
  const [selectedOutboundSchedule, setSelectedOutboundSchedule] = useState(null);
  const [selectedOutboundSeats, setSelectedOutboundSeats] = useState([]);

  // One-Way Specific Selection
  const [selectedOneWaySchedule, setSelectedOneWaySchedule] = useState(null);
  const [selectedOneWaySeats, setSelectedOneWaySeats] = useState([]);

  // Return Selection States (Round-Trip)
  const [returnSchedules, setReturnSchedules] = useState([]);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [selectedReturnSchedule, setSelectedReturnSchedule] = useState(null);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState([]);
  const [noReturnBusesFound, setNoReturnBusesFound] = useState(false);

  // Payment State & Modal
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [confirmedBookingForTicket, setConfirmedBookingForTicket] = useState(null);
  const [modalSchedule, setModalSchedule] = useState(null);

  // Round-Trip Passenger Details
  const [roundPassengerForm, setRoundPassengerForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    gender: 'Male',
    age: '',
    emergencyContact: '',
  });

  useEffect(() => {
    if (user) {
      setRoundPassengerForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  // Reset seat selections whenever schedules change
  useEffect(() => {
    setSelectedOneWaySeats([]);
  }, [selectedOneWaySchedule?._id]);

  useEffect(() => {
    setSelectedOutboundSeats([]);
  }, [selectedOutboundSchedule?._id]);

  useEffect(() => {
    setSelectedReturnSeats([]);
  }, [selectedReturnSchedule?._id]);

  const handleSwap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (fromCity === toCity) {
      toast.error('Departure and Destination cities must be different');
      return;
    }

    setLoading(true);
    setSelectedOutboundSchedule(null);
    setSelectedOutboundSeats([]);
    setSelectedOneWaySchedule(null);
    setSelectedOneWaySeats([]);
    setSelectedReturnSchedule(null);
    setSelectedReturnSeats([]);
    setLockedCompany(null);

    try {
      const res = await scheduleAPI.search({
        from: fromCity,
        to: toCity,
        date: travelDate,
      });

      const schedules = res || [];
      setOutboundSchedules(schedules);

      if (schedules.length === 0) {
        toast.info('No bus schedules found for this route on the selected date.');
        setFlowStep('search');
      } else if (tripType === 'round') {
        // Group available companies for round-trip locked company selection
        const compMap = new Map();
        schedules.forEach((sch) => {
          const comp = sch.companyId || sch.company;
          const compId = comp?._id || comp?.id || 'c_default';
          const compName = comp?.companyName || sch.bus?.busNumber || 'Ethio Bus Express';
          if (!compMap.has(compId)) {
            compMap.set(compId, {
              id: compId,
              rawCompany: comp,
              companyName: compName,
              logo: comp?.logo || '',
              rating: comp?.rating || 4.8,
              minPrice: sch.price,
              schedulesCount: 1,
              busTypes: [sch.bus?.type || 'Luxury Express'],
            });
          } else {
            const item = compMap.get(compId);
            item.schedulesCount += 1;
            if (sch.price < item.minPrice) item.minPrice = sch.price;
            if (sch.bus?.type && !item.busTypes.includes(sch.bus.type)) {
              item.busTypes.push(sch.bus.type);
            }
          }
        });

        setCompaniesList(Array.from(compMap.values()));
        setFlowStep('company_select');
      } else {
        // Classic direct one-way results flow
        setFlowStep('oneway_results');
      }
    } catch {
      toast.error('Failed to fetch bus schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ONE-WAY BOOKING HANDLERS
  // ══════════════════════════════════════════════════════════════
  const toggleOneWaySeat = (seatNum) => {
    const booked = selectedOneWaySchedule?.bookedSeats?.map(String) || [];
    if (booked.includes(String(seatNum))) {
      toast.warning(`Seat ${seatNum} is already booked.`);
      return;
    }

    if (selectedOneWaySeats.includes(seatNum)) {
      setSelectedOneWaySeats(prev => prev.filter(s => s !== seatNum));
    } else {
      if (selectedOneWaySeats.length >= passengers) {
        if (passengers === 1) {
          setSelectedOneWaySeats([seatNum]);
        } else {
          toast.info(`You have already selected ${passengers} seat(s) for your party.`);
        }
      } else {
        setSelectedOneWaySeats(prev => [...prev, seatNum]);
      }
    }
  };

  const handlePayOneWay = async () => {
    if (!selectedOneWaySchedule) {
      toast.error('Please choose a bus schedule');
      return;
    }
    if (selectedOneWaySeats.length < passengers) {
      toast.error(`Please select ${passengers} seat(s)`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      const passengerPayload = {
        name: user?.name || 'Passenger User',
        email: user?.email || 'passenger@ethiotrip.com',
        phone: user?.phone || '0911000000',
      };

      const bookingPayload = {
        scheduleId: selectedOneWaySchedule._id,
        selectedSeats: selectedOneWaySeats.map(String),
        tripType: 'oneway',
        passengerDetails: passengerPayload,
      };

      const res = await bookingAPI.create(bookingPayload);
      const created = res.booking || res;
      setActiveBookingForPayment(created);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Booking process encountered an error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // ROUND-TRIP STEP 1: Lock Company
  // ══════════════════════════════════════════════════════════════
  const handleSelectCompany = (comp) => {
    setLockedCompany(comp);
    setFlowStep('outbound_select');
    toast.success(`Booking locked to ${comp.companyName}`);
  };

  // ══════════════════════════════════════════════════════════════
  // ROUND-TRIP STEP 2: Outbound Trip
  // ══════════════════════════════════════════════════════════════
  const toggleOutboundSeat = (seatNum) => {
    const booked = selectedOutboundSchedule?.bookedSeats?.map(String) || [];
    if (booked.includes(String(seatNum))) {
      toast.warning(`Seat ${seatNum} is already booked.`);
      return;
    }

    if (selectedOutboundSeats.includes(seatNum)) {
      setSelectedOutboundSeats(prev => prev.filter(s => s !== seatNum));
    } else {
      if (selectedOutboundSeats.length >= passengers) {
        if (passengers === 1) {
          setSelectedOutboundSeats([seatNum]);
        } else {
          toast.info(`You have already selected ${passengers} seat(s) for your party.`);
        }
      } else {
        setSelectedOutboundSeats(prev => [...prev, seatNum]);
      }
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RETURN TRIP FETCH HELPER
  // ══════════════════════════════════════════════════════════════
  const fetchReturnSchedules = async (targetDate = returnDate, compId) => {
    setLoadingReturn(true);
    setNoReturnBusesFound(false);
    try {
      const companyId = compId || lockedCompany?.id || lockedCompany?.rawCompany?._id || selectedOutboundSchedule?.companyId?._id || selectedOutboundSchedule?.companyId;
      const res = await scheduleAPI.search({
        from: toCity,
        to: fromCity,
        date: targetDate,
        companyId: companyId && companyId !== 'c_default' ? companyId : undefined,
      });

      const list = Array.isArray(res) ? res : [];
      const filtered = list.filter(sch => {
        if (!companyId || companyId === 'c_default') return true;
        const cId = sch.companyId?._id || sch.companyId || sch.company?._id;
        return String(cId) === String(companyId);
      });

      setReturnSchedules(filtered);
      if (filtered.length === 0) {
        setNoReturnBusesFound(true);
      }
    } catch (err) {
      console.error('Failed to load return schedules:', err);
      setReturnSchedules([]);
      setNoReturnBusesFound(true);
    } finally {
      setLoadingReturn(false);
    }
  };

  const handleSaveOutboundAndContinue = async () => {
    if (!selectedOutboundSchedule) {
      toast.error('Please choose an outbound bus schedule');
      return;
    }
    if (selectedOutboundSeats.length < passengers) {
      toast.error(`Please select ${passengers} seat(s) for the outbound trip`);
      return;
    }

    setFlowStep('return_select');
    await fetchReturnSchedules(returnDate);
  };

  // Condition 1: Pay Only for Outbound
  const handlePayOnlyOutbound = () => {
    setTripType('oneway');
    setSelectedReturnSchedule(null);
    setSelectedReturnSeats([]);
    setFlowStep('review');
    toast.info('Trip updated to One-Way Outbound journey.');
  };

  // Condition 2: Find Another Return Schedule Date
  const handleChangeReturnDate = async (newDate) => {
    setReturnDate(newDate);
    await fetchReturnSchedules(newDate);
  };

  // ══════════════════════════════════════════════════════════════
  // ROUND-TRIP STEP 3: Return Trip Seats
  // ══════════════════════════════════════════════════════════════
  const toggleReturnSeat = (seatNum) => {
    const booked = selectedReturnSchedule?.bookedSeats?.map(String) || [];
    if (booked.includes(String(seatNum))) {
      toast.warning(`Seat ${seatNum} is already booked.`);
      return;
    }

    if (selectedReturnSeats.includes(seatNum)) {
      setSelectedReturnSeats(prev => prev.filter(s => s !== seatNum));
    } else {
      if (selectedReturnSeats.length >= passengers) {
        if (passengers === 1) {
          setSelectedReturnSeats([seatNum]);
        } else {
          toast.info(`You have already selected ${passengers} seat(s) for your return party.`);
        }
      } else {
        setSelectedReturnSeats(prev => [...prev, seatNum]);
      }
    }
  };

  const handleSaveReturnAndContinue = () => {
    if (!selectedReturnSchedule) {
      toast.error('Please choose a return bus schedule');
      return;
    }
    if (selectedReturnSeats.length < passengers) {
      toast.error(`Please select ${passengers} seat(s) for the return trip`);
      return;
    }
    setFlowStep('review');
  };

  // Fare calculations for Review
  const outboundPrice = (selectedOutboundSchedule?.price || 750) * (selectedOutboundSeats.length || passengers);
  const returnPrice = (selectedReturnSchedule?.price || 750) * (selectedReturnSeats.length || passengers);
  const isRound = tripType === 'round' && selectedReturnSchedule;
  const subtotal = outboundPrice + (isRound ? returnPrice : 0);
  const discountAmount = isRound ? Math.round(subtotal * 0.1) : 0; // 10% round trip discount
  const finalTotal = subtotal - discountAmount;

  // ══════════════════════════════════════════════════════════════
  // ROUND-TRIP STEP 4: Open Payment Modal
  // ══════════════════════════════════════════════════════════════
  const handleConfirmAndPayRoundTrip = async () => {
    if (!selectedOutboundSchedule) {
      toast.error('Please select outbound trip schedule');
      return;
    }
    if (selectedOutboundSeats.length < passengers) {
      toast.error(`Please select ${passengers} seat(s) for the outbound trip`);
      return;
    }
    if (isRound && (!selectedReturnSchedule || selectedReturnSeats.length < passengers)) {
      toast.error(`Please select ${passengers} seat(s) for the return trip`);
      return;
    }

    const resolvedName  = (roundPassengerForm.fullName || '').trim() || user?.name || '';
    const resolvedPhone = (roundPassengerForm.phone || '').trim() || user?.phone || '';
    const resolvedEmail = (roundPassengerForm.email || '').trim() || user?.email || '';

    if (!resolvedName?.trim()) {
      toast.error('Passenger name is required. Please ensure your account has a name set.');
      return;
    }
    if (!resolvedPhone?.trim()) {
      toast.error('Contact phone is required. Please ensure your account has a phone number set.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const bookingPayload = {
        scheduleId: selectedOutboundSchedule._id,
        selectedSeats: selectedOutboundSeats.map(String),
        tripType: isRound ? 'round' : 'oneway',
        returnScheduleId: isRound ? selectedReturnSchedule._id : undefined,
        returnSeats: isRound ? selectedReturnSeats.map(String) : undefined,
        discountAmount: discountAmount,
        discountCode: isRound ? 'ROUNDTRIP10' : undefined,
        baseFare: subtotal,
        totalPrice: finalTotal,
        passengerDetails: {
          name:   resolvedName,
          phone:  resolvedPhone,
          email:  resolvedEmail || '',
          gender: roundPassengerForm.gender,
          age:    roundPassengerForm.age,
        },
      };

      const res = await bookingAPI.create(bookingPayload);
      const created = res.booking || res;
      setActiveBookingForPayment(created);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Round-trip booking encountered an error.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ══ EXACT HOME PAGE SEARCH BAR ══ */}
      <div className="eb-search-card-container" style={{ margin: '0 auto', width: '100%', maxWidth: 1100 }}>
        <div className="eb-search-card">
          <div className="eb-search-tabs">
            <button
              type="button"
              className={`eb-tab-btn ${tripType === 'oneway' ? 'active' : ''}`}
              onClick={() => {
                setTripType('oneway');
                setFlowStep('search');
              }}
            >
              <FaBus /> One Way
            </button>
            <button
              type="button"
              className={`eb-tab-btn ${tripType === 'round' ? 'active' : ''}`}
              onClick={() => {
                setTripType('round');
                setFlowStep('search');
              }}
            >
              <FaExchangeAlt /> Round Trip
            </button>
          </div>

          <form onSubmit={handleSearch} className="eb-search-grid">
            <div className="eb-input-group">
              <label>Departure City</label>
              <div className="eb-input-field">
                <FaMapMarkerAlt className="eb-field-icon" />
                <select value={fromCity} onChange={(e) => setFromCity(e.target.value)}>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button type="button" className="eb-swap-btn" onClick={handleSwap} title="Swap Cities">
              <FaExchangeAlt />
            </button>

            <div className="eb-input-group">
              <label>Destination City</label>
              <div className="eb-input-field">
                <FaMapMarkerAlt className="eb-field-icon" />
                <select value={toCity} onChange={(e) => setToCity(e.target.value)}>
                  {CITIES.filter((c) => c !== fromCity).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="eb-input-group">
              <label>Travel Date</label>
              <div className="eb-input-field">
                <FaCalendarAlt className="eb-field-icon" />
                <input
                  type="date"
                  value={travelDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTravelDate(e.target.value)}
                />
              </div>
            </div>

            {tripType === 'round' && (
              <div className="eb-input-group">
                <label>Return Date</label>
                <div className="eb-input-field">
                  <FaCalendarAlt className="eb-field-icon" style={{ color: '#059669' }} />
                  <input
                    type="date"
                    value={returnDate}
                    min={travelDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="eb-input-group">
              <label>Passengers</label>
              <div className="eb-input-field">
                <FaUser className="eb-field-icon" />
                <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Passenger' : 'Passengers'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="eb-search-action">
              <button type="submit" className="eb-search-submit-btn" disabled={loading}>
                <FaSearch /> {loading ? 'Searching...' : 'Search Buses'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ONE-WAY CLASSIC FLOW: DIRECT BUS SCHEDULES & SEAT SELECTOR
          ══════════════════════════════════════════════════════════════ */}
      {tripType === 'oneway' && flowStep === 'oneway_results' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                {fromCity} → {toCity}
              </h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                {outboundSchedules.length} bus departure{outboundSchedules.length > 1 ? 's' : ''} available on {travelDate}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFlowStep('search')}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Modify Search
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Direct List of Bus Schedules */}
            {outboundSchedules.map((sch) => {
              const compName = sch.companyId?.companyName || sch.company?.companyName || sch.bus?.busNumber || 'Ethio Bus Express';
              return (
                <div
                  key={sch._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 18,
                    border: '1.5px solid #e2e8f0',
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CompanyLogoBadge companyName={compName} logo={sch.companyId?.logo || sch.company?.logo} size={48} />
                      <div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>{compName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Bus {sch.bus?.busNumber || 'EB-101'} · {sch.bus?.type || 'Luxury Express'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#059669' }}>
                        ETB {sch.price}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>per passenger</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>DEPARTURE</div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{sch.departureTime}</div>
                      </div>
                      <span style={{ color: '#cbd5e1' }}>→</span>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>ARRIVAL</div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{sch.arrivalTime}</div>
                      </div>
                      <div style={{ marginLeft: 10, background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                        <FaCouch /> {sch.availableSeats} Seats Left
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectSchedule) {
                          onSelectSchedule({ ...sch, requiredSeatsCount: passengers });
                        } else {
                          setModalSchedule({ ...sch, requiredSeatsCount: passengers });
                        }
                      }}
                      style={{
                        padding: '10px 22px',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Select Seat(s) <FaArrowRight />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ROUND-TRIP MULTI-STEP FLOW
          ══════════════════════════════════════════════════════════════ */}
      {tripType === 'round' && flowStep !== 'search' && (
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          {/* STEP PROGRESS INDICATOR */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '14px 20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: 20 }}>
            {[
              { id: 'company_select', label: '1. Select Company', done: ['outbound_select', 'return_select', 'review'].includes(flowStep) },
              { id: 'outbound_select', label: '2. Outbound Trip', done: ['return_select', 'review'].includes(flowStep) },
              { id: 'return_select', label: '3. Return Trip', done: ['review'].includes(flowStep) },
              { id: 'review', label: '4. Review & Confirm', done: false },
            ].map((step, idx) => {
              const isCurrent = flowStep === step.id;
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: step.done ? '#16a34a' : isCurrent ? '#0f172a' : '#f1f5f9',
                    color: step.done || isCurrent ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.75rem'
                  }}>
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#0f172a' : step.done ? '#16a34a' : '#64748b' }}>
                    {step.label}
                  </span>
                  {idx < 3 && <span style={{ color: '#cbd5e1', marginLeft: 12 }}>→</span>}
                </div>
              );
            })}
          </div>

          {/* STEP 1: SELECT COMPANY (ROUND TRIP) */}
          {flowStep === 'company_select' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Available Bus Operators for {fromCity} ↔ {toCity}
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                  Select ONE company to lock your round-trip journey and secure maximum round-trip discounts.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
                {companiesList.map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 18,
                      border: '1.5px solid #e2e8f0',
                      padding: 22,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 16,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <CompanyLogoBadge companyName={comp.companyName} logo={comp.logo} size={52} />
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                              {comp.companyName}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: 2 }}>
                              <FaStar /> {comp.rating} ★ Rating
                            </div>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>
                          10% Round-Trip Off
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {comp.busTypes.map((type, i) => (
                          <span key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                            {type}
                          </span>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {comp.schedulesCount} daily departure{comp.schedulesCount > 1 ? 's' : ''} available on this route
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Starting From</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>
                          ETB {comp.minPrice} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>/ seat</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectCompany(comp)}
                        style={{
                          padding: '10px 20px',
                          background: '#078930',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 12,
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(7, 137, 48, 0.3)',
                        }}
                      >
                        Select &amp; Lock Company <FaArrowRight />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: OUTBOUND TRIP SELECTION */}
          {flowStep === 'outbound_select' && (
            <div>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '16px 22px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    OUTBOUND TRIP · STEP 1 OF 2
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#064e3b' }}>
                    {fromCity} → {toCity} ({travelDate})
                  </h3>
                </div>

                {lockedCompany && (
                  <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 800, color: '#078930', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FaLock /> Locked Company: {lockedCompany.companyName}
                  </div>
                )}
              </div>

              {/* Outbound Schedules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  Choose Departure Schedule ({outboundSchedules.length} Available)
                </h4>

                {outboundSchedules
                  .filter(sch => {
                    if (!lockedCompany || lockedCompany.id === 'c_default') return true;
                    const cId = sch.companyId?._id || sch.companyId || sch.company?._id;
                    return String(cId) === String(lockedCompany.id || lockedCompany.rawCompany?._id);
                  })
                  .map((sch) => {
                    const isSelected = selectedOutboundSchedule?._id === sch._id;
                    const compName = lockedCompany?.companyName || sch.companyId?.companyName || sch.company?.companyName || 'Bus Operator';
                    return (
                      <div
                        key={sch._id}
                        style={{
                          background: '#ffffff',
                          borderRadius: 18,
                          border: `2px solid ${isSelected ? '#078930' : '#e2e8f0'}`,
                          padding: 20,
                          boxShadow: isSelected ? '0 6px 20px rgba(7, 137, 48, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <CompanyLogoBadge companyName={compName} logo={lockedCompany?.logo || sch.companyId?.logo || sch.company?.logo} size={48} />
                            <div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>{compName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Bus {sch.bus?.busNumber || 'EB-101'} · {sch.bus?.type || 'Luxury Express'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#078930' }}>
                              ETB {sch.price}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>per passenger</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>DEPARTURE</div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{sch.departureTime}</div>
                            </div>
                            <span style={{ color: '#cbd5e1' }}>→</span>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>ARRIVAL</div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{sch.arrivalTime}</div>
                            </div>
                            <div style={{ marginLeft: 10, background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                              <FaCouch /> {sch.availableSeats} Seats Left
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setModalSchedule({
                                ...sch,
                                _mode: 'outbound',
                                onSeatsSelected: (seats, updatedSch) => {
                                  setSelectedOutboundSchedule(updatedSch);
                                  setSelectedOutboundSeats(seats);
                                  setModalSchedule(null);
                                  setFlowStep('return_select');
                                  const compId = lockedCompany?.id || lockedCompany?.rawCompany?._id || updatedSch?.companyId?._id || updatedSch?.companyId;
                                  fetchReturnSchedules(returnDate, compId);
                                  toast.success(`Outbound seats (${seats.join(', ')}) saved! Loading return trips...`);
                                }
                              });
                            }}
                            style={{
                              padding: '10px 22px',
                              background: '#078930',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 10,
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              boxShadow: '0 4px 12px rgba(7, 137, 48, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Select Outbound Seat(s) <FaArrowRight />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* STEP 3: RETURN TRIP SELECTION (SAME COMPANY ONLY) */}
          {flowStep === 'return_select' && (
            <div>
              {/* Outbound Saved Summary Strip */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#16a34a', fontSize: '1.1rem' }}><FaCheckCircle /></span>
                  <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700 }}>
                    Outbound Saved: <strong>{fromCity} → {toCity}</strong> ({travelDate}, {selectedOutboundSchedule?.departureTime}) · Seat(s): <strong>{selectedOutboundSeats.join(', ')}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFlowStep('outbound_select')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Change Outbound
                </button>
              </div>

              {/* Return Trip Header */}
              <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 16, padding: '16px 22px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    RETURN TRIP · STEP 2 OF 2
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#713f12' }}>
                    {toCity} → {fromCity} ({returnDate})
                  </h3>
                </div>

                {lockedCompany && (
                  <div style={{ background: '#ffffff', border: '1px solid #fef08a', padding: '6px 14px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FaLock /> Locked Operator: {lockedCompany.companyName} (Same Company Only)
                  </div>
                )}
              </div>

              {/* Condition Check: If NO Return Buses on that date */}
              {noReturnBusesFound ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '2px solid #f59e0b',
                    borderRadius: 20,
                    padding: '28px 24px',
                    textAlign: 'center',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.12)',
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 14px' }}>
                    <FaExclamationTriangle />
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 900, color: '#92400e' }}>
                    No Return Buses Available for {lockedCompany?.companyName || 'this Operator'} on {returnDate}
                  </h3>

                  <p style={{ margin: '0 auto 24px', maxWidth: 580, fontSize: '0.88rem', color: '#78350f', lineHeight: 1.5 }}>
                    There are no scheduled return trips by {lockedCompany?.companyName || 'this company'} on this specific return date. You can choose to pay only for your outbound trip now, or select another return date.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handlePayOnlyOutbound}
                      style={{
                        padding: '12px 24px',
                        background: '#078930',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 12,
                        fontWeight: 900,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 15px rgba(7, 137, 48, 0.3)',
                      }}
                    >
                      <FaBus /> Pay Only for Outbound <FaArrowRight />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '4px 12px', borderRadius: 12, border: '1.5px solid #cbd5e1' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Find Another Date:</span>
                      <input
                        type="date"
                        value={returnDate}
                        min={travelDate}
                        onChange={(e) => handleChangeReturnDate(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    Choose Return Schedule ({returnSchedules.length} Available)
                  </h4>

                  {returnSchedules.map((sch) => {
                    const isSelected = selectedReturnSchedule?._id === sch._id;
                    const compName = lockedCompany?.companyName || sch.companyId?.companyName || sch.company?.companyName || 'Bus Operator';
                    return (
                      <div
                        key={sch._id}
                        style={{
                          background: '#ffffff',
                          borderRadius: 18,
                          border: `2px solid ${isSelected ? '#078930' : '#e2e8f0'}`,
                          padding: 20,
                          boxShadow: isSelected ? '0 6px 20px rgba(7, 137, 48, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <CompanyLogoBadge companyName={compName} logo={lockedCompany?.logo || sch.companyId?.logo || sch.company?.logo} size={48} />
                            <div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>{compName}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Bus {sch.bus?.busNumber || 'EB-202'} · {sch.bus?.type || 'Luxury Express'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#078930' }}>
                              ETB {sch.price}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>per passenger</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>DEPARTURE</div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{sch.departureTime}</div>
                            </div>
                            <span style={{ color: '#cbd5e1' }}>→</span>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>ARRIVAL</div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{sch.arrivalTime}</div>
                            </div>
                            <div style={{ marginLeft: 10, background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                              <FaCouch /> {sch.availableSeats} Seats Left
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setModalSchedule({
                                ...sch,
                                _mode: 'return',
                                onSeatsSelected: (seats, updatedSch) => {
                                  setSelectedReturnSchedule(updatedSch);
                                  setSelectedReturnSeats(seats);
                                  setModalSchedule(null);
                                  setFlowStep('review');
                                  toast.success(`Return seats (${seats.join(', ')}) saved! Please enter passenger details.`);
                                }
                              });
                            }}
                            style={{
                              padding: '10px 22px',
                              background: '#078930',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 10,
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              boxShadow: '0 4px 12px rgba(7, 137, 48, 0.25)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Select Return Seat(s) <FaArrowRight />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PASSENGER INFO & REVIEW FOR ROUND-TRIP */}
          {flowStep === 'review' && (
            <div style={{ maxWidth: 1040, margin: '0 auto', width: '100%' }}>
              <div style={{ background: '#ffffff', borderRadius: 24, border: '1.5px solid #e2e8f0', padding: '26px 30px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
                {/* Stepper Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 14, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {lockedCompany && (
                      <CompanyLogoBadge companyName={lockedCompany.companyName} logo={lockedCompany.logo} size={50} />
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                        Passenger Information &amp; Review
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                        Round-Trip Intercity Journey · {lockedCompany?.companyName || 'Ethio Bus'}
                      </p>
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem' }}>
                    ✓ 10% Round-Trip Discount Applied
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
                  {/* Left Column: Passenger Contact Form */}
                  <div style={{ background: '#f8fafc', borderRadius: 18, border: '1px solid #e2e8f0', padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaUser />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        Passenger Personal Details
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Lock notice */}
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: '1.1rem' }}>🔒</span>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d4ed8', marginBottom: 2 }}>Account Information (Locked)</div>
                          <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                            Auto-filled from your account. Only <strong>Gender</strong> and <strong>Age</strong> can be changed.
                          </div>
                        </div>
                      </div>

                      {/* Full Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                          Passenger Full Name <span style={{ color: '#ef4444' }}>*</span>
                          <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>Editable</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={roundPassengerForm.fullName}
                          onChange={(e) => setRoundPassengerForm({ ...roundPassengerForm, fullName: e.target.value })}
                          placeholder="e.g. Abebe Kebede"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #86efac', fontSize: '0.9rem', outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* Phone & Email */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                            Phone <span style={{ color: '#ef4444' }}>*</span>
                            <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>Editable</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={roundPassengerForm.phone}
                            onChange={(e) => setRoundPassengerForm({ ...roundPassengerForm, phone: e.target.value })}
                            placeholder="0911234567"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #86efac', fontSize: '0.9rem', outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={roundPassengerForm.email}
                            onChange={(e) => setRoundPassengerForm({ ...roundPassengerForm, email: e.target.value })}
                            placeholder="passenger@example.com"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #86efac', fontSize: '0.9rem', outline: 'none', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Gender & Age — EDITABLE */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                            Gender <span style={{ fontSize: '0.7rem', color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>Editable</span>
                          </label>
                          <select
                            value={roundPassengerForm.gender}
                            onChange={e => setRoundPassengerForm({ ...roundPassengerForm, gender: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #86efac', fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                            Age (Optional) <span style={{ fontSize: '0.7rem', color: '#059669', background: '#dcfce7', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>Editable</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            placeholder="e.g. 28"
                            value={roundPassengerForm.age}
                            onChange={e => setRoundPassengerForm({ ...roundPassengerForm, age: e.target.value })}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #86efac', fontSize: '0.9rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Outbound + Return Cards and Pricing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Outbound Card */}
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>
                          OUTBOUND TRIP
                        </span>
                        <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>ETB {outboundPrice}</strong>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>{fromCity} → {toCity}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                        📅 {travelDate} ({selectedOutboundSchedule?.departureTime}) · 💺 Seats: <strong style={{ color: '#059669' }}>{selectedOutboundSeats.join(', ')}</strong>
                      </div>
                    </div>

                    {/* Return Card */}
                    <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#854d0e', background: '#fef9c3', padding: '2px 8px', borderRadius: 6 }}>
                          RETURN TRIP
                        </span>
                        <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>ETB {returnPrice}</strong>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>{toCity} → {fromCity}</div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                        📅 {returnDate} ({selectedReturnSchedule?.departureTime}) · 💺 Seats: <strong style={{ color: '#ca8a04' }}>{selectedReturnSeats.join(', ')}</strong>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div style={{ background: '#ffffff', borderRadius: 16, padding: 16, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: 6 }}>
                        <span>Subtotal (2 Trips):</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>ETB {subtotal}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', fontWeight: 800, marginBottom: 6 }}>
                          <span>10% Round-Trip Discount:</span>
                          <span>- ETB {discountAmount}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', borderTop: '1.5px dashed #cbd5e1', paddingTop: 10, marginTop: 6 }}>
                        <span>Final Total:</span>
                        <span style={{ color: '#078930' }}>ETB {finalTotal}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => setFlowStep('return_select')}
                        style={{ flex: 1, padding: '13px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmAndPayRoundTrip}
                        disabled={isProcessingPayment}
                        style={{
                          flex: 2, padding: '13px', background: '#078930', color: '#ffffff', border: 'none', borderRadius: 12,
                          fontWeight: 900, fontSize: '0.95rem', cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(7,137,48,0.3)'
                        }}
                      >
                        <FaCreditCard /> {isProcessingPayment ? 'Reserving…' : `Pay ETB ${finalTotal} →`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {modalSchedule && (
        <SeatSelectorModal
          schedule={modalSchedule}
          requiredSeatsCount={passengers}
          titlePrefix={modalSchedule._mode === 'outbound' ? 'Outbound Trip' : modalSchedule._mode === 'return' ? 'Return Trip' : ''}
          onSeatsSelectedOnly={modalSchedule.onSeatsSelected}
          onClose={() => setModalSchedule(null)}
          onConfirmBooking={(booking) => {
            setModalSchedule(null);
            setActiveBookingForPayment(booking);
          }}
        />
      )}

      {activeBookingForPayment && (
        <PaymentModal
          booking={activeBookingForPayment}
          onClose={() => setActiveBookingForPayment(null)}
          onSuccess={(paidBooking) => {
            const confirmed = paidBooking || activeBookingForPayment;
            setActiveBookingForPayment(null);
            setConfirmedBookingForTicket(confirmed);
            toast.success('Payment completed successfully! E-Tickets generated.');
          }}
        />
      )}

      {confirmedBookingForTicket && (
        <TicketModal
          booking={confirmedBookingForTicket}
          onClose={() => setConfirmedBookingForTicket(null)}
        />
      )}
    </div>
  );
};

export default BusSearch;
