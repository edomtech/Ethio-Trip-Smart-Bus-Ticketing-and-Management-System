import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { scheduleAPI, ticketAPI, conductorReportAPI, authAPI } from '../../utils/api';
import {
  FaBus,
  FaQrcode,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSearch,
  FaRoute,
  FaClipboardList,
  FaShieldAlt,
  FaExclamationTriangle,
  FaUserCircle,
  FaSync,
  FaArrowRight,
  FaSignOutAlt,
  FaBars,
  FaChartBar,
  FaTachometerAlt,
  FaPaperPlane,
  FaUserCheck,
  FaCamera,
  FaEye,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useTranslation } from '../../i18n.jsx';
import LanguageSelector from '../../components/LanguageSelector';
import CameraQRScanner from '../../components/CameraQRScanner';
import PassengerDetailsModal from '../../components/PassengerDetailsModal';

/* ── Colour palette for Conductor portal (indigo / purple theme) ─────────── */
const C = {
  primary:   '#4f46e5',
  primaryDk: '#3730a3',
  primaryLt: '#e0e7ff',
  sidebar:   'linear-gradient(180deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)',
  accent:    '#818cf8',
  success:   '#10b981',
  danger:    '#ef4444',
  warn:      '#f59e0b',
  bg:        '#f8fafc',
};

const ConductorDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [assignedTrips, setAssignedTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [manifest, setManifest] = useState([]);
  const [manifestStats, setManifestStats] = useState({ total: 0, verified: 0, pendingVerification: 0, boarded: 0, notBoarded: 0 });

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingManifest, setLoadingManifest] = useState(false);

  /* Validation & Boarding */
  const [ticketQuery, setTicketQuery] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [boardingSuccess, setBoardingSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPassengerForModal, setSelectedPassengerForModal] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  /* Manifest filter */
  const [manifestFilter, setManifestFilter] = useState('ALL');

  /* Problem Reporting State */
  const [problemCategory, setProblemCategory] = useState('Passenger problem');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemPassenger, setProblemPassenger] = useState('');
  const [problemTicket, setProblemTicket] = useState('');
  const [submittingProblem, setSubmittingProblem] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  /* Profile State */
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    newPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  /* ── Data fetching ─────────────────────────────────────────────────────── */
  useEffect(() => {
    fetchAssignedTrips();
    fetchMyReports();
  }, []);

  useEffect(() => {
    if (selectedTrip) fetchTripManifest(selectedTrip._id);
  }, [selectedTrip]);

  const fetchAssignedTrips = async () => {
    try {
      setLoadingTrips(true);
      const data = await scheduleAPI.getMyAssigned();
      const list = Array.isArray(data) ? data : [];
      setAssignedTrips(list);
      if (list.length > 0 && !selectedTrip) setSelectedTrip(list[0]);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingTrips(false);
    }
  };

  const fetchTripManifest = async (scheduleId) => {
    try {
      setLoadingManifest(true);
      const data = await ticketAPI.getTripManifest({ scheduleId });
      setManifest(data.passengers || []);
      setManifestStats({
        total: data.totalPassengers || 0,
        verified: data.verifiedCount || 0,
        pendingVerification: data.pendingVerificationCount || 0,
        boarded: data.boardedCount || 0,
        notBoarded: data.notBoardedCount || 0,
      });
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingManifest(false);
    }
  };

  const fetchMyReports = async () => {
    try {
      setLoadingReports(true);
      const data = await conductorReportAPI.getAll();
      setMyReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleValidateTicket = async (customCodeOrEvent) => {
    let query = ticketQuery;
    if (typeof customCodeOrEvent === 'string') {
      query = customCodeOrEvent;
      setTicketQuery(customCodeOrEvent);
    } else if (customCodeOrEvent?.preventDefault) {
      customCodeOrEvent.preventDefault();
    }

    if (!query || !query.trim()) {
      toast.warning('Please scan a QR code or enter a ticket number');
      return;
    }

    setShowCameraModal(false);
    setValidating(true);
    setValidationResult(null);
    setValidationError('');
    setBoardingSuccess('');

    let cleanCode = query.trim();
    if (cleanCode.includes('TICKET:')) {
      const match = cleanCode.match(/TICKET:\s*([^\s\n]+)/);
      if (match && match[1]) cleanCode = match[1];
    } else if (cleanCode.includes('ETHIOTRIP:')) {
      const parts = cleanCode.split(':');
      if (parts[1]) cleanCode = parts[1];
    }

    try {
      const res = await ticketAPI.conductorValidate({
        ticketNumber: cleanCode,
        qrData: query.trim(),
        scheduleId: selectedTrip?._id,
      });

      if (res.valid) {
        setValidationResult(res.ticket);
        setValidationError('');
        toast.success(`✅ Ticket verified for ${res.ticket.passengerName} (Seat ${res.ticket.seatNumber})`);
      } else {
        setValidationResult(res.ticket || null);
        setValidationError(res.message || 'Ticket is not valid for boarding');
        if (res.status === 'NOT_VERIFIED_BY_AGENT') {
          toast.warning('⚠️ Ticket requires counter verification by an Agent before boarding.');
        } else {
          toast.error(res.message || 'Validation failed');
        }
      }
    } catch (err) {
      setValidationError(err.message || 'Invalid Ticket / Unrecognized QR Code');
      toast.error(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmBoarding = async (ticket) => {
    try {
      setActionLoading(true);
      setBoardingSuccess('');
      setValidationError('');
      await ticketAPI.conductorConfirmBoarding({ ticketId: ticket._id, ticketNumber: ticket.ticketNumber });
      setBoardingSuccess(`Boarding confirmed for ${ticket.passengerName} (Seat: ${ticket.seatNumber})!`);
      setValidationResult(null);
      setTicketQuery('');
      if (selectedTrip) fetchTripManifest(selectedTrip._id);
      toast.success('Passenger boarded successfully!');
    } catch (err) {
      setValidationError(err.message || 'Failed to confirm boarding');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitProblem = async (e) => {
    e.preventDefault();
    if (!problemDescription.trim()) {
      toast.warning('Please enter problem details');
      return;
    }

    setSubmittingProblem(true);
    try {
      await conductorReportAPI.create({
        scheduleId: selectedTrip?._id,
        tripId: selectedTrip?.tripId,
        busId: selectedTrip?.bus?._id || selectedTrip?.bus,
        passengerName: problemPassenger.trim(),
        ticketNumber: problemTicket.trim(),
        category: problemCategory,
        description: problemDescription.trim(),
      });
      toast.success('Problem report filed to Company Admin successfully!');
      setProblemDescription('');
      setProblemPassenger('');
      setProblemTicket('');
      fetchMyReports();
    } catch (err) {
      toast.error(err.message || 'Failed to file problem report');
    } finally {
      setSubmittingProblem(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone,
      };
      if (profileForm.newPassword) {
        payload.password = profileForm.newPassword;
      }
      await authAPI.updateProfile(payload);
      toast.success('Conductor profile updated successfully!');
      setProfileForm((prev) => ({ ...prev, newPassword: '' }));
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const filteredManifest = manifest.filter((p) => {
    if (manifestFilter === 'BOARDED') return p.boardingStatus === 'BOARDED';
    if (manifestFilter === 'NOT_BOARDED') return p.boardingStatus === 'NOT_BOARDED';
    if (manifestFilter === 'VERIFIED') return p.verificationStatus === 'VERIFIED';
    if (manifestFilter === 'INVALID') return p.verificationStatus !== 'VERIFIED';
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAssigned = assignedTrips.filter((t) => t.date === todayStr);

  const companyName = user?.companyId?.companyName || 'Transport Fleet';

  // Conductor Sidebar Items
  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: <FaTachometerAlt /> },
    { id: 'assigned_trips', label: 'Assigned Trips', icon: <FaBus /> },
    { id: 'passenger_list', label: t('nav.passenger', 'Passenger Manifest'), icon: <FaClipboardList /> },
    { id: 'scan_board', label: 'Scan & Board Passenger', icon: <FaQrcode /> },
    { id: 'report_problem', label: 'Report Problem', icon: <FaExclamationTriangle />, badge: myReports.filter((r) => r.status === 'OPEN').length },
    { id: 'profile', label: t('common.profile', 'Profile'), icon: <FaUserCircle /> },
  ];

  const card = { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Poppins','Inter',sans-serif" }}>
      {/* ── LEFT SIDEBAR ── */}
      <aside
        style={{
          width: sidebarOpen ? 260 : 0,
          minWidth: sidebarOpen ? 260 : 0,
          background: C.sidebar,
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: sidebarOpen ? '24px 16px' : 0,
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100,
          boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease, padding 0.25s ease',
        }}
      >
        {sidebarOpen && (
          <>
            <div>
              {/* Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  <FaBus />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.2 }}>Conductor Portal</div>
                  <div style={{ fontSize: '0.72rem', color: C.accent, fontWeight: 600 }}>{companyName}</div>
                </div>
              </div>

              {/* Nav */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`eb-as-nav-item${activeTab === item.id ? ' active' : ''}`}
                  >
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10, fontWeight: 800 }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', width: '100%', marginTop: 16 }}
            >
              <FaSignOutAlt /> Logout
            </button>
          </>
        )}
      </aside>

      {/* ── RIGHT PANEL ── */}
      <div style={{ marginLeft: sidebarOpen ? 260 : 0, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.25s ease', minWidth: 0 }}>
        {/* Topbar */}
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 28px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 8 }}
            >
              <FaBars />
            </button>
            <div style={{ background: `${C.primary}18`, color: C.primary, padding: '4px 14px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 800 }}>
              🚌 Conductor Boarding & Onboard Center
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LanguageSelector />
            <button
              onClick={() => {
                fetchAssignedTrips();
                if (selectedTrip) fetchTripManifest(selectedTrip._id);
                fetchMyReports();
              }}
              style={{ background: `${C.primary}12`, color: C.primary, border: 'none', padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <FaSync style={{ animation: loadingTrips || loadingManifest ? 'spin 1s linear infinite' : 'none' }} /> {t('common.refresh', 'Refresh')}
            </button>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
              {(user?.name || '').replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff)\b/gi, '').trim() || 'Conductor'}
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active Trip Selector Header */}
          {assignedTrips.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 18, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#64748b' }}>Active Trip:</span>
                <select
                  value={selectedTrip?._id || ''}
                  onChange={(e) => {
                    const found = assignedTrips.find((t) => t._id === e.target.value);
                    if (found) setSelectedTrip(found);
                  }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}
                >
                  {assignedTrips.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tripId} • {t.route?.from} → {t.route?.to} ({t.date} at {t.departureTime})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrip && (
                <div style={{ display: 'flex', gap: 14, fontSize: '0.82rem', color: '#475569' }}>
                  <span>Bus: <strong>{selectedTrip.bus?.busNumber || '—'}</strong></span>
                  <span>Departure: <strong>{selectedTrip.departureTime}</strong></span>
                  <span>Date: <strong>{selectedTrip.date}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              1. DASHBOARD OVERVIEW (Matching Screenshot)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* ═══════════════════════════════════════════════════════════════
                  ROW 1: 4 Large Metric Cards (Dynamic Conductor Data)
                  ═══════════════════════════════════════════════════════════════ */}
              {(() => {
                const totalSeats = selectedTrip?.bus?.totalSeats || selectedTrip?.bus?.capacity || (selectedTrip ? 45 : 0);
                const assignedSeats = manifestStats.total || 0;
                const boarded = manifestStats.boarded || 0;
                const remaining = manifestStats.notBoarded || Math.max(0, assignedSeats - boarded);
                const boardedPercent = assignedSeats > 0 ? Math.round((boarded / assignedSeats) * 100) : 0;
                const remainingPercent = assignedSeats > 0 ? Math.max(0, 100 - boardedPercent) : 0;

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
                      {/* Card 1: Total Seats */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Total Seats
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 2px', lineHeight: 1 }}>
                          {totalSeats}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                          {selectedTrip ? 'Bus Capacity' : 'No Trip Active'}
                        </div>
                      </div>

                      {/* Card 2: Assigned Seats */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Assigned Seats
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#2563eb', margin: '4px 0 2px', lineHeight: 1 }}>
                          {assignedSeats}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                          Passengers Booked
                        </div>
                      </div>

                      {/* Card 3: Boarded Passengers */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Boarded Passengers
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#16a34a', margin: '4px 0 2px', lineHeight: 1 }}>
                          {boarded}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>
                          {boardedPercent}% Completed
                        </div>
                      </div>

                      {/* Card 4: Remaining to Board */}
                      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          Remaining to Board
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ea580c', margin: '4px 0 2px', lineHeight: 1 }}>
                          {remaining}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c' }}>
                          {remainingPercent}% Remaining
                        </div>
                      </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        ROW 2: 2 Panels (Boarding Progress / Boarding by Status)
                        ═══════════════════════════════════════════════════════════════ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                      {/* Panel 1: Boarding Progress */}
                      <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 18px', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                          Boarding Progress
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
                          {/* SVG Radial Gauge */}
                          <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <circle cx="18" cy="18" r="14.5" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                              <circle
                                cx="18"
                                cy="18"
                                r="14.5"
                                fill="transparent"
                                stroke="#6366f1"
                                strokeWidth="3.2"
                                strokeDasharray={`${boardedPercent * 0.91} 100`}
                                strokeDashoffset="0"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{boardedPercent}%</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>Boarded</span>
                            </div>
                          </div>

                          {/* Breakdown Numbers */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '130px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Boarded</span>
                              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{boarded}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Remaining</span>
                              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{remaining}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Total</span>
                              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{assignedSeats}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Panel 2: Boarding by Status */}
                      <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: '0 0 18px', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                          Boarding by Status
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
                          {/* SVG Donut */}
                          <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f1f5f9" strokeWidth="4.5" />
                              {assignedSeats > 0 ? (
                                <>
                                  <circle cx="18" cy="18" r="14" fill="transparent" stroke="#10b981" strokeWidth="4.5" strokeDasharray={`${boardedPercent * 0.88} 100`} strokeDashoffset="0" />
                                  <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray={`${remainingPercent * 0.88} 100`} strokeDashoffset={`-${boardedPercent * 0.88}`} />
                                </>
                              ) : (
                                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#e2e8f0" strokeWidth="4.5" strokeDasharray="100 100" />
                              )}
                            </svg>
                          </div>

                          {/* Status Breakdown Legend */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px', fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                                <span style={{ color: '#64748b' }}>Checked-In</span>
                              </div>
                              <strong style={{ color: '#0f172a' }}>{boarded} ({boardedPercent}%)</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }} />
                                <span style={{ color: '#64748b' }}>Not Checked-In</span>
                              </div>
                              <strong style={{ color: '#0f172a' }}>{remaining} ({remainingPercent}%)</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ color: '#64748b' }}>No Show</span>
                              </div>
                              <strong style={{ color: '#0f172a' }}>0 (0%)</strong>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1' }} />
                                <span style={{ color: '#64748b' }}>Cancelled</span>
                              </div>
                              <strong style={{ color: '#0f172a' }}>0 (0%)</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* ═══════════════════════════════════════════════════════════════
                  ROW 3: Quick Actions
                  ═══════════════════════════════════════════════════════════════ */}
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                  Quick Actions
                </h3>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scan_board')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 22px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    }}
                  >
                    <FaQrcode /> Scan / Board Passenger
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('passenger_list')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 22px',
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <FaClipboardList style={{ color: '#ea580c' }} /> View Passenger Manifest
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              2. ASSIGNED TRIPS (Section 10)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'assigned_trips' && (
            <div style={card}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 900 }}>All Assigned Trips</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: 12 }}>Trip ID</th>
                      <th style={{ padding: 12 }}>Date</th>
                      <th style={{ padding: 12 }}>Bus</th>
                      <th style={{ padding: 12 }}>Route</th>
                      <th style={{ padding: 12 }}>Departure</th>
                      <th style={{ padding: 12 }}>Booked Seats</th>
                      <th style={{ padding: 12 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTrips.map((t) => (
                      <tr key={t._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 12, fontWeight: 800, color: C.primary }}>{t.tripId}</td>
                        <td style={{ padding: 12, fontWeight: 600 }}>{t.date}</td>
                        <td style={{ padding: 12 }}>{t.bus?.busNumber || '—'}</td>
                        <td style={{ padding: 12 }}>{t.route?.from} → {t.route?.to}</td>
                        <td style={{ padding: 12, fontWeight: 700 }}>{t.departureTime}</td>
                        <td style={{ padding: 12 }}><strong>{(t.bookedSeats || []).length}</strong> passengers</td>
                        <td style={{ padding: 12 }}>
                          <button
                            onClick={() => {
                              setSelectedTrip(t);
                              setActiveTab('passenger_list');
                            }}
                            style={{ padding: '6px 12px', background: C.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Open Manifest
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              3. PASSENGER LIST (Section 10)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'passenger_list' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 900 }}>
                    Passenger Manifest ({selectedTrip?.tripId || 'Selected Trip'})
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
                    {selectedTrip?.route?.from} → {selectedTrip?.route?.to} on {selectedTrip?.date} ({selectedTrip?.departureTime})
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <select
                    value={manifestFilter}
                    onChange={(e) => setManifestFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="ALL">All Passengers ({manifest.length})</option>
                    <option value="BOARDED">Boarded ({manifestStats.boarded})</option>
                    <option value="NOT_BOARDED">Not Boarded ({manifestStats.notBoarded})</option>
                    <option value="VERIFIED">Agent Verified ({manifestStats.verified})</option>
                    <option value="INVALID">Agent Pending / Invalid ({manifestStats.pendingVerification})</option>
                  </select>
                </div>
              </div>

              {loadingManifest ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>Loading manifest...</div>
              ) : filteredManifest.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>No passengers matching the filter.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                        <th style={{ padding: 10 }}>Seat</th>
                        <th style={{ padding: 10 }}>Passenger Name</th>
                        <th style={{ padding: 10 }}>Contact</th>
                        <th style={{ padding: 10 }}>Ticket No</th>
                        <th style={{ padding: 10 }}>Agent Verification</th>
                        <th style={{ padding: 10 }}>Boarding Status</th>
                        <th style={{ padding: 10 }}>Booking Details &amp; Boarding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredManifest.map((p) => {
                        const isVerified = p.verificationStatus === 'VERIFIED';
                        const isBoarded = p.boardingStatus === 'BOARDED';
                        return (
                          <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: 10, fontWeight: 900, color: C.primary, fontSize: '1rem' }}>{p.seatNumber}</td>
                            <td style={{ padding: 10, fontWeight: 700, color: '#0f172a' }}>{p.passengerName}</td>
                            <td style={{ padding: 10, color: '#64748b', fontSize: '0.82rem' }}>{p.passengerPhone || p.user?.phone || '0911223344'}</td>
                            <td style={{ padding: 10, fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>{p.ticketNumber}</td>
                            <td style={{ padding: 10 }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 10px',
                                  borderRadius: 12,
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: isVerified ? '#dcfce7' : '#fee2e2',
                                  color: isVerified ? '#16a34a' : '#dc2626',
                                }}
                              >
                                {isVerified ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                {p.verificationStatus || 'PENDING'}
                              </span>
                            </td>
                            <td style={{ padding: 10 }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '3px 10px',
                                  borderRadius: 12,
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: isBoarded ? '#e0e7ff' : '#f1f5f9',
                                  color: isBoarded ? C.primary : '#64748b',
                                }}
                              >
                                {isBoarded ? <FaCheckCircle /> : <FaClock />}
                                {p.boardingStatus}
                              </span>
                            </td>
                            <td style={{ padding: 10 }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPassengerForModal(p)}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#f8fafc',
                                    border: '1.5px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <FaEye /> Details
                                </button>
                                {!isBoarded && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('scan_board');
                                      setTicketQuery(p.ticketNumber);
                                      handleValidateTicket(p.ticketNumber);
                                    }}
                                    style={{
                                      padding: '5px 12px',
                                      background: isVerified ? C.primary : '#64748b',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 8,
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <FaQrcode /> Scan to Board
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              4. SCAN & CONFIRM BOARDING (Live Camera & Agent Verification)
             ═══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'scan_board' || activeTab === 'verify_ticket' || activeTab === 'confirm_boarding') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Trip Context Bar */}
              <div style={{ background: '#1e1b4b', color: '#fff', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#a5b4fc', fontWeight: 700 }}>
                    Active Boarding Trip
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaBus style={{ color: '#38bdf8' }} /> {selectedTrip?.tripId || 'Trip'} — {selectedTrip?.route?.from} → {selectedTrip?.route?.to}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem' }}>
                  <div><strong>Date:</strong> {selectedTrip?.date}</div>
                  <div><strong>Departure:</strong> {selectedTrip?.departureTime}</div>
                  <div><strong>Bus:</strong> {selectedTrip?.bus?.busNumber}</div>
                  <div><strong>Boarded:</strong> <span style={{ color: '#4ade80', fontWeight: 800 }}>{manifestStats.boarded} / {manifestStats.total}</span></div>
                </div>
              </div>

              {/* ── Control Bar matching uploaded image media_1788360219709.png ── */}
              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '22px 28px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap'
              }}>
                {/* Search / QR string input */}
                <div style={{
                  flex: 1,
                  minWidth: '260px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <FaSearch style={{
                    position: 'absolute',
                    left: '16px',
                    color: '#94a3b8',
                    fontSize: '1rem',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type="text"
                    placeholder="e.g. TKT-10023-01 or paste QR string..."
                    value={ticketQuery}
                    onChange={(e) => setTicketQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleValidateTicket(); }}
                    style={{
                      width: '100%',
                      padding: '14px 18px 14px 44px',
                      borderRadius: '14px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      color: '#0f172a',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Validate Button */}
                <button
                  type="button"
                  onClick={() => handleValidateTicket()}
                  disabled={validating}
                  style={{
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FaCheckCircle style={{ fontSize: '1rem' }} /> Validate
                </button>

                {/* Scan Button (Camera QR scanner toggle) */}
                <button
                  type="button"
                  onClick={() => setShowCameraModal(prev => !prev)}
                  style={{
                    padding: '14px 24px',
                    background: showCameraModal ? '#4f46e5' : '#f5f3ff',
                    color: showCameraModal ? '#ffffff' : '#4f46e5',
                    border: '1.5px solid #6366f1',
                    borderRadius: '14px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FaQrcode style={{ fontSize: '1.1rem' }} /> {showCameraModal ? 'Close Scanner' : 'Scan'}
                </button>
              </div>

              {/* Live Camera Scanner Container */}
              {showCameraModal && (
                <div style={{ maxWidth: 420, margin: '0 auto' }}>
                  <CameraQRScanner
                    onScan={(scannedCode) => handleValidateTicket(scannedCode)}
                    onClose={() => setShowCameraModal(false)}
                    isScanning={validating}
                    activeSchedule={selectedTrip}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Validation & Boarding Action Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Status: Validating */}
                  {validating && (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Verifying Passenger Ticket &amp; Agent Status...</div>
                      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Checking company database, trip assignment, and agent validation</div>
                      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                  )}

                  {/* Status: Agent Verified — Ready to Board */}
                  {!validating && validationResult && validationResult.verificationStatus === 'VERIFIED' && (
                    <div style={{ ...card, border: '2px solid #10b981', background: '#f0fdf4', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#16a34a', fontWeight: 900, fontSize: '1.15rem', marginBottom: 14 }}>
                        <FaCheckCircle style={{ fontSize: '1.4rem' }} /> TICKET AGENT VERIFIED — READY FOR BOARDING
                      </div>

                      <div style={{ background: '#ffffff', borderRadius: 14, padding: 18, border: '1px solid #bbf7d0', marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Passenger</div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{validationResult.passengerName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{validationResult.passengerPhone || '0911223344'}</div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Seat Number</div>
                            <div style={{ fontWeight: 900, color: C.primary, fontSize: '1.4rem' }}>{validationResult.seatNumber}</div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Ticket No</div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{validationResult.ticketNumber}</div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Fare &amp; Payment</div>
                            <div style={{ fontWeight: 800, color: '#16a34a' }}>ETB {validationResult.price || selectedTrip?.price || 950} (PAID)</div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Counter Verification</div>
                            <div style={{ fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FaCheckCircle /> Verified by {validationResult.verifiedBy || 'Ticket Agent'}
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Bus Route</div>
                            <div style={{ fontWeight: 700, color: '#334155' }}>{validationResult.route || `${selectedTrip?.route?.from} → ${selectedTrip?.route?.to}`}</div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmBoarding(validationResult)}
                        disabled={actionLoading}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 14,
                          fontWeight: 900,
                          fontSize: '1.05rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          boxShadow: '0 6px 16px rgba(22, 163, 74, 0.35)',
                          transition: 'transform 0.1s ease',
                        }}
                      >
                        <FaCheckCircle style={{ fontSize: '1.2rem' }} />
                        {actionLoading ? 'Recording Boarding...' : `Confirm Boarding for Seat ${validationResult.seatNumber}`}
                      </button>
                    </div>
                  )}

                  {/* Status: NOT Verified by Agent */}
                  {!validating && validationResult && validationResult.verificationStatus !== 'VERIFIED' && (
                    <div style={{ ...card, border: '2px solid #f59e0b', background: '#fffbeb', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.12)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#d97706', fontWeight: 900, fontSize: '1.1rem', marginBottom: 10 }}>
                        <FaExclamationTriangle style={{ fontSize: '1.3rem' }} /> BOARDING NOT ALLOWED — NOT VERIFIED BY AGENT
                      </div>
                      <p style={{ color: '#78350f', fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.4 }}>
                        This passenger's ticket is paid, but has <strong>NOT been verified by a counter Ticket Agent</strong>. Conductor cannot confirm boarding until the passenger validates their ticket at the station counter.
                      </p>

                      <div style={{ background: '#ffffff', borderRadius: 14, padding: 16, border: '1px solid #fde68a', marginBottom: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: '0.85rem' }}>
                          <div><strong>Passenger:</strong> {validationResult.passengerName}</div>
                          <div><strong>Seat:</strong> <span style={{ color: '#d97706', fontWeight: 900 }}>{validationResult.seatNumber}</span></div>
                          <div><strong>Ticket No:</strong> {validationResult.ticketNumber}</div>
                          <div><strong>Status:</strong> <span style={{ color: '#d97706', fontWeight: 800 }}>PENDING AGENT VERIFICATION</span></div>
                        </div>
                      </div>

                      <div style={{ padding: '12px', background: '#fef3c7', borderRadius: 10, fontSize: '0.8rem', color: '#92400e', fontWeight: 700, textAlign: 'center' }}>
                        Please direct passenger to the ticket counter for Agent ID &amp; ticket verification.
                      </div>
                    </div>
                  )}

                  {/* Status: General Validation Error */}
                  {!validating && validationError && (!validationResult || validationResult.verificationStatus === 'VERIFIED') && (
                    <div style={{ ...card, border: '2px solid #ef4444', background: '#fef2f2' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#dc2626', fontWeight: 900, fontSize: '1.05rem', marginBottom: 6 }}>
                        <FaTimesCircle style={{ fontSize: '1.3rem' }} /> BOARDING REJECTED / INVALID TICKET
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#991b1b' }}>{validationError}</div>
                    </div>
                  )}

                  {/* Status: Boarding Success Flash */}
                  {boardingSuccess && (
                    <div style={{ ...card, border: '2px solid #10b981', background: '#f0fdf4', textAlign: 'center', padding: 24 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.6rem' }}>
                        <FaCheckCircle />
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#166534', marginBottom: 6 }}>
                        Passenger Boarded Successfully!
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: 16 }}>
                        {boardingSuccess}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBoardingSuccess('');
                          setValidationResult(null);
                          setTicketQuery('');
                        }}
                        style={{
                          padding: '10px 20px',
                          background: C.primary,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Scan Next Passenger
                      </button>
                    </div>
                  )}


                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              6. REPORT PROBLEM (Section 10 & 23)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'report_problem' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
              {/* Report Submission Form */}
              <div style={card}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 900 }}>
                  ⚠️ Report Passenger / Ticket Problem
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 20 }}>
                  Directly report seat mismatches, duplicate tickets, or passenger incidents to Company Admin
                </p>

                <form onSubmit={handleSubmitProblem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Problem Category *</label>
                    <select
                      value={problemCategory}
                      onChange={(e) => setProblemCategory(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                    >
                      <option value="Passenger problem">Passenger problem</option>
                      <option value="Ticket problem">Ticket problem</option>
                      <option value="Payment problem">Payment problem</option>
                      <option value="Seat mismatch">Seat mismatch</option>
                      <option value="Passenger information mismatch">Passenger information mismatch</option>
                      <option value="Invalid ticket">Invalid ticket</option>
                      <option value="Duplicate boarding">Duplicate boarding</option>
                      <option value="Wrong trip">Wrong trip</option>
                      <option value="Other issue">Other issue</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Passenger Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Abebe Kebede"
                        value={problemPassenger}
                        onChange={(e) => setProblemPassenger(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Ticket Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. TKT-982104"
                        value={problemTicket}
                        onChange={(e) => setProblemTicket(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Description & Details *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe what occurred, who was involved, and what action was attempted..."
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingProblem}
                    style={{
                      padding: '12px 20px',
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <FaPaperPlane /> {submittingProblem ? 'Submitting...' : 'Submit Report to Company Admin'}
                  </button>
                </form>
              </div>

              {/* Submitted Reports History */}
              <div style={card}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 900 }}>
                  📋 My Submitted Problem Reports
                </h3>

                {loadingReports ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>Loading reports...</div>
                ) : myReports.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                    No problem reports filed yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '500px', overflowY: 'auto' }}>
                    {myReports.map((rep) => {
                      const isOpen = rep.status === 'OPEN';
                      const isResolved = rep.status === 'RESOLVED' || rep.status === 'CLOSED';
                      return (
                        <div key={rep._id} style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.88rem' }}>{rep.category}</span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: isOpen ? '#fee2e2' : isResolved ? '#dcfce7' : '#fef3c7',
                                color: isOpen ? '#dc2626' : isResolved ? '#16a34a' : '#d97706',
                              }}
                            >
                              {rep.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 6 }}>{rep.description}</div>
                          {rep.resolutionNotes && (
                            <div style={{ fontSize: '0.78rem', color: '#16a34a', background: '#f0fdf4', padding: 6, borderRadius: 6, marginBottom: 4 }}>
                              <strong>Admin Resolution:</strong> {rep.resolutionNotes}
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(rep.createdAt).toLocaleString()} {rep.tripId ? `• Trip: ${rep.tripId}` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              7. PROFILE (Section 10)
             ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div style={{ ...card, maxWidth: 600 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 900 }}>Conductor Profile</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>Update your contact information and password</p>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>
                    New Password <span style={{ color: '#94a3b8' }}>(Leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password..."
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  style={{ padding: '12px 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start' }}
                >
                  {savingProfile ? 'Saving...' : 'Update Conductor Profile'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Passenger Booking Details Modal */}
      {selectedPassengerForModal && (
        <PassengerDetailsModal
          passenger={selectedPassengerForModal}
          trip={selectedTrip}
          onClose={() => setSelectedPassengerForModal(null)}
          onScanToBoard={(p) => {
            setSelectedPassengerForModal(null);
            setActiveTab('scan_board');
            setTicketQuery(p.ticketNumber);
            handleValidateTicket(p.ticketNumber);
          }}
        />
      )}
    </div>
  );
};

export default ConductorDashboard;
