import React, { useState, useEffect } from 'react';
import {
  FaSearch, FaExchangeAlt, FaBus, FaClock, FaCouch, FaStar,
  FaShieldAlt, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaCheckCircle,
  FaArrowRight, FaArrowLeft, FaTicketAlt, FaDownload, FaPrint,
  FaCreditCard, FaLock, FaExclamationTriangle, FaTimes, FaTag
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { scheduleAPI, companyAPI, bookingAPI, paymentAPI, platformSettingAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../i18n';
import { toast } from 'react-toastify';
import PaymentModal from '../../../components/PaymentModal';
import SeatSelectorModal from '../../../components/SeatSelectorModal';
import TicketModal from '../../../components/TicketModal';

const DEFAULT_CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar',
  'Gondar', 'Jimma', 'Jijiga', 'Adama', 'Dessie', 'Arba Minch', 'Harar'
];

export const getCompanyLogo = (companyName, customLogo) => {
  if (customLogo && typeof customLogo === 'string' && !customLogo.startsWith('http') && customLogo.startsWith('/')) {
    return customLogo;
  }
  const name = (companyName || '').toLowerCase();
  if (name.includes('selam')) return '/logos/selam_bus.png';
  if (name.includes('sky')) return '/logos/sky_bus.png';
  if (name.includes('abay')) return '/logos/abay_bus.png';
  if (name.includes('ethio')) return '/logos/sky_bus.png';
  if (name.includes('zemen')) return '/logos/zemen_bus.png';
  if (name.includes('habesha')) return '/logos/habesha_bus.png';
  if (customLogo && typeof customLogo === 'string' && customLogo.startsWith('/')) return customLogo;
  return '/logos/sky_bus.png';
};

export const CompanyLogoBadge = ({ companyName, logo, size = 46 }) => {
  const [imgError, setImgError] = useState(false);
  const logoSrc = getCompanyLogo(companyName, logo);

  return (
    <div
      className="rounded-xl bg-white border-[1.5px] border-slate-200 flex items-center justify-center overflow-hidden p-[3px] shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
      style={{ width: size, height: size }}
    >
      {!imgError ? (
        <img
          src={logoSrc}
          alt={companyName || 'Bus Operator'}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <div
          className="w-full h-full rounded-lg bg-green-50 text-green-600 flex items-center justify-center"
          style={{ fontSize: size * 0.45 }}
        >
          <FaBus />
        </div>
      )}
    </div>
  );
};

const BusSearch = ({ onSelectSchedule }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const getFutureDateString = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [tripType, setTripType] = useState('oneway');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);

  const [flowStep, setFlowStep] = useState('search');
  const [loading, setLoading] = useState(false);
  const [outboundSchedules, setOutboundSchedules] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  const [lockedCompany, setLockedCompany] = useState(null);
  const [selectedOutboundSchedule, setSelectedOutboundSchedule] = useState(null);
  const [selectedOutboundSeats, setSelectedOutboundSeats] = useState([]);

  const [selectedOneWaySchedule, setSelectedOneWaySchedule] = useState(null);
  const [selectedOneWaySeats, setSelectedOneWaySeats] = useState([]);

  const [returnSchedules, setReturnSchedules] = useState([]);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [selectedReturnSchedule, setSelectedReturnSchedule] = useState(null);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState([]);
  const [noReturnBusesFound, setNoReturnBusesFound] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [confirmedBookingForTicket, setConfirmedBookingForTicket] = useState(null);
  const [modalSchedule, setModalSchedule] = useState(null);

  const [roundPassengerForm, setRoundPassengerForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    gender: '',
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

  const [cities, setCities] = useState(DEFAULT_CITIES);
  useEffect(() => {
    platformSettingAPI.getSettings().then((data) => {
      if (data?.cities?.length > 0) setCities(data.cities);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleVoiceSearch = (e) => {
      const { origin, destination, date, passengers: pax } = e.detail || {};
      if (origin) setFromCity(origin);
      if (destination) setToCity(destination);
      if (date) setTravelDate(date);
      if (pax) setPassengers(pax);

      if (origin && destination) {
        setLoading(true);
        scheduleAPI.search({
          from: origin,
          to: destination,
          date: date || travelDate,
        }).then((schedules) => {
          const list = schedules || [];
          setOutboundSchedules(list);
          if (list.length > 0) {
            setFlowStep('oneway_results');
            toast.success(`Voice AI: Found ${list.length} bus(es) for ${origin} → ${destination}!`);
          } else {
            toast.info(`No buses found for ${origin} → ${destination} on ${date || travelDate}.`);
            setFlowStep('search');
          }
        }).catch((err) => {
          console.error('Voice search fetch error:', err);
        }).finally(() => {
          setLoading(false);
        });
      }
    };

    window.addEventListener('ethiotrip_voice_search', handleVoiceSearch);
    return () => {
      window.removeEventListener('ethiotrip_voice_search', handleVoiceSearch);
    };
  }, [travelDate]);

  const handleSwap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!fromCity || !toCity) {
      toast.error(t('search.selectCities', 'Please select departure and destination cities'));
      return;
    }
    if (fromCity === toCity) {
      toast.error(t('search.diffCities', 'Departure and Destination cities must be different'));
      return;
    }
    if (!travelDate) {
      toast.error(t('search.selectDate', 'Please select travel date'));
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
        toast.info(t('search.noBusesDate', 'No bus schedules found for this route on the selected date.'));
        setFlowStep('search');
      } else if (tripType === 'round') {
        const compMap = new Map();
        schedules.forEach((sch) => {
          const comp = sch.companyId || sch.company;
          const compId = comp?._id || comp?.id || 'c_default';
          const compName = comp?.companyName || sch.bus?.busNumber || 'Ethio Trip';
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
        setFlowStep('oneway_results');
      }
    } catch {
      toast.error(t('search.fetchFailed', 'Failed to fetch bus schedules. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (comp) => {
    setLockedCompany(comp);
    setFlowStep('outbound_select');
    toast.success(`Booking locked to ${comp.companyName}`);
  };

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

  const handlePayOnlyOutbound = () => {
    setTripType('oneway');
    setSelectedReturnSchedule(null);
    setSelectedReturnSeats([]);
    setFlowStep('review');
    toast.info('Trip updated to One-Way Outbound journey.');
  };

  const handleChangeReturnDate = async (newDate) => {
    setReturnDate(newDate);
    await fetchReturnSchedules(newDate);
  };

  const activeOutboundSeats = (selectedOutboundSeats && selectedOutboundSeats.length > 0)
    ? selectedOutboundSeats
    : (selectedOutboundSchedule?.selectedSeats && selectedOutboundSchedule.selectedSeats.length > 0)
    ? selectedOutboundSchedule.selectedSeats
    : [];

  const activeReturnSeats = (selectedReturnSeats && selectedReturnSeats.length > 0)
    ? selectedReturnSeats
    : (selectedReturnSchedule?.selectedSeats && selectedReturnSchedule.selectedSeats.length > 0)
    ? selectedReturnSchedule.selectedSeats
    : [];

  const outboundPrice = (selectedOutboundSchedule?.price || 750) * (activeOutboundSeats.length || passengers);
  const returnPrice = (selectedReturnSchedule?.price || 750) * (activeReturnSeats.length || passengers);
  const isRound = tripType === 'round' && selectedReturnSchedule;
  const subtotal = outboundPrice + (isRound ? returnPrice : 0);
  const discountAmount = isRound ? Math.round(subtotal * 0.1) : 0;
  const finalTotal = subtotal - discountAmount;

  const handleConfirmAndPayRoundTrip = async () => {
    if (!selectedOutboundSchedule) {
      toast.error('Please select outbound trip schedule');
      return;
    }

    const finalOutboundSeats = (activeOutboundSeats && activeOutboundSeats.length > 0)
      ? activeOutboundSeats
      : (selectedOutboundSchedule?.selectedSeats && selectedOutboundSchedule.selectedSeats.length > 0)
      ? selectedOutboundSchedule.selectedSeats
      : [];

    const finalReturnSeats = (activeReturnSeats && activeReturnSeats.length > 0)
      ? activeReturnSeats
      : (selectedReturnSchedule?.selectedSeats && selectedReturnSchedule.selectedSeats.length > 0)
      ? selectedReturnSchedule.selectedSeats
      : [];

    if (finalOutboundSeats.length < passengers) {
      toast.error(`Please select ${passengers} seat(s) for the outbound trip`);
      return;
    }
    if (isRound && (!selectedReturnSchedule || finalReturnSeats.length < passengers)) {
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
        selectedSeats: finalOutboundSeats.map(String),
        tripType: isRound ? 'round' : 'oneway',
        returnScheduleId: isRound ? selectedReturnSchedule._id : undefined,
        returnSeats: isRound ? finalReturnSeats.map(String) : undefined,
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
    <div className="flex flex-col gap-6 pb-10 w-full">
      <div className="mx-auto w-full max-w-6xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 transition-all">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
            <button
              type="button"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tripType === 'oneway'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setTripType('oneway');
                setFlowStep('search');
              }}
            >
              <FaBus /> {t('home.tripTypeOneWay', 'One Way')}
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tripType === 'round'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => {
                setTripType('round');
                setFlowStep('search');
              }}
            >
              <FaExchangeAlt /> {t('home.tripTypeRound', 'Round Trip')}
            </button>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('home.from', 'Departure City')}
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <FaMapMarkerAlt className="text-slate-400 mr-2 shrink-0 text-sm" />
                <select
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="">{t('home.selectOrigin', 'Select Departure City')}</option>
                  {cities.map((c) => <option key={c} value={c} className="dark:bg-slate-900">{t(c, c)}</option>)}
                </select>
              </div>
            </div>

            <div className="lg:col-span-1 flex justify-center pb-1">
              <button
                type="button"
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                onClick={handleSwap}
                title={t('home.swapCities', 'Swap cities')}
              >
                <FaExchangeAlt />
              </button>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('home.to', 'Destination City')}
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <FaMapMarkerAlt className="text-slate-400 mr-2 shrink-0 text-sm" />
                <select
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  <option value="">{t('home.selectDestination', 'Select Destination City')}</option>
                  {cities.filter((c) => c !== fromCity).map((c) => <option key={c} value={c} className="dark:bg-slate-900">{t(c, c)}</option>)}
                </select>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('home.departureDate', 'Travel Date')}
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <FaCalendarAlt className="text-slate-400 mr-2 shrink-0 text-sm" />
                <input
                  type="date"
                  value={travelDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {tripType === 'round' && (
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('home.returnDate', 'Return Date')}
                </label>
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                  <FaCalendarAlt className="text-emerald-600 mr-2 shrink-0 text-sm" />
                  <input
                    type="date"
                    value={returnDate}
                    min={travelDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            <div className="lg:col-span-1 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('home.passengers', 'Seats')}
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <FaUser className="text-slate-400 mr-1.5 shrink-0 text-xs" />
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n} className="dark:bg-slate-900">{n}</option>)}
                </select>
              </div>
            </div>

            <div className={tripType === 'round' ? 'lg:col-span-12 mt-2' : 'lg:col-span-2'}>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <FaSearch /> {loading ? t('home.searching', 'Searching...') : t('home.searchBuses', 'Search Buses')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {tripType === 'oneway' && flowStep === 'oneway_results' && (
        <div className="max-w-[1100px] mx-auto w-full">
          <div className="mb-[18px] flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="m-0 text-[1.25rem] font-black text-slate-900">
                {t(fromCity, fromCity)} → {t(toCity, toCity)}
              </h3>
              <p className="mt-[3px] mb-0 text-slate-500 text-[0.85rem]">
                {outboundSchedules.length} {outboundSchedules.length > 1 ? t('search.busDeparturesAvailable', 'bus departures available on') : t('search.busDepartureAvailable', 'bus departure available on')} {travelDate}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFlowStep('search')}
              className="py-1.5 px-3.5 rounded-lg border border-[1.5px] border-slate-300 bg-white text-slate-600 font-bold text-[0.8rem] cursor-pointer hover:bg-slate-50 transition-colors"
            >
              {t('search.modifySearch', 'Modify Search')}
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {outboundSchedules.map((sch) => {
              const compName = sch.companyId?.companyName || sch.company?.companyName || sch.bus?.busNumber || 'Ethio Trip';
              return (
                <div
                  key={sch._id}
                  className="bg-white rounded-[18px] border border-[1.5px] border-slate-200 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-150"
                >
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <CompanyLogoBadge companyName={compName} logo={sch.companyId?.logo || sch.company?.logo} size={48} />
                      <div>
                        <div className="font-black text-slate-900 text-[1.05rem]">{compName}</div>
                        <div className="text-[0.75rem] text-slate-500">
                          Bus {sch.bus?.busNumber || 'EB-101'} · {sch.bus?.type || 'Luxury Express'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[1.3rem] font-black text-emerald-600">
                        ETB {sch.price}
                      </div>
                      <span className="text-[0.72rem] text-slate-500">{t('search.perPassenger', 'per passenger')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3.5 flex-wrap gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <div className="text-[0.7rem] text-slate-400 font-bold">{t('passenger.departure', 'DEPARTURE')}</div>
                        <div className="font-black text-slate-900 text-[0.95rem]">{sch.departureTime}</div>
                      </div>
                      <span className="text-slate-300">→</span>
                      <div>
                        <div className="text-[0.7rem] text-slate-400 font-bold">{t('ticket.arrivalTime', 'ARRIVAL')}</div>
                        <div className="font-black text-slate-900 text-[0.95rem]">{sch.arrivalTime}</div>
                      </div>
                      <div className="ml-2.5 bg-green-50 text-emerald-600 py-[3px] px-2 rounded-md text-[0.75rem] font-extrabold flex items-center gap-1.5">
                        <FaCouch /> {sch.availableSeats} {t('search.seatsLeft', 'Seats Left')}
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
                      className="py-2.5 px-[22px] bg-emerald-600 text-white border-none rounded-[10px] font-extrabold text-[0.88rem] cursor-pointer flex items-center gap-2 shadow-[0_4px_12px_rgba(5,150,105,0.25)] hover:bg-emerald-700 transition-all duration-150"
                    >
                      {t('search.selectSeats', 'Select Seat(s)')} <FaArrowRight />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tripType === 'round' && flowStep !== 'search' && (
        <div className="max-w-[1100px] mx-auto w-full">
          <div className="flex items-center justify-between bg-white py-3.5 px-5 rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-x-auto gap-2">
            {[
              { id: 'company_select', label: t('search.stepCompany', '1. Select Company'), done: ['outbound_select', 'return_select', 'review'].includes(flowStep) },
              { id: 'outbound_select', label: t('search.stepOutbound', '2. Outbound Trip'), done: ['return_select', 'review'].includes(flowStep) },
              { id: 'return_select', label: t('search.stepReturn', '3. Return Trip'), done: ['review'].includes(flowStep) },
              { id: 'review', label: t('search.stepReview', '4. Review & Confirm'), done: false },
            ].map((step, idx) => {
              const isCurrent = flowStep === step.id;
              return (
                <div key={step.id} className="flex items-center gap-2 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[0.75rem] ${
                    step.done
                      ? 'bg-green-600 text-white'
                      : isCurrent
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[0.8rem] whitespace-nowrap ${
                    isCurrent
                      ? 'font-extrabold text-slate-900'
                      : step.done
                        ? 'font-semibold text-green-600'
                        : 'font-semibold text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                  {idx < 3 && <span className="text-slate-300 ml-2">→</span>}
                </div>
              );
            })}
          </div>

          {flowStep === 'company_select' && (
            <div>
              <div className="mb-4">
                <h3 className="m-0 mb-1 text-[1.25rem] font-black text-slate-900">
                  {t('search.availableOperators', 'Available Bus Operators for')} {t(fromCity, fromCity)} ↔ {t(toCity, toCity)}
                </h3>
                <p className="m-0 text-slate-500 text-[0.85rem]">
                  {t('search.selectCompanyPrompt', 'Select ONE company to lock your round-trip journey and secure maximum round-trip discounts.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {companiesList.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-white rounded-[18px] border border-[1.5px] border-slate-200 p-[22px] shadow-[0_4px_15px_rgba(0,0,0,0.04)] flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <CompanyLogoBadge companyName={comp.companyName} logo={comp.logo} size={52} />
                          <div>
                            <h4 className="m-0 text-[1.1rem] font-black text-slate-900">
                              {comp.companyName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[0.75rem] text-amber-600 font-bold mt-0.5">
                              <FaStar /> {comp.rating} ★
                            </div>
                          </div>
                        </div>

                        <span className="text-[0.7rem] bg-green-50 text-emerald-600 font-extrabold py-1 px-2.5 rounded-full">
                          {t('search.roundTripDiscount', '10% Round-Trip Discount Applied')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {comp.busTypes.map((type, i) => (
                          <span key={i} className="bg-slate-50 border border-slate-200 text-slate-600 py-[3px] px-2 rounded-md text-[0.72rem] font-bold">
                            {type}
                          </span>
                        ))}
                      </div>

                      <div className="text-[0.78rem] text-slate-500">
                        {comp.schedulesCount} {t('home.dailyDeparture', 'daily departure')}{comp.schedulesCount > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-3.5">
                      <div>
                        <span className="text-[0.7rem] text-slate-500">{t('search.startingFrom', 'Starting From')}</span>
                        <div className="text-[1.25rem] font-black text-emerald-600">
                          ETB {comp.minPrice} <span className="text-[0.75rem] text-slate-500 font-medium">/ {t('passenger.seat', 'seat')}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectCompany(comp)}
                        className="py-2.5 px-5 bg-[#078930] text-white border-none rounded-xl font-extrabold text-[0.88rem] cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(7,137,48,0.3)] hover:bg-[#066d26] transition-all"
                      >
                        {t('search.selectLockCompany', 'Select & Lock Company')} <FaArrowRight />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {flowStep === 'outbound_select' && (
            <div>
              <div className="bg-green-50 border border-[1.5px] border-green-300 rounded-2xl py-4 px-[22px] mb-5 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <span className="text-[0.72rem] font-black text-green-800 uppercase tracking-[0.5px]">
                    {t('search.outboundTripStep', 'OUTBOUND TRIP · STEP 1 OF 2')}
                  </span>
                  <h3 className="m-0 mt-0.5 text-[1.2rem] font-black text-emerald-950">
                    {t(fromCity, fromCity)} → {t(toCity, toCity)} ({travelDate})
                  </h3>
                </div>

                {lockedCompany && (
                  <div className="bg-white border border-green-200 py-1.5 px-3.5 rounded-[10px] text-[0.82rem] font-extrabold text-[#078930] flex items-center gap-1.5">
                    <FaLock /> {t('search.lockedCompany', 'Locked Company')}: {lockedCompany.companyName}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3.5">
                <h4 className="m-0 mb-1 text-[0.95rem] font-extrabold text-slate-900">
                  {t('search.chooseDepartureSchedule', 'Choose Departure Schedule')} ({outboundSchedules.length})
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
                        className={`bg-white rounded-[18px] p-5 transition-all duration-150 border-2 ${
                          isSelected
                            ? 'border-[#078930] shadow-[0_6px_20px_rgba(7,137,48,0.15)]'
                            : 'border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <CompanyLogoBadge companyName={compName} logo={lockedCompany?.logo || sch.companyId?.logo || sch.company?.logo} size={48} />
                            <div>
                              <div className="font-black text-slate-900 text-[1.05rem]">{compName}</div>
                              <div className="text-[0.75rem] text-slate-500">
                                Bus {sch.bus?.busNumber || 'EB-101'} · {sch.bus?.type || 'Luxury Express'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[1.3rem] font-black text-[#078930]">
                              ETB {sch.price}
                            </div>
                            <span className="text-[0.72rem] text-slate-500">{t('search.perPassenger', 'per passenger')}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-3.5 flex-wrap gap-3">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <div className="text-[0.7rem] text-slate-400 font-bold">{t('passenger.departure', 'DEPARTURE')}</div>
                              <div className="font-black text-slate-900 text-[0.95rem]">{sch.departureTime}</div>
                            </div>
                            <span className="text-slate-300">→</span>
                            <div>
                              <div className="text-[0.7rem] text-slate-400 font-bold">{t('ticket.arrivalTime', 'ARRIVAL')}</div>
                              <div className="font-black text-slate-900 text-[0.95rem]">{sch.arrivalTime}</div>
                            </div>
                            <div className="ml-2.5 bg-green-50 text-emerald-600 py-[3px] px-2 rounded-md text-[0.75rem] font-extrabold flex items-center gap-1.5">
                              <FaCouch /> {sch.availableSeats} {t('search.seatsLeft', 'Seats Left')}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setModalSchedule({
                                ...sch,
                                _mode: 'outbound',
                                onSeatsSelected: (seats, updatedSch) => {
                                  const confirmedSeats = Array.isArray(seats) && seats.length > 0 ? seats : ['1'];
                                  setSelectedOutboundSchedule({ ...updatedSch, selectedSeats: confirmedSeats });
                                  setSelectedOutboundSeats(confirmedSeats);
                                  setModalSchedule(null);
                                  setFlowStep('return_select');
                                  const compId = lockedCompany?.id || lockedCompany?.rawCompany?._id || updatedSch?.companyId?._id || updatedSch?.companyId;
                                  fetchReturnSchedules(returnDate, compId);
                                  toast.success(`Outbound seats (${confirmedSeats.join(', ')}) saved! Loading return trips...`);
                                }
                              });
                            }}
                            className="py-2.5 px-[22px] bg-[#078930] text-white border-none rounded-[10px] font-extrabold text-[0.88rem] cursor-pointer flex items-center gap-2 shadow-[0_4px_12px_rgba(7,137,48,0.25)] hover:bg-[#066d26] transition-all duration-150"
                          >
                            {t('search.selectSeats', 'Select Outbound Seat(s)')} <FaArrowRight />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {flowStep === 'return_select' && (
            <div>
              <div className="bg-slate-50 border border-slate-200 rounded-[14px] py-3 px-[18px] mb-4 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-[1.1rem]"><FaCheckCircle /></span>
                  <span className="text-[0.82rem] text-slate-900 font-bold">
                    {t('search.outboundSaved', 'Outbound Saved')}: <strong>{t(fromCity, fromCity)} → {t(toCity, toCity)}</strong> ({travelDate}, {selectedOutboundSchedule?.departureTime}) · {t('booking.selectedSeats', 'Seat(s)')}: <strong>{(activeOutboundSeats.length > 0 ? activeOutboundSeats : selectedOutboundSeats).join(', ')}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFlowStep('outbound_select')}
                  className="bg-transparent border-none text-blue-600 font-bold text-[0.78rem] cursor-pointer hover:underline"
                >
                  {t('search.changeOutbound', 'Change Outbound')}
                </button>
              </div>

              <div className="bg-amber-50 border border-[1.5px] border-yellow-300 rounded-2xl py-4 px-[22px] mb-5 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <span className="text-[0.72rem] font-black text-amber-800 uppercase tracking-[0.5px]">
                    {t('search.returnTripStep', 'RETURN TRIP · STEP 2 OF 2')}
                  </span>
                  <h3 className="m-0 mt-0.5 text-[1.2rem] font-black text-amber-950">
                    {t(toCity, toCity)} → {t(fromCity, fromCity)} ({returnDate})
                  </h3>
                </div>

                {lockedCompany && (
                  <div className="bg-white border border-yellow-200 py-1.5 px-3.5 rounded-[10px] text-[0.82rem] font-extrabold text-amber-800 flex items-center gap-1.5">
                    <FaLock /> {t('search.lockedCompany', 'Locked Operator')}: {lockedCompany.companyName}
                  </div>
                )}
              </div>

              {noReturnBusesFound ? (
                <div className="bg-amber-50/60 border-2 border-amber-500 rounded-[20px] py-7 px-6 text-center shadow-[0_8px_25px_rgba(245,158,11,0.12)]">
                  <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto mb-3.5">
                    <FaExclamationTriangle />
                  </div>

                  <h3 className="m-0 mb-2 text-[1.25rem] font-black text-amber-900">
                    {t('search.noReturnBusesFound', 'No Return Buses Available for this Operator on')} {returnDate}
                  </h3>

                  <p className="my-0 mx-auto mb-6 max-w-[580px] text-[0.88rem] text-amber-950 leading-relaxed">
                    {t('search.noReturnBusesDesc', 'There are no scheduled return trips by this company on this specific return date. You can choose to pay only for your outbound trip now, or select another return date.')}
                  </p>

                  <div className="flex justify-center gap-3.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePayOnlyOutbound}
                      className="py-3 px-6 bg-[#078930] text-white border-none rounded-xl font-black text-[0.92rem] cursor-pointer flex items-center gap-2 shadow-[0_4px_15px_rgba(7,137,48,0.3)] hover:bg-[#066d26] transition-all"
                    >
                      <FaBus /> {t('search.payOnlyOutbound', 'Pay Only for Outbound')} <FaArrowRight />
                    </button>

                    <div className="flex items-center gap-2 bg-white py-1 px-3 rounded-xl border border-[1.5px] border-slate-300">
                      <span className="text-[0.82rem] font-bold text-slate-600">{t('search.findAnotherDate', 'Find Another Date')}:</span>
                      <input
                        type="date"
                        value={returnDate}
                        min={travelDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleChangeReturnDate(e.target.value)}
                        className="border-none outline-none font-bold text-[0.85rem] text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  <h4 className="m-0 mb-1 text-[0.95rem] font-extrabold text-slate-900">
                    {t('search.chooseReturnSchedule', 'Choose Return Schedule')} ({returnSchedules.length})
                  </h4>

                  {returnSchedules.map((sch) => {
                    const isSelected = selectedReturnSchedule?._id === sch._id;
                    const compName = lockedCompany?.companyName || sch.companyId?.companyName || sch.company?.companyName || 'Bus Operator';
                    return (
                      <div
                        key={sch._id}
                        className={`bg-white rounded-[18px] p-5 transition-all duration-150 border-2 ${
                          isSelected
                            ? 'border-[#078930] shadow-[0_6px_20px_rgba(7,137,48,0.15)]'
                            : 'border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <CompanyLogoBadge companyName={compName} logo={lockedCompany?.logo || sch.companyId?.logo || sch.company?.logo} size={48} />
                            <div>
                              <div className="font-black text-slate-900 text-[1.05rem]">{compName}</div>
                              <div className="text-[0.75rem] text-slate-500">
                                Bus {sch.bus?.busNumber || 'EB-202'} · {sch.bus?.type || 'Luxury Express'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[1.3rem] font-black text-[#078930]">
                              ETB {sch.price}
                            </div>
                            <span className="text-[0.72rem] text-slate-500">{t('search.perPassenger', 'per passenger')}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-3.5 flex-wrap gap-3">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <div className="text-[0.7rem] text-slate-400 font-bold">{t('passenger.departure', 'DEPARTURE')}</div>
                              <div className="font-black text-slate-900 text-[0.95rem]">{sch.departureTime}</div>
                            </div>
                            <span className="text-slate-300">→</span>
                            <div>
                              <div className="text-[0.7rem] text-slate-400 font-bold">{t('ticket.arrivalTime', 'ARRIVAL')}</div>
                              <div className="font-black text-slate-900 text-[0.95rem]">{sch.arrivalTime}</div>
                            </div>
                            <div className="ml-2.5 bg-green-50 text-emerald-600 py-[3px] px-2 rounded-md text-[0.75rem] font-extrabold flex items-center gap-1.5">
                              <FaCouch /> {sch.availableSeats} {t('search.seatsLeft', 'Seats Left')}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setModalSchedule({
                                ...sch,
                                _mode: 'return',
                                onSeatsSelected: (seats, updatedSch) => {
                                  const confirmedSeats = Array.isArray(seats) && seats.length > 0 ? seats : ['1'];
                                  setSelectedReturnSchedule({ ...updatedSch, selectedSeats: confirmedSeats });
                                  setSelectedReturnSeats(confirmedSeats);
                                  setModalSchedule(null);
                                  setFlowStep('review');
                                  toast.success(`Return seats (${confirmedSeats.join(', ')}) saved! Please enter passenger details.`);
                                }
                              });
                            }}
                            className="py-2.5 px-[22px] bg-[#078930] text-white border-none rounded-[10px] font-extrabold text-[0.88rem] cursor-pointer flex items-center gap-2 shadow-[0_4px_12px_rgba(7,137,48,0.25)] hover:bg-[#066d26] transition-all duration-150"
                          >
                            {t('search.selectSeats', 'Select Return Seat(s)')} <FaArrowRight />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {flowStep === 'review' && (
            <div className="max-w-[1040px] mx-auto w-full">
              <div className="bg-white rounded-3xl border border-[1.5px] border-slate-200 p-[26px] md:p-[30px] shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3.5 flex-wrap gap-3">
                  <div className="flex items-center gap-3.5">
                    {lockedCompany && (
                      <CompanyLogoBadge companyName={lockedCompany.companyName} logo={lockedCompany.logo} size={50} />
                    )}
                    <div>
                      <h3 className="m-0 text-[1.35rem] font-black text-slate-900">
                        {t('search.passengerInfoReview', 'Passenger Information & Review')}
                      </h3>
                      <p className="mt-0.5 mb-0 text-[0.84rem] text-slate-500">
                        {t('home.tripTypeRound', 'Round-Trip')} · {lockedCompany?.companyName || 'Ethio Trip'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-50 text-green-600 border border-green-200 py-1.5 px-3.5 rounded-xl font-extrabold text-[0.85rem]">
                    ✓ {t('search.roundTripDiscount', '10% Round-Trip Discount Applied')}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
                  <div className="bg-slate-50 rounded-[18px] border border-slate-200 p-[22px]">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FaUser />
                      </div>
                      <h4 className="m-0 text-[1rem] font-extrabold text-slate-900">
                        {t('booking.passengerInfo', 'Passenger Information')}
                      </h4>
                    </div>

                    <div className="flex flex-col gap-3.5">
                      <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-2.5 px-3.5 flex items-start gap-2.5">
                        <span className="text-[1.1rem]">🔒</span>
                        <div>
                          <div className="text-[0.8rem] font-extrabold text-blue-700 mb-0.5">{t('search.accountInfoLocked', 'Account Information (Locked)')}</div>
                          <div className="text-[0.75rem] text-blue-500">
                            {t('search.accountInfoHint', 'Auto-filled from your account. Only Gender and Age can be changed.')}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[0.8rem] font-bold text-slate-700 mb-1">
                          {t('forms.passengerFullName', 'Passenger Full Name')} <span className="text-red-500">*</span>
                          <span className="ml-1.5 text-[0.7rem] text-emerald-600 bg-green-100 py-0.5 px-1.5 rounded">{t('forms.editable', 'Editable')}</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={roundPassengerForm.fullName}
                          onChange={(e) => setRoundPassengerForm({ ...roundPassengerForm, fullName: e.target.value })}
                          placeholder=""
                          className="w-full py-2.5 px-3 rounded-lg border border-[1.5px] border-green-300 text-[0.9rem] outline-none bg-white text-slate-900 box-border focus:border-green-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[0.8rem] font-bold text-slate-700 mb-1">
                            {t('forms.phone', 'Phone')} <span className="text-red-500">*</span>
                            <span className="ml-1.5 text-[0.7rem] text-emerald-600 bg-green-100 py-0.5 px-1.5 rounded">{t('forms.editable', 'Editable')}</span>
                          </label>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={roundPassengerForm.phone}
                            onChange={(e) => setRoundPassengerForm({ ...roundPassengerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            onKeyDown={e => {
                              if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            placeholder=""
                            className="w-full py-2.5 px-3 rounded-lg border border-[1.5px] border-green-300 text-[0.9rem] outline-none bg-white text-slate-900 box-border focus:border-green-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[0.8rem] font-bold text-slate-700 mb-1">
                            {t('forms.email', 'Email (Optional)')}
                          </label>
                          <input
                            type="email"
                            value={roundPassengerForm.email}
                            onChange={(e) => setRoundPassengerForm({ ...roundPassengerForm, email: e.target.value })}
                            placeholder=""
                            className="w-full py-2.5 px-3 rounded-lg border border-[1.5px] border-green-300 text-[0.9rem] outline-none bg-white text-slate-900 box-border focus:border-green-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[0.8rem] font-bold text-slate-700 mb-1">
                            {t('forms.gender', 'Gender')} <span className="text-[0.7rem] text-emerald-600 bg-green-100 py-0.5 px-1.5 rounded ml-1">{t('forms.editable', 'Editable')}</span>
                          </label>
                          <select
                            value={roundPassengerForm.gender}
                            onChange={e => setRoundPassengerForm({ ...roundPassengerForm, gender: e.target.value })}
                            className="w-full py-2.5 px-3 rounded-lg border border-[1.5px] border-green-300 text-[0.9rem] outline-none bg-white box-border cursor-pointer focus:border-green-500"
                          >
                            <option value="Male">{t('forms.male', 'Male')}</option>
                            <option value="Female">{t('forms.female', 'Female')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[0.8rem] font-bold text-slate-700 mb-1">
                            {t('forms.age', 'Age (Optional)')} <span className="text-[0.7rem] text-emerald-600 bg-green-100 py-0.5 px-1.5 rounded ml-1">{t('forms.editable', 'Editable')}</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            placeholder=""
                            value={roundPassengerForm.age}
                            onChange={e => setRoundPassengerForm({ ...roundPassengerForm, age: e.target.value })}
                            className="w-full py-2.5 px-3 rounded-lg border border-[1.5px] border-green-300 text-[0.9rem] outline-none bg-white box-border focus:border-green-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-green-50 border border-[1.5px] border-green-200 rounded-2xl p-4">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[0.72rem] font-black text-green-700 bg-green-100 py-0.5 px-2 rounded-md">
                          {t('ticket.outboundTrip', 'OUTBOUND TRIP')}
                        </span>
                        <strong className="text-slate-900 text-[0.85rem]">ETB {outboundPrice}</strong>
                      </div>
                      <div className="font-black text-[1rem] text-slate-900">{t(fromCity, fromCity)} → {t(toCity, toCity)}</div>
                      <div className="text-[0.78rem] text-slate-600 mt-1">
                        📅 {travelDate} ({selectedOutboundSchedule?.departureTime}) · 💺 {t('booking.selectedSeats', 'Seats')}: <strong className="text-emerald-600">{(activeOutboundSeats.length > 0 ? activeOutboundSeats : selectedOutboundSeats).join(', ')}</strong>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-[1.5px] border-yellow-200 rounded-2xl p-4">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[0.72rem] font-black text-amber-800 bg-yellow-100 py-0.5 px-2 rounded-md">
                          {t('ticket.returnTrip', 'RETURN TRIP')}
                        </span>
                        <strong className="text-slate-900 text-[0.85rem]">ETB {returnPrice}</strong>
                      </div>
                      <div className="font-black text-[1rem] text-slate-900">{t(toCity, toCity)} → {t(fromCity, fromCity)}</div>
                      <div className="text-[0.78rem] text-slate-600 mt-1">
                        📅 {returnDate} ({selectedReturnSchedule?.departureTime}) · 💺 {t('booking.selectedSeats', 'Seats')}: <strong className="text-amber-600">{(activeReturnSeats.length > 0 ? activeReturnSeats : selectedReturnSeats).join(', ')}</strong>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-slate-200">
                      <div className="flex justify-between text-[0.85rem] text-slate-500 mb-1.5">
                        <span>{t('search.subtotal2Trips', 'Subtotal (2 Trips):')}</span>
                        <span className="font-bold text-slate-900">ETB {subtotal}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-[0.85rem] text-green-600 font-extrabold mb-1.5">
                          <span>{t('search.roundTripDiscountLabel', '10% Round-Trip Discount:')}</span>
                          <span>- ETB {discountAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[1.25rem] font-black text-slate-900 border-t border-[1.5px] border-dashed border-slate-300 pt-2.5 mt-1.5">
                        <span>{t('search.finalTotal', 'Final Total:')}</span>
                        <span className="text-[#078930]">ETB {finalTotal}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFlowStep('return_select')}
                        className="flex-1 p-3.5 bg-slate-100 text-slate-600 border-none rounded-xl font-extrabold text-[0.88rem] cursor-pointer hover:bg-slate-200 transition-colors"
                      >
                        ← {t('common.back', 'Back')}
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmAndPayRoundTrip}
                        disabled={isProcessingPayment}
                        className="flex-[2] p-3.5 bg-[#078930] text-white border-none rounded-xl font-black text-[0.95rem] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(7,137,48,0.3)] hover:bg-[#066d26] transition-colors disabled:cursor-not-allowed disabled:opacity-75"
                      >
                        <FaCreditCard /> {isProcessingPayment ? t('common.loading', 'Reserving…') : `${t('common.payNow', 'Pay Now')} (ETB ${finalTotal}) →`}
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
          titlePrefix={modalSchedule._mode === 'outbound' ? t('ticket.outboundTrip', 'Outbound Trip') : modalSchedule._mode === 'return' ? t('ticket.returnTrip', 'Return Trip') : ''}
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
