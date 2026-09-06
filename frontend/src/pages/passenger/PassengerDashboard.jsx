import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaBus, FaSearch, FaTicketAlt, FaCalendarAlt, FaWallet, FaUser, FaBell,
  FaHeadset, FaSignOutAlt, FaExchangeAlt, FaTimes, FaBars,
  FaCheckCircle, FaMapMarkerAlt, FaLock, FaPhone, FaEnvelope, FaArrowRight,
  FaChevronRight, FaStar, FaDownload, FaCheckDouble, FaTrashAlt, FaClock,
  FaMoneyBillWave, FaShieldAlt, FaSuitcase, FaQrcode, FaExclamationTriangle, FaCreditCard,
  FaChevronDown
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bookingAPI, scheduleAPI, paymentAPI, notificationAPI, supportAPI, companyAPI } from '../../utils/api';
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
import { useTranslation } from '../../i18n.jsx';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationPanel from '../../components/NotificationPanel';

// ── Inline countdown timer component ──────────────────────────────────────────
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
      setIsUrgent(diff < 30 * 60 * 1000); // urgent if < 30 min left
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span style={{
      fontFamily: 'monospace',
      fontWeight: 900,
      fontSize: '1rem',
      color: isUrgent ? '#ef4444' : '#d97706',
      background: isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(217,119,6,0.1)',
      padding: '2px 8px',
      borderRadius: 6,
      animation: isUrgent ? 'pulse 1s infinite' : 'none',
    }}>
      {timeLeft}
    </span>
  );
};

const CITIES = ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Hawassa', 'Bahir Dar', 'Jimma', 'Adama', 'Gondar', 'Dessie', 'Jijiga', 'Arba Minch', 'Shashamane'];

const POPULAR_DESTINATIONS = [
  { from: 'Addis Ababa', to: 'Bahir Dar', price: 'ETB 750', duration: '8 hrs', tag: 'Lake Tana', color: '#047857' },
  { from: 'Addis Ababa', to: 'Hawassa', price: 'ETB 550', duration: '4.5 hrs', tag: 'Resort City', color: '#0284c7' },
  { from: 'Addis Ababa', to: 'Dire Dawa', price: 'ETB 850', duration: '9 hrs', tag: 'Eastern Express', color: '#7c3aed' },
  { from: 'Addis Ababa', to: 'Gondar', price: 'ETB 950', duration: '12 hrs', tag: 'Historic Castles', color: '#b45309' },
];

const PassengerDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search & Data States
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

  // Notification States — Clean empty state for new passengers
  const [notifications, setNotifications] = useState([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all'); // 'all' | 'unread'
  const notifRef = useRef(null);

  // Modals
  const [selectedScheduleForSeat, setSelectedScheduleForSeat] = useState(null);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [activeTicketForView, setActiveTicketForView] = useState(null);

  // Customer Support State
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

  // Real-time polling for support answers when on Support tab
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
    if (!threadReply.trim()) return;
    setSendingReply(true);
    try {
      const res = await supportAPI.addMessage(selectedThread._id, threadReply.trim());
      toast.success('Reply sent to support agent!');
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
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateSupportTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.description.trim() || !newTicketForm.subject.trim()) {
      toast.warning('Please enter subject and message details');
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
      toast.success('Support question submitted successfully!');
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
      toast.error(err.message || 'Failed to submit support question');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Close notification popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    try {
      await notificationAPI.markAsRead(id);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
    try {
      await notificationAPI.markAllAsRead();
    } catch (e) {}
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  const handleDeleteSupportTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this support inquiry?')) return;
    try {
      await supportAPI.delete(ticketId);
      setSupportThreads((prev) => prev.filter((t) => t._id !== ticketId));
      if (selectedThread?._id === ticketId) {
        setSelectedThread(null);
      }
      toast.success('Support inquiry deleted');
    } catch (err) {
      toast.error('Failed to delete support inquiry');
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
      if (!res?.length) toast.info('No direct buses found for this date. Check neighboring dates.');
    } catch (err) {
      toast.error('Search failed');
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

  const handleQuickBookCity = (from, to) => {
    setSearchParams((prev) => ({ ...prev, from, to }));
    setActiveTab('search');
    scheduleAPI.search({ from, to, date: searchParams.date })
      .then((res) => setSchedules(res || []))
      .catch(() => {});
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
    toast.success('Payment verified! Your official E-Ticket is ready.');
  };

  const sidebarNavItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: <FaBus /> },
    { id: 'search', label: t('nav.searchBook', 'Search & Book Bus'), icon: <FaSearch /> },
    { id: 'history', label: t('nav.myBookings', 'My Bookings'), icon: <FaCalendarAlt /> },
    { id: 'tickets', label: t('nav.myTickets', 'My E-Tickets'), icon: <FaTicketAlt /> },
    { id: 'payments', label: t('nav.paymentCenter', 'Payment Center'), icon: <FaWallet /> },
    { id: 'refunds', label: t('nav.cancellationRefund', 'Cancellation & Refund'), icon: <FaMoneyBillWave /> },
    { id: 'notifications', label: t('common.notifications', 'Notifications'), icon: <FaBell />, badge: unreadCount },
    { id: 'support', label: t('nav.support', 'Customer Support'), icon: <FaHeadset /> },
    { id: 'profile', label: t('common.profile', 'Profile'), icon: <FaUser /> },
  ];

  const passengerName = (() => {
    const raw = user?.name || '';
    const clean = raw.replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff|Verified Passenger)\b/gi, '').trim();
    return clean || 'Samuel';
  })();
  const upcomingBooking = myBookings.find((b) => b.status === 'confirmed');

  const filteredNotifs = notificationFilter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Poppins', 'Inter', sans-serif", overflowX: 'hidden', maxWidth: '100vw', position: 'relative' }}>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`eb-sidebar-overlay ${sidebarOpen ? 'show-mobile' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Left Passenger Sidebar ── */}
      <aside
        className={`eb-pax-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: '260px',
          background: 'linear-gradient(180deg, #062b1e 0%, #0a3d29 100%)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100,
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
        }}
      >
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #078930, #22c55e)',
                color: '#FCDD09',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 4px 12px rgba(7,137,48,0.4)',
              }}
            >
              <FaBus />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                ETHIO <span style={{ color: '#FCDD09' }}>TRIP</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#86efac', fontWeight: 600 }}>Passenger Travel Portal</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sidebarNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTab === item.id ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                  color: activeTab === item.id ? '#4ade80' : '#d1fae5',
                  fontWeight: activeTab === item.id ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: '1rem', color: activeTab === item.id ? '#4ade80' : '#86efac' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{ background: '#DA121A', color: '#fff', fontSize: '0.68rem', padding: '2px 7px', borderRadius: '50px', fontWeight: 900 }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div>
          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              background: 'rgba(218, 18, 26, 0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(218, 18, 26, 0.3)',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="eb-pax-main" style={{ minHeight: '100vh', minWidth: 0, overflowX: 'hidden' }}>
        {/* Top Navigation Bar */}
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            gap: 12,
            flexWrap: 'wrap',
            overflow: 'visible',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="eb-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Menu"
              style={{ display: 'flex' }}
            >
              <FaBars />
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {sidebarNavItems.find(n => n.id === activeTab)?.label || 'Passenger Portal'}
            </h1>
          </div>

          {/* Right Topbar Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="eb-header-date-badge">
              <FaCalendarAlt style={{ color: '#078930' }} />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <LanguageSelector />
            {/* Unified Role Notification Panel */}
            <NotificationPanel role="passenger" onViewAll={() => setActiveTab('notifications')} />

            {/* Quick Profile Link */}
            <div
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #078930, #046623)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                }}
              >
                {passengerName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{passengerName}</span>
            </div>
          </div>
        </header>

        {/* ── Main Dashboard Body ── */}
        <div style={{ padding: '20px 16px', flex: 1, overflowX: 'hidden' }}>
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* ═══════════════════════════════════════════════════════════════
                  ROW 1: 5 Top Stats Cards Grid (Real Passenger Data)
                  ═══════════════════════════════════════════════════════════════ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {/* Card 1: Total Bookings */}
                <div
                  onClick={() => setActiveTab('history')}
                  style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <FaSuitcase />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Bookings</div>
                      <h2 style={{ margin: '2px 0 0', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {myBookings.length}
                      </h2>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: myBookings.length > 0 ? '#10b981' : '#94a3b8', marginTop: '6px' }}>
                    {myBookings.length > 0 ? `${myBookings.length} bookings made` : 'No bookings yet'}
                  </div>
                </div>

                {/* Card 2: Active E-Tickets */}
                <div
                  onClick={() => setActiveTab('tickets')}
                  style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <FaTicketAlt />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Active E-Tickets</div>
                      <h2 style={{ margin: '2px 0 0', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {myBookings.filter(b =>
                          (b.paymentStatus === 'PAID' || b.paymentStatus === 'paid') &&
                          (b.status === 'confirmed' || b.status === 'CONFIRMED' || b.status === 'completed') &&
                          Boolean(b.ticketNumber)
                        ).length}
                      </h2>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
                    View E-Tickets
                  </div>
                </div>

                {/* Card 3: Pending Payments */}
                <div
                  onClick={() => setActiveTab('payments')}
                  style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <FaWallet />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Pending Payments</div>
                      <h2 style={{ margin: '2px 0 0', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {myBookings.filter(b => b.status === 'pending' || b.status === 'pending_payment' || b.paymentStatus === 'unpaid').length}
                      </h2>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: myBookings.some(b => b.status === 'pending') ? '#ea580c' : '#2563eb', marginTop: '6px' }}>
                    {myBookings.some(b => b.status === 'pending') ? 'Awaiting Payment' : 'Complete Payment'}
                  </div>
                </div>

                {/* Card 4: Upcoming Trips */}
                <div
                  onClick={() => setActiveTab('history')}
                  style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <FaBus />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Upcoming Trips</div>
                      <h2 style={{ margin: '2px 0 0', fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {myBookings.filter(b => b.status === 'confirmed' || b.status === 'CONFIRMED').length}
                      </h2>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
                    View Trips
                  </div>
                </div>

                {/* Card 5: Loyalty Points */}
                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fefce8', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <FaStar />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Loyalty Points</div>
                      <h2 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                        {user?.loyaltyPoints !== undefined ? user.loyaltyPoints : myBookings.length * 10} <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>pts</span>
                      </h2>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ca8a04', marginTop: '6px' }}>
                    {myBookings.length >= 10 ? 'Gold Member' : myBookings.length >= 3 ? 'Silver Member' : 'Member'}
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  ROW 2: 3-Column Content (Area Chart / Recent Bookings / Spending Summary)
                  ═══════════════════════════════════════════════════════════════ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.35fr 1fr', gap: '18px' }}>
                {/* Column 1: Booking Overview (This Year) */}
                <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                      Booking Overview <span style={{ color: '#64748b', fontWeight: 500 }}>(This Year)</span>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      <span>This Year</span>
                      <FaChevronDown style={{ fontSize: '0.6rem' }} />
                    </div>
                  </div>

                  {/* SVG Area Line Chart */}
                  <div style={{ width: '100%', height: '170px', position: 'relative' }}>
                    <svg viewBox="0 0 400 130" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="paxGreenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      <line x1="25" y1="15" x2="385" y2="15" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="25" y1="45" x2="385" y2="45" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="25" y1="75" x2="385" y2="75" stroke="#f1f5f9" strokeDasharray="3 3" />
                      <line x1="25" y1="105" x2="385" y2="105" stroke="#f1f5f9" strokeDasharray="3 3" />

                      {/* Y-axis labels */}
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

                    {/* Months X-axis labels */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '30px', paddingRight: '15px', marginTop: '4px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
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

                {/* Column 2: Recent Bookings */}
                <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>Recent Bookings</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All
                    </button>
                  </div>

                  {myBookings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No bookings recorded yet. Search buses above to book your journey!
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Booking ID</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Route</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Date</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600 }}>Status</th>
                          <th style={{ paddingBottom: '8px', fontWeight: 600, textAlign: 'right' }}>Ticket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myBookings.slice(0, 4).map((b) => {
                          const isPaidAndConfirmed =
                            (b.paymentStatus === 'PAID' || b.paymentStatus === 'paid') &&
                            (b.status === 'confirmed' || b.status === 'CONFIRMED' || b.status === 'completed') &&
                            Boolean(b.ticketNumber);
                          const isCancelled = b.status === 'cancelled' || b.status === 'CANCELLED';
                          return (
                            <tr key={b._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td style={{ padding: '8px 0', fontWeight: 700, color: '#0f172a' }}>
                                {isPaidAndConfirmed ? b.ticketNumber : <span style={{ color: '#94a3b8' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 0', color: '#334155' }}>
                                <div>{b.schedule?.route?.from || 'Origin'} → {b.schedule?.route?.to || 'Destination'}</div>
                                <span style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  color: b.tripType === 'round' ? '#92400e' : '#475569',
                                  background: b.tripType === 'round' ? '#fef3c7' : '#f1f5f9',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  border: `1px solid ${b.tripType === 'round' ? '#fde68a' : '#e2e8f0'}`,
                                  display: 'inline-block',
                                  marginTop: 2
                                }}>
                                  {b.tripType === 'round' ? '🔁 Round-Trip' : 'One-Way'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 0', color: '#64748b' }}>
                                {b.schedule?.date || 'Scheduled'}
                              </td>
                              <td style={{ padding: '8px 0' }}>
                                <span style={{
                                  background: (b.status === 'confirmed' || b.status === 'CONFIRMED') ? '#ecfdf5' : isCancelled ? '#fef2f2' : '#fffbeb',
                                  color: (b.status === 'confirmed' || b.status === 'CONFIRMED') ? '#10b981' : isCancelled ? '#ef4444' : '#d97706',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '50px'
                                }}>
                                  {b.status}
                                </span>
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                {isPaidAndConfirmed ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveTicketForView(b)}
                                    style={{
                                      background: '#078930',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                    title="Open and view E-Ticket"
                                  >
                                    <FaTicketAlt style={{ fontSize: '0.6rem' }} /> E-Ticket
                                  </button>
                                ) : isCancelled ? (
                                  <span style={{ color: '#ef4444', fontSize: '0.68rem', fontWeight: 700 }}>Cancelled</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setActiveBookingForPayment(b)}
                                    style={{
                                      background: '#d97706',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                    title="Pay to get your E-Ticket"
                                  >
                                    <FaCreditCard style={{ fontSize: '0.6rem' }} /> Pay Now
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Column 3: Spending Summary */}
                <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {(() => {
                    const totalSpent = myBookings
                      .filter(b => b.status === 'confirmed' || b.paymentStatus === 'paid')
                      .reduce((sum, b) => sum + (Number(b.totalPrice) || Number(b.totalAmount) || 0), 0);
                    const cancelledSpent = myBookings
                      .filter(b => b.status === 'cancelled')
                      .reduce((sum, b) => sum + (Number(b.totalPrice) || Number(b.totalAmount) || 0), 0);
                    const totalAll = totalSpent + cancelledSpent || 1;
                    const ticketPercent = totalSpent > 0 ? Math.round((totalSpent / totalAll) * 100) : 0;
                    const cancelPercent = cancelledSpent > 0 ? Math.round((cancelledSpent / totalAll) * 100) : 0;
                    const otherPercent = 100 - ticketPercent - cancelPercent;

                    return (
                      <>
                        <div>
                          <h3 style={{ margin: '0 0 10px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>Spending Summary</h3>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Spent</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                            Birr {totalSpent.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: totalSpent > 0 ? '#10b981' : '#94a3b8', marginTop: '2px' }}>
                            {totalSpent > 0 ? 'Verified transactions' : 'No payments made yet'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '12px' }}>
                          {/* SVG Donut */}
                          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
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

                          {/* Breakdown */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                              <span style={{ color: '#64748b' }}>Tickets</span>
                              <strong style={{ marginLeft: 'auto', color: '#0f172a' }}>Birr {totalSpent.toLocaleString()} ({totalSpent > 0 ? ticketPercent : 0}%)</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }} />
                              <span style={{ color: '#64748b' }}>Cancellation</span>
                              <strong style={{ marginLeft: 'auto', color: '#0f172a' }}>Birr {cancelledSpent.toLocaleString()} ({cancelledSpent > 0 ? cancelPercent : 0}%)</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1' }} />
                              <span style={{ color: '#64748b' }}>Others</span>
                              <strong style={{ marginLeft: 'auto', color: '#0f172a' }}>Birr 0 (0%)</strong>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  ROW 3: Quick Actions & Support Help
                  ═══════════════════════════════════════════════════════════════ */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '18px' }}>
                {/* Left: Quick Actions */}
                <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>Quick Actions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {/* Action 1 */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('search')}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        <FaBus />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Book a Bus Ticket</span>
                    </button>

                    {/* Action 2 */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fefce8', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        <FaTicketAlt />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>View My E-Tickets</span>
                    </button>

                    {/* Action 3 */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('payments')}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        <FaCreditCard />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Payment Center</span>
                    </button>

                    {/* Action 4 */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('refunds')}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        <FaMoneyBillWave />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Cancellation &amp; Refund</span>
                    </button>
                  </div>
                </div>

                {/* Right: Support & Help */}
                <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.92rem', color: '#4f46e5', marginBottom: '6px' }}>
                      <FaHeadset /> Support &amp; Help
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                      Need help with your booking? Our support team is available 24/7 to assist you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('support')}
                    style={{ width: '100%', padding: '10px', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', marginTop: '12px' }}
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Module Views */}
          {activeTab === 'search' && (
            <BusSearch
              schedules={schedules}
              loading={loading}
              searchParams={searchParams}
              onSearch={handleSearch}
              onSelectSchedule={(s) => setSelectedScheduleForSeat(s)}
            />
          )}

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

          {activeTab === 'reviews' && <ReviewsRatings />}

          {activeTab === 'notifications' && (
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '22px', border: '1px solid #e2e8f0', maxWidth: '720px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>All Notifications</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Trip reminders, booking alerts &amp; payment receipts</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllNotifications}
                      style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <FaTrashAlt /> Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{ padding: '6px 12px', background: '#f0fdf4', color: '#078930', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <FaCheckDouble /> Mark All as Read
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <FaBell style={{ fontSize: '2.2rem', marginBottom: '10px', color: '#cbd5e1' }} />
                    <h4 style={{ margin: '0 0 4px', color: '#64748b', fontSize: '0.95rem', fontWeight: 800 }}>No notifications yet</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>You're all caught up! New booking, payment, and trip alerts will appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleMarkAsRead(n._id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: n.isRead ? '#ffffff' : '#f0fdf4',
                        border: n.isRead ? '1px solid #e2e8f0' : '1.5px solid #86efac',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: n.type === 'payment' ? '#f3e8ff' : '#dcfce7', color: n.type === 'payment' ? '#7e22ce' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
                          {n.type === 'payment' ? <FaWallet /> : <FaTicketAlt />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{n.title}</h4>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{n.time}</span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.3 }}>{n.message}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(n._id);
                        }}
                        title="Delete Notification"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
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
            <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
              {/* Single Sleek Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '4px 0' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  My Support Inquiries ({supportThreads.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(true)}
                  style={{
                    padding: '7px 14px',
                    background: '#078930',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(7,137,48,0.15)',
                  }}
                >
                  <FaHeadset /> Ask Question
                </button>
              </div>

              {/* Responsive Grid: Inquiries on Left, Active Chat on Right */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedThread ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: 12 }}>
                {/* Conversations List */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 12 }}>

                  {supportThreads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8' }}>
                      <FaHeadset style={{ fontSize: '1.5rem', marginBottom: 6, color: '#cbd5e1' }} />
                      <p style={{ margin: '0 0 8px', fontSize: '0.78rem' }}>You haven't opened any support questions yet.</p>
                      <button
                        type="button"
                        onClick={() => setShowNewTicketModal(true)}
                        style={{ padding: '5px 12px', background: '#078930', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}
                      >
                        Ask a Question
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '380px', overflowY: 'auto' }}>
                      {supportThreads.map((t) => {
                        const isSelected = selectedThread?._id === t._id;
                        const status = (t.status || 'OPEN').toUpperCase();
                        return (
                          <div
                            key={t._id}
                            onClick={() => setSelectedThread(t)}
                            style={{
                              padding: '9px 11px',
                              borderRadius: 8,
                              border: `1.5px solid ${isSelected ? '#078930' : '#e2e8f0'}`,
                              background: isSelected ? '#f0fdf4' : '#f8fafc',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontWeight: 800, color: '#078930', fontSize: '0.74rem' }}>
                                {t.companyId?.companyName || 'Bus Operator'}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    borderRadius: 6,
                                    background: status === 'OPEN' ? '#fee2e2' : status === 'IN_PROGRESS' ? '#fef3c7' : status === 'ANSWERED' ? '#dcfce7' : '#f1f5f9',
                                    color: status === 'OPEN' ? '#dc2626' : status === 'IN_PROGRESS' ? '#d97706' : status === 'ANSWERED' ? '#16a34a' : '#64748b',
                                  }}
                                >
                                  {status}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSupportTicket(t._id);
                                  }}
                                  title="Delete Inquiry"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                >
                                  <FaTrashAlt />
                                </button>
                              </div>
                            </div>

                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem', marginBottom: 2 }}>
                              {t.subject}
                            </div>

                            <div style={{ fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                              {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].message : t.description}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#94a3b8' }}>
                              <span>{t.category}</span>
                              <span>{new Date(t.updatedAt || t.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Active Thread Message Stream */}
                {selectedThread && (
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '380px' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                            {selectedThread.subject}
                          </h4>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            <strong>{selectedThread.companyId?.companyName || 'Bus Operator'}</strong>
                            {selectedThread.ticketNumber && ` • Ticket: ${selectedThread.ticketNumber}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 6,
                              background: selectedThread.status === 'ANSWERED' ? '#dcfce7' : '#fee2e2',
                              color: selectedThread.status === 'ANSWERED' ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {selectedThread.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupportTicket(selectedThread._id)}
                            title="Delete Support Inquiry"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#ef4444',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '0.68rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 700,
                            }}
                          >
                            <FaTrashAlt /> Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Messages Container */}
                    <div style={{ flex: 1, padding: '10px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc' }}>
                      {/* Initial inquiry description if messages empty */}
                      {(!selectedThread.messages || selectedThread.messages.length === 0) && (
                        <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: '#078930', color: '#fff', padding: '7px 11px', borderRadius: 9 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#86efac', marginBottom: 1 }}>You (Passenger)</div>
                          <div style={{ fontSize: '0.76rem', lineHeight: 1.3 }}>{selectedThread.description}</div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'right' }}>
                            {new Date(selectedThread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}

                      {/* Messages Thread */}
                      {selectedThread.messages && selectedThread.messages.map((msg, idx) => {
                        const isPassenger = msg.senderRole === 'passenger' || !msg.senderRole;
                        return (
                          <div
                            key={idx}
                            style={{
                              alignSelf: isPassenger ? 'flex-end' : 'flex-start',
                              maxWidth: '85%',
                              background: isPassenger ? '#078930' : '#ffffff',
                              color: isPassenger ? '#ffffff' : '#0f172a',
                              padding: '7px 11px',
                              borderRadius: 9,
                              border: isPassenger ? 'none' : '1px solid #e2e8f0',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                            }}
                          >
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isPassenger ? '#86efac' : '#2563eb', marginBottom: 1 }}>
                              {isPassenger ? 'You (Passenger)' : `${msg.senderName} (Support)`}
                            </div>
                            <div style={{ fontSize: '0.76rem', lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
                              {msg.message}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: isPassenger ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginTop: 2, textAlign: 'right' }}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Passenger Reply Input */}
                    <form onSubmit={handleSendThreadReply} style={{ padding: '7px 10px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Type reply..."
                        value={threadReply}
                        onChange={(e) => setThreadReply(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1.5px solid #cbd5e1', fontSize: '0.76rem', outline: 'none' }}
                      />
                      <button
                        type="submit"
                        disabled={sendingReply}
                        style={{ padding: '6px 12px', background: '#078930', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer' }}
                      >
                        {sendingReply ? '...' : 'Send'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Modals ── */}
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

      {/* ── New Support Inquiry Modal ── */}
      {showNewTicketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, maxWidth: 440, width: '100%', padding: 18, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>Ask a Support Question</h3>
              <button onClick={() => setShowNewTicketModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleCreateSupportTicket} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 3, color: '#334155' }}>Select Bus Company *</label>
                <select
                  value={newTicketForm.companyId}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, companyId: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName} ({c.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 3, color: '#334155' }}>Issue Category *</label>
                <select
                  value={newTicketForm.category}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="Booking Assistance">Booking Assistance</option>
                  <option value="Ticket Query">Ticket Query</option>
                  <option value="Chapa Payment">Chapa Payment</option>
                  <option value="Cancellation & Refund">Cancellation & Refund</option>
                  <option value="Schedule / Route Query">Schedule / Route Query</option>
                  <option value="Luggage / Lost Item">Luggage / Lost Item</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 3, color: '#334155' }}>Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question about morning bus to Gondar..."
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 3, color: '#334155' }}>Ticket Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TKT-102938"
                  value={newTicketForm.ticketNumber}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketNumber: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, marginBottom: 3, color: '#334155' }}>Your Question / Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your question or problem..."
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  style={{ padding: '7px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  style={{ padding: '8px 18px', background: '#078930', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  {submittingTicket ? 'Submitting...' : 'Send Support Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Pay Now Modal (for unpaid bookings from Recent Bookings table) ── */}
      {activeBookingForPayment && (
        <PaymentModal
          booking={activeBookingForPayment}
          onClose={() => setActiveBookingForPayment(null)}
          onSuccess={() => {
            setActiveBookingForPayment(null);
            fetchData();
          }}
        />
      )}

      {/* ── Official E-Ticket Modal Viewer ── */}
      {activeTicketForView && (
        <TicketModal
          booking={activeTicketForView}
          onClose={() => setActiveTicketForView(null)}
        />
      )}
    </div>
  );
};

export default PassengerDashboard;
