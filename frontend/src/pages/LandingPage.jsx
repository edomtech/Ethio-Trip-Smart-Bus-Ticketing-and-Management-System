import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBus, FaMapMarkerAlt, FaCalendarAlt, FaUser, FaSearch, FaExchangeAlt,
  FaShieldAlt, FaHeadset, FaClock, FaUsers, FaChevronDown, FaChevronUp,
  FaTicketAlt, FaTag, FaArrowRight
} from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import SeatSelectorModal from '../components/SeatSelectorModal';
import PaymentModal from '../components/PaymentModal';
import TicketModal from '../components/TicketModal';
import { scheduleAPI, busAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n.jsx';
import { toast } from 'react-toastify';
const CITIES = [
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

  const travelDateTime = new Date(travelDate).getTime();
  const returnDateTime = new Date(returnDate).getTime();
  const stayDays = Math.max(1, Math.round((returnDateTime - travelDateTime) / (1000 * 60 * 60 * 24)));
  const discountPercent = stayDays >= 14 ? 15 : stayDays >= 7 ? 12 : stayDays >= 3 ? 10 : 5;

  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [buses, setBuses] = useState([]);
  const [busesLoading, setBusesLoading] = useState(false);

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
    fetchBuses();
  }, []);

  const visibleRoutes = showAll ? ALL_ROUTES : ALL_ROUTES.slice(0, 6);

  const handleSwap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (fromCity === toCity) {
      toast.error('From and To cities must be different');
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await scheduleAPI.search({ from: fromCity, to: toCity, date: travelDate });
      setSearchResults(res || []);
      if (!res?.length) toast.info('No schedules found for this route.');
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoute = (routeItem) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const selectedRouteSchedule = {
      _id: 'sch_' + Date.now(),
      bus: { busNumber: 'EB-2026', type: 'Luxury Express', capacity: 45 },
      route: { from: routeItem.from, to: routeItem.to, duration: '8 hrs' },
      date: travelDate,
      departureTime: routeItem.time,
      arrivalTime: '04:00 PM',
      price: routeItem.price,
      availableSeats: 32,
      bookedSeats: ['01A', '02B'],
    };
    setSelectedSchedule(selectedRouteSchedule);
  };

  return (
    <MainLayout>
      <div className="eb-home-wrap">

        {/* ══ HERO SECTION & SEARCH CARD (PURE SOLID GREEN) ══ */}
        <section className="eb-hero-section" id="home">
          <div className="eb-hero-container">
            
            {/* Left: Hero Content */}
            <div className="eb-hero-content">
              <div className="eb-hero-pill">
                <span className="eb-pill-icon"><FaBus /></span>
                <span>{t('home.pill', 'Ethio Trip — Smart Bus Ticketing Platform')}</span>
              </div>
              <h1 className="eb-hero-title">
                {t('home.heroTitle', 'Travel Across Ethiopia with Comfort & Safety')}
              </h1>
              <p className="eb-hero-desc">
                {t('home.heroDesc', 'Welcome to Ethio Trip. Search, compare, and book tickets instantly from premium operators across Ethiopia.')}
              </p>

              {/* Compact Metrics */}
              <div className="eb-hero-counters">
                {[
                  { cls: 'purple', icon: <FaBus />, val: '500+', lbl: 'Trips Daily' },
                  { cls: 'pink', icon: <FaUsers />, val: '100K+', lbl: 'Passengers' },
                  { cls: 'blue', icon: <FaShieldAlt />, val: '100%', lbl: 'Secure' },
                  { cls: 'yellow', icon: <FaHeadset />, val: '24/7', lbl: 'Support' },
                ].map((c, i) => (
                  <div key={i} className="eb-counter-item">
                    <div className={`eb-ci-icon ${c.cls}`}>{c.icon}</div>
                    <div className="eb-ci-text"><strong>{c.val}</strong><span>{c.lbl}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Bus Hero Image */}
            <div className="eb-hero-visual">
              <div className="eb-hero-bus-card">
                <img
                  src="/images/hero_bus_clean.jpg"
                  alt="Luxury Coach Bus"
                  className="eb-hero-img"
                  onError={(e) => { e.target.src = '/images/hero_bus.jpg'; }}
                />
              </div>
            </div>

          </div>

          {/* ══ INLINE SEARCH CARD ══ */}
          <div className="eb-search-card-container">
            <div className="eb-search-card">
              <div className="eb-search-tabs">
                <button
                  type="button"
                  className={`eb-tab-btn ${tripType === 'oneway' ? 'active' : ''}`}
                  onClick={() => setTripType('oneway')}
                >
                  <FaBus /> {t('home.tripTypeOneWay', 'One Way')}
                </button>
                <button
                  type="button"
                  className={`eb-tab-btn ${tripType === 'round' ? 'active' : ''}`}
                  onClick={() => setTripType('round')}
                >
                  <FaExchangeAlt /> {t('home.tripTypeRound', 'Round Trip')}
                </button>
              </div>
              <form onSubmit={handleSearch} className="eb-search-grid">
                <div className="eb-input-group">
                  <label>{t('home.from', 'Departure City')}</label>
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
                  <label>{t('home.to', 'Destination City')}</label>
                  <div className="eb-input-field">
                    <FaMapMarkerAlt className="eb-field-icon" />
                    <select value={toCity} onChange={(e) => setToCity(e.target.value)}>
                      {CITIES.filter((c) => c !== fromCity).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="eb-input-group">
                  <label>{t('home.departureDate', 'Travel Date')}</label>
                  <div className="eb-input-field">
                    <FaCalendarAlt className="eb-field-icon" />
                    <input type="date" value={travelDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setTravelDate(e.target.value)} />
                  </div>
                </div>
                {tripType === 'round' && (
                  <div className="eb-input-group">
                    <label>{t('home.returnDate', 'Return Date')}</label>
                    <div className="eb-input-field">
                      <FaCalendarAlt className="eb-field-icon" style={{ color: '#059669' }} />
                      <input type="date" value={returnDate} min={travelDate} onChange={(e) => setReturnDate(e.target.value)} />
                    </div>
                  </div>
                )}
                <div className="eb-input-group">
                  <label>{t('home.passengers', 'Passengers')}</label>
                  <div className="eb-input-field">
                    <FaUser className="eb-field-icon" />
                    <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Passenger' : 'Passengers'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="eb-search-action">
                  <button type="submit" className="eb-search-submit-btn" disabled={loading}><FaSearch /> {loading ? t('common.loading', 'Searching...') : t('home.searchBuses', 'Search Buses')}</button>
                </div>
              </form>

              {tripType === 'round' && (
                <div style={{ marginTop: '0.85rem', padding: '0.6rem 1rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.25))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#34d399', fontWeight: 700, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#059669', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.75rem' }}>🎉 Round Trip Bonus</span>
                    <span>Stay Duration: {stayDays} {stayDays === 1 ? 'Day' : 'Days'}</span>
                  </div>
                  <div style={{ background: '#fbbf24', color: '#0f172a', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                    {discountPercent}% STAY DISCOUNT APPLIED!
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══ POPULAR ROUTES ══ */}
        <section className="eb-popular-section" id="popular-routes">
          <div className="eb-section-container">
            <div className="eb-section-header">
              <h2 className="eb-section-title">Popular Routes</h2>
              <button type="button" className="eb-view-all-link" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show Less' : `View All (${ALL_ROUTES.length} Routes)`} {showAll ? <FaChevronUp /> : <FaChevronDown />}
              </button>
            </div>
            <div className="eb-routes-grid">
              {visibleRoutes.map((route) => (
                <div key={route.id} className="eb-route-card" data-route={route.id} onClick={() => handleBookRoute(route)}>
                  <div className="eb-rc-image-wrap">
                    <img
                      src={route.img}
                      alt={route.to}
                      className="eb-rc-img"
                      onError={(e) => { e.target.src = '/images/dire_dawa.jpg'; }}
                    />
                    {route.badge && <span className={`eb-rc-badge ${route.badgeType}`}>{route.badge}</span>}
                  </div>
                  <div className="eb-rc-body">
                    <div className="eb-rc-route-title">{route.from} → {route.to}</div>
                    <div className="eb-rc-meta">
                      <span><FaCalendarAlt /> Daily Departure</span>
                      <span><FaClock /> {route.time}</span>
                    </div>
                    <div className="eb-rc-footer">
                      <div>
                        <span className="eb-rc-from-lbl">Fare from</span>
                        <div className="eb-rc-price">Br {route.price}</div>
                      </div>
                      <button className="eb-book-now-btn" type="button">
                        Book <FaArrowRight />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FEATURED BUS FLEET (PROMINENT BUS IMAGES & LOGOS) ══ */}
        <section className="eb-popular-section" id="bus-fleet" style={{ background: '#f8fafc', padding: '3.5rem 0' }}>
          <div className="eb-section-container">
            <div className="eb-section-header">
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Premium Fleet
                </span>
                <h2 className="eb-section-title" style={{ margin: '4px 0 0' }}>{t('home.modernFleet', 'Modern Buses & Operators')}</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
                  {t('home.fleetSub', 'Explore luxury coaches equipped with verified amenities and high safety standards across Ethiopia.')}
                </p>
              </div>
              <button
                type="button"
                className="eb-view-all-link"
                onClick={() => navigate('/buses')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                {t('home.viewAllFleet', 'View All Fleet')} <FaArrowRight />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              {(buses && buses.length > 0 ? buses.slice(0, 6) : [
                { _id: 'b1', busNumber: 'Selam Luxury VIP Coach', plateNumber: '3-A10101-ET', type: 'VIP', capacity: 45, image: '/images/selam_bus.png', companyId: { companyName: 'Selam Bus Line', logo: '/logos/selam_bus.png' }, amenities: ['WiFi', 'Air Conditioning', 'Leather Recliners'] },
                { _id: 'b2', busNumber: 'Ethio Express Liner', plateNumber: '3-B20202-ET', type: 'Luxury', capacity: 45, image: '/images/ethio_bus.png', companyId: { companyName: 'Ethio Bus', logo: '/logos/ethio_bus.png' }, amenities: ['Air Conditioning', 'WiFi', 'Water'] },
                { _id: 'b3', busNumber: 'Zemen Star Executive', plateNumber: '3-C30303-ET', type: 'VIP', capacity: 45, image: '/images/zemen_bus.png', companyId: { companyName: 'Zemen Bus', logo: '/logos/zemen_bus.png' }, amenities: ['WiFi', 'Coffee/Tea', 'Extra Legroom'] },
                { _id: 'b4', busNumber: 'Abay Standard Express', plateNumber: '3-D40404-ET', type: 'Standard', capacity: 45, image: '/images/abay_bus.png', companyId: { companyName: 'Abay Bus', logo: '/logos/abay_bus.png' }, amenities: ['Air Conditioning', 'Water'] },
                { _id: 'b5', busNumber: 'Habesha Southern Liner', plateNumber: '3-E50505-ET', type: 'Luxury', capacity: 45, image: '/images/habesha_bus.png', companyId: { companyName: 'Habesha Bus', logo: '/logos/habesha_bus.png' }, amenities: ['Air Conditioning', 'TV', 'USB Charging'] },
              ]).map((b) => {
                const busImg = (b.image && b.image.trim()) ? b.image : (
                  (b.companyId?.companyName || '').toLowerCase().includes('selam') ? '/images/selam_bus.png' :
                  (b.companyId?.companyName || '').toLowerCase().includes('ethio') ? '/images/ethio_bus.png' :
                  (b.companyId?.companyName || '').toLowerCase().includes('zemen') ? '/images/zemen_bus.png' :
                  (b.companyId?.companyName || '').toLowerCase().includes('abay') ? '/images/abay_bus.png' :
                  (b.companyId?.companyName || '').toLowerCase().includes('habesha') ? '/images/habesha_bus.png' : '/images/selam_bus.png'
                );

                return (
                  <div
                    key={b._id}
                    style={{
                      background: '#ffffff', borderRadius: 18, overflow: 'hidden',
                      border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 190, background: '#0f172a' }}>
                      <img
                        src={busImg}
                        alt={b.busNumber}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = '/images/selam_bus.png'; }}
                      />
                      <span style={{
                        position: 'absolute', top: 12, right: 12,
                        background: b.type === 'VIP' ? '#d97706' : b.type === 'Luxury' ? '#7c3aed' : '#2563eb',
                        color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 999
                      }}>
                        {b.type}
                      </span>
                      {b.companyId && (
                        <div style={{
                          position: 'absolute', bottom: 12, left: 12,
                          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
                          padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          {b.companyId.logo && (
                            <img src={b.companyId.logo} alt="logo" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                          )}
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>{b.companyId.companyName}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{b.busNumber}</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{b.plateNumber}</span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                        <span>Capacity: <strong>{b.capacity} Seats</strong></span>
                      </div>

                      {b.amenities && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: '1rem' }}>
                          {(Array.isArray(b.amenities) ? b.amenities : String(b.amenities).split(',')).slice(0, 3).map((am, i) => (
                            <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>
                              {am.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => navigate('/buses')}
                        style={{
                          width: '100%', background: '#059669', color: '#fff', border: 'none',
                          padding: '0.65rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                      >
                        {t('home.bookSeat', 'Book Seat on Bus')} <FaArrowRight style={{ fontSize: '0.75rem' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="eb-features-strip">
          <div className="eb-features-container">
            {[
              { icon: <FaTicketAlt />, title: 'Easy Booking', desc: 'Anytime, anywhere' },
              { icon: <FaShieldAlt />, title: 'Safe Travel', desc: 'Your safety first' },
              { icon: <FaTag />, title: 'Best Prices', desc: 'No hidden fees' },
              { icon: <FaHeadset />, title: '24/7 Support', desc: 'Always here' },
            ].map((f, i) => (
              <div key={i} className="eb-feature-item">
                <div className="eb-fi-icon">{f.icon}</div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ SEARCH MODALS ══ */}
        {searchResults && searchResults.length > 0 && (
          <div className="eb-modal-overlay" onClick={() => setSearchResults(null)}>
            <div className="eb-modal-box" onClick={(e) => e.stopPropagation()}>
              <h3>Buses: {fromCity} → {toCity}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {searchResults.map((s) => (
                  <div key={s._id} className="eb-sch-result-card">
                    <div>
                      <strong>{s.bus?.busNumber} · {s.bus?.type}</strong>
                      <p style={{ fontSize: '.75rem', color: '#64748b', margin: 0 }}>
                        {s.departureTime} → {s.arrivalTime} · {s.availableSeats} seats available
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="eb-rc-price">Br {s.price}</div>
                      <button
                        className="eb-search-submit-btn"
                        style={{ padding: '4px 10px', fontSize: '.72rem', marginTop: 4 }}
                        onClick={() => {
                          setSearchResults(null);
                          setSelectedSchedule(s);
                        }}
                      >
                        Select Seat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

      </div>
    </MainLayout>
  );
};

export default LandingPage;
