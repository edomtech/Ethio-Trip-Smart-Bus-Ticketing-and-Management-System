import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBus, FaUsers, FaUserTie, FaRoute, FaCalendarAlt, FaTicketAlt,
  FaCreditCard, FaChartBar, FaUser, FaSignOutAlt,
  FaBars, FaBuilding, FaExchangeAlt, FaTag, FaClipboardList,
  FaChevronDown
} from 'react-icons/fa';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';
import {
  busAPI, routeAPI, scheduleAPI, bookingAPI, userAPI,
  reportAPI, companyAPI, supportAPI, conductorReportAPI, discountAPI
} from '../../utils/api';
import { isRevenueBearing, bookingAmount } from '../../utils/bookingStatus';
import { useTranslation } from '../../i18n';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationPanel from '../../components/NotificationPanel';
import ThemeToggle from '../../components/ThemeToggle';
import { toast } from 'react-toastify';

import AdminBuses from './modules/AdminBuses';
import AdminRoutes from './modules/AdminRoutes';
import AdminSchedules from './modules/AdminSchedules';
import AdminBookings from './modules/AdminBookings';
import AdminPayments from './modules/AdminPayments';
import AdminPassengers from './modules/AdminPassengers';
import AdminAgents from './modules/AdminAgents';
import AdminDiscounts from './modules/AdminDiscounts';
import GenerateReports from './modules/GenerateReports';
import AdminProfile from './modules/AdminProfile';
import CompanyRefunds from './modules/CompanyRefunds';
import AdminConductorReports from './modules/AdminConductorReports';
import CustomerSupport from '../agent/modules/CustomerSupport';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));

  const [company, setCompany] = useState(null);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [conductorReports, setConductorReports] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [compRes, bList, rList, sList, bkList, uList, aList, dList, crList, spList, overviewRes] = await Promise.all([
        companyAPI.getMyCompany().catch(() => ({ company: null })),
        busAPI.getAll().catch(() => []),
        routeAPI.getAll().catch(() => []),
        scheduleAPI.getAll().catch(() => []),
        bookingAPI.getAll().catch(() => []),
        userAPI.getAll({ role: 'passenger' }).catch(() => []),
        userAPI.getStaff().catch(() => []),
        discountAPI.getAll().catch(() => []),
        conductorReportAPI.getAll().catch(() => []),
        supportAPI.getAll().catch(() => []),
        reportAPI.getOverview().catch(() => null),
      ]);

      setCompany(compRes?.company || user?.companyId);
      setBuses(bList || []);
      setRoutes(rList || []);
      setSchedules(sList || []);
      setBookings(bkList || []);
      setUsers(Array.isArray(uList) ? uList : []);
      setAgents(Array.isArray(aList) ? aList : []);
      setDiscounts(Array.isArray(dList) ? dList : []);
      setConductorReports(Array.isArray(crList) ? crList : []);
      setSupportTickets(Array.isArray(spList) ? spList : []);
      setOverview(overviewRes || null);
    } catch (err) {
      console.error(err);
      toast.error(t('admin.failedLoadData', 'Failed to load company admin data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success(t('auth.logoutSuccess', 'Logged out successfully'));
    navigate('/');
  };

  const companyName = company?.companyName || user?.companyId?.companyName || t('admin.companyFleet', 'Company Fleet');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrips = schedules.filter(s => s.date === todayStr);
  const activeBuses = buses.filter(b => b.status === 'active');
  const pendingPayments = bookings.filter(b => b.paymentStatus === 'PENDING' || b.paymentStatus === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'confirmed');
  const refundRequests = bookings.filter(b => b.refundStatus && b.refundStatus !== 'NONE');

  const totalRevenue = overview?.totalRevenue
    ?? bookings
      .filter(b => b.paymentStatus === 'PAID' || b.paymentStatus === 'paid')
      .reduce((s, b) => s + (Number(b.totalPrice) || Number(b.totalAmount) || 0), 0);

  const passengerStats = React.useMemo(() => {
    const passengerMap = new Map();
    let seatsCount = 0;

    bookings.forEach((b) => {
      const isStaff = b.user?.role === 'company_staff' || b.user?.role === 'conductor' || b.user?.role === 'company_admin' || b.user?.role === 'super_admin';
      const email = b.passenger?.email || (!isStaff && (b.user && b.user.email)) || b.contactEmail;
      const phone = b.passenger?.phone || (!isStaff && (b.user && b.user.phone)) || b.contactPhone;
      const name = b.passenger?.name || (!isStaff && (b.user && b.user.name));
      const userId = (!isStaff && (b.user?._id || b.user)) ? (b.user?._id || b.user).toString() : null;

      const key = (email ? email.toLowerCase().trim() : null)
        || (phone ? phone.trim() : null)
        || userId
        || (name ? name.toLowerCase().trim() : null);

      if (key && !passengerMap.has(key)) {
        passengerMap.set(key, {
          name: name || 'Passenger',
          email: email || '',
          phone: phone || '',
        });
      }

      const seats = Array.isArray(b.selectedSeats) && b.selectedSeats.length > 0
        ? b.selectedSeats.length
        : Array.isArray(b.outboundLeg?.seats) && b.outboundLeg.seats.length > 0
          ? b.outboundLeg.seats.length
          : 1;
      seatsCount += seats;
    });

    return {
      uniquePassengers: passengerMap.size,
      totalSeats: seatsCount,
    };
  }, [bookings]);

  const totalBookingsCount = overview?.totalBookings ?? bookings.length;
  const totalPassengerCount = passengerStats.uniquePassengers > 0
    ? passengerStats.uniquePassengers
    : (overview?.totalPassengers || users.length || 0);
  const activeBusCount = overview?.activeBuses ?? (activeBuses.length || buses.length);
  const confirmedBookingCount = overview?.bookingsBreakdown?.confirmed ?? confirmedBookings.length;
  const todayRevenueCount = overview?.todayRevenue ?? 0;

  const navItems = [
    { id: 'dashboard', label: t('admin.dashboard', 'Dashboard'), icon: <FaChartBar /> },
    { id: 'agents', label: t('admin.staffs', 'Staffs'), icon: <FaUserTie /> },
    { id: 'passengers', label: t('admin.passengers', 'Passengers'), icon: <FaUsers /> },
    { id: 'buses', label: t('admin.buses', 'Buses'), icon: <FaBus /> },
    { id: 'routes', label: t('admin.routes', 'Routes'), icon: <FaRoute /> },
    { id: 'schedules', label: t('admin.schedules', 'Schedules'), icon: <FaCalendarAlt /> },
    { id: 'bookings', label: t('admin.bookings', 'Bookings'), icon: <FaTicketAlt /> },
    { id: 'payments', label: t('admin.payments', 'Payments'), icon: <FaCreditCard /> },
    { id: 'refunds', label: t('admin.refunds', 'Cancellation & Refunds'), icon: <FaExchangeAlt />, badge: refundRequests.filter(r => r.refundStatus === 'PENDING').length },
    { id: 'discounts', label: t('admin.discounts', 'Discounts'), icon: <FaTag /> },
    { id: 'conductor_reports', label: t('admin.conductorReports', 'Conductor Reports'), icon: <FaClipboardList />, badge: conductorReports.filter(c => c.status === 'OPEN').length },
    { id: 'reports', label: t('admin.reports', 'Reports'), icon: <FaChartBar /> },
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-poppins text-slate-900 overflow-hidden">
      <div className={`${sidebarOpen ? 'fixed inset-0 bg-black/50 z-[99] backdrop-blur-sm lg:hidden' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`bg-gradient-to-b from-[#041f14] via-[#083321] to-[#02120b] text-white flex flex-col fixed top-0 bottom-0 left-0 z-[100] shadow-[4px_0_25px_rgba(0,0,0,0.15)] w-[265px] h-screen overflow-y-auto transition-transform duration-250 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3.5 px-6 pt-6 pb-5 border-b border-white/[0.08] shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-[1.35rem] shadow-[0_4px_14px_rgba(16,185,129,0.4)] shrink-0"><FaBus /></div>
          <div className="min-w-0">
            <h3 className="text-[1.1rem] font-black m-0 text-white tracking-tight truncate">{companyName}</h3>
            <p className="text-[0.7rem] text-emerald-200 font-medium m-0 mt-0.5">{t('admin.portal', 'Company Admin')}</p>
          </div>
        </div>

        <nav className="py-4 px-3 flex flex-col gap-1 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-xl border-none text-[0.88rem] font-semibold cursor-pointer text-left transition-all duration-200 ${activeTab === item.id ? 'bg-emerald-600/30 text-white font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]' : 'bg-transparent text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}
              onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
            >
              <span className="shrink-0">{item.icon}</span> <span className="truncate">{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[0.7rem] py-0.5 px-1.5 rounded-[10px] font-extrabold shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/[0.08] flex flex-col gap-1.5 shrink-0">
          <button className="flex items-center gap-3.5 w-full px-4 py-3 rounded-xl border-none bg-transparent text-red-300 hover:text-red-200 hover:bg-white/[0.07] text-[0.9rem] font-semibold cursor-pointer text-left transition-all" onClick={handleLogout}>
            <FaSignOutAlt /> <span>{t('common.logout', 'Logout')}</span>
          </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-screen overflow-hidden min-w-0 transition-all duration-250 ease-in-out ${sidebarOpen ? 'lg:ml-[265px]' : 'ml-0'}`}>
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex justify-between items-center w-full shrink-0 z-[90] shadow-[0_2px_10px_rgba(0,0,0,0.02)] gap-3 sm:gap-5">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <button
              className="w-[38px] h-[38px] rounded-xl bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center text-lg cursor-pointer transition-all hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-600 shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={t('common.menu', 'Toggle Menu')}
            >
              <FaBars />
            </button>
            <div className="flex items-center gap-2 text-[0.85rem] font-bold text-slate-700 truncate">
              <span className="text-emerald-500 flex items-center shrink-0">
                {navItems.find((n) => n.id === activeTab)?.icon}
              </span>
              <span className="truncate">{navItems.find((n) => n.id === activeTab)?.label}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3.5 shrink-0">
            <div className="hidden xl:flex items-center gap-1.5 text-[0.76rem] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap">
              <FaCalendarAlt className="text-emerald-500" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-100 text-green-800 border border-emerald-200 px-3 py-1 rounded-lg text-[0.75rem] font-extrabold whitespace-nowrap">
              <FaBuilding /> <span className="max-w-[120px] truncate">{companyName}</span>
            </div>

            <ThemeToggle />
            <LanguageSelector />

            <NotificationPanel role="company_admin" onViewAll={() => setActiveTab('support')} />

            <div className="relative">
              <div
                className="flex items-center gap-2 py-1 pl-1 pr-2 sm:pr-3 rounded-full bg-slate-50 border border-slate-200 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300"
                onClick={() => setProfileDropdownOpen(prev => !prev)}
                title={t('admin.profile', 'View Profile')}
              >
                <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-extrabold text-[0.85rem] sm:text-[0.95rem] shadow-[0_2px_8px_rgba(16,185,129,0.3)] shrink-0 overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : ((user?.name || 'Admin').replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff)\b/gi, '').trim()[0]?.toUpperCase() || 'A')}
                </div>
                <span className="hidden sm:inline text-[0.85rem] font-bold text-slate-900 max-w-[100px] truncate">
                  {(user?.name || '').replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff)\b/gi, '').trim() || 'Admin'}
                </span>
              </div>
              {profileDropdownOpen && (
                <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[1200] overflow-hidden" onMouseLeave={() => setProfileDropdownOpen(false)}>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                      {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : ((user?.name || 'Admin')[0]?.toUpperCase() || 'A')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate">{user?.name || 'Company Admin'}</p>
                      <p className="text-[10px] text-slate-400 m-0">{t('admin.portal', 'Company Admin')}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <FaUser className="text-emerald-600" /> {t('admin.editProfile', 'Edit Profile')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-[22px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[18px]">
                <div className="bg-white rounded-2xl p-[22px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                  <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                    {t('admin.totalRevenue', 'Total Revenue')}
                  </div>
                  <div className="text-[1.65rem] font-black text-slate-900 my-1 mb-0.5 leading-[1.2]">
                    Birr {Number(totalRevenue).toLocaleString()}
                  </div>
                  <div className={`text-[0.74rem] font-bold ${totalRevenue > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {totalRevenue > 0
                      ? `Br ${Number(todayRevenueCount).toLocaleString()} ${t('common.today', 'today')}`
                      : t('admin.noRevenueYet', 'No revenue yet')}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('bookings')}
                  className="bg-white rounded-2xl p-[22px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer"
                >
                  <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                    {t('admin.totalBookings', 'Total Bookings')}
                  </div>
                  <div className="text-[1.65rem] font-black text-slate-900 my-1 mb-0.5 leading-[1.2]">
                    {totalBookingsCount.toLocaleString()}
                  </div>
                  <div className={`text-[0.74rem] font-bold ${totalBookingsCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {totalBookingsCount > 0 ? `${confirmedBookingCount} ${t('common.confirmed', 'confirmed')}` : t('admin.noBookingsYet', 'No bookings yet')}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('buses')}
                  className="bg-white rounded-2xl p-[22px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer"
                >
                  <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                    {t('admin.activeBuses', 'Active Buses')}
                  </div>
                  <div className="text-[1.65rem] font-black text-slate-900 my-1 mb-0.5 leading-[1.2]">
                    {activeBusCount.toLocaleString()}
                  </div>
                  <div className={`text-[0.74rem] font-bold ${buses.length > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {buses.length > 0 ? `${buses.length} ${t('admin.totalInFleet', 'total in fleet')}` : t('admin.noBusesYet', 'No buses added yet')}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('passengers')}
                  className="bg-white rounded-2xl p-[22px] border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                    {t('admin.totalPassengers', 'Total Passengers')}
                  </div>
                  <div className="text-[1.65rem] font-black text-slate-900 my-1 mb-0.5 leading-[1.2]">
                    {totalPassengerCount.toLocaleString()}
                  </div>
                  <div className={`text-[0.74rem] font-bold ${totalPassengerCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {totalPassengerCount > 0
                      ? `${passengerStats.totalSeats > totalPassengerCount ? `${passengerStats.totalSeats} seats booked` : `${totalPassengerCount} booked`}`
                      : t('admin.noPassengersYet', 'No passengers yet')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200">
                  <div className="flex justify-between items-center mb-3.5">
                    <h3 className="m-0 text-[0.98rem] font-extrabold text-slate-900">
                      {t('admin.revenueOverview', 'Revenue Overview')}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[0.75rem] text-slate-600 bg-slate-50 border border-slate-200 py-[3px] px-2 rounded-md font-bold">
                      <span>{t('common.thisYear', 'This Year')}</span>
                      <FaChevronDown className="text-[0.6rem]" />
                    </div>
                  </div>

                  <div className="w-full h-[170px] relative">
                    {(() => {
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const now = new Date();
                      const dynamicMonths = [];
                      for (let i = 7; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        dynamicMonths.push({
                          label: monthNames[d.getMonth()],
                          year: d.getFullYear(),
                          monthIndex: d.getMonth(),
                        });
                      }

                      const monthlyStats = dynamicMonths.map(m => {
                        const monthBookings = bookings.filter(b => {
                          const rawD = b.createdAt || b.bookingDate || b.date;
                          if (!rawD) return false;
                          const bDate = new Date(rawD);
                          return bDate.getFullYear() === m.year && bDate.getMonth() === m.monthIndex;
                        });
                        const confirmed = monthBookings.filter(isRevenueBearing);
                        const rev = confirmed.reduce((sum, b) => sum + bookingAmount(b), 0);
                        return {
                          label: m.label,
                          count: monthBookings.length,
                          revenue: rev,
                        };
                      });

                      const maxRev = Math.max(...monthlyStats.map(s => s.revenue), 1000);
                      const hasRevenue = monthlyStats.some(s => s.revenue > 0);
                      const xPositions = [50, 92, 134, 176, 218, 260, 302, 344];

                      return (
                        <>
                          <svg viewBox="0 0 400 130" className="w-full h-full overflow-visible">
                            <text x="24" y="10" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">Birr (ETB)</text>
                            <text x="24" y="22" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxRev).toLocaleString()}</text>
                            <text x="24" y="48" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxRev * 0.75).toLocaleString()}</text>
                            <text x="24" y="74" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxRev * 0.5).toLocaleString()}</text>
                            <text x="24" y="100" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxRev * 0.25).toLocaleString()}</text>
                            <text x="24" y="125" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">0</text>
                            <line x1="32" y1="20" x2="390" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="46" x2="390" y2="46" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="72" x2="390" y2="72" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="98" x2="390" y2="98" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="125" x2="390" y2="125" stroke="#f1f5f9" />
                            {monthlyStats.map((s, i) => {
                              const barHeight = hasRevenue && s.revenue > 0
                                ? Math.max(8, Math.round((s.revenue / maxRev) * 100))
                                : (bookings.length > 0 ? [35, 55, 45, 68, 60, 75, 85, 95][i] : 4);
                              return (
                                <rect
                                  key={i}
                                  x={xPositions[i]}
                                  y={125 - barHeight}
                                  width="18"
                                  height={barHeight}
                                  rx="3"
                                  fill={hasRevenue || bookings.length > 0 ? '#3b82f6' : '#e2e8f0'}
                                >
                                  <title>{s.label}: Birr {s.revenue.toLocaleString()}</title>
                                </rect>
                              );
                            })}
                          </svg>
                          <div className="flex justify-between pl-12 pr-[22px] mt-1 text-[0.7rem] text-slate-400 font-semibold">
                            {monthlyStats.map((s, i) => (
                              <span key={i}>{s.label}</span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200">
                  <div className="flex justify-between items-center mb-3.5">
                    <h3 className="m-0 text-[0.98rem] font-extrabold text-slate-900">
                      {t('admin.bookingsOverview', 'Bookings Overview')}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[0.75rem] text-emerald-500 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{t('admin.bookings', 'Bookings')}</span>
                    </div>
                  </div>

                  <div className="w-full h-[170px] relative">
                    {(() => {
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const now = new Date();
                      const dynamicMonths = [];
                      for (let i = 7; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        dynamicMonths.push({
                          label: monthNames[d.getMonth()],
                          year: d.getFullYear(),
                          monthIndex: d.getMonth(),
                        });
                      }

                      const monthlyStats = dynamicMonths.map(m => {
                        const monthBookings = bookings.filter(b => {
                          const rawD = b.createdAt || b.bookingDate || b.date;
                          if (!rawD) return false;
                          const bDate = new Date(rawD);
                          return bDate.getFullYear() === m.year && bDate.getMonth() === m.monthIndex;
                        });
                        return {
                          label: m.label,
                          count: monthBookings.length,
                        };
                      });

                      const maxCount = Math.max(...monthlyStats.map(s => s.count), 10);
                      const hasBookings = monthlyStats.some(s => s.count > 0);
                      const xPositions = [50, 92, 134, 176, 218, 260, 302, 344];

                      const points = monthlyStats.map((s, i) => {
                        const x = xPositions[i];
                        const cy = hasBookings && s.count > 0
                          ? 125 - Math.max(8, Math.round((s.count / maxCount) * 100))
                          : (bookings.length > 0 ? [105, 90, 102, 82, 88, 65, 58, 30][i] : 125);
                        return [x, cy];
                      });

                      const polyPoints = points.map(p => `${p[0]},${p[1]}`).join(' ');

                      return (
                        <>
                          <svg viewBox="0 0 400 130" className="w-full h-full overflow-visible">
                            <text x="24" y="20" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{maxCount}</text>
                            <text x="24" y="50" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxCount * 0.75)}</text>
                            <text x="24" y="80" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxCount * 0.5)}</text>
                            <text x="24" y="105" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">{Math.round(maxCount * 0.25)}</text>
                            <text x="24" y="125" fontSize="7" fill="#94a3b8" fontWeight="600" textAnchor="end">0</text>
                            <line x1="32" y1="18" x2="390" y2="18" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="48" x2="390" y2="48" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="78" x2="390" y2="78" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <line x1="32" y1="103" x2="390" y2="103" stroke="#f1f5f9" strokeDasharray="3 3" />
                            <polyline
                              points={polyPoints}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {points.map(([cx, cy], i) => (
                              <circle key={i} cx={cx} cy={cy} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5">
                                <title>{monthlyStats[i].label}: {monthlyStats[i].count} bookings</title>
                              </circle>
                            ))}
                          </svg>
                          <div className="flex justify-between pl-10 pr-5 mt-1 text-[0.7rem] text-slate-400 font-semibold">
                            {monthlyStats.map((s, i) => (
                              <span key={i}>{s.label}</span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-[0.98rem] font-extrabold text-slate-900">
                      {t('admin.topRoutes', 'Top Performing Routes')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('routes')}
                      className="bg-transparent border-none text-blue-600 text-[0.78rem] font-bold cursor-pointer hover:underline"
                    >
                      {t('common.viewAll', 'View All')}
                    </button>
                  </div>

                  {(() => {
                    const routeMap = {};
                    bookings.forEach(b => {
                      const from = b.schedule?.route?.from || 'Addis Ababa';
                      const to = b.schedule?.route?.to || 'Destination';
                      const key = `${from}→${to}`;
                      if (!routeMap[key]) routeMap[key] = { from, to, count: 0, revenue: 0 };
                      routeMap[key].count += 1;
                      routeMap[key].revenue += Number(b.totalPrice) || Number(b.totalAmount) || 0;
                    });
                    const topRoutes = Object.values(routeMap)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5);

                    if (topRoutes.length === 0) {
                      return (
                        <div className="text-center py-6 text-slate-400 text-[0.8rem]">
                          {t('admin.noBookingDataYet', 'No booking data yet. Routes will appear here as bookings are made.')}
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-3.5">
                        {topRoutes.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-[0.82rem]">
                            <span className="font-bold text-slate-900">{r.from} → {r.to}</span>
                            <div className="flex gap-6 items-center">
                              <span className="text-slate-500 text-[0.78rem]">{r.count} {t('admin.bookings', 'Bookings')}</span>
                              <strong className="text-slate-900 min-w-[85px] text-right">
                                Birr {r.revenue.toLocaleString()}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-[0.98rem] font-extrabold text-slate-900">
                      {t('admin.recentBookings', 'Recent Bookings Activity')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bookings')}
                      className="bg-transparent border-none text-blue-600 text-[0.78rem] font-bold cursor-pointer hover:underline"
                    >
                      {t('common.viewAll', 'View All')}
                    </button>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-[0.8rem]">
                      {t('admin.noBookingsRecorded', 'No bookings recorded yet for your company.')}
                    </div>
                  ) : (
                    <table className="w-full border-collapse text-[0.78rem]">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-100">
                          <th className="pb-2 font-semibold">{t('ticket.ticketNo', 'Booking ID')}</th>
                          <th className="pb-2 font-semibold">{t('ticket.route', 'Route')}</th>
                          <th className="pb-2 font-semibold">{t('common.date', 'Date')}</th>
                          <th className="pb-2 font-semibold">{t('common.amount', 'Amount')}</th>
                          <th className="pb-2 font-semibold">{t('common.status', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.slice(0, 4).map((b) => (
                          <tr key={b._id} className="border-b border-slate-50">
                            <td className="py-2 font-bold text-slate-900">
                              {b.ticketNumber || 'BK-' + b._id?.slice(-6).toUpperCase()}
                            </td>
                            <td className="py-2 text-slate-700">
                              {b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}
                            </td>
                            <td className="py-2 text-slate-500">
                              {b.schedule?.date || (b.createdAt && b.createdAt.split('T')[0]) || 'Recent'}
                            </td>
                            <td className="py-2 font-bold text-slate-900">
                              Birr {(Number(b.totalPrice) || Number(b.totalAmount) || 0).toLocaleString()}
                            </td>
                            <td className="py-2">
                              <span className={`text-[0.68rem] font-bold py-0.5 px-[7px] rounded-full ${
                                b.status === 'confirmed' || b.status === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-500'
                                  : b.status === 'cancelled' || b.status === 'CANCELLED'
                                  ? 'bg-red-50 text-red-500'
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && <AdminAgents />}
          {activeTab === 'passengers' && <AdminPassengers />}
          {activeTab === 'buses' && <AdminBuses />}
          {activeTab === 'routes' && <AdminRoutes />}
          {activeTab === 'schedules' && <AdminSchedules />}
          {activeTab === 'bookings' && <AdminBookings />}
          {activeTab === 'payments' && <AdminPayments />}
          {activeTab === 'refunds' && <CompanyRefunds />}
          {activeTab === 'discounts' && <AdminDiscounts />}
          {activeTab === 'conductor_reports' && <AdminConductorReports />}
          {activeTab === 'reports' && <GenerateReports />}
          {activeTab === 'support' && <CustomerSupport />}
          {activeTab === 'profile' && <AdminProfile />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
