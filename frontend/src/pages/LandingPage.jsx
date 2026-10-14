import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBus, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaSearch, FaExchangeAlt,
  FaShieldAlt, FaHeadset, FaUsers,
  FaTicketAlt, FaTag
} from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import SeatSelectorModal from '../components/SeatSelectorModal';
import PaymentModal from '../components/PaymentModal';
import TicketModal from '../components/TicketModal';
import AIAssistantWidget from '../components/AI/AIAssistantWidget';
import { scheduleAPI, busAPI, reportAPI, companyAPI, platformSettingAPI, discountAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';

const DEFAULT_CITIES = [
  'Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar',
  'Gondar', 'Jimma', 'Jijiga', 'Adama', 'Dessie', 'Arba Minch', 'Harar'
];

const ALL_ROUTES = [
  { id:'r1',  from:'Addis Ababa', to:'Dire Dawa',   time:'08:00 AM', price:700,  badge:'Popular',  badgeType:'popular',  img:'/images/dire_dawa.jpg'  },
  { id:'r2',  from:'Addis Ababa', to:'Mekelle',     time:'07:30 AM', price:850,  badge:'Popular',  badgeType:'popular',  img:'/images/mekelle.jpg'    },
  { id:'r3',  from:'Addis Ababa', to:'Hawassa',     time:'08:30 AM', price:650,  badge:'Trending', badgeType:'trending', img:'/images/hawassa.jpg'    },
  { id:'r4',  from:'Addis Ababa', to:'Bahir Dar',   time:'06:30 AM', price:750,  badge:'Popular',  badgeType:'popular',  img:'/images/bahir_dar.jpg'  },
  { id:'r5',  from:'Addis Ababa', to:'Gondar',      time:'10:00 AM', price:900,  badge:'Trending', badgeType:'trending', img:'/images/gondar.jpg'     },
  { id:'r6',  from:'Addis Ababa', to:'Jimma',       time:'07:00 AM', price:550,  badge:'Popular',  badgeType:'popular',  img:'/images/jimma.jpg'      },
  { id:'r7',  from:'Addis Ababa', to:'Jijiga',      time:'09:00 AM', price:800,  badge:'Trending', badgeType:'trending', img:'/images/jijiga.jpg'     },
  { id:'r8',  from:'Addis Ababa', to:'Adama',       time:'09:30 AM', price:320,  badge:'Popular',  badgeType:'popular',  img:'/images/adama.jpg'      },
  { id:'r9',  from:'Addis Ababa', to:'Dessie',      time:'06:00 AM', price:680,  badge:'Popular',  badgeType:'popular',  img:'/images/dessie.jpg'     },
  { id:'r10', from:'Addis Ababa', to:'Arba Minch',  time:'07:15 AM', price:780,  badge:'Trending', badgeType:'trending', img:'/images/arba_minch.jpg' },
  { id:'r11', from:'Addis Ababa', to:'Harar',       time:'08:45 AM', price:820,  badge:'Popular',  badgeType:'popular',  img:'/images/harar.jpg'      },
  { id:'r12', from:'Dire Dawa',   to:'Addis Ababa', time:'09:15 AM', price:700,  badge:'Popular',  badgeType:'popular',  img:'/images/addis_ababa.jpg'},
];

const cleanCompanyName = (name) => {
  if (!name) return '';
  return name.replace(/\b(Lines?|Line)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
};

const FALLBACK_COMPANIES = [
  { _id: 'c1', companyName: 'Selam Bus Line', logo: '/logos/selam_bus.png' },
  { _id: 'c2', companyName: 'Sky Bus Line', logo: '/logos/sky_bus.png' },
  { _id: 'c3', companyName: 'Zemen Bus', logo: '/logos/zemen_bus.png' },
  { _id: 'c4', companyName: 'Abay Bus Line', logo: '/logos/abay_bus.png' },
  { _id: 'c5', companyName: 'Habesha Bus', logo: '/logos/habesha_bus.png' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const getFutureDateString = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [tripType, setTripType] = useState('oneway');
  const [fromCity, setFromCity] = useState('Addis Ababa');
  const [toCity, setToCity] = useState('Dire Dawa');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(getFutureDateString(3));
  const [passengers, setPassengers] = useState(1);


  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [buses, setBuses] = useState([]);
  const [busesLoading, setBusesLoading] = useState(false);
  const [siteStats, setSiteStats] = useState({ totalSchedules: null, totalBookings: null, totalPassengers: null });
  const [companies, setCompanies] = useState([]);
  const [publicDiscounts, setPublicDiscounts] = useState([]);
  const [cities, setCities] = useState(DEFAULT_CITIES);

  useEffect(() => {
    const fetchBuses = async () => {
      setBusesLoading(true);
      try {
        const data = await busAPI.getPublic();
        setBuses(data || []);
      } catch (err) {
        console.error('Error fetching buses:', err);
      } finally {
        setBusesLoading(false);
      }
    };
    const fetchStats = async () => {
      try {
        const data = await reportAPI.getPublic();
        if (data) setSiteStats(data);
      } catch {
      }
    };
    const fetchCompanies = async () => {
      try {
        const data = await companyAPI.getActiveCompanies();
        const list = Array.isArray(data) ? data : data?.companies || [];
        setCompanies(list);
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };
    const fetchDiscounts = async () => {
      try {
        const data = await discountAPI.getPublic();
        setPublicDiscounts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching public discounts:', err);
      }
    };
    const fetchCities = async () => {
      try {
        const data = await platformSettingAPI.getSettings();
        if (data?.cities?.length > 0) setCities(data.cities);
      } catch {
      }
    };
    fetchBuses();
    fetchStats();
    fetchCompanies();
    fetchDiscounts();
    fetchCities();
  }, []);

  const visibleRoutes = showAll ? ALL_ROUTES : ALL_ROUTES.slice(0, 6);

  const handleSwap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (fromCity === toCity) return;
    setLoading(true);
    try {
      const res = await scheduleAPI.search({ from: fromCity, to: toCity, date: travelDate });
      setSearchResults(res || []);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = (schedule) => {
    try {
      sessionStorage.setItem('pending_booking_trip', JSON.stringify({
        schedule,
        fromCity,
        toCity,
        travelDate,
        passengers,
        tripType,
      }));
    } catch {}

    if (!user) {
      navigate('/login', {
        state: {
          redirectTo: '/passenger?tab=search',
          message: 'Please sign in to select your seats and complete your booking.',
          selectedTrip: schedule,
        },
      });
    } else {
      navigate('/passenger?tab=search', {
        state: {
          selectedTrip: schedule,
          fromCity,
          toCity,
          travelDate,
        },
      });
    }
  };

  const handleBookRoute = (routeItem) => {
    try {
      sessionStorage.setItem('pending_booking_trip', JSON.stringify({
        fromCity: routeItem.from,
        toCity: routeItem.to,
        travelDate,
        passengers,
        tripType,
      }));
    } catch {}

    if (!user) {
      navigate('/login', {
        state: {
          redirectTo: '/passenger?tab=search',
          message: 'Please sign in to book your tickets.',
        },
      });
      return;
    }
    navigate('/passenger?tab=search', {
      state: {
        fromCity: routeItem.from,
        toCity: routeItem.to,
        travelDate,
      },
    });
  };

  return (
    <MainLayout>
      <div className="w-full bg-slate-50 dark:bg-[#071410] font-poppins text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors duration-200">

        {}
        <section
          className="relative bg-[url('/images/hero_bus_clean.jpg')] bg-cover bg-center pt-12 pb-16 px-4 sm:px-6 overflow-hidden"
          id="home"
        >
          {}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/65 via-slate-950/55 to-emerald-950/60" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold mb-3">
              <span className="text-emerald-300"><FaBus /></span>
              <span>{t('home.pill', 'Ethio Trip — Smart Bus Ticketing Platform')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight mb-2">
              {t('home.heroTitle', 'Travel Across Ethiopia with Comfort & Safety')}
            </h1>
          </div>

          {}
          <div className="relative z-10 max-w-5xl mx-auto px-2 sm:px-4 mt-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 px-3 sm:py-3.5 sm:px-5 transition-all shadow-xl">
              <div className="flex items-center gap-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tripType === 'oneway'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setTripType('oneway')}
                >
                  <FaBus /> {t('home.tripTypeOneWay', 'One Way')}
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tripType === 'round'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setTripType('round')}
                >
                  <FaExchangeAlt /> {t('home.tripTypeRound', 'Round Trip')}
                </button>
              </div>

              <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
                <div className="lg:col-span-3 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('home.from', 'Departure City')}</label>
                  <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                    <FaMapMarkerAlt className="text-slate-400 mr-2 shrink-0 text-sm" />
                    <select
                      value={fromCity}
                      onChange={(e) => setFromCity(e.target.value)}
                      className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {cities.map((c) => <option key={c} value={c} className="dark:bg-slate-900">{t(c, c)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="lg:col-span-1 flex justify-center pb-1">
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    onClick={handleSwap}
                    title={t('home.swapCities', 'Swap cities')}
                  >
                    <FaExchangeAlt />
                  </button>
                </div>

                <div className="lg:col-span-3 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('home.to', 'Destination City')}</label>
                  <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                    <FaMapMarkerAlt className="text-slate-400 mr-2 shrink-0 text-sm" />
                    <select
                      value={toCity}
                      onChange={(e) => setToCity(e.target.value)}
                      className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {cities.filter((c) => c !== fromCity).map((c) => <option key={c} value={c} className="dark:bg-slate-900">{t(c, c)}</option>)}
                    </select>
                  </div>
                </div>

                <div className={tripType === 'round' ? 'lg:col-span-2 flex flex-col gap-1' : 'lg:col-span-2 flex flex-col gap-1'}>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('home.departureDate', 'Travel Date')}</label>
                  <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
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
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('home.returnDate', 'Return Date')}</label>
                    <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                      <FaCalendarAlt className="text-emerald-600 mr-2 shrink-0 text-sm" />
                      <input
                        type="date"
                        value={returnDate}
                        min={travelDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                <div className={tripType === 'round' ? 'lg:col-span-1 flex flex-col gap-1' : 'lg:col-span-1 flex flex-col gap-1'}>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('home.passengers', 'Seats')}</label>
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
        </section>

        {}
        {searchResults !== null && (
          <section id="search-results" className="py-10 px-4 sm:px-6 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1 border border-emerald-500/20">
                    <FaBus /> {t('landing.availableBuses', 'Available Buses')}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white m-0 tracking-tight">
                    {t(fromCity, fromCity)} → {t(toCity, toCity)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                    {t('landing.travelDate', 'Travel Date')}: <strong>{travelDate}</strong> • {searchResults.length} {t('landing.matchingBusesFound', 'matching bus(es) found')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchResults(null)}
                  className="self-start sm:self-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer transition shadow-xs"
                >
                  {t('landing.clearResults', 'Clear Results')}
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4 border border-amber-200 dark:border-amber-800">
                    <FaBus />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                    {t('landing.noBusesDate', 'No Direct Buses Scheduled for this Date')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                    {t('landing.noBusesDesc', 'We could not find an active departure for this route on the selected date. Try choosing tomorrow or exploring other routes.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      const tomStr = tom.toISOString().split('T')[0];
                      setTravelDate(tomStr);
                      scheduleAPI.search({ from: fromCity, to: toCity, date: tomStr }).then(r => setSearchResults(r || [])).catch(() => setSearchResults([]));
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    {t('landing.searchTomorrow', "Search Tomorrow's Buses")}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {searchResults.map((sch) => {
                    const compName = sch.companyId?.companyName || 'Intercity Bus';
                    const compLogo = sch.companyId?.logo || (
                      compName.toLowerCase().includes('selam') ? '/logos/selam_bus.png' :
                      compName.toLowerCase().includes('sky') ? '/logos/sky_bus.png' :
                      compName.toLowerCase().includes('zemen') ? '/logos/zemen_bus.png' :
                      compName.toLowerCase().includes('abay') ? '/logos/abay_bus.png' :
                      compName.toLowerCase().includes('habesha') ? '/logos/habesha_bus.png' : '/logos/selam_bus.png'
                    );

                    return (
                      <div
                        key={sch._id}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
                      >
                        <div>
                          {}
                          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                                <img
                                  src={compLogo}
                                  alt={compName}
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/logos/selam_bus.png'; }}
                                />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white m-0 tracking-tight leading-tight">
                                  {compName}
                                </h4>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {sch.bus?.busType || sch.bus?.type || 'Standard Luxury Coach'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                              Verified
                            </span>
                          </div>

                          {}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 mb-3">
                            <div className="flex items-center justify-between text-xs font-black text-slate-900 dark:text-white mb-1">
                              <span>{t(sch.route?.from || fromCity, sch.route?.from || fromCity)}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono">➔</span>
                              <span>{t(sch.route?.to || toCity, sch.route?.to || toCity)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{t('landing.departs', 'Departs')}: <strong className="text-slate-700 dark:text-slate-200">{sch.departureTime || '06:00 AM'}</strong></span>
                              <span>{t('landing.seats', 'Seats')}: <strong className="text-emerald-600 dark:text-emerald-400">{sch.availableSeats || 30} {t('landing.left', 'Left')}</strong></span>
                            </div>
                          </div>
                        </div>

                        {}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('landing.fare', 'Fare')}</span>
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                              ETB {sch.price?.toLocaleString()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleBookNow(sch)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-xs cursor-pointer shadow-md shadow-emerald-600/30 hover:scale-[1.02] transition-all flex items-center gap-1.5"
                          >
                            <span>{t('landing.bookNow', 'Book Now')}</span>
                            <span>➔</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {}
        {publicDiscounts && publicDiscounts.length > 0 && (
          <section className="py-8 px-4 sm:px-6 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 border-b border-amber-200/50 dark:border-amber-800/30">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white m-0">Special Holiday Offers & Ceremony Discounts</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 m-0">Exclusive holiday promotions from our partner transport operators</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicDiscounts.map((disc) => (
                  <div key={disc._id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/60 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      {disc.holidayTag && disc.holidayTag !== 'None' ? disc.holidayTag : 'Special Offer'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        {disc.companyId?.companyName || 'Verified Bus Line'}
                      </div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white m-0 mb-1">{disc.name}</h3>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 my-1">
                        {disc.discountType === 'percentage' ? `${disc.discountValue}% OFF` : `ETB ${disc.discountValue} OFF`}
                      </div>
                      <p className="text-[11px] text-slate-500 m-0">
                        {disc.tripType === 'round' ? 'Applicable on Round-Trip Bookings' : 'Applicable on All Trips'}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {disc.code}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(disc.code);
                          alert(`Promo code "${disc.code}" copied to clipboard! Use it during booking.`);
                        }}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Copy Promo Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Popular Routes Section */}
        <section className="py-12 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" id="routes">
          <div className="max-w-7xl mx-auto">
            {/* Metric Cards (Positioned above Popular Routes) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
              {[
                { bg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/60', icon: <FaBus />, val: siteStats.totalSchedules != null ? siteStats.totalSchedules : (buses.length || '0'), lbl: t('home.availableTrips', 'Available Trips') },
                { bg: 'bg-pink-600', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-900/60', icon: <FaUsers />, val: siteStats.totalPassengers != null ? siteStats.totalPassengers : '0', lbl: t('home.passengersCount', 'Passengers') },
                { bg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/60', icon: <FaShieldAlt />, val: '100%', lbl: t('home.secure', 'Secure') },
                { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/60', icon: <FaHeadset />, val: '24/7', lbl: t('home.support247', 'Support') },
              ].map((c, i) => (
                <div key={i} className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border ${c.border} shadow-xs hover:shadow-md transition-all`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0 ${c.bg}`}>
                    {c.icon}
                  </div>
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <strong className="text-slate-900 dark:text-white text-base sm:text-lg font-black truncate">{c.val}</strong>
                    <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">{c.lbl}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {t('home.destinations', 'Popular Routes')}
                </h2>
              </div>
            </div>

            {/* Route Cards with Compact Image Size & Route City Names Only */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleRoutes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => handleBookRoute(route)}
                  className="group rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-32 sm:h-36 overflow-hidden">
                    <img
                      src={route.img}
                      alt={`${route.from} to ${route.to}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/images/hero_bus_clean.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                    <div className="absolute bottom-3 left-3.5 right-3.5 text-white flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-black m-0 leading-tight tracking-wide drop-shadow-md">
                        {t(route.from, route.from)} <span className="text-emerald-400 mx-1">➔</span> {t(route.to, route.to)}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!showAll && ALL_ROUTES.length > 6 && (
              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  {t('landing.viewAllRoutes', 'View All Available Routes')} ({ALL_ROUTES.length}) →
                </button>
              </div>
            )}
          </div>
        </section>



        {}
        <section className="bg-slate-100/70 dark:bg-slate-900/50 py-12 px-4 sm:px-6" id="partners">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {t('home.partnersPill', 'Trusted Network')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {t('home.ourPartners', 'Our Bus Partners')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('home.partnersSub', 'Traveling in partnership with Ethiopia’s leading licensed coach operators.')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 max-w-6xl mx-auto">
              {(companies && companies.length > 0
                ? companies.filter((c) =>
                    ['selam', 'sky', 'zemen', 'abay', 'habesha'].some((name) =>
                      (c.companyName || '').toLowerCase().includes(name)
                    )
                  )
                : FALLBACK_COMPANIES
              ).map((comp) => {
                const displayName = cleanCompanyName(comp.companyName);
                const compLogo = comp.logo || (
                  (comp.companyName || '').toLowerCase().includes('selam') ? '/logos/selam_bus.png' :
                  (comp.companyName || '').toLowerCase().includes('sky') ? '/logos/sky_bus.png' :
                  (comp.companyName || '').toLowerCase().includes('zemen') ? '/logos/zemen_bus.png' :
                  (comp.companyName || '').toLowerCase().includes('abay') ? '/logos/abay_bus.png' :
                  (comp.companyName || '').toLowerCase().includes('habesha') ? '/logos/habesha_bus.png' : '/logos/selam_bus.png'
                );

                return (
                  <div
                    key={comp._id || comp.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col items-center justify-center text-center group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-2 mb-3 border border-slate-100 dark:border-slate-700/60 group-hover:scale-105 transition-transform">
                      {compLogo ? (
                        <img
                          src={compLogo}
                          alt={displayName}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/logos/selam_bus.png';
                          }}
                        />
                      ) : (
                        <FaBus className="text-2xl text-emerald-600" />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0 tracking-tight">
                      {displayName}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {}
        <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <FaTicketAlt />, title: t('home.easyBooking', 'Easy Booking'), desc: t('home.easyBookingDesc', 'Anytime, anywhere') },
              { icon: <FaShieldAlt />, title: t('home.safeTravel', 'Safe Travel'), desc: t('home.safeTravelDesc', 'Your safety first') },
              { icon: <FaTag />, title: t('home.bestPrices', 'Best Prices'), desc: t('home.bestPricesDesc', 'No hidden fees') },
              { icon: <FaHeadset />, title: t('home.supportAlways', '24/7 Support'), desc: t('home.supportAlwaysDesc', 'Always here') },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">{f.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>



        {selectedSchedule && (
          <SeatSelectorModal
            schedule={selectedSchedule}
            onClose={() => setSelectedSchedule(null)}
            onBookingComplete={(b) => {
              setSelectedSchedule(null);
              setPendingBooking(b);
            }}
          />
        )}
        {pendingBooking && (
          <PaymentModal
            booking={pendingBooking}
            onClose={() => setPendingBooking(null)}
            onSuccess={(b) => {
              setPendingBooking(null);
              setConfirmedBooking(b);
            }}
          />
        )}
        {confirmedBooking && (
          <TicketModal
            booking={confirmedBooking}
            onClose={() => setConfirmedBooking(null)}
          />
        )}

        <AIAssistantWidget />
      </div>
    </MainLayout>
  );
};

export default LandingPage;
