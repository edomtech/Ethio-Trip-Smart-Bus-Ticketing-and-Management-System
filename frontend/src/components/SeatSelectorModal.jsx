import React, { useState, useEffect } from 'react';
import {
  FaTimes, FaBus, FaShieldAlt, FaArrowRight, FaArrowLeft, FaPhone,
  FaCheck, FaCouch, FaChevronRight, FaEdit, FaUser, FaEnvelope, FaIdCard, FaCreditCard
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bookingAPI, scheduleAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';

const BUS_IMAGES = {
  VIP: '/images/bus_selam_vip.jpg',
  Luxury: '/images/bus_selam_luxury.jpg',
  Executive: '/images/bus_abay_standard.jpg',
  Standard: '/images/bus_habesha_luxury.jpg',
  default: '/images/hero_bus_clean.jpg',
};

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
  onSeatsSelectedOnly,  
  requiredSeatsCount,
  titlePrefix = '',
  isAgentBooking = false,
  onAgentBookingComplete,
  prefilledPassenger = null,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [modalStep, setModalStep] = useState('seats');  
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [passengerForm, setPassengerForm] = useState({
    fullName: isAgentBooking ? (prefilledPassenger?.fullName || '') : (user?.name || ''),
    phone: isAgentBooking ? (prefilledPassenger?.phone || '') : (user?.phone || ''),
    email: isAgentBooking ? (prefilledPassenger?.email || '') : (user?.email || ''),
    gender: isAgentBooking ? (prefilledPassenger?.gender || 'Male') : 'Male',
    age: isAgentBooking ? (prefilledPassenger?.age || '') : '',
    emergencyContact: '',
    notes: '',
    bookingChannel: 'walk_in',  
    paymentStatus: 'PAID',  
    paymentMethod: 'Cash',  
  });

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
  const roundTripDiscount = isRoundTrip ? Math.round(grossSubtotal * 0.10) : 0;  
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

    let btnClasses = "w-[38px] h-[34px] rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 transition-all duration-150 border ";
    if (isBooked) {
      btnClasses += "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 cursor-not-allowed";
    } else if (isSelected) {
      btnClasses += "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/30 cursor-pointer scale-105";
    } else {
      btnClasses += "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs";
    }

    return (
      <button
        type="button"
        onClick={() => toggleSeat(num)}
        disabled={isBooked}
        title={isBooked ? `Seat ${num} – Occupied` : isSelected ? `Seat ${num} – Selected` : `Seat ${num} – Available`}
        className={btnClasses}
      >
        {num}
      </button>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 font-sans"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl overflow-y-auto flex flex-col border border-slate-200 dark:border-slate-800 transition-colors"
      >
        {}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
          {}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              <span className="text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tight">
                ETHIO<span className="text-emerald-600 dark:text-emerald-400">TRIP</span>
              </span>
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded ml-1">
                .ET
              </span>
            </div>

            {}
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-full text-xs font-extrabold text-blue-700 dark:text-blue-300">
              <FaBus className="text-blue-600 dark:text-blue-400" />
              <span>{titlePrefix ? `${titlePrefix}: ${operatorName}` : operatorName}</span>
            </div>
          </div>

          {}
          <div className="flex items-center gap-2">
            {(isAgentBooking ? [
              { n: 1, lbl: t('schedules', 'Schedules'), state: 'done' },
              { n: 2, lbl: t('seat selection', 'Seat Selection'), state: modalStep === 'seats' ? 'active' : 'done' },
              { n: 3, lbl: t('passenger & payment', 'Passenger & Payment'), state: modalStep === 'passenger_info' ? 'active' : 'next' },
            ] : [
              { n: 1, lbl: t('search', 'Search'), state: 'done' },
              { n: 2, lbl: t('trips', 'Trips'), state: 'done' },
              { n: 3, lbl: t('seat selection', 'Seat Selection'), state: modalStep === 'seats' ? 'active' : 'done' },
              { n: 4, lbl: t('passenger details', 'Passenger Info'), state: modalStep === 'passenger_info' ? 'active' : 'next' },
              { n: 5, lbl: t('payment', 'Payment'), state: 'next' },
            ]).map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5.5 h-5.5 rounded-full text-[11px] font-black flex items-center justify-center ${
                      s.state === 'active'
                        ? isAgentBooking ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        : s.state === 'done'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {s.state === 'done' ? <FaCheck className="text-[9px]" /> : s.n}
                  </div>
                  <span
                    className={`text-xs ${
                      s.state === 'active'
                        ? isAgentBooking ? 'font-extrabold text-emerald-600 dark:text-emerald-400' : 'font-extrabold text-blue-600 dark:text-blue-400'
                        : s.state === 'done'
                        ? 'font-bold text-slate-800 dark:text-slate-200'
                        : 'font-medium text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.lbl}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`w-3.5 h-[1.5px] ${s.state === 'done' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {}
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              {t('need help?', 'Need help?')} <strong className="text-slate-900 dark:text-slate-100 font-extrabold flex items-center gap-1"><FaPhone className="text-xs" /> {contactPhone}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 w-7 h-7 rounded-full cursor-pointer flex items-center justify-center text-sm transition"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {}
        <div className="px-6 pt-4.5">
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 shadow-xs">
            {}
            <div className="flex items-center gap-5">
              <img
                src={busImage}
                alt={`${operatorName} Bus`}
                className="w-24 sm:w-28 h-16 object-cover rounded-lg shadow-sm"
                onError={(e) => { e.target.src = BUS_IMAGES.default; }}
              />

              {}
              <div>
                <div className="font-extrabold text-base text-slate-900 dark:text-white">{routeFrom}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{fromStation}</div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mt-1">{travelTime}</div>
              </div>

              <div className="text-slate-400 px-2">
                <FaChevronRight className="text-sm" />
              </div>

              {}
              <div>
                <div className="font-extrabold text-base text-slate-900 dark:text-white">{routeTo}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{toStation}</div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200 mt-1">{arrivalTime}</div>
              </div>
            </div>

            {}
            <div className="flex items-center gap-6 sm:gap-7 flex-wrap">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{t('date', 'Date')}</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{travelDate}</div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{t('nav.buses', 'Bus')}</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{operatorName}</div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{t('Total Seats', 'Total Seats')}</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">45</div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <FaEdit /> {t('Change Trip', 'Change Trip')}
              </button>
            </div>
          </div>
        </div>

        {}
        {modalStep === 'seats' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
            {}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-xs">
              {}
              <div className="flex gap-5 mb-5 flex-wrap justify-center">
                {[
                  { bg: 'bg-emerald-500 border-emerald-600', label: t('selected', 'Selected') },
                  { bg: 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600', label: t('available', 'Available') },
                  { bg: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600', label: t('occupied', 'Occupied') },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <div className={`w-4 h-4 border rounded ${l.bg}`} />
                    {l.label}
                  </div>
                ))}
              </div>

              {}
              <div className="flex justify-center">
                <div className="w-full max-w-[320px] border-[2.5px] border-blue-600 dark:border-emerald-500 rounded-[38px_38px_24px_24px] bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative">
                  {}
                  <div className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 py-2 px-3 text-center text-[11px] font-black tracking-[3px] text-slate-500 dark:text-slate-400">
                    FRONT
                  </div>

                  {}
                  <div className="flex flex-col gap-2 p-3 sm:p-4 bg-white dark:bg-slate-900">
                    {ROWS.map(row => (
                      <div key={row.key} className="flex items-center justify-between">
                        {}
                        <div className="flex gap-1.5 min-w-[82px]">
                          {row.left.map(n => (
                            <SeatBtn key={n} num={n} />
                          ))}
                        </div>

                        {}
                        <div className="flex-1 mx-2 h-8.5 bg-slate-700 dark:bg-slate-800 rounded flex items-center justify-center opacity-80" />

                        {}
                        <div className="flex gap-1.5 min-w-[82px] justify-end">
                          {row.right.map(n => (
                            <SeatBtn key={n} num={n} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {}
                  <div className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 py-2 px-3 text-center text-[11px] font-black tracking-[3px] text-slate-500 dark:text-slate-400">
                    BACK
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
              {}
              <div className="flex items-center gap-2">
                <div className="text-blue-600 dark:text-emerald-400 text-lg">
                  <FaCouch />
                </div>
                <h3 className="m-0 text-base font-extrabold text-slate-900 dark:text-white">
                  {t('your selected seats', 'Your Selected Seats')}
                </h3>
              </div>

              {}
              <div className="flex gap-2 flex-wrap min-h-[34px]">
                {selectedSeats.length > 0 ? (
                  selectedSeats
                    .sort((a, b) => a - b)
                    .map(s => (
                      <span
                        key={s}
                        onClick={() => toggleSeat(s)}
                        className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-md font-extrabold text-xs cursor-pointer inline-flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                        title="Click to deselect"
                      >
                        {s} <span className="font-black text-xs">×</span>
                      </span>
                    ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {t('click available seats on the bus map to select', 'Click available seats on the bus map to select')}
                  </span>
                )}
              </div>

              {}
              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3.5 text-sm text-slate-500 dark:text-slate-400 flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span>{t('seat(s)', 'Seat(s)')}</span>
                  <strong className="text-slate-900 dark:text-white">{selectedSeats.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('ticket price (per seat)', 'Ticket Price (per seat)')}</span>
                  <strong className="text-slate-900 dark:text-white">ETB {pricePerSeat.toLocaleString()}</strong>
                </div>
              </div>

              {}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3.5 flex justify-between items-center">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{t('total amount', 'Total Amount')}</span>
                <span className="text-xl font-black text-blue-600 dark:text-emerald-400">
                  ETB {(pricePerSeat * selectedSeats.length).toFixed(2)}
                </span>
              </div>

              {}
              <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl p-3.5 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2.5">
                <FaShieldAlt className="text-xl shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
                <div>
                  <strong className="text-sky-900 dark:text-sky-200 font-bold block mb-0.5">{t('secure booking', 'Secure Booking')}</strong>
                  <div className="text-sky-700 dark:text-sky-300 text-[11px] leading-relaxed">
                    {t('your payment information is safe and encrypted.', 'Your payment information is safe and encrypted.')}
                  </div>
                </div>
              </div>

              {}
              <div className="flex flex-col gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={handleContinueToPassengerInfo}
                  disabled={selectedSeats.length === 0}
                  className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-md ${
                    selectedSeats.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 cursor-pointer'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>{t('continue to passenger info', 'Continue to Passenger Info')}</span> <FaArrowRight />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <FaArrowLeft /> {t('back to trip selection', 'Back to Trip Selection')}
                </button>
              </div>
            </div>
          </div>
        )}

        {}
        {modalStep === 'passenger_info' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            {}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                  isAgentBooking ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                }`}>
                  <FaUser />
                </div>
                <div>
                  <h3 className="m-0 text-base font-extrabold text-slate-900 dark:text-white">
                    {isAgentBooking ? t('agent booking details', 'Agent Counter & Passenger Booking Details') : t('passenger details', 'Passenger Contact & Details')}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isAgentBooking ? t('agent booking details desc', 'Enter passenger contact info, booking channel, and configure payment status') : t('passenger info hint', 'Please enter accurate personal information for ticketing and verification')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateBookingAndPay} className="flex flex-col gap-4">
                {isAgentBooking && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Booking Channel / Source <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPassengerForm({ ...passengerForm, bookingChannel: 'walk_in' })}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          passengerForm.bookingChannel === 'walk_in'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        🚶 Walk-In (Terminal)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPassengerForm({ ...passengerForm, bookingChannel: 'phone_call' })}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          passengerForm.bookingChannel === 'phone_call'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        📞 Phone Call Booking
                      </button>
                    </div>
                  </div>
                )}

                {}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                    {t('passenger full name', 'Passenger Full Name')} <span className="text-red-500 ml-0.5">*</span>
                    <span className="ml-2 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded font-semibold">{t('editable', 'Editable')}</span>
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abebe Bikila"
                      value={passengerForm.fullName}
                      onChange={e => setPassengerForm({ ...passengerForm, fullName: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('phone', 'Phone')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FaPhone className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                      <input
                        type="tel"
                        required
                        placeholder="09..."
                        maxLength={10}
                        value={passengerForm.phone}
                        onChange={e => setPassengerForm({ ...passengerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        onKeyDown={e => {
                          if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('email', 'Email')} {isAgentBooking ? `(${t('optional', 'Optional')})` : ''}
                    </label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
                      <input
                        type="email"
                        placeholder="e.g. abebe@gmail.com"
                        value={passengerForm.email}
                        onChange={e => setPassengerForm({ ...passengerForm, email: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('gender', 'Gender')}
                    </label>
                    <select
                      value={passengerForm.gender}
                      onChange={e => setPassengerForm({ ...passengerForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition cursor-pointer"
                    >
                      <option value="Male">{t('male', 'Male')}</option>
                      <option value="Female">{t('female', 'Female')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('age', 'Age')} ({t('optional', 'Optional')})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="Age"
                      value={passengerForm.age}
                      onChange={e => setPassengerForm({ ...passengerForm, age: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                </div>

                {}
                {isAgentBooking && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FaCreditCard className="text-emerald-600 dark:text-emerald-400" /> Agent Payment Status Setup
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Payment Status *
                        </label>
                        <select
                          value={passengerForm.paymentStatus}
                          onChange={e => setPassengerForm({ ...passengerForm, paymentStatus: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
                            passengerForm.paymentStatus === 'PAID'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          <option value="PAID">Paid / Completed (Confirmed)</option>
                          <option value="PENDING">Pending / Reserved (5h Hold)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Payment Method *
                        </label>
                        <select
                          value={passengerForm.paymentMethod}
                          onChange={e => setPassengerForm({ ...passengerForm, paymentMethod: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none cursor-pointer"
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

                {}
                {selectedSeats.length > 1 && (
                  <div className="mt-2">
                    <label className="block text-xs font-extrabold text-slate-900 dark:text-white mb-2.5">
                      Passenger Names for Assigned Seats:
                    </label>
                    <div className="flex flex-col gap-2.5">
                      {passengersList.map((p, idx) => (
                        <div
                          key={p.seatNumber}
                          className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 flex items-center gap-3"
                        >
                          <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-md font-extrabold text-xs">
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
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            {}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center gap-2">
                <div className={`text-lg ${isAgentBooking ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  <FaCreditCard />
                </div>
                <h3 className="m-0 text-base font-extrabold text-slate-900 dark:text-white">
                  {isAgentBooking ? t('counter booking summary', 'Counter Booking Summary') : t('booking summary', 'Booking Summary')}
                </h3>
              </div>

              {}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1.5">{t('assigned seats', 'ASSIGNED SEATS')}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedSeats.sort((a, b) => a - b).map(s => (
                    <span key={s} className="bg-emerald-500 text-white px-2 py-0.5 rounded font-extrabold text-xs">
                      {t('seat', 'Seat')} {s}
                    </span>
                  ))}
                </div>
              </div>

              {}
              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3.5 text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-2.5">
                <div className="flex justify-between">
                  <span>{t('bus company', 'Bus Operator')}</span>
                  <strong className="text-slate-900 dark:text-white">{operatorName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('seat(s)', "Seat(s) Count")}</span>
                  <strong className="text-slate-900 dark:text-white">{selectedSeats.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('single leg fare', 'Single Leg Fare')}</span>
                  <strong className="text-slate-900 dark:text-white">ETB {basePrice.toLocaleString()} / {t('seat', 'seat')}</strong>
                </div>
                {isRoundTrip && (
                  <>
                    <div className="flex justify-between">
                      <span>{t('round trip fare', 'Round-Trip Fare (2 Legs)')}</span>
                      <strong className="text-slate-900 dark:text-white">ETB {(basePrice * 2).toLocaleString()} / {t('seat', 'seat')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Subtotal', 'Gross Subtotal')}</span>
                      <strong className="text-slate-900 dark:text-white">ETB {grossSubtotal.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{t('round trip saver', 'Round-Trip Saver (10% OFF)')}</span>
                      <strong className="font-bold">- ETB {roundTripDiscount.toLocaleString()}</strong>
                    </div>
                  </>
                )}
                {isAgentBooking && (
                  <div className="flex justify-between">
                    <span>{t('payment method', 'Payment Method')}</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{passengerForm.paymentMethod}</strong>
                  </div>
                )}
              </div>

              {}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3.5 flex justify-between items-center">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{t('total amount', 'Total Fare')}</span>
                <span className={`text-xl font-black ${isAgentBooking ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  ETB {totalPayable.toFixed(2)}
                </span>
              </div>

              {}
              <div className={`rounded-xl p-3 text-xs flex items-center gap-2.5 border ${
                isAgentBooking
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300'
              }`}>
                <FaShieldAlt className={`text-lg shrink-0 ${isAgentBooking ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
                <span className="text-[11px] leading-relaxed">
                  {isAgentBooking
                    ? 'Direct staff counter booking. Digital ticket & printable boarding pass issued immediately.'
                    : 'Encrypted payment. Instant digital QR ticket confirmation.'}
                </span>
              </div>

              {}
              <div className="flex flex-col gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={handleCreateBookingAndPay}
                  disabled={isSubmitting}
                  className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                    isAgentBooking
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <FaArrowLeft /> {t('back to seat selection', 'Back to Seat Selection')}
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
