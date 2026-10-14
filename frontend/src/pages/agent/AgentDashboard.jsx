import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { bookingAPI, scheduleAPI, companyAPI, ticketAPI, supportAPI } from '../../utils/api';
import {
  todayDateString, isConfirmed, isAwaitingPayment, isCancelled, isRefunded,
  isRevenueBearing, bookingAmount, bookingSeats, bookingRouteLabel,
} from '../../utils/bookingStatus';
import {
  FaBus, FaSearch,
  FaShieldAlt, FaSignOutAlt, FaPlus,
  FaClipboardList, FaTicketAlt, FaHeadset, FaHourglassHalf, FaUser, FaEnvelope,
  FaCalendarAlt, FaChevronDown, FaChevronRight, FaChartLine, FaFileAlt,
  FaUsers, FaPrint, FaCouch, FaBars, FaReceipt,
  FaExchangeAlt
} from 'react-icons/fa';

import ViewPassenger from './modules/ViewPassenger';
import TripPassengerVerification from './modules/TripPassengerVerification';
import ReceiptVerification from './modules/ReceiptVerification';
import DailyBookings from './modules/DailyBookings';
import CustomerSupport from './modules/CustomerSupport';
import AgentCommunications from './modules/AgentCommunications';
import StaffRefundApprovals from './modules/StaffRefundApprovals';
import CounterBooking from './modules/CounterBooking';
import SeatAvailability from './modules/SeatAvailability';
import AgentReports from './modules/AgentReports';
import AgentProfile from './modules/AgentProfile';
import { useTranslation } from '../../i18n';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationPanel from '../../components/NotificationPanel';
import ThemeToggle from '../../components/ThemeToggle';

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [chartFilter, setChartFilter] = useState('Today');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingVerification: 0,
    pendingReceipts: 0,
    verifiedTickets: 0,
    cancelledTickets: 0,
    refundedTickets: 0,
    totalRevenue: 0,
    passengersServed: 0,
    allCompanyBookings: [],
    todayTrips: [],
    recentBookings: [],
    popularRoutes: [],
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
      const today = todayDateString();
      const [schedulesRes, bookingsRes, supportRes] = await Promise.all([
        scheduleAPI.getAll().catch(() => []),
        bookingAPI.getAll().catch(() => []),
        supportAPI.getAll().catch(() => []),
      ]);

      const companyId = user?.companyId?._id || user?.companyId;
      const allBookings = Array.isArray(bookingsRes) ? bookingsRes : [];
      const companyBookings = companyId
        ? allBookings.filter(b => {
            const bCompany = b.companyId?._id || b.companyId;
            return bCompany === companyId || bCompany === companyId?._id;
          })
        : [];

      const todayBks = companyBookings.filter(b => b.createdAt && b.createdAt.split('T')[0] === today);
      const verified = companyBookings.filter(b => isConfirmed(b) || b.verificationStatus === 'VERIFIED').length;
      const pending = companyBookings.filter(isAwaitingPayment).length;
      const pendingReceipts = companyBookings.filter(b => b.receiptStatus === 'PENDING').length;
      const cancelled = companyBookings.filter(isCancelled).length;
      const refunded = companyBookings.filter(isRefunded).length;
      const totalRev = companyBookings
        .filter(isRevenueBearing)
        .reduce((sum, b) => sum + bookingAmount(b), 0);
      const totalPax = companyBookings.reduce((sum, b) => sum + bookingSeats(b).length, 0);

      const routeMap = {};
      companyBookings.forEach(b => {
        const label = bookingRouteLabel(b);
        const from = b.schedule?.route?.from || b.outboundLeg?.schedule?.route?.from || 'Addis Ababa';
        const to = b.schedule?.route?.to || b.outboundLeg?.schedule?.route?.to || 'Destination';
        const key = label || `${from} → ${to}`;
        if (!routeMap[key]) routeMap[key] = { from, to, count: 0 };
        routeMap[key].count += bookingSeats(b).length;
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
        pendingReceipts,
        verifiedTickets: verified,
        cancelledTickets: cancelled,
        refundedTickets: refunded,
        pendingRefundApprovals: companyBookings.filter(b => b.refundStatus === 'APPROVED' || b.refundDecision === 'APPROVED').length,
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

  const companyName = company?.companyName || user?.companyId?.companyName || 'Ethio Trip';
  const staffName = (() => {
    const raw = user?.name || '';
    const clean = raw.replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff)\b/gi, '').trim();
    return clean || 'Agent';
  })();

  const sidebarNavItems = [
    { id: 'overview', label: t('nav.dashboard', 'Dashboard'), icon: <FaBus /> },
    { id: 'seat_availability', label: t('agent.seatAvailability', 'Seat Availability'), icon: <FaCouch /> },
    { id: 'book_ticket', label: t('nav.searchBook', 'Book Ticket'), icon: <FaPlus /> },
    { id: 'receipt_approval', label: t('agent.receiptApprovals', 'Receipt Approvals'), icon: <FaReceipt />, badge: stats.pendingReceipts },
    { id: 'refund_approvals', label: t('agent.refundApprovals', 'Refund Approvals'), icon: <FaExchangeAlt />, badge: stats.pendingRefundApprovals },
    { id: 'view_passenger', label: t('nav.passenger', 'View Passenger'), icon: <FaUsers /> },
    { id: 'verify_booking', label: t('agent.verifyBooking', 'Verify Booking'), icon: <FaShieldAlt />, badge: stats.pendingVerification },
    { id: 'daily_bookings', label: t('nav.bookings', 'Daily Bookings'), icon: <FaClipboardList /> },
    { id: 'customer_support', label: t('nav.support', 'Customer Support'), icon: <FaHeadset /> },
    { id: 'communications', label: t('agent.messages', 'Messages'), icon: <FaEnvelope /> },
    { id: 'reports', label: t('nav.reports', 'Reports'), icon: <FaFileAlt /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-[250px] bg-[#062f22] text-white flex flex-col justify-between p-6 py-6
        h-screen box-border shrink-0 overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          <div className="flex items-center gap-3 px-2 pb-6 border-b border-white/[0.08] mb-4.5">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-emerald-500 text-white flex items-center justify-center text-[1.2rem] shrink-0">
              <FaBus />
            </div>
            <div>
              <div className="font-extrabold text-[1rem] text-white tracking-tight">{companyName}</div>
              <div className="text-[0.72rem] text-emerald-200 font-medium">{t('ticket agent', 'Ticket Agent')}</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {sidebarNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`flex items-center gap-3.5 w-full px-4 py-3 rounded-xl border-none text-[0.9rem] font-semibold cursor-pointer text-left transition-all ${isActive ? 'bg-white/20 text-white font-extrabold shadow-sm' : 'bg-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white'}`}
                >
                  <span className="text-[1.05rem] flex items-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && !isActive && (
                    <span className="bg-red-500 text-white text-[0.68rem] font-extrabold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/[0.08] pt-4">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full py-2.5 px-3.5 rounded-lg border-0 bg-transparent text-red-400 hover:text-red-300 hover:bg-white/5 text-[0.88rem] font-semibold cursor-pointer text-left transition-colors"
          >
            <FaSignOutAlt />
            <span>{t('common.logout', 'Logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="shrink-0 py-4 px-4 md:px-8 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <button
            className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-50"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          <LanguageSelector />
          <NotificationPanel role="agent" />
          <div className="relative">
            <div
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-full py-1.5 pl-1.5 pr-3.5 cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[0.85rem] font-extrabold overflow-hidden shrink-0">
                {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : staffName[0]}
              </div>
              <span className="hidden sm:block text-[0.85rem] font-bold text-slate-900">
                {staffName}
              </span>
            </div>
            {profileDropdownOpen && (
              <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[1200] overflow-hidden" onMouseLeave={() => setProfileDropdownOpen(false)}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                    {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : staffName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate">{staffName}</p>
                    <p className="text-[10px] text-slate-400 m-0">{t('ticket agent', 'Ticket Agent / Staff')}</p>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <FaUser className="text-emerald-600" /> {t('common.editProfile', 'Edit Profile')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 md:py-6 px-4 md:px-8">
          {activeTab === 'overview' && (
            <>
              <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                  <h1 className="m-0 text-[1.55rem] font-black text-slate-900 tracking-tight">
                    {t('nav.dashboard', 'Dashboard')}
                  </h1>
                  <p className="m-0 mt-1 text-[0.84rem] text-slate-500">
                    {t('agent.dashboardSubtitle', "Here's what's happening with your ticketing operations today.")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full py-1.5 px-3.5 text-[0.82rem] font-bold text-slate-700 cursor-pointer shadow-sm">
                    <FaCalendarAlt className="text-emerald-500 text-[0.9rem]" />
                    <span className="hidden sm:inline">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <FaChevronDown className="text-[0.65rem] text-slate-400" />
                  </div>
                </div>
              </header>

              <div className="flex flex-col gap-[22px]">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className="w-[42px] h-[42px] rounded-[10px] bg-emerald-50 text-emerald-500 flex items-center justify-center text-[1.2rem] shrink-0">
                        <FaTicketAlt />
                      </div>
                      <h2 className="m-0 text-[1.75rem] font-black text-slate-900 leading-none">
                        {stats.todayBookings}
                      </h2>
                    </div>
                    <div className="text-[0.82rem] font-bold text-slate-500">{t('agent.todayBookings', "Today's Bookings")}</div>
                    <div className={`text-[0.74rem] font-bold mt-1 ${stats.todayBookings > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {stats.todayBookings > 0 ? t('agent.activeToday', 'Active bookings today') : t('agent.noBookingsYet', 'No bookings yet today')}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className="w-[42px] h-[42px] rounded-[10px] bg-orange-50 text-orange-500 flex items-center justify-center text-[1.2rem] shrink-0">
                        <FaHourglassHalf />
                      </div>
                      <h2 className="m-0 text-[1.75rem] font-black text-slate-900 leading-none">
                        {stats.pendingVerification}
                      </h2>
                    </div>
                    <div className="text-[0.82rem] font-bold text-slate-500">{t('agent.pendingVerification', 'Pending Verification')}</div>
                    <div className={`text-[0.74rem] font-bold mt-1 ${stats.pendingVerification > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                      {stats.pendingVerification > 0 ? t('agent.needAttention', 'Need attention') : t('agent.allClear', 'All clear')}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className="w-[42px] h-[42px] rounded-[10px] bg-blue-50 text-blue-500 flex items-center justify-center text-[1.2rem] shrink-0">
                        <FaShieldAlt />
                      </div>
                      <h2 className="m-0 text-[1.75rem] font-black text-slate-900 leading-none">
                        {stats.verifiedTickets}
                      </h2>
                    </div>
                    <div className="text-[0.82rem] font-bold text-slate-500">{t('agent.verifiedTickets', 'Verified Tickets')}</div>
                    <div className="text-[0.74rem] font-bold text-blue-500 mt-1">{t('agent.completedToday', 'Completed today')}</div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className="w-[42px] h-[42px] rounded-[10px] bg-purple-50 text-purple-500 flex items-center justify-center text-[1.2rem] shrink-0">
                        <FaChartLine />
                      </div>
                      <h2 className="m-0 text-[1.5rem] font-black text-slate-900 leading-none">
                        ETB {stats.totalRevenue.toLocaleString()}
                      </h2>
                    </div>
                    <div className="text-[0.82rem] font-bold text-slate-500">{t('admin.totalRevenue', 'Total Revenue')}</div>
                    <div className="text-[0.74rem] font-bold text-purple-500 mt-1">{t('agent.companySales', 'Company sales')}</div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-2">
                      <div className="w-[42px] h-[42px] rounded-[10px] bg-red-50 text-red-500 flex items-center justify-center text-[1.2rem] shrink-0">
                        <FaUsers />
                      </div>
                      <h2 className="m-0 text-[1.75rem] font-black text-slate-900 leading-none">
                        {stats.passengersServed}
                      </h2>
                    </div>
                    <div className="text-[0.82rem] font-bold text-slate-500">{t('agent.passengersServed', 'Passengers Served')}</div>
                    <div className="text-[0.74rem] font-bold text-emerald-500 mt-1">{t('agent.totalPassengers', 'Total passengers')}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.15fr] gap-[18px]">
                  <div className="bg-white rounded-[18px] p-[22px] border border-slate-200 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-center mb-3.5">
                      <h3 className="m-0 text-[1.05rem] font-extrabold text-slate-900">
                        {t('agent.todayBookingsOverview', "Today's Bookings Overview")}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[0.78rem] text-slate-600 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-lg font-bold cursor-pointer">
                        <span>{chartFilter}</span>
                        <FaChevronDown className="text-[0.65rem]" />
                      </div>
                    </div>

                    <div className="w-full h-[170px] relative">
                      <svg viewBox="0 0 540 140" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="agentGreenGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        <line x1="30" y1="20" x2="520" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="30" y1="50" x2="520" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="30" y1="80" x2="520" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />
                        <line x1="30" y1="110" x2="520" y2="110" stroke="#f1f5f9" strokeDasharray="3 3" />

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

                      <div className="flex justify-between pl-[35px] pr-2.5 mt-0.5 text-[0.72rem] text-slate-400 font-semibold">
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

                    <div className="flex items-center justify-around border-t border-slate-100 pt-3 mt-2.5">
                      <div className="text-center">
                        <div className="text-[1.15rem] font-black text-slate-900">{stats.todayBookings}</div>
                        <div className="text-[0.72rem] text-slate-500 font-semibold">{t('agent.totalBookings', 'Total Bookings')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[1.15rem] font-black text-emerald-500">{stats.verifiedTickets}</div>
                        <div className="text-[0.72rem] text-slate-500 font-semibold">{t('booking.confirmed', 'Confirmed')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[1.15rem] font-black text-amber-500">{stats.pendingVerification}</div>
                        <div className="text-[0.72rem] text-slate-500 font-semibold">{t('payment.pending', 'Pending')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[1.15rem] font-black text-red-500">{stats.cancelledTickets || 0}</div>
                        <div className="text-[0.72rem] text-slate-500 font-semibold">{t('booking.cancelled', 'Cancelled')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[18px] p-[22px] border border-slate-200 flex flex-col justify-between shadow-sm">
                    <h3 className="m-0 mb-3 text-[1.05rem] font-extrabold text-slate-900">
                      {t('agent.bookingsByStatus', 'Bookings by Status')}
                    </h3>

                    {(() => {
                      const total = (stats.verifiedTickets || 0) + (stats.pendingVerification || 0) + (stats.cancelledTickets || 0) + (stats.refundedTickets || 0) || stats.todayBookings || 0;
                      const confPct = total > 0 ? Math.round(((stats.verifiedTickets || 0) / total) * 100) : 0;
                      const pendPct = total > 0 ? Math.round(((stats.pendingVerification || 0) / total) * 100) : 0;
                      const cancPct = total > 0 ? Math.round(((stats.cancelledTickets || 0) / total) * 100) : 0;
                      const refPct = total > 0 ? Math.round(((stats.refundedTickets || 0) / total) * 100) : 0;

                      const circ = 282.74;
                      const confDash = (confPct / 100) * circ;
                      const pendDash = (pendPct / 100) * circ;
                      const cancDash = (cancPct / 100) * circ;

                      return (
                        <div className="flex items-center justify-around gap-4 my-auto">
                          <div className="relative w-[130px] h-[130px] shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-[1.25rem] font-black text-slate-900 leading-none">{total}</span>
                              <span className="text-[0.65rem] text-slate-500 font-semibold mt-0.5">{t('common.total', 'Total')}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center justify-between text-[0.75rem]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-600 font-semibold">{t('booking.confirmed', 'Confirmed')}</span>
                              </div>
                              <strong className="text-slate-900">{stats.verifiedTickets || 0} ({confPct}%)</strong>
                            </div>
                            <div className="flex items-center justify-between text-[0.75rem]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-slate-600 font-semibold">{t('payment.pending', 'Pending')}</span>
                              </div>
                              <strong className="text-slate-900">{stats.pendingVerification || 0} ({pendPct}%)</strong>
                            </div>
                            <div className="flex items-center justify-between text-[0.75rem]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-slate-600 font-semibold">{t('booking.cancelled', 'Cancelled')}</span>
                              </div>
                              <strong className="text-slate-900">{stats.cancelledTickets || 0} ({cancPct}%)</strong>
                            </div>
                            <div className="flex items-center justify-between text-[0.75rem]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                <span className="text-slate-600 font-semibold">{t('booking.refunded', 'Refunded')}</span>
                              </div>
                              <strong className="text-slate-900">{stats.refundedTickets || 0} ({refPct}%)</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1.35fr_1.2fr] gap-[18px]">
                  <div className="bg-white rounded-[18px] p-5 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-3.5">
                      <h3 className="m-0 text-[1rem] font-extrabold text-slate-900">{t('agent.recentBookings', 'Recent Bookings')}</h3>
                      <button
                        onClick={() => setActiveTab('daily_bookings')}
                        className="bg-slate-50 border border-slate-200 text-slate-600 text-[0.72rem] font-bold py-1 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {t('common.viewAll', 'View All')}
                      </button>
                    </div>

                    {(!stats.recentBookings || stats.recentBookings.length === 0) ? (
                      <div className="text-center py-7 text-slate-400 text-[0.8rem]">
                        {t('agent.noBookingsRecorded', 'No bookings recorded yet for this company.')}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[0.78rem]">
                          <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-100">
                              <th className="pb-2 font-semibold">{t('booking.bookingId', 'Booking ID')}</th>
                              <th className="pb-2 font-semibold">{t('admin.route', 'Route')}</th>
                              <th className="pb-2 font-semibold">{t('conductor.date', 'Date')}</th>
                              <th className="pb-2 font-semibold">{t('common.status', 'Status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.recentBookings.map((b) => (
                              <tr key={b._id} className="border-b border-slate-50">
                                <td className="py-2 font-bold text-slate-900">
                                  {b.ticketNumber || 'BK-' + b._id?.slice(-6).toUpperCase()}
                                </td>
                                <td className="py-2 text-slate-700">
                                  {t(b.schedule?.route?.from, b.schedule?.route?.from || 'Origin')} → {t(b.schedule?.route?.to, b.schedule?.route?.to || 'Destination')}
                                </td>
                                <td className="py-2 text-slate-500">
                                  {b.schedule?.date || (b.createdAt && b.createdAt.split('T')[0]) || 'Today'}
                                </td>
                                <td className="py-2">
                                  <span className={`text-[0.7rem] font-bold px-2 py-0.5 rounded-full ${
                                    b.status === 'confirmed' || b.status === 'CONFIRMED'
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : b.status === 'cancelled' || b.status === 'CANCELLED'
                                      ? 'bg-red-50 text-red-500'
                                      : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {t(b.status, b.status)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-[18px] p-5 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-3.5">
                      <h3 className="m-0 text-[1rem] font-extrabold text-slate-900">{t('agent.popularRoutesToday', 'Popular Routes Today')}</h3>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="bg-slate-50 border border-slate-200 text-slate-600 text-[0.72rem] font-bold py-1 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {t('common.viewAll', 'View All')}
                      </button>
                    </div>

                    {(!stats.popularRoutes || stats.popularRoutes.length === 0) ? (
                      <div className="text-center py-7 text-slate-400 text-[0.8rem]">
                        {t('agent.noRouteActivity', 'No route booking activity recorded yet.')}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between text-[0.72rem] text-slate-400 font-semibold">
                          <span>{t('admin.route', 'Route')}</span>
                          <span>{t('booking.bookings', 'Bookings')}</span>
                        </div>

                        {stats.popularRoutes.map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-2 text-[0.78rem]">
                            <div className="flex items-center gap-2 w-40 overflow-hidden text-ellipsis whitespace-nowrap">
                              <span className="text-slate-400 font-bold w-3">{r.id}</span>
                              <span className="font-semibold text-slate-900 truncate">{t(r.from, r.from)} → {t(r.to, r.to)}</span>
                            </div>
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.percentage}%` }} />
                            </div>
                            <span className="font-extrabold text-slate-900 w-4 text-right">{r.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-[18px] p-5 border border-slate-200 flex flex-col justify-between shadow-sm">
                    <h3 className="m-0 mb-3 text-[1rem] font-extrabold text-slate-900">{t('agent.quickActions', 'Quick Actions')}</h3>

                    <div className="flex flex-col gap-2.5">
                      <div
                        onClick={() => setActiveTab('search_passenger')}
                        className="flex items-center justify-between p-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-[34px] h-[34px] rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center text-[0.95rem]">
                            <FaSearch />
                          </div>
                          <div>
                            <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.searchPassenger', 'Search Passenger')}</div>
                            <div className="text-[0.68rem] text-slate-500">{t('agent.findPaxHelp', 'Find passenger by phone or name')}</div>
                          </div>
                        </div>
                        <FaChevronRight className="text-emerald-500 text-[0.75rem]" />
                      </div>

                      <div
                        onClick={() => setActiveTab('book_ticket')}
                        className="flex items-center justify-between p-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50/70 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-[34px] h-[34px] rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center text-[0.95rem]">
                            <FaTicketAlt />
                          </div>
                          <div>
                            <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.bookNewTicket', 'Book New Ticket')}</div>
                            <div className="text-[0.68rem] text-slate-500">{t('agent.createBookingHelp', 'Create a new booking')}</div>
                          </div>
                        </div>
                        <FaChevronRight className="text-purple-500 text-[0.75rem]" />
                      </div>

                      <div
                        onClick={() => setActiveTab('verify_booking')}
                        className="flex items-center justify-between p-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/70 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-[34px] h-[34px] rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-[0.95rem]">
                            <FaShieldAlt />
                          </div>
                          <div>
                            <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.verifyBooking', 'Verify Booking')}</div>
                            <div className="text-[0.68rem] text-slate-500">{t('agent.verifyBookingHelp', 'Verify and confirm booking')}</div>
                          </div>
                        </div>
                        <FaChevronRight className="text-blue-500 text-[0.75rem]" />
                      </div>

                      <div
                        onClick={() => setActiveTab('daily_bookings')}
                        className="flex items-center justify-between p-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:bg-slate-50/70 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-[34px] h-[34px] rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center text-[0.95rem]">
                            <FaPrint />
                          </div>
                          <div>
                            <div className="text-[0.82rem] font-extrabold text-slate-900">{t('ticket.printBoardingPass', 'Print Ticket')}</div>
                            <div className="text-[0.68rem] text-slate-500">{t('agent.printTicketHelp', 'Print or reprint ticket')}</div>
                          </div>
                        </div>
                        <FaChevronRight className="text-orange-500 text-[0.75rem]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-[1rem] font-extrabold text-slate-900">
                      {t('agent.todayActivityTimeline', "Today's Activity Timeline")}
                    </h3>
                    <button
                      onClick={() => setActiveTab('daily_bookings')}
                      className="bg-slate-50 border border-slate-200 text-slate-600 text-[0.72rem] font-bold py-1 px-2.5 rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      {t('common.viewAll', 'View All Activity')}
                    </button>
                  </div>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[0.74rem] text-slate-500 font-bold min-w-[58px]">07:15 AM</span>
                      <div className="flex flex-col items-center mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="w-0.5 h-[30px] bg-slate-200 mt-1" />
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.newBookingCreated', 'New booking created')}</div>
                        <div className="text-[0.72rem] text-slate-500 mt-0.5">Addis Ababa → Bahir Dar • 2 Seats</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="text-[0.74rem] text-slate-500 font-bold min-w-[58px]">08:30 AM</span>
                      <div className="flex flex-col items-center mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="w-0.5 h-[30px] bg-slate-200 mt-1" />
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.bookingVerified', 'Booking verified')}</div>
                        <div className="text-[0.72rem] text-slate-500 mt-0.5">BK-250831-001 verified successfully</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="text-[0.74rem] text-slate-500 font-bold min-w-[58px]">09:45 AM</span>
                      <div className="flex flex-col items-center mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="w-0.5 h-[30px] bg-slate-200 mt-1" />
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.pendingVerification', 'Pending verification')}</div>
                        <div className="text-[0.72rem] text-slate-500 mt-0.5">Addis Ababa → Hawassa • 1 Seat</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="text-[0.74rem] text-slate-500 font-bold min-w-[58px]">11:20 AM</span>
                      <div className="flex flex-col items-center mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      </div>
                      <div>
                        <div className="text-[0.82rem] font-extrabold text-slate-900">{t('agent.bookingCancelled', 'Booking cancelled')}</div>
                        <div className="text-[0.72rem] text-slate-500 mt-0.5">Addis Ababa → Jimma • 2 Seats</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'seat_availability' && <SeatAvailability onNavigateToBook={() => setActiveTab('book_ticket')} />}
          {(activeTab === 'view_passenger' || activeTab === 'search_passenger') && <ViewPassenger />}
          {activeTab === 'book_ticket' && <CounterBooking />}
          {activeTab === 'receipt_approval' && <ReceiptVerification />}
          {activeTab === 'refund_approvals' && <StaffRefundApprovals onNavigateToMessages={() => setActiveTab('communications')} />}
          {activeTab === 'verify_booking' && <TripPassengerVerification />}
          {activeTab === 'daily_bookings' && <DailyBookings />}
          {activeTab === 'customer_support' && <CustomerSupport />}
          {activeTab === 'communications' && <AgentCommunications />}
          {activeTab === 'reports' && <AgentReports company={company} user={user} />}
          {activeTab === 'profile' && <AgentProfile />}
        </div>
      </main>
    </div>
  );
};

export default AgentDashboard;
