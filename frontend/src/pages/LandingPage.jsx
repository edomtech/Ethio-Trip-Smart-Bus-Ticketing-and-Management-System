import { useState } from 'react';
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
import { scheduleAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './LandingPage.css';

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

  const [tripType, setTripType] = useState('oneway');
  const [fromCity, setFromCity] = useState('Addis Ababa');
  const [toCity, setToCity] = useState('Dire Dawa');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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
                <span>Smart Bus Travel Platform</span>
              </div>
              <h1 className="eb-hero-title">
                Travel Across Ethiopia<br />
                with <span className="eb-text-highlight">Comfort &amp; Safety</span>
              </h1>
              <p className="eb-hero-desc">
                Book bus tickets online easily and securely. Fast booking, transparent fares, and 24/7 service.
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
                  src="/images/hero_bus.jpg"
                  alt="EthioBus Luxury Coach"
                  className="eb-hero-img"
                  onError={(e) => { e.target.src = '/ethiobus-hero.jpg'; }}
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
                  <FaBus /> One Way
                </button>
                <button
                  type="button"
                  className={`eb-tab-btn ${tripType === 'round' ? 'active' : ''}`}
                  onClick={() => setTripType('round')}
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
                      onChange={(e) => setTravelDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="eb-input-group">
                  <label>Passengers</label>
                  <div className="eb-input-field">
                    <FaUser className="eb-field-icon" />
                    <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="eb-search-submit-btn" disabled={loading}>
                  <FaSearch /> {loading ? 'Searching...' : 'Search Buses'}
                </button>
              </form>
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

        {/* ══ FEATURES STRIP ══ */}
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
