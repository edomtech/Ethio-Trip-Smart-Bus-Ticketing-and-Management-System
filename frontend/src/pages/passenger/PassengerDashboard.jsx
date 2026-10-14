import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaBus, FaSearch, FaTicketAlt, FaCalendarAlt, FaWallet, FaUser, FaBell,
  FaHeadset, FaSignOutAlt, FaExchangeAlt, FaTimes, FaBars,
  FaCheckCircle, FaMapMarkerAlt, FaLock, FaPhone, FaEnvelope, FaArrowRight,
  FaChevronRight, FaStar, FaDownload, FaCheckDouble, FaTrashAlt, FaClock,
  FaMoneyBillWave, FaShieldAlt, FaSuitcase, FaQrcode, FaExclamationTriangle, FaCreditCard,
  FaChevronDown, FaRobot
} from 'react-icons/fa';
import { bookingAPI, scheduleAPI, paymentAPI, notificationAPI, supportAPI, companyAPI } from '../../utils/api';
import {
  hasActiveTicket, isAwaitingPayment, isConfirmed, isCancelled,
  isPaid, isRevenueBearing, isUpcoming, bookingAmount,
} from '../../utils/bookingStatus';
import { useNotification } from '../../contexts/NotificationContext';
import { MESSAGES } from '../../constants/messages';
import SeatSelectorModal from '../../components/SeatSelectorModal';
import PaymentModal from '../../components/PaymentModal';
import TicketModal from '../../components/TicketModal';
import DataTable from '../../components/DataTable';
import BusSearch from './modules/BusSearch';
import BookingHistory from './modules/BookingHistory';
import TicketDownload from './modules/TicketDownload';
import PassengerProfile from './modules/PassengerProfile';
import TripComparison from './modules/TripComparison';
import ReviewsRatings from './modules/ReviewsRatings';
import CancelBooking from './modules/CancelBooking';
import PaymentCenter from './modules/PaymentCenter';
import ViewSchedules from './modules/ViewSchedules';
import AIAssistantPage from './AIAssistantPage';
import AIAssistantWidget from '../../components/AI/AIAssistantWidget';
import { useTranslation } from '../../i18n';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationPanel from '../../components/NotificationPanel';
import ThemeToggle from '../../components/ThemeToggle';

const CountdownTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setIsUrgent(diff < 30 * 60 * 1000);
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span className={`font-mono font-black text-base py-0.5 px-2 rounded-md ${
      isUrgent ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-amber-600 bg-amber-600/10'
    }`}>
      {timeLeft}
    </span>
  );
};

const PassengerDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const notify = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchParams, setSearchParams] = useState({
    from: 'Addis Ababa',
    to: 'Bahir Dar',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
    tripType: 'oneway',
  });
  const [schedules, setSchedules] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const notifRef = useRef(null);

  const [selectedScheduleForSeat, setSelectedScheduleForSeat] = useState(null);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [activeTicketForView, setActiveTicketForView] = useState(null);

  const [supportThreads, setSupportThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadReply, setThreadReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    companyId: '',
    category: 'Booking Assistance',
    subject: '',
    ticketNumber: '',
    description: '',
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schData, bkData, notifData, supData, compData] = await Promise.all([
        scheduleAPI.getAll().catch(() => []),
        bookingAPI.getMyBookings().catch(() => []),
        notificationAPI.getMyNotifications().catch(() => null),
        supportAPI.getMyTickets().catch(() => []),
        companyAPI.getActiveCompanies().catch(() => ({ companies: [] })),
      ]);
      setSchedules(schData || []);
      setMyBookings(bkData || []);
      if (Array.isArray(supData)) {
        setSupportThreads(supData);
        setSelectedThread((prev) => {
          if (!prev) return null;
          return supData.find((t) => t._id === prev._id) || prev;
        });
      }
      const compList = compData?.companies || (Array.isArray(compData) ? compData : []);
      setCompanies(compList);
      if (compList.length > 0 && !newTicketForm.companyId) {
        setNewTicketForm(prev => ({ ...prev, companyId: compList[0]._id }));
      }
      if (notifData && Array.isArray(notifData.notifications)) {
        setNotifications(notifData.notifications);
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'support') return;
    const interval = setInterval(async () => {
      try {
        const supData = await supportAPI.getMyTickets();
        if (Array.isArray(supData)) {
          setSupportThreads(supData);
          setSelectedThread((prev) => {
            if (!prev) return null;
            return supData.find((t) => t._id === prev._id) || prev;
          });
        }
      } catch (err) {}
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSendThreadReply = async (e) => {
    e.preventDefault();
    if (!threadReply.trim()) {
      notify.warning(MESSAGES.support.replyRequired);
      return;
    }
    setSendingReply(true);
    try {
      const res = await supportAPI.addMessage(selectedThread._id, threadReply.trim());
      setThreadReply('');
      if (res?.ticket) setSelectedThread(res.ticket);
      const supData = await supportAPI.getMyTickets().catch(() => []);
      if (Array.isArray(supData)) {
        setSupportThreads(supData);
        if (res?.ticket) {
          const updatedMatch = supData.find(t => t._id === res.ticket._id);
          if (updatedMatch) setSelectedThread(updatedMatch);
        }
      }
    } catch (err) {
      notify.notifyError(err, MESSAGES.support.failed);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateSupportTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.description.trim() || !newTicketForm.subject.trim()) {
      notify.warning({
        title: t('passenger.subject', 'Subject *'),
        description: t('passenger.describeQuestion', 'Please enter both a subject and a message before submitting.'),
      });
      return;
    }
    setSubmittingTicket(true);
    try {
      const created = await supportAPI.create({
        companyId: newTicketForm.companyId || companies[0]?._id || undefined,
        category: newTicketForm.category,
        subject: newTicketForm.subject,
        ticketNumber: newTicketForm.ticketNumber,
        description: newTicketForm.description,
        passengerName: user?.name,
        passengerEmail: user?.email,
        passengerPhone: user?.phone,
      });
      setShowNewTicketModal(false);
      setNewTicketForm({ companyId: companies[0]?._id || '', category: 'Booking Assistance', subject: '', ticketNumber: '', description: '' });
      const supData = await supportAPI.getMyTickets().catch(() => []);
      if (Array.isArray(supData)) {
        setSupportThreads(supData);
        const match = supData.find(t => t._id === created?._id || t._id === created?.ticket?._id);
        if (match) setSelectedThread(match);
        else if (created && created._id) setSelectedThread(created);
      }
    } catch (err) {
      notify.notifyError(err, MESSAGES.support.failed);
    } finally {
      setSubmittingTicket(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    try {
      await notificationAPI.markAsRead(id);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationAPI.markAllAsRead();
    } catch (e) {}
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      notify.notifyError(err, MESSAGES.notifications.deleteFailed);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
    } catch (err) {
      notify.notifyError(err, MESSAGES.notifications.clearFailed);
    }
  };

  const handleDeleteSupportTicket = async (ticket) => {
    const ticketId = ticket?._id || ticket;
    const subject = ticket?.subject || '';

    const confirmed = await notify.confirm({
      title: t('passenger.deleteInquiry', 'Delete Support Inquiry?'),
      message: `${t('passenger.deleteInquiryConfirm', 'Are you sure you want to delete')} ${subject ? `"${subject}"` : ''}?`,
      description: t('passenger.deleteInquiryDesc', 'The conversation and its messages will be permanently removed.'),
      confirmLabel: t('common.delete', 'Delete'),
      cancelLabel: t('common.cancel', 'Cancel'),
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingTicketId(ticketId);
    try {
      await supportAPI.delete(ticketId);
      setSupportThreads((prev) => prev.filter((t) => t._id !== ticketId));
      if (selectedThread?._id === ticketId) {
        setSelectedThread(null);
      }
    } catch (err) {
      notify.notifyError(err, MESSAGES.support.deleteFailed);
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setActiveTab('search');
    try {
      const res = await scheduleAPI.search({
        from: searchParams.from,
        to: searchParams.to,
        date: searchParams.date,
      });
      setSchedules(res || []);
      if (!res?.length) notify.info(MESSAGES.search.noResults);
    } catch (err) {
      notify.notifyError(err, MESSAGES.search.failed);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapCities = () => {
    setSearchParams((prev) => ({
      ...prev,
      from: prev.to,
      to: prev.from,
    }));
  };

  const handleSeatSelected = (booking) => {
    setSelectedScheduleForSeat(null);
    setMyBookings((prev) => [booking, ...prev]);
    setActiveBookingForPayment(booking);
  };

  const handlePaymentSuccess = (updatedBooking) => {
    setActiveBookingForPayment(null);
    setMyBookings((prev) => prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b)));
    setActiveTicketForView(updatedBooking);
    notify.success(MESSAGES.payment.success);
  };

  const sidebarNavItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: <FaBus /> },
    { id: 'schedules', label: t('nav.schedules', 'View Schedules'), icon: <FaCalendarAlt /> },
    { id: 'search', label: t('nav.searchBook', 'Search & Book Bus'), icon: <FaSearch /> },
    { id: 'history', label: t('nav.myBookings', 'My Bookings'), icon: <FaTicketAlt /> },
    { id: 'tickets', label: t('nav.myTickets', 'My E-Tickets'), icon: <FaTicketAlt /> },
    { id: 'payments', label: t('nav.paymentCenter', 'Payment Center'), icon: <FaWallet /> },
    { id: 'refunds', label: t('nav.cancellationRefund', 'Cancellation & Refund'), icon: <FaMoneyBillWave /> },
    { id: 'support', label: t('nav.support', 'Customer Support'), icon: <FaHeadset /> },
  ];

  const passengerName = (() => {
    const raw = user?.name || '';
    const clean = raw.replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff|Verified Passenger)\b/gi, '').trim();
    return clean || 'Passenger';
  })();

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden max-w-[100vw] relative">
      <div
        className={`${sidebarOpen ? 'fixed inset-0 bg-black/50 z-[99] backdrop-blur-sm lg:hidden' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`w-[260px] bg-gradient-to-b from-[#062b1e] to-[#0a3d29] text-white flex flex-col justify-between py-6 px-4 fixed top-0 bottom-0 left-0 z-[100] shadow-[4px_0_24px_rgba(0,0,0,0.15)] h-screen overflow-y-auto overflow-x-hidden transition-transform duration-250 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          <div className="flex items-center gap-3 px-2 pb-6 border-b border-white/10 mb-5">
            <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#078930] to-green-500 text-yellow-300 flex items-center justify-center text-xl shadow-[0_4px_12px_rgba(7,137,48,0.4)]">
              <FaBus />
            </div>
            <div>
              <div className="text-[1.15rem] font-black text-white leading-tight">
                ETHIO <span className="text-yellow-300">TRIP</span>
              </div>
              <div className="text-[0.68rem] text-green-300 font-semibold">{t('nav.passenger', 'Passenger')}</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {sidebarNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`flex items-center gap-3 py-[11px] px-3.5 rounded-xl border-none font-semibold text-[0.85rem] cursor-pointer text-left transition-all duration-150 relative ${
                  activeTab === item.id
                    ? 'bg-green-400/20 text-green-400 font-extrabold'
                    : 'bg-transparent text-emerald-100 hover:bg-white/5'
                }`}
              >
                <span className={`text-base ${activeTab === item.id ? 'text-green-400' : 'text-green-300'}`}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-red-600/15 text-red-300 border border-red-600/30 rounded-xl font-extrabold text-[0.85rem] cursor-pointer hover:bg-red-600/25 transition-colors"
          >
            <FaSignOutAlt /> {t('common.logout', 'Sign Out')}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 transition-all duration-250 lg:ml-[260px]">
        <header className="bg-white border-b border-slate-200 py-3 px-3 sm:px-5 flex items-center justify-between shrink-0 z-[100] gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              className="lg:hidden w-[38px] h-[38px] rounded-xl bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center text-lg cursor-pointer transition-all hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-600 shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={t('common.menu', 'Toggle Menu')}
            >
              <FaBars />
            </button>
            <h1 className="m-0 text-[1.1rem] sm:text-[1.25rem] font-extrabold text-slate-900 truncate">
              {sidebarNavItems.find(n => n.id === activeTab)?.label || t('passenger.portal', 'Passenger Portal')}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-[0.76rem] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap">
              <FaCalendarAlt className="text-[#078930]" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <ThemeToggle />
            <LanguageSelector />
            <NotificationPanel role="passenger" onViewAll={() => setActiveTab('notifications')} />

            <div className="relative">
              <div
                onClick={() => setProfileDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 py-1 pl-1 pr-2 sm:pr-3 rounded-full bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#078930] to-[#046623] text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : passengerName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-[0.85rem] font-extrabold text-slate-800 max-w-[100px] truncate">{passengerName}</span>
              </div>
              {profileDropdownOpen && (
                <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[1200] overflow-hidden" onMouseLeave={() => setProfileDropdownOpen(false)}>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#078930] to-[#046623] text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                      {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : passengerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate">{passengerName}</p>
                      <p className="text-[10px] text-slate-400 m-0">{t('passenger', 'Passenger')}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <FaUser className="text-emerald-600" /> {t('passenger.profile', 'Edit Profile')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="py-4 sm:py-5 px-3 sm:px-6 flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-[22px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('history')}
                  className="bg-white rounded-2xl p-[18px_20px] border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3.5 mb-2">
                    <div className="w-[42px] h-[42px] rounded-[10px] bg-green-50 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                      <FaSuitcase />
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                        {t('passenger.totalBookings', 'Total Bookings')}
                      </div>
                      <h2 className="mt-0.5 mb-0 text-[1.65rem] font-black text-slate-900 leading-none">
                        {myBookings.length}
                      </h2>
                    </div>
                  </div>
                  <div className={`text-[0.74rem] font-bold mt-1.5 ${myBookings.length > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {myBookings.length > 0 ? `${myBookings.length} ${t('common.bookings', 'bookings')}` : t('passenger.noBookingsYet', 'No bookings yet')}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('tickets')}
                  className="bg-white rounded-2xl p-[18px_20px] border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3.5 mb-2">
                    <div className="w-[42px] h-[42px] rounded-[10px] bg-green-50 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                      <FaTicketAlt />
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                        {t('passenger.activeETickets', 'Active E-Tickets')}
                      </div>
                      <h2 className="mt-0.5 mb-0 text-[1.65rem] font-black text-slate-900 leading-none">
                        {myBookings.filter(hasActiveTicket).length}
                      </h2>
                    </div>
                  </div>
                  <div className="text-[0.74rem] font-bold text-blue-600 mt-1.5">
                    {t('passenger.viewETickets', 'View E-Tickets')}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('payments')}
                  className="bg-white rounded-2xl p-[18px_20px] border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3.5 mb-2">
                    <div className="w-[42px] h-[42px] rounded-[10px] bg-orange-50 text-orange-500 flex items-center justify-center text-xl shrink-0">
                      <FaWallet />
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                        {t('passenger.pendingPayments', 'Pending Payments')}
                      </div>
                      <h2 className="mt-0.5 mb-0 text-[1.65rem] font-black text-slate-900 leading-none">
                        {myBookings.filter(isAwaitingPayment).length}
                      </h2>
                    </div>
                  </div>
                  <div className={`text-[0.74rem] font-bold mt-1.5 ${myBookings.some(isAwaitingPayment) ? 'text-orange-600' : 'text-blue-600'}`}>
                    {myBookings.some(isAwaitingPayment) ? t('passenger.awaitingPayment', 'Awaiting Payment') : t('passenger.completePayment', 'Complete Payment')}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('history')}
                  className="bg-white rounded-2xl p-[18px_20px] border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3.5 mb-2">
                    <div className="w-[42px] h-[42px] rounded-[10px] bg-blue-50 text-blue-500 flex items-center justify-center text-xl shrink-0">
                      <FaBus />
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-[0.4px]">
                        {t('passenger.upcomingTrips', 'Upcoming Trips')}
                      </div>
                      <h2 className="mt-0.5 mb-0 text-[1.65rem] font-black text-slate-900 leading-none">
                        {myBookings.filter(b => isConfirmed(b) && isUpcoming(b)).length}
                      </h2>
                    </div>
                  </div>
                  <div className="text-[0.74rem] font-bold text-blue-600 mt-1.5">
                    {t('passenger.viewTrips', 'View Trips')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1.35fr_1fr] gap-4.5">
                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="m-0 text-[0.98rem] font-extrabold text-slate-900">
                      {t('passenger.bookingOverview', 'Booking Overview')} <span className="text-slate-500 font-medium">({t('passenger.thisYear', 'This Year')})</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-[0.75rem] text-slate-600 bg-slate-50 border border-slate-200 py-[3px] px-2 rounded-md font-bold">
                      <span>{t('passenger.thisYear', 'This Year')}</span>
                      <FaChevronDown className="text-[0.6rem]" />
                    </div>
                  </div>

                  <div className="w-full h-[170px] relative">
                    <svg viewBox="0 0 400 130" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="paxGreenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <line x1="25" y1="15" x2="385" y2="15" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="25" y1="45" x2="385" y2="45" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="25" y1="75" x2="385" y2="75" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="25" y1="105" x2="385" y2="105" stroke="#f1f5f9" strokeDasharray="3 3" />

                      <text x="14" y="18" fontSize="8" fill="#94a3b8" fontWeight="600" textAnchor="end">20</text>
                      <text x="14" y="48" fontSize="8" fill="#94a3b8" fontWeight="600" textAnchor="end">15</text>
                      <text x="14" y="78" fontSize="8" fill="#94a3b8" fontWeight="600" textAnchor="end">10</text>
                      <text x="14" y="108" fontSize="8" fill="#94a3b8" fontWeight="600" textAnchor="end">5</text>
                      <text x="14" y="125" fontSize="8" fill="#94a3b8" fontWeight="600" textAnchor="end">0</text>

                      {myBookings.length > 0 ? (
                        <>
                          <polygon
                            points="35,110 80,105 130,95 180,80 230,85 280,60 330,45 375,25 375,125 35,125"
                            fill="url(#paxGreenGrad)"
                          />
                          <polyline
                            points="35,110 80,105 130,95 180,80 230,85 280,60 330,45 375,25"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {[
                            [35, 110], [80, 105], [130, 95], [180, 80],
                            [230, 85], [280, 60], [330, 45], [375, 25]
                          ].map(([cx, cy], i) => (
                            <circle key={i} cx={cx} cy={cy} r="3" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                          ))}
                        </>
                      ) : (
                        <>
                          <line x1="35" y1="125" x2="375" y2="125" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                          {[35, 80, 130, 180, 230, 280, 330, 375].map((cx, i) => (
                            <circle key={i} cx={cx} cy={125} r="2.5" fill="#10b981" />
                          ))}
                        </>
                      )}
                    </svg>

                    <div className="flex justify-between pl-[30px] pr-[15px] mt-1 text-[0.7rem] text-slate-400 font-semibold">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                      <span>Jul</span>
                      <span>Aug</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200">
                  <div className="flex justify-between items-center mb-3.5">
                    <h3 className="m-0 text-[0.98rem] font-extrabold text-slate-900">{t('passenger.recentBookings', 'Recent Bookings')}</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="bg-transparent border-none text-blue-600 text-[0.78rem] font-bold cursor-pointer hover:underline"
                    >
                      {t('passenger.viewAll', 'View All')}
                    </button>
                  </div>

                  {myBookings.length === 0 ? (
                    <div className="text-center py-[30px] px-2.5 text-slate-400 text-[0.8rem]">
                      {t('passenger.noBookingsRecorded', 'No bookings recorded yet. Search buses above to book your journey!')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[0.78rem]">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-100">
                            <th className="pb-2 font-semibold">{t('ticket.ticketNo', 'Booking ID')}</th>
                            <th className="pb-2 font-semibold">{t('ticket.route', 'Route')}</th>
                            <th className="pb-2 font-semibold">{t('common.date', 'Date')}</th>
                            <th className="pb-2 font-semibold">{t('common.status', 'Status')}</th>
                            <th className="pb-2 font-semibold text-right">{t('ticket.title', 'Ticket')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myBookings.slice(0, 4).map((b) => {
                            const isPaidAndConfirmed = hasActiveTicket(b);
                            const cancelled = isCancelled(b);
                            return (
                              <tr key={b._id} className="border-b border-slate-50">
                                <td className="py-2 font-bold text-slate-900">
                                  {isPaidAndConfirmed ? b.ticketNumber : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="py-2 text-slate-700">
                                  <div>{b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}</div>
                                  <span className={`text-[0.62rem] font-extrabold py-[1px] px-[5px] rounded border inline-block mt-0.5 ${
                                    b.tripType === 'round'
                                      ? 'text-amber-800 bg-amber-100 border-amber-200'
                                      : 'text-slate-600 bg-slate-100 border-slate-200'
                                  }`}>
                                    {b.tripType === 'round' ? `🔁 ${t('home.tripTypeRound', 'Round-Trip')}` : t('home.tripTypeOneWay', 'One-Way')}
                                  </span>
                                </td>
                                <td className="py-2 text-slate-500">
                                  {b.schedule?.date || 'Scheduled'}
                                </td>
                                <td className="py-2">
                                  <span className={`text-[0.68rem] font-bold py-0.5 px-2 rounded-full ${
                                    isConfirmed(b)
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : cancelled
                                        ? 'bg-red-50 text-red-500'
                                        : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-2 text-right">
                                  {isPaidAndConfirmed ? (
                                    <button
                                      type="button"
                                      onClick={() => setActiveTicketForView(b)}
                                      className="bg-[#078930] text-white border-none rounded-md py-[3px] px-2 text-[0.68rem] font-extrabold cursor-pointer inline-flex items-center gap-1 hover:bg-[#066d26] transition-colors"
                                      title="Open and view E-Ticket"
                                    >
                                      <FaTicketAlt className="text-[0.6rem]" /> {t('ticket.title', 'E-Ticket')}
                                    </button>
                                  ) : cancelled ? (
                                    <span className="text-red-500 text-[0.68rem] font-bold">{t('common.cancelled', 'Cancelled')}</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveBookingForPayment(b)}
                                      className="bg-amber-600 text-white border-none rounded-md py-[3px] px-2 text-[0.68rem] font-extrabold cursor-pointer inline-flex items-center gap-1 hover:bg-amber-700 transition-colors"
                                      title="Pay to get your E-Ticket"
                                    >
                                      <FaCreditCard className="text-[0.6rem]" /> {t('common.payNow', 'Pay Now')}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[18px] p-[22px] border border-slate-200 flex flex-col justify-between">
                  {(() => {
                    const totalSpent = myBookings
                      .filter(isRevenueBearing)
                      .reduce((sum, b) => sum + bookingAmount(b), 0);
                    const cancelledSpent = myBookings
                      .filter(b => isCancelled(b) && isPaid(b))
                      .reduce((sum, b) => sum + bookingAmount(b), 0);
                    const totalAll = totalSpent + cancelledSpent || 1;
                    const ticketPercent = totalSpent > 0 ? Math.round((totalSpent / totalAll) * 100) : 0;
                    const cancelPercent = cancelledSpent > 0 ? Math.round((cancelledSpent / totalAll) * 100) : 0;

                    return (
                      <>
                        <div>
                          <h3 className="m-0 mb-2.5 text-[0.98rem] font-extrabold text-slate-900">{t('passenger.spendingSummary', 'Spending Summary')}</h3>
                          <div className="text-[0.72rem] text-slate-500 font-semibold">{t('passenger.totalSpent', 'Total Spent')}</div>
                          <div className="text-[1.35rem] font-black text-slate-900 mt-0.5">
                            Birr {totalSpent.toLocaleString()}
                          </div>
                          <div className={`text-[0.72rem] font-bold mt-0.5 ${totalSpent > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {totalSpent > 0 ? t('passenger.verifiedTransactions', 'Verified transactions') : t('passenger.noPaymentsYet', 'No payments made yet')}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2.5 mt-3">
                          <div className="relative w-20 h-20 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                              {totalSpent > 0 ? (
                                <>
                                  <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10b981" strokeWidth="4" strokeDasharray={`${ticketPercent * 0.88} 100`} strokeDashoffset="0" />
                                  {cancelPercent > 0 && (
                                    <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f59e0b" strokeWidth="4" strokeDasharray={`${cancelPercent * 0.88} 100`} strokeDashoffset={`-${ticketPercent * 0.88}`} />
                                  )}
                                </>
                              ) : (
                                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#e2e8f0" strokeWidth="4" strokeDasharray="100 100" />
                              )}
                            </svg>
                          </div>

                          <div className="flex flex-col gap-1.5 text-[0.72rem]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />
                              <span className="text-slate-500">{t('passenger.tickets', 'Tickets')}</span>
                              <strong className="ml-auto text-slate-900">Birr {totalSpent.toLocaleString()} ({totalSpent > 0 ? ticketPercent : 0}%)</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-[7px] h-[7px] rounded-full bg-amber-500" />
                              <span className="text-slate-500">{t('passenger.cancellation', 'Cancellation')}</span>
                              <strong className="ml-auto text-slate-900">Birr {cancelledSpent.toLocaleString()} ({cancelledSpent > 0 ? cancelPercent : 0}%)</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-[7px] h-[7px] rounded-full bg-slate-300" />
                              <span className="text-slate-500">{t('passenger.others', 'Others')}</span>
                              <strong className="ml-auto text-slate-900">Birr 0 (0%)</strong>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-4.5">
                <div className="bg-white rounded-[18px] p-5 border border-slate-200">
                  <h3 className="m-0 mb-3.5 text-[0.98rem] font-extrabold text-slate-900">{t('passenger.quickActions', 'Quick Actions')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 text-emerald-500 flex items-center justify-center text-base shrink-0">
                        <FaBus />
                      </div>
                      <span className="text-[0.8rem] font-extrabold text-slate-900">{t('passenger.bookBusTicket', 'Book a Bus Ticket')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-500 flex items-center justify-center text-base shrink-0">
                        <FaTicketAlt />
                      </div>
                      <span className="text-[0.8rem] font-extrabold text-slate-900">{t('passenger.viewMyETickets', 'View My E-Tickets')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('payments')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-base shrink-0">
                        <FaCreditCard />
                      </div>
                      <span className="text-[0.8rem] font-extrabold text-slate-900">{t('passenger.paymentCenter', 'Payment Center')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('refunds')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-base shrink-0">
                        <FaMoneyBillWave />
                      </div>
                      <span className="text-[0.8rem] font-extrabold text-slate-900">{t('passenger.cancellationRefund', 'Cancellation & Refund')}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[18px] p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-extrabold text-[0.92rem] text-indigo-600 mb-1.5">
                      <FaHeadset /> {t('passenger.supportHelp', 'Support & Help')}
                    </div>
                    <p className="m-0 text-[0.78rem] text-slate-500 leading-relaxed">
                      {t('passenger.supportDesc', 'Need help with your booking? Our support team is available 24/7 to assist you.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('support')}
                    className="w-full p-2.5 bg-indigo-600 text-white border-none rounded-[10px] font-extrabold text-[0.82rem] cursor-pointer mt-3 hover:bg-indigo-700 transition-colors"
                  >
                    {t('passenger.contactSupport', 'Contact Support')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <BusSearch
              schedules={schedules}
              loading={loading}
              searchParams={searchParams}
              onSearch={handleSearch}
              onSelectSchedule={(s) => setSelectedScheduleForSeat(s)}
            />
          )}

          {activeTab === 'schedules' && <ViewSchedules />}

          {activeTab === 'compare' && (
            <TripComparison
              schedules={schedules}
              onSelectSchedule={(s) => setSelectedScheduleForSeat(s)}
            />
          )}

          {activeTab === 'history' && <BookingHistory />}

          {activeTab === 'tickets' && (
            <TicketDownload
              bookings={myBookings}
              onViewTicket={(b) => setActiveTicketForView(b)}
              onBookNow={() => setActiveTab('search')}
              onViewHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentCenter
              myBookings={myBookings}
              onSelectBus={() => setActiveTab('search')}
              onPayBooking={(b) => setActiveBookingForPayment(b)}
              onViewTicket={(b) => setActiveTicketForView(b)}
            />
          )}

          {activeTab === 'refunds' && <CancelBooking />}

          {activeTab === 'assistant' && <AIAssistantPage />}

          {activeTab === 'reviews' && <ReviewsRatings />}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-[18px] p-[22px] border border-slate-200 max-w-[720px]">
              <div className="flex justify-between items-center mb-[18px] border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="m-0 text-[1.15rem] font-black text-slate-900">{t('passenger.allNotifications', 'All Notifications')}</h3>
                  <p className="mt-0.5 mb-0 text-[0.78rem] text-slate-500">{t('passenger.notificationsSubtitle', 'Trip reminders, booking alerts & payment receipts')}</p>
                </div>
                <div className="flex gap-2">
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllNotifications}
                      className="py-1.5 px-3 bg-red-50 text-red-500 border border-red-200 rounded-lg font-bold text-[0.78rem] cursor-pointer flex items-center gap-1.5 hover:bg-red-100 transition-colors"
                    >
                      <FaTrashAlt /> {t('passenger.clearAll', 'Clear All')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="py-1.5 px-3 bg-green-50 text-emerald-700 border border-green-200 rounded-lg font-bold text-[0.78rem] cursor-pointer flex items-center gap-1.5 hover:bg-green-100 transition-colors"
                  >
                    <FaCheckDouble /> {t('passenger.markAllRead', 'Mark All as Read')}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 px-5 text-slate-400">
                    <FaBell className="text-4xl mb-2.5 text-slate-300 mx-auto" />
                    <h4 className="m-0 mb-1 text-slate-500 text-[0.95rem] font-extrabold">{t('passenger.noNotifications', 'No notifications yet')}</h4>
                    <p className="m-0 text-[0.8rem]">{t('passenger.notificationsEmpty', "You're all caught up! New booking, payment, and trip alerts will appear here.")}</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleMarkAsRead(n._id)}
                      className={`p-3 md:p-4 rounded-xl cursor-pointer flex gap-3 items-center justify-between transition-colors ${
                        n.isRead ? 'bg-white border border-slate-200' : 'bg-green-50/50 border-[1.5px] border-green-300'
                      }`}
                    >
                      <div className="flex gap-3 items-center flex-1">
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-base shrink-0 ${
                          n.type === 'payment' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {n.type === 'payment' ? <FaWallet /> : <FaTicketAlt />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="m-0 text-[0.88rem] font-extrabold text-slate-900">{n.title}</h4>
                            <span className="text-[0.68rem] text-slate-400">{n.time}</span>
                          </div>
                          <p className="mt-0.5 mb-0 text-[0.8rem] text-slate-600 leading-snug">{n.message}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(n._id);
                        }}
                        title={t('common.delete', 'Delete')}
                        className="bg-transparent border-none text-slate-400 p-1.5 rounded-md cursor-pointer text-sm flex items-center justify-center hover:text-red-500 transition-colors"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && <PassengerProfile user={user} />}

          {activeTab === 'support' && (
            <div className="max-w-[860px] mx-auto w-full">
              <div className="flex justify-between items-center mb-3 py-1 flex-wrap gap-2">
                <span className="text-[0.9rem] font-extrabold text-slate-900">
                  {t('passenger.myInquiries', 'My Support Inquiries')} ({supportThreads.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(true)}
                  className="py-[7px] px-3.5 bg-[#078930] text-white border-none rounded-lg font-bold text-[0.78rem] cursor-pointer flex items-center gap-1.5 shadow-[0_2px_6px_rgba(7,137,48,0.15)] hover:bg-[#066d26] transition-colors"
                >
                  <FaHeadset /> {t('passenger.askQuestion', 'Ask Question')}
                </button>
              </div>

              <div className={`grid gap-3 ${selectedThread ? 'grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]' : 'grid-cols-1'}`}>
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  {supportThreads.length === 0 ? (
                    <div className="text-center py-6 px-3 text-slate-400">
                      <FaHeadset className="text-2xl mb-1.5 text-slate-300 mx-auto" />
                      <p className="m-0 mb-2 text-[0.78rem]">{t('passenger.supportEmpty', "You haven't opened any support questions yet.")}</p>
                      <button
                        type="button"
                        onClick={() => setShowNewTicketModal(true)}
                        className="py-1 px-3 bg-[#078930] text-white border-none rounded-md font-bold text-[0.74rem] cursor-pointer hover:bg-[#066d26] transition-colors"
                      >
                        {t('passenger.askQuestion', 'Ask a Question')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto">
                      {supportThreads.map((tItem) => {
                        const isSelected = selectedThread?._id === tItem._id;
                        const status = (tItem.status || 'OPEN').toUpperCase();
                        return (
                          <div
                            key={tItem._id}
                            onClick={() => setSelectedThread(tItem)}
                            className={`p-[9px_11px] rounded-lg cursor-pointer transition-all duration-150 border-[1.5px] ${
                              isSelected ? 'border-[#078930] bg-green-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-extrabold text-[#078930] text-[0.74rem]">
                                {tItem.companyId?.companyName || t('passenger.busOperator', 'Bus Operator')}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[0.62rem] font-extrabold py-[1px] px-[5px] rounded-md ${
                                    status === 'OPEN'
                                      ? 'bg-red-100 text-red-600'
                                      : status === 'IN_PROGRESS'
                                        ? 'bg-amber-100 text-amber-600'
                                        : status === 'ANSWERED'
                                          ? 'bg-green-100 text-green-600'
                                          : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {status}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSupportTicket(tItem);
                                  }}
                                  disabled={deletingTicketId === tItem._id}
                                  title={t('passenger.deleteInquiry', 'Delete Inquiry')}
                                  aria-label={`Delete inquiry ${tItem.subject || ''}`}
                                  className="bg-transparent border-none text-slate-400 py-[1px] px-[3px] rounded cursor-pointer text-[0.72rem] hover:text-red-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <FaTrashAlt />
                                </button>
                              </div>
                            </div>

                            <div className="font-bold text-slate-900 text-[0.78rem] mb-0.5">
                              {tItem.subject}
                            </div>

                            <div className="text-[0.7rem] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap mb-0.5">
                              {tItem.messages && tItem.messages.length > 0 ? tItem.messages[tItem.messages.length - 1].message : tItem.description}
                            </div>

                            <div className="flex justify-between text-[0.64rem] text-slate-400">
                              <span>{tItem.category}</span>
                              <span>{new Date(tItem.updatedAt || tItem.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedThread && (
                  <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[380px]">
                    <div className="py-2 px-3 border-b border-slate-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="m-0 text-[0.84rem] font-extrabold text-slate-900">
                            {selectedThread.subject}
                          </h4>
                          <div className="text-[0.68rem] text-slate-500">
                            <strong>{selectedThread.companyId?.companyName || t('passenger.busOperator', 'Bus Operator')}</strong>
                            {selectedThread.ticketNumber && ` • Ticket: ${selectedThread.ticketNumber}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[0.64rem] font-extrabold py-[1px] px-1.5 rounded-md ${
                              selectedThread.status === 'ANSWERED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {selectedThread.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupportTicket(selectedThread)}
                            disabled={deletingTicketId === selectedThread._id}
                            title={t('passenger.deleteInquiry', 'Delete Inquiry')}
                            className="bg-red-50 border border-red-200 text-red-600 py-0.5 px-1.5 rounded text-[0.68rem] cursor-pointer flex items-center gap-1 font-bold hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <FaTrashAlt /> {deletingTicketId === selectedThread._id ? '...' : t('common.delete', 'Delete')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-2.5 md:p-3 overflow-y-auto flex flex-col gap-1.5 bg-slate-50">
                      {(!selectedThread.messages || selectedThread.messages.length === 0) && (
                        <div className="self-end max-w-[85%] bg-[#078930] text-white py-[7px] px-[11px] rounded-[9px]">
                          <div className="text-[0.62rem] font-extrabold text-green-200 mb-0.5">{t('passenger.youPassenger', 'You (Passenger)')}</div>
                          <div className="text-[0.76rem] leading-snug">{selectedThread.description}</div>
                          <div className="text-[0.6rem] text-white/70 mt-0.5 text-right">
                            {new Date(selectedThread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}

                      {selectedThread.messages && selectedThread.messages.map((msg, idx) => {
                        const isPassenger = msg.senderRole === 'passenger' || !msg.senderRole;
                        return (
                          <div
                            key={idx}
                            className={`max-w-[85%] py-[7px] px-[11px] rounded-[9px] ${
                              isPassenger
                                ? 'self-end bg-[#078930] text-white'
                                : 'self-start bg-white text-slate-900 border border-slate-200 shadow-sm'
                            }`}
                          >
                            <div className={`text-[0.62rem] font-extrabold mb-0.5 ${isPassenger ? 'text-green-200' : 'text-blue-600'}`}>
                              {isPassenger ? t('passenger.youPassenger', 'You (Passenger)') : `${msg.senderName} (${t('passenger.supportDesk', 'Support')})`}
                            </div>
                            <div className="text-[0.76rem] leading-snug whitespace-pre-wrap">
                              {msg.message}
                            </div>
                            <div className={`text-[0.6rem] mt-0.5 text-right ${isPassenger ? 'text-white/70' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendThreadReply} className="py-[7px] px-2.5 border-t border-slate-200 bg-white flex gap-1.5">
                      <input
                        type="text"
                        placeholder={t('passenger.typeReply', 'Type reply...')}
                        value={threadReply}
                        onChange={(e) => setThreadReply(e.target.value)}
                        className="flex-1 py-1.5 px-2.5 rounded-md border border-[1.5px] border-slate-300 text-[0.76rem] outline-none focus:border-green-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply}
                        className="py-1.5 px-3 bg-[#078930] text-white border-none rounded-md font-bold text-[0.74rem] cursor-pointer hover:bg-[#066d26] transition-colors disabled:opacity-60"
                      >
                        {sendingReply ? '...' : t('common.save', 'Send')}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedScheduleForSeat && (
        <SeatSelectorModal
          schedule={selectedScheduleForSeat}
          requiredSeatsCount={Number(searchParams.passengers) || 1}
          onClose={() => setSelectedScheduleForSeat(null)}
          onConfirmBooking={handleSeatSelected}
        />
      )}

      {activeBookingForPayment && (
        <PaymentModal
          booking={activeBookingForPayment}
          onClose={() => setActiveBookingForPayment(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] max-w-[440px] w-full p-[18px] max-h-[88vh] overflow-y-auto shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="m-0 font-extrabold text-[1.05rem] text-slate-900">{t('passenger.askSupportQuestion', 'Ask a Support Question')}</h3>
              <button onClick={() => setShowNewTicketModal(false)} className="bg-transparent border-none text-lg cursor-pointer text-slate-500 hover:text-slate-800">✕</button>
            </div>

            <form onSubmit={handleCreateSupportTicket} className="flex flex-col gap-2.5">
              <div>
                <label className="block text-[0.74rem] font-bold mb-[3px] text-slate-700">{t('passenger.selectBusCompany', 'Select Bus Company *')}</label>
                <select
                  value={newTicketForm.companyId}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, companyId: e.target.value })}
                  className="w-full py-[7px] px-2.5 rounded-[7px] border border-[1.5px] border-slate-300 text-[0.82rem] outline-none bg-white focus:border-green-500"
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName} ({c.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[0.74rem] font-bold mb-[3px] text-slate-700">{t('passenger.issueCategory', 'Issue Category *')}</label>
                <select
                  value={newTicketForm.category}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                  className="w-full py-[7px] px-2.5 rounded-[7px] border border-[1.5px] border-slate-300 text-[0.82rem] outline-none bg-white focus:border-green-500"
                >
                  <option value="Booking Assistance">{t('passenger.bookingAssistance', 'Booking Assistance')}</option>
                  <option value="Ticket Query">{t('passenger.ticketQuery', 'Ticket Query')}</option>
                  <option value="Chapa Payment">{t('passenger.chapaPayment', 'Chapa Payment')}</option>
                  <option value="Cancellation & Refund">{t('passenger.cancellationRefund', 'Cancellation & Refund')}</option>
                  <option value="Schedule / Route Query">{t('passenger.scheduleRouteQuery', 'Schedule / Route Query')}</option>
                  <option value="Luggage / Lost Item">{t('passenger.luggageLostItem', 'Luggage / Lost Item')}</option>
                  <option value="General Inquiry">{t('passenger.generalInquiry', 'General Inquiry')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.74rem] font-bold mb-[3px] text-slate-700">{t('passenger.subject', 'Subject *')}</label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  className="w-full py-[7px] px-2.5 rounded-[7px] border border-[1.5px] border-slate-300 text-[0.82rem] outline-none box-border focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-[0.74rem] font-bold mb-[3px] text-slate-700">{t('passenger.ticketNumberOptional', 'Ticket Number (Optional)')}</label>
                <input
                  type="text"
                  placeholder=""
                  value={newTicketForm.ticketNumber}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketNumber: e.target.value })}
                  className="w-full py-[7px] px-2.5 rounded-[7px] border border-[1.5px] border-slate-300 text-[0.82rem] outline-none box-border focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-[0.74rem] font-bold mb-[3px] text-slate-700">{t('passenger.yourQuestionDetails', 'Your Question / Details *')}</label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('passenger.describeQuestion', 'Describe your question or problem...')}
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  className="w-full py-[7px] px-2.5 rounded-[7px] border border-[1.5px] border-slate-300 text-[0.82rem] outline-none box-border focus:border-green-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="py-[7px] px-3.5 bg-slate-100 border border-slate-200 rounded-[7px] font-bold text-[0.78rem] cursor-pointer text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="py-2 px-4.5 bg-[#078930] text-white border-none rounded-lg font-extrabold text-[0.82rem] cursor-pointer hover:bg-[#066d26] transition-colors disabled:opacity-70"
                >
                  {submittingTicket ? t('common.loading', 'Submitting...') : t('passenger.sendSupportRequest', 'Send Support Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTicketForView && (
        <TicketModal
          booking={activeTicketForView}
          onClose={() => setActiveTicketForView(null)}
        />
      )}

      <AIAssistantWidget />
    </div>
  );
};

export default PassengerDashboard;
