import React, { useState } from 'react';
import {
  FaBus, FaSearch, FaUser, FaCalendarAlt,
  FaCheckCircle, FaPrint, FaArrowLeft, FaClock, FaCouch,
  FaQrcode, FaEnvelope
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { scheduleAPI, notificationAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import SeatSelectorModal from '../../../components/SeatSelectorModal';
import TicketModal from '../../../components/TicketModal';
import { useTranslation } from '../../../i18n';

const CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar',
  'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga'
];
const TODAY = new Date().toISOString().split('T')[0];

const CounterBooking = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const STEPS = [
    { id: 1, label: t('booking.passengerInfo', 'Passenger Info') },
    { id: 2, label: t('booking.findBus', 'Find Bus') },
    { id: 3, label: t('booking.selectSeat', 'Select Seat') },
    { id: 4, label: t('booking.ticket', 'Ticket') },
  ];

  const [step, setStep] = useState('form');

  const [pax, setPax] = useState({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    age: '',
  });

  const [tripType, setTripType] = useState('oneway');
  const [from, setFrom] = useState('Addis Ababa');
  const [to, setTo] = useState('Bahir Dar');
  const [date, setDate] = useState(TODAY);
  const [returnDate, setReturnDate] = useState('');

  const [schedules, setSchedules] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [issuedBooking, setIssuedBooking] = useState(null);

  const [showTicketModalBooking, setShowTicketModalBooking] = useState(null);

  const companyId = user?.companyId?._id || user?.companyId;

  const handleSearch = async () => {
    if (!from || !to || from === to) {
      toast.warn(t('forms.selectDifferentCities', 'Please select different origin and destination cities.'));
      return;
    }
    if (!date) {
      toast.warn(t('forms.selectDepartureDate', 'Please select a departure date.'));
      return;
    }
    if (tripType === 'round' && !returnDate) {
      toast.warn(t('forms.selectReturnDate', 'Please select a return date for round trip.'));
      return;
    }
    if (!pax.fullName.trim()) {
      toast.warn(t('forms.enterPassengerName', 'Please enter passenger full name.'));
      return;
    }
    if (!pax.phone.trim()) {
      toast.warn(t('forms.enterPassengerPhone', 'Please enter passenger phone number.'));
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
        toast.info(t('agent.noScheduledTrips', 'No scheduled trips found for your company on this route and date.'));
      }
    } catch (err) {
      toast.error(err.message || t('agent.searchFailed', 'Search failed'));
    } finally {
      setSearching(false);
    }
  };

  const handleAgentBookingComplete = (booking) => {
    setIssuedBooking(booking);
    setSelectedSchedule(null);
    setShowTicketModalBooking(booking);
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

  const labelClass = "block text-[0.72rem] font-extrabold text-slate-600 mb-1";
  const inputClass = "w-full px-3 py-[9px] rounded-lg border-[1.5px] border-slate-300 text-[0.87rem] outline-none bg-white text-slate-900 focus:border-eb-green transition-colors";

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-[14px] border border-slate-200 py-3.5 px-[22px] flex items-center overflow-x-auto shadow-sm">
        {STEPS.map((s, i) => {
          const done = stepNum > s.id;
          const active = stepNum === s.id;
          return (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-[7px] shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.73rem] font-black ${
                  done ? 'bg-green-500 text-white' : active ? 'bg-eb-green text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {done ? '✓' : s.id}
                </div>
                <span className={`text-[0.78rem] whitespace-nowrap ${
                  active ? 'font-extrabold text-slate-900' : done ? 'font-semibold text-green-600' : 'font-semibold text-slate-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 min-w-5 h-0.5 mx-2 ${done ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {step === 'form' && (
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-[22px] shadow-sm">
            <h3 className="m-0 mb-4 text-base font-black text-slate-900 flex items-center gap-2">
              <FaUser className="text-eb-green" /> {t('booking.passengerDetails', 'Passenger Details')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className={labelClass}>{t('forms.fullName', 'Full Name')} *</label>
                <input
                  type="text"
                  placeholder=""
                  value={pax.fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, fullName: val }));
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t('forms.phone', 'Phone Number')} *</label>
                <input
                  type="tel"
                  placeholder=""
                  maxLength={10}
                  value={pax.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPax(prev => ({ ...prev, phone: val }));
                  }}
                  onKeyDown={e => {
                    if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t('forms.email', 'Email Address')}</label>
                <input
                  type="email"
                  placeholder=""
                  value={pax.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, email: val }));
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>{t('forms.gender', 'Gender')}</label>
                <select
                  value={pax.gender}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, gender: val }));
                  }}
                  className={inputClass}
                >
                  <option value="Male">{t('forms.male', 'Male')}</option>
                  <option value="Female">{t('forms.female', 'Female')}</option>
                  <option value="Other">{t('forms.other', 'Other')}</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>{t('forms.age', 'Age')}</label>
                <input
                  type="number"
                  placeholder=""
                  min="1" max="120"
                  value={pax.age}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPax(prev => ({ ...prev, age: val }));
                  }}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-[22px] shadow-sm">
            <h3 className="m-0 mb-4 text-base font-black text-slate-900 flex items-center gap-2">
              <FaBus className="text-eb-green" /> {t('booking.searchAvailableBus', 'Search Available Bus')}
            </h3>

            <div className="flex gap-1.5 mb-[18px] bg-slate-50 rounded-xl p-1 w-fit border border-slate-200">
              {['oneway', 'round'].map(tType => (
                <button
                  key={tType}
                  type="button"
                  onClick={() => setTripType(tType)}
                  className={`px-[18px] py-[7px] rounded-lg border-0 font-extrabold text-[0.82rem] cursor-pointer transition-colors ${
                    tripType === tType ? 'bg-eb-green text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tType === 'oneway' ? t('booking.oneWay', 'One-Way') : t('booking.roundTripDiscount', 'Round Trip (10% Discount)')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>{t('booking.fromOrigin', 'From (Origin)')}</label>
                <select value={from} onChange={e => setFrom(e.target.value)} className={inputClass}>
                  {CITIES.map(c => <option key={c} value={c}>{t(c, c)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('booking.toDestination', 'To (Destination)')}</label>
                <select value={to} onChange={e => setTo(e.target.value)} className={inputClass}>
                  {CITIES.map(c => <option key={c} value={c}>{t(c, c)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('booking.departureDate', 'Departure Date')}</label>
                <input
                  type="date" value={date} min={TODAY}
                  onChange={e => setDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              {tripType === 'round' ? (
                <div>
                  <label className={labelClass}>{t('booking.returnDate', 'Return Date')} *</label>
                  <input
                    type="date" value={returnDate} min={date || TODAY}
                    onChange={e => setReturnDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div className="flex items-end">
                  <div className="text-[0.75rem] text-slate-400 py-2">{t('booking.standardOneWay', 'Standard One-Way Trip')}</div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !pax.fullName.trim() || !pax.phone.trim()}
              className={`mt-[18px] px-[26px] py-[11px] text-white border-0 rounded-xl font-black text-[0.9rem] flex items-center gap-2 transition-all ${
                !pax.fullName.trim() || !pax.phone.trim()
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-eb-green hover:bg-[#067328] cursor-pointer shadow-[0_2px_8px_rgba(7,137,48,0.25)]'
              }`}
            >
              <FaSearch /> {searching ? t('common.loading', 'Searching...') : t('booking.searchBuses', 'Search Buses')}
            </button>
            {(!pax.fullName.trim() || !pax.phone.trim()) && (
              <p className="mt-2 mb-0 text-[0.74rem] text-amber-600 font-bold">
                {t('agent.fillPaxNotice', 'Fill passenger name and phone above before searching.')}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'results' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2.5">
            <div>
              <h3 className="m-0 font-black text-slate-900 text-lg">
                {t(from, from)} → {t(to, to)} · {date} {tripType === 'round' ? `· ${t('booking.returnDate', 'Return')}: ${returnDate}` : ''}
              </h3>
              <p className="mt-[3px] mb-0 text-[0.8rem] text-slate-500">
                {t('passenger.passenger', 'Passenger')}: <strong>{pax.fullName}</strong> · {pax.phone} {tripType === 'round' ? `· ${t('booking.roundTripDiscount', 'Round-Trip (10% Discount)')}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('form')}
              className="px-3.5 py-[7px] rounded-lg border-[1.5px] border-slate-300 bg-white text-slate-700 font-bold text-[0.8rem] cursor-pointer flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
            >
              <FaArrowLeft /> {t('booking.modifySearch', 'Modify Search')}
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-[50px] px-5 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
              <FaBus className="text-[2.5rem] text-slate-300 mb-3 mx-auto" />
              <h4 className="m-0 mb-1 text-slate-700 font-bold">{t('booking.noTripsFound', 'No trips found')}</h4>
              <p className="m-0 text-[0.82rem]">
                {t('agent.noSchedulesNotice', 'Your company has no schedules on this route and date.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
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
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-[260px]">
                      {sch.companyId?.logo || sch.company?.logo ? (
                        <img
                          src={sch.companyId?.logo || sch.company?.logo}
                          alt={sch.companyId?.companyName || 'Company Logo'}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-eb-green to-emerald-800 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-sm">
                          <FaBus />
                        </div>
                      )}

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-eb-green">
                            {sch.companyId?.companyName || sch.company?.companyName || user?.companyId?.companyName || 'Ethio Trip'}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {t('admin.bus', 'Bus')} {sch.bus?.busNumber} · {sch.bus?.type || 'Standard'}
                          </span>
                          {isRound && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              {t('booking.roundTripDiscount', 'Round-Trip (10% Off)')}
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <span>{t(from, from)}</span>
                          <span className="text-eb-green">→</span>
                          <span>{t(to, to)}</span>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                          <span><FaCalendarAlt className="text-eb-green mr-1 inline" />{sch.date}</span>
                          <span><FaClock className="text-eb-green mr-1 inline" />{sch.departureTime} → {sch.arrivalTime || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-48 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-center">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>{booked} {t('booking.booked', 'Booked')}</span>
                        <span className={left > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {left} {t('booking.seatsLeft', 'Seats Left')}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                    </div>

                    <div className="flex sm:flex-row md:flex-col items-center sm:justify-between md:items-end md:justify-center gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <div className="text-xl font-black text-slate-900">
                          ETB {finalRate.toLocaleString()}
                        </div>
                        {isRound && (
                          <div className="text-[11px] text-slate-400 line-through">
                            ETB {grossRate.toLocaleString()}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={left === 0}
                        onClick={() => {
                          setSelectedSchedule({ ...sch, tripType, returnDate });
                          setStep('seat_modal');
                        }}
                        className={`px-5 py-2.5 text-white border-0 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                          left > 0 ? 'bg-eb-green hover:bg-[#067328]' : 'bg-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <FaCouch /> {left > 0 ? t('booking.selectSeat', 'Select Seats') : t('booking.soldOut', 'Sold Out')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 'ticket' && (
        <div className="bg-green-50 border-2 border-green-300 rounded-[20px] p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center text-[1.8rem] mx-auto mb-4">
            <FaCheckCircle />
          </div>
          <h2 className="m-0 mb-1.5 text-green-800 font-black text-[1.35rem]">
            {t('ticket.issuedSuccess', 'Ticket Successfully Issued!')}
          </h2>
          <p className="m-0 mb-5 text-green-700 text-[0.88rem]">
            {t('ticket.reference', 'Reference')}: <strong>{issuedBooking?.ticketNumber || issuedBooking?._id}</strong>
          </p>

          <div className="bg-white border border-green-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left mb-5 shadow-sm">
            <div>
              <div className="text-[0.68rem] text-slate-500 font-bold uppercase">{t('passenger.passenger', 'Passenger')}</div>
              <div className="font-extrabold text-slate-900">{issuedBooking?.passenger?.name}</div>
              <div className="text-[0.75rem] text-slate-500">{issuedBooking?.passenger?.phone}</div>
            </div>
            <div>
              <div className="text-[0.68rem] text-slate-500 font-bold uppercase">{t('admin.route', 'Route')}</div>
              <div className="font-extrabold text-slate-900">
                {issuedBooking?.schedule?.route?.from} ➔ {issuedBooking?.schedule?.route?.to}
              </div>
              <div className="text-[0.75rem] text-slate-500">
                {issuedBooking?.schedule?.date} · {issuedBooking?.schedule?.departureTime}
              </div>
            </div>
            <div>
              <div className="text-[0.68rem] text-slate-500 font-bold uppercase">{t('booking.seats', 'Seats')}</div>
              <div className="flex gap-1 flex-wrap mt-1">
                {(issuedBooking?.selectedSeats || []).map(s => (
                  <span
                    key={s}
                    className="bg-green-500 text-white px-2 py-0.5 rounded font-black text-[0.8rem]"
                  >
                    {t('booking.seat', 'Seat')} {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[0.68rem] text-slate-500 font-bold uppercase">{t('ticket.fareStatus', 'Fare / Status')}</div>
              <div className="font-black text-green-800 text-[1.05rem]">
                ETB {issuedBooking?.totalPrice || issuedBooking?.baseFare}
              </div>
              <div className="text-[0.72rem] text-green-700 font-bold">
                {issuedBooking?.paymentStatus || 'PAID'}
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => setShowTicketModalBooking(issuedBooking)}
              className="px-[22px] py-2.5 bg-eb-green hover:bg-[#067328] text-white border-0 rounded-lg font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-[7px] transition-colors"
            >
              <FaQrcode /> {t('ticket.viewDigitalTicket', 'View Digital Ticket with QR Code')}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const targetEmail = pax.email || issuedBooking?.passenger?.email || issuedBooking?.contactEmail;
                  if (!targetEmail) {
                    const entered = window.prompt(t('agent.enterPassengerEmail', "Enter passenger's email address:"));
                    if (!entered) return;
                    await notificationAPI.sendTicketEmail({ bookingId: issuedBooking._id, email: entered });
                  } else {
                    await notificationAPI.sendTicketEmail({ bookingId: issuedBooking._id, email: targetEmail });
                  }
                  toast.success(t('ticket.sentSuccess', 'Ticket sent to passenger email successfully!'));
                } catch (err) {
                  toast.error(err.message || t('ticket.sendFailed', 'Failed to send ticket email'));
                }
              }}
              className="px-[22px] py-2.5 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-[7px] transition-colors"
            >
              <FaEnvelope /> {t('ticket.sendToEmail', 'Send Ticket to Email')}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-[22px] py-2.5 bg-green-800 hover:bg-green-900 text-white border-0 rounded-lg font-extrabold text-[0.85rem] cursor-pointer flex items-center gap-[7px] transition-colors"
            >
              <FaPrint /> {t('ticket.printBoardingPass', 'Print Boarding Pass')}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="px-[22px] py-2.5 bg-white hover:bg-slate-50 text-slate-700 border-[1.5px] border-slate-300 rounded-lg font-bold text-[0.85rem] cursor-pointer transition-colors"
            >
              {t('booking.bookAnother', 'Book Another Ticket')}
            </button>
          </div>
        </div>
      )}

      {step === 'seat_modal' && selectedSchedule && (
        <SeatSelectorModal
          schedule={selectedSchedule}
          isAgentBooking={true}
          onClose={() => setStep('results')}
          onAgentBookingComplete={handleAgentBookingComplete}
          prefilledPassenger={pax}
        />
      )}

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
