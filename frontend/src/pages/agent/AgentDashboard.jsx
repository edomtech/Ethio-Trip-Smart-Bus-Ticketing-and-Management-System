import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI, scheduleAPI, companyAPI, ticketAPI, supportAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import {
  FaBus, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSearch,
  FaShieldAlt, FaUserCheck, FaSignOutAlt, FaSync, FaPlus, FaClock,
  FaClipboardList, FaTicketAlt, FaHeadset, FaHourglassHalf, FaCalendarDay, FaUser,
  FaCalendarAlt, FaChevronDown, FaChevronRight, FaChartLine, FaChartBar, FaFileAlt,
  FaUsers, FaMoneyBillWave, FaArrowUp, FaPrint, FaCouch
} from 'react-icons/fa';

import ViewPassenger from './modules/ViewPassenger';
import TripPassengerVerification from './modules/TripPassengerVerification';
import DailyBookings from './modules/DailyBookings';
import CustomerSupport from './modules/CustomerSupport';
import CounterBooking from './modules/CounterBooking';
import SeatAvailability from './modules/SeatAvailability';
import AgentReports from './modules/AgentReports';
import AgentProfile from './modules/AgentProfile';
import { useTranslation } from '../../i18n.jsx';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationPanel from '../../components/NotificationPanel';

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [chartFilter, setChartFilter] = useState('Today');

  // Live KPI statistics
  const [stats, setStats] = useState({
    todayBookings: 24,
    pendingVerification: 6,
    verifiedTickets: 18,
    totalRevenue: 48750,
    passengersServed: 125,
    todayTrips: [],
    recentBookings: [],
    popularRoutes: [
      { from: 'Addis Ababa', to: 'Bahir Dar', count: 8, max: 10 },
      { from: 'Addis Ababa', to: 'Mekelle', count: 5, max: 10 },
      { from: 'Addis Ababa', to: 'Hawassa', count: 4, max: 10 },
      { from: 'Addis Ababa', to: 'Dire Dawa', count: 3, max: 10 },
      { from: 'Addis Ababa', to: 'Jimma', count: 2, max: 10 },
    ],
  });

  useEffect(() => {
    companyAPI.getMyCompany()
      .then(res => setCompany(res?.company || user?.companyId))
      .catch(() => setCompany(user?.companyId));
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [schedulesRes, bookingsRes, supportRes] = await Promise.all([
        scheduleAPI.getAll().catch(() => []),
        bookingAPI.getAll().catch(() => []),
        supportAPI.getAll().catch(() => []),
      ]);

      const companyId = user?.companyId?._id || user?.companyId;
      const allBookings = Array.isArray(bookingsRes) ? bookingsRes : [];
      const companyBookings = companyId
        ? allBookings.filter(b => (b.companyId?._id || b.companyId) === companyId)
        : allBookings;

      const todayBks = companyBookings.filter(b => b.createdAt && b.createdAt.split('T')[0] === today);
      const verified = companyBookings.filter(b => b.status === 'confirmed' || b.status === 'CONFIRMED' || b.verificationStatus === 'VERIFIED').length;
      const pending = companyBookings.filter(b => b.status === 'pending' || b.status === 'pending_payment' || b.paymentStatus === 'unpaid').length;
      const cancelled = companyBookings.filter(b => b.status === 'cancelled' || b.status === 'CANCELLED').length;
      const refunded = companyBookings.filter(b => b.status === 'refunded' || b.status === 'REFUNDED').length;
      const totalRev = companyBookings
        .filter(b => b.status === 'confirmed' || b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (Number(b.totalPrice) || Number(b.totalAmount) || 0), 0);
      const totalPax = companyBookings.reduce((sum, b) => sum + (Array.isArray(b.selectedSeats) ? b.selectedSeats.length : 1), 0);

      // Aggregate popular routes
      const routeMap = {};
      companyBookings.forEach(b => {
        const from = b.schedule?.route?.from || 'Addis Ababa';
        const to = b.schedule?.route?.to || 'Destination';
        const key = `${from} → ${to}`;
        if (!routeMap[key]) routeMap[key] = { from, to, count: 0 };
        routeMap[key].count += (Array.isArray(b.selectedSeats) ? b.selectedSeats.length : 1);
      });
      const popRoutes = Object.values(routeMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((r, i) => ({
          id: i + 1,
          from: r.from,
          to: r.to,
          count: r.count,
          percentage: totalPax > 0 ? Math.round((r.count / totalPax) * 100) : 0,
        }));

      setStats({
        todayBookings: todayBks.length,
        pendingVerification: pending,
        verifiedTickets: verified,
        cancelledTickets: cancelled,
        refundedTickets: refunded,
        totalRevenue: totalRev,
        passengersServed: totalPax,
        allCompanyBookings: companyBookings,
        recentBookings: companyBookings.slice(0, 5),
        popularRoutes: popRoutes,
      });
    } catch (err) {
      console.error('Error fetching agent stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const companyName = company?.companyName || user?.companyId?.companyName || 'Ethio Bus';
  const staffName = (() => {
    const raw = user?.name || '';
    const clean = raw.replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff)\b/gi, '').trim();
    return clean || 'Agent';
  })();

  const sidebarNavItems = [
    { id: 'overview', label: t('nav.dashboard', 'Dashboard'), icon: <FaBus /> },
    { id: 'seat_availability', label: 'Seat Availability', icon: <FaCouch /> },
    { id: 'book_ticket', label: t('nav.searchBook', 'Book Ticket'), icon: <FaPlus /> },
    { id: 'view_passenger', label: t('nav.passenger', 'View Passenger'), icon: <FaUsers /> },
    { id: 'verify_booking', label: 'Verify Booking', icon: <FaShieldAlt />, badge: stats.pendingVerification },
    { id: 'daily_bookings', label: t('nav.bookings', 'Daily Bookings'), icon: <FaClipboardList /> },
    { id: 'customer_support', label: t('nav.support', 'Customer Support'), icon: <FaHeadset /> },
    { id: 'reports', label: t('nav.reports', 'Reports'), icon: <FaFileAlt /> },
    { id: 'profile', label: t('common.profile', 'Profile'), icon: <FaUser /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ── Left Sidebar ── */}
      <aside style={{ width: '250px', background: '#062f22', color: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box', flexShrink: 0 }}>
        <div>
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '18px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              <FaBus />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', letterSpacing: '-0.01em' }}>{companyName}</div>
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0', fontWeight: 500 }}>Ticket Agent Portal</div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sidebarNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`eb-as-nav-item${isActive ? ' active' : ''}`}
                >
                  <span style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge > 0 && !isActive && (
                    <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '50px' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#f87171',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main style={{ flex: 1, minWidth: 0, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Top Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.55rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Here's what's happening with your ticketing operations today.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Date Pill Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '50px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <FaCalendarAlt style={{ color: '#10b981', fontSize: '0.9rem' }} />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <FaChevronDown style={{ fontSize: '0.65rem', color: '#94a3b8' }} />
            </div>

            <LanguageSelector />

            {/* Notification Bell */}
            <NotificationPanel role="agent" />

            {/* Profile Dropdown Pill */}
            <div
              onClick={() => setActiveTab('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '50px', padding: '5px 14px 5px 6px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                {staffName[0]}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                {staffName}
              </span>
              <FaChevronDown style={{ fontSize: '0.65rem', color: '#94a3b8' }} />
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* ═══════════════════════════════════════════════════════════════
                ROW 1: 5 Top KPI Cards Grid
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
              {/* Card 1: Today's Bookings */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <FaTicketAlt />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {stats.todayBookings}
                  </h2>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Today's Bookings</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: stats.todayBookings > 0 ? '#10b981' : '#94a3b8', marginTop: '4px' }}>
                  {stats.todayBookings > 0 ? 'Active bookings today' : 'No bookings yet today'}
                </div>
              </div>

              {/* Card 2: Pending Verification */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <FaHourglassHalf />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {stats.pendingVerification}
                  </h2>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Pending Verification</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: stats.pendingVerification > 0 ? '#f97316' : '#94a3b8', marginTop: '4px' }}>
                  {stats.pendingVerification > 0 ? 'Need attention' : 'All clear'}
                </div>
              </div>

              {/* Card 3: Verified Tickets */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <FaShieldAlt />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {stats.verifiedTickets}
                  </h2>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Verified Tickets</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>Completed today</div>
              </div>

              {/* Card 4: Total Revenue */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <FaChartLine />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    Birr {stats.totalRevenue.toLocaleString()}
                  </h2>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Total Revenue</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#8b5cf6', marginTop: '4px' }}>Company sales</div>
              </div>

              {/* Card 5: Passengers Served */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    <FaUsers />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                    {stats.passengersServed}
                  </h2>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Passengers Served</div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>Total passengers</div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 2: 2 Charts Grid (Area Chart + Donut Status Chart)
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.15fr', gap: '18px' }}>
              {/* Left: Today's Bookings Overview */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Today's Bookings Overview
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                    <span>{chartFilter}</span>
                    <FaChevronDown style={{ fontSize: '0.65rem' }} />
                  </div>
                </div>

                {/* SVG Area Line Chart */}
                <div style={{ width: '100%', height: '170px', position: 'relative' }}>
                  <svg viewBox="0 0 540 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="agentGreenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="30" y1="20" x2="520" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="30" y1="50" x2="520" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="30" y1="80" x2="520" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="30" y1="110" x2="520" y2="110" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {/* Y-axis Labels */}
                    <text x="15" y="24" fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="end">25</text>
                    <text x="15" y="54" fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="end">20</text>
                    <text x="15" y="84" fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="end">15</text>
                    <text x="15" y="114" fontSize="9" fill="#94a3b8" fontWeight="600" textAnchor="end">10</text>

                    {stats.todayBookings > 0 ? (
                      <>
                        <polygon
                          points="35,130 35,130 65,100 100,75 130,105 165,85 200,92 230,68 265,95 300,78 335,70 370,105 405,75 440,88 475,60 510,75 520,40 520,130"
                          fill="url(#agentGreenGrad)"
                        />
                        <polyline
                          points="35,130 65,100 100,75 130,105 165,85 200,92 230,68 265,95 300,78 335,70 370,105 405,75 440,88 475,60 510,75 520,40"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {[
                          [35, 130], [65, 100], [100, 75], [130, 105], [165, 85],
                          [200, 92], [230, 68], [265, 95], [300, 78], [335, 70],
                          [370, 105], [405, 75], [440, 88], [475, 60], [510, 75], [520, 40]
                        ].map(([cx, cy], i) => (
                          <circle key={i} cx={cx} cy={cy} r="3.2" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                        ))}
                      </>
                    ) : (
                      <>
                        <line x1="30" y1="130" x2="520" y2="130" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                        {[35, 100, 165, 230, 300, 370, 440, 510].map((cx, i) => (
                          <circle key={i} cx={cx} cy={130} r="3" fill="#10b981" />
                        ))}
                      </>
                    )}
                  </svg>

                  {/* X-axis labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '35px', paddingRight: '10px', marginTop: '2px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    <span>06:00</span>
                    <span>08:00</span>
                    <span>10:00</span>
                    <span>12:00</span>
                    <span>14:00</span>
                    <span>16:00</span>
                    <span>18:00</span>
                    <span>20:00</span>
                  </div>
                </div>

                {/* Bottom Summary Indicators */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>{stats.todayBookings}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Bookings</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>{stats.verifiedTickets}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Confirmed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f59e0b' }}>{stats.pendingVerification}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Pending</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ef4444' }}>{stats.cancelledTickets || 0}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Cancelled</div>
                  </div>
                </div>
              </div>

              {/* Right: Bookings by Status Donut Chart */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Bookings by Status
                </h3>

                {(() => {
                  const total = (stats.verifiedTickets || 0) + (stats.pendingVerification || 0) + (stats.cancelledTickets || 0) + (stats.refundedTickets || 0) || stats.todayBookings || 0;
                  const confPct = total > 0 ? Math.round(((stats.verifiedTickets || 0) / total) * 100) : 0;
                  const pendPct = total > 0 ? Math.round(((stats.pendingVerification || 0) / total) * 100) : 0;
                  const cancPct = total > 0 ? Math.round(((stats.cancelledTickets || 0) / total) * 100) : 0;
                  const refPct = total > 0 ? Math.round(((stats.refundedTickets || 0) / total) * 100) : 0;

                  // SVG Circle stroke dash calculations
                  const circ = 282.74; // 2 * PI * 45
                  const confDash = (confPct / 100) * circ;
                  const pendDash = (pendPct / 100) * circ;
                  const cancDash = (cancPct / 100) * circ;

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', margin: 'auto 0' }}>
                      {/* SVG Donut */}
                      <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <circle cx="50" cy="50" r="45" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                          {total > 0 && confPct > 0 && (
                            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#10b981" strokeWidth="10" strokeDasharray={`${confDash} ${circ}`} strokeDashoffset="0" />
                          )}
                          {total > 0 && pendPct > 0 && (
                            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#f59e0b" strokeWidth="10" strokeDasharray={`${pendDash} ${circ}`} strokeDashoffset={-confDash} />
                          )}
                          {total > 0 && cancPct > 0 && (
                            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#ef4444" strokeWidth="10" strokeDasharray={`${cancDash} ${circ}`} strokeDashoffset={-(confDash + pendDash)} />
                          )}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{total}</span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Total</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ color: '#475569', fontWeight: 600 }}>Confirmed</span>
                          </div>
                          <strong style={{ color: '#0f172a' }}>{stats.verifiedTickets || 0} ({confPct}%)</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                            <span style={{ color: '#475569', fontWeight: 600 }}>Pending</span>
                          </div>
                          <strong style={{ color: '#0f172a' }}>{stats.pendingVerification || 0} ({pendPct}%)</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                            <span style={{ color: '#475569', fontWeight: 600 }}>Cancelled</span>
                          </div>
                          <strong style={{ color: '#0f172a' }}>{stats.cancelledTickets || 0} ({cancPct}%)</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
                            <span style={{ color: '#475569', fontWeight: 600 }}>Refunded</span>
                          </div>
                          <strong style={{ color: '#0f172a' }}>{stats.refundedTickets || 0} ({refPct}%)</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 3: 3 Column Panels Grid (Recent Bookings / Popular Routes / Quick Actions)
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1.35fr 1.2fr', gap: '18px' }}>
              {/* Panel 1: Recent Bookings */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Recent Bookings</h3>
                  <button
                    onClick={() => setActiveTab('daily_bookings')}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    View All
                  </button>
                </div>

                {(!stats.recentBookings || stats.recentBookings.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No bookings recorded yet for this company.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Booking ID</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Route</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Date</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentBookings.map((b) => (
                          <tr key={b._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '8px 0', fontWeight: 700, color: '#0f172a' }}>
                              {b.ticketNumber || 'BK-' + b._id?.slice(-6).toUpperCase()}
                            </td>
                            <td style={{ padding: '8px 0', color: '#334155' }}>
                              {b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}
                            </td>
                            <td style={{ padding: '8px 0', color: '#64748b' }}>
                              {b.schedule?.date || (b.createdAt && b.createdAt.split('T')[0]) || 'Today'}
                            </td>
                            <td style={{ padding: '8px 0' }}>
                              <span style={{
                                background: b.status === 'confirmed' || b.status === 'CONFIRMED' ? '#ecfdf5' : b.status === 'cancelled' || b.status === 'CANCELLED' ? '#fef2f2' : '#fffbeb',
                                color: b.status === 'confirmed' || b.status === 'CONFIRMED' ? '#10b981' : b.status === 'cancelled' || b.status === 'CANCELLED' ? '#ef4444' : '#d97706',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '50px',
                              }}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Panel 2: Popular Routes Today */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Popular Routes Today</h3>
                  <button
                    onClick={() => setActiveTab('reports')}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    View All
                  </button>
                </div>

                {(!stats.popularRoutes || stats.popularRoutes.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No route booking activity recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      <span>Route</span>
                      <span>Bookings</span>
                    </div>

                    {stats.popularRoutes.map((r) => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 700, width: '12px' }}>{r.id}</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.from} → {r.to}</span>
                        </div>
                        <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '50px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${r.percentage}%`, height: '100%', background: '#10b981', borderRadius: '50px' }} />
                        </div>
                        <span style={{ fontWeight: 800, color: '#0f172a', width: '16px', textAlign: 'right' }}>{r.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel 3: Quick Actions */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Quick Actions</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Action 1 */}
                  <div
                    onClick={() => setActiveTab('search_passenger')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                        <FaSearch />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Search Passenger</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Find passenger by phone or name</div>
                      </div>
                    </div>
                    <FaChevronRight style={{ color: '#10b981', fontSize: '0.75rem' }} />
                  </div>

                  {/* Action 2 */}
                  <div
                    onClick={() => setActiveTab('book_ticket')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                        <FaTicketAlt />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Book New Ticket</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Create a new booking</div>
                      </div>
                    </div>
                    <FaChevronRight style={{ color: '#8b5cf6', fontSize: '0.75rem' }} />
                  </div>

                  {/* Action 3 */}
                  <div
                    onClick={() => setActiveTab('verify_booking')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                        <FaShieldAlt />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Verify Booking</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Verify and confirm booking</div>
                      </div>
                    </div>
                    <FaChevronRight style={{ color: '#3b82f6', fontSize: '0.75rem' }} />
                  </div>

                  {/* Action 4 */}
                  <div
                    onClick={() => setActiveTab('daily_bookings')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>
                        <FaPrint />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Print Ticket</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Print or reprint ticket</div>
                      </div>
                    </div>
                    <FaChevronRight style={{ color: '#f97316', fontSize: '0.75rem' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 4: Today's Activity Timeline
                ═══════════════════════════════════════════════════════════════ */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Today's Activity Timeline
                </h3>
                <button
                  onClick={() => setActiveTab('daily_bookings')}
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  View All Activity
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {/* Node 1 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, minWidth: '58px' }}>07:15 AM</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                    <span style={{ width: '2px', height: '30px', background: '#e2e8f0', marginTop: '4px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>New booking created</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Addis Ababa → Bahir Dar • 2 Seats</div>
                  </div>
                </div>

                {/* Node 2 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, minWidth: '58px' }}>08:30 AM</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ width: '2px', height: '30px', background: '#e2e8f0', marginTop: '4px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Booking verified</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>BK-250831-001 verified successfully</div>
                  </div>
                </div>

                {/* Node 3 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, minWidth: '58px' }}>09:45 AM</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                    <span style={{ width: '2px', height: '30px', background: '#e2e8f0', marginTop: '4px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Pending verification</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Addis Ababa → Hawassa • 1 Seat</div>
                  </div>
                </div>

                {/* Node 4 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, minWidth: '58px' }}>11:20 AM</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>Booking cancelled</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Addis Ababa → Jimma • 2 Seats</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-module Pages ── */}
        {activeTab === 'seat_availability' && <SeatAvailability onNavigateToBook={() => setActiveTab('book_ticket')} />}
        {(activeTab === 'view_passenger' || activeTab === 'search_passenger') && <ViewPassenger />}
        {activeTab === 'book_ticket' && <CounterBooking />}
        {activeTab === 'verify_booking' && <TripPassengerVerification />}
        {activeTab === 'daily_bookings' && <DailyBookings />}
        {activeTab === 'customer_support' && <CustomerSupport />}
        {activeTab === 'reports' && <AgentReports company={company} user={user} />}
        {activeTab === 'profile' && <AgentProfile />}
      </main>
    </div>
  );
};

export default AgentDashboard;

