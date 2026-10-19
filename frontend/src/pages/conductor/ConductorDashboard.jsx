import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { scheduleAPI, ticketAPI, conductorReportAPI, authAPI } from '../../utils/api';
import {
  FaBus,
  FaQrcode,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSearch,
  FaClipboardList,
  FaExclamationTriangle,
  FaUserCircle,
  FaSync,
  FaSignOutAlt,
  FaBars,
  FaTachometerAlt,
  FaPaperPlane,
  FaEye,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useTranslation } from '../../i18n';
import LanguageSelector from '../../components/LanguageSelector';
import CameraQRScanner from '../../components/CameraQRScanner';
import PassengerDetailsModal from '../../components/PassengerDetailsModal';
import NotificationPanel from '../../components/NotificationPanel';
import ThemeToggle from '../../components/ThemeToggle';

const ConductorDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));

  const [assignedTrips, setAssignedTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [manifest, setManifest] = useState([]);
  const [manifestStats, setManifestStats] = useState({ total: 0, verified: 0, pendingVerification: 0, boarded: 0, notBoarded: 0 });

  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const [ticketQuery, setTicketQuery] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [boardingSuccess, setBoardingSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPassengerForModal, setSelectedPassengerForModal] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const [manifestFilter, setManifestFilter] = useState('ALL');

  const [problemCategory, setProblemCategory] = useState('Passenger problem');
  const [problemDescription, setProblemDescription] = useState('');
  const [problemPassenger, setProblemPassenger] = useState('');
  const [problemTicket, setProblemTicket] = useState('');
  const [submittingProblem, setSubmittingProblem] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    newPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

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
      setManifest(data.manifest || data.passengers || []);
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
      toast.warning(t('conductor.scanOrEnterPrompt', 'Please scan a QR code or enter a ticket number'));
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
        toast.success(`✅ ${t('ticket.verified', 'Ticket verified for')} ${res.ticket.passengerName} (${t('booking.seat', 'Seat')} ${res.ticket.seatNumber})`);
      } else {
        setValidationResult(res.ticket || null);
        setValidationError(res.message || t('conductor.invalidForBoarding', 'Ticket is not valid for boarding'));
        if (res.status === 'NOT_VERIFIED_BY_AGENT') {
          toast.warning(`⚠️ ${t('conductor.requiresAgentVerification', 'Ticket requires counter verification by an Agent before boarding.')}`);
        } else {
          toast.error(res.message || t('conductor.validationFailed', 'Validation failed'));
        }
      }
    } catch (err) {
      setValidationError(err.message || t('conductor.invalidTicketOrQR', 'Invalid Ticket / Unrecognized QR Code'));
      toast.error(err.message || t('conductor.validationFailed', 'Validation failed'));
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmBoarding = async (ticket) => {
    if (!ticket) return;

    try {
      setActionLoading(true);
      setBoardingSuccess('');
      setValidationError('');
      await ticketAPI.conductorConfirmBoarding({ ticketId: ticket._id, ticketNumber: ticket.ticketNumber });
      setBoardingSuccess(`${t('conductor.boardingConfirmedFor', 'Boarding confirmed for')} ${ticket.passengerName} (${t('booking.seat', 'Seat')}: ${ticket.seatNumber})!`);
      setValidationResult(null);
      setTicketQuery('');
      if (selectedTrip) fetchTripManifest(selectedTrip._id);
      toast.success(t('conductor.paxBoardedSuccess', 'Passenger boarded successfully!'));
    } catch (err) {
      setValidationError(err.message || t('conductor.failedConfirmBoarding', 'Failed to confirm boarding'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitProblem = async (e) => {
    e.preventDefault();
    if (!problemDescription.trim()) {
      toast.warning(t('forms.required', 'Please enter problem details'));
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
      toast.success(t('conductor.problemFiledSuccess', 'Problem report filed to Company Admin successfully!'));
      setProblemDescription('');
      setProblemPassenger('');
      setProblemTicket('');
      fetchMyReports();
    } catch (err) {
      toast.error(err.message || t('conductor.problemFileFailed', 'Failed to file problem report'));
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
      toast.success(t('conductor.profileUpdatedSuccess', 'Conductor profile updated successfully!'));
      setProfileForm((prev) => ({ ...prev, newPassword: '' }));
    } catch (err) {
      toast.error(err.message || t('admin.profileUpdateFailed', 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success(t('auth.logoutSuccess', 'Logged out successfully'));
    navigate('/');
  };

  const filteredManifest = manifest.filter((p) => {
    if (manifestFilter === 'BOARDED') return p.boardingStatus === 'BOARDED';
    if (manifestFilter === 'NOT_BOARDED') return p.boardingStatus === 'NOT_BOARDED';
    if (manifestFilter === 'VERIFIED') return p.verificationStatus === 'VERIFIED';
    if (manifestFilter === 'INVALID') return p.verificationStatus !== 'VERIFIED';
    return true;
  });

  const companyName = user?.companyId?.companyName || 'Transport Fleet';

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: <FaTachometerAlt /> },
    { id: 'assigned_trips', label: t('conductor.assignedTrips', 'Assigned Trips'), icon: <FaBus /> },
    { id: 'passenger_list', label: t('conductor.passengerManifest', 'Passenger Manifest'), icon: <FaClipboardList /> },
    { id: 'scan_board', label: t('conductor.scanAndBoard', 'Scan & Board Passenger'), icon: <FaQrcode /> },
    { id: 'report_problem', label: t('conductor.reportProblem', 'Report Problem'), icon: <FaExclamationTriangle />, badge: myReports.filter((r) => r.status === 'OPEN').length },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-poppins relative overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[99] lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#3730a3] text-white flex flex-col justify-between fixed top-0 bottom-0 left-0 z-[100] shadow-[4px_0_24px_rgba(0,0,0,0.18)] overflow-y-auto overflow-x-hidden transition-all duration-250 ease-in-out ${
          sidebarOpen ? 'w-[260px] min-w-[260px] p-6 px-4' : 'w-0 min-w-0 p-0'
        }`}
      >
        {sidebarOpen && (
          <>
            <div>
              <div className="flex items-center gap-3 px-2 pb-6 border-b border-white/10 mb-5">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
                  <FaBus />
                </div>
                <div>
                  <div className="font-black text-[0.95rem] leading-tight">{t('conductor', 'Conductor')}</div>
                  <div className="text-[0.72rem] text-indigo-400 font-semibold">{companyName}</div>
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={`flex items-center gap-3.5 w-full px-4 py-3 rounded-xl border-none text-[0.9rem] font-semibold cursor-pointer text-left transition-all ${activeTab === item.id ? 'bg-white/20 text-white font-extrabold shadow-sm' : 'bg-transparent text-slate-300 hover:bg-white/[0.08] hover:text-white'}`}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[0.7rem] px-1.5 py-0.5 rounded-full font-extrabold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border-none bg-red-500/15 text-red-300 font-bold text-[0.85rem] cursor-pointer w-full mt-4 hover:bg-red-500/25 transition-colors"
            >
              <FaSignOutAlt /> {t('common.logout', 'Logout')}
            </button>
          </>
        )}
      </aside>

      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-[margin-left] duration-250 ease-in-out min-w-0 ${sidebarOpen ? 'lg:ml-[260px]' : 'ml-0'}`}>
        <header className="bg-white border-b border-slate-200 px-7 h-16 flex items-center justify-between sticky top-0 z-[90] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="bg-transparent border-none text-[1.2rem] cursor-pointer text-slate-500 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <FaBars />
            </button>
            <div className="bg-indigo-600/10 text-indigo-600 px-3.5 py-1 rounded-full text-[0.78rem] font-extrabold">
              🚌 {t('conductor.boardingOnboardCenter', 'Conductor Boarding & Onboard Center')}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LanguageSelector />
            <button
              onClick={() => {
                fetchAssignedTrips();
                if (selectedTrip) fetchTripManifest(selectedTrip._id);
                fetchMyReports();
              }}
              className="bg-indigo-600/10 text-indigo-600 border-none px-3.5 py-2 rounded-[10px] flex items-center gap-1.5 font-bold text-[0.82rem] cursor-pointer hover:bg-indigo-600/20 transition-colors"
            >
              <FaSync className={loadingTrips || loadingManifest ? 'animate-spin' : ''} /> {t('common.refresh', 'Refresh')}
            </button>
            <NotificationPanel role="conductor" />
            <div className="relative">
              <div
                onClick={() => setProfileDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl px-3 py-1.5 cursor-pointer transition"
                title={t('nav.profile', 'My Profile')}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0 overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : <FaUserCircle />}
                </div>
                <span className="font-bold text-[0.82rem] text-indigo-800 hidden sm:block max-w-[120px] truncate">
                  {(user?.name || '').replace(/\s*\([^)]*\)/g, '').replace(/\b(Passenger|Super Admin|Company Admin|Admin|Ticket Agent|Agent|Conductor|Staff)\b/gi, '').trim() || t('conductor', 'Conductor')}
                </span>
              </div>
              {profileDropdownOpen && (
                <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[1200] overflow-hidden" onMouseLeave={() => setProfileDropdownOpen(false)}>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                      {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : <FaUserCircle />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate">{user?.name || 'Conductor'}</p>
                      <p className="text-[10px] text-slate-400 m-0">{t('conductor', 'Bus Conductor')}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <FaUserCircle className="text-indigo-600" /> {t('common.editProfile', 'Edit Profile')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-7 flex flex-col gap-6 flex-1 overflow-y-auto">
          {assignedTrips.length > 0 && activeTab !== 'report_problem' && (
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200 flex items-center justify-between flex-wrap gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-[0.88rem] text-slate-500">{t('conductor.activeTrip', 'Active Trip:')}</span>
                <select
                  value={selectedTrip?._id || ''}
                  onChange={(e) => {
                    const found = assignedTrips.find((item) => item._id === e.target.value);
                    if (found) setSelectedTrip(found);
                  }}
                  className="px-3.5 py-2 rounded-[10px] border-[1.5px] border-slate-300 font-extrabold text-[0.9rem] text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {assignedTrips.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.tripId} • {t(item.route?.from, item.route?.from)} → {t(item.route?.to, item.route?.to)} ({item.date} @ {item.departureTime})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrip && (
                <div className="flex gap-3.5 text-[0.82rem] text-slate-600">
                  <span>{t('admin.bus', 'Bus:')} <strong>{selectedTrip.bus?.busNumber || '—'}</strong></span>
                  <span>{t('conductor.departure', 'Departure:')} <strong>{selectedTrip.departureTime}</strong></span>
                  <span>{t('conductor.date', 'Date:')} <strong>{selectedTrip.date}</strong></span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-5.5">
              {(() => {
                const totalSeats = selectedTrip?.bus?.totalSeats || selectedTrip?.bus?.capacity || (selectedTrip ? 45 : 0);
                const assignedSeats = manifestStats.total || 0;
                const boarded = manifestStats.boarded || 0;
                const remaining = manifestStats.notBoarded || Math.max(0, assignedSeats - boarded);
                const boardedPercent = assignedSeats > 0 ? Math.round((boarded / assignedSeats) * 100) : 0;
                const remainingPercent = assignedSeats > 0 ? Math.max(0, 100 - boardedPercent) : 0;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                      <div className="bg-white rounded-2xl p-5.5 border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                        <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-wider">
                          {t('conductor.totalSeats', 'Total Seats')}
                        </div>
                        <div className="text-[2.4rem] font-black text-slate-900 my-1 leading-none">
                          {totalSeats}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          {selectedTrip ? t('conductor.busCapacity', 'Bus Capacity') : t('conductor.noTripActive', 'No Trip Active')}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-5.5 border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                        <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-wider">
                          {t('conductor.assignedSeats', 'Assigned Seats')}
                        </div>
                        <div className="text-[2.4rem] font-black text-blue-600 my-1 leading-none">
                          {assignedSeats}
                        </div>
                        <div className="text-xs font-bold text-blue-600">
                          {t('conductor.passengersBooked', 'Passengers Booked')}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-5.5 border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                        <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-wider">
                          {t('conductor.boardedPassengers', 'Boarded Passengers')}
                        </div>
                        <div className="text-[2.4rem] font-black text-green-600 my-1 leading-none">
                          {boarded}
                        </div>
                        <div className="text-xs font-bold text-green-600">
                          {boardedPercent}% {t('conductor.completed', 'Completed')}
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-5.5 border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                        <div className="text-[0.72rem] font-extrabold text-slate-500 uppercase tracking-wider">
                          {t('conductor.remainingToBoard', 'Remaining to Board')}
                        </div>
                        <div className="text-[2.4rem] font-black text-orange-600 my-1 leading-none">
                          {remaining}
                        </div>
                        <div className="text-xs font-bold text-orange-600">
                          {remainingPercent}% {t('conductor.remaining', 'Remaining')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
                      <div className="bg-white rounded-[18px] p-6 border border-slate-200">
                        <h3 className="m-0 mb-4.5 text-base font-black text-slate-900">
                          {t('conductor.boardingProgress', 'Boarding Progress')}
                        </h3>

                        <div className="flex items-center justify-around gap-5">
                          <div className="relative w-[130px] h-[130px] shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-[1.25rem] font-black text-slate-900">{boardedPercent}%</span>
                              <span className="text-[0.68rem] font-bold text-slate-500">{t('booking.boarded', 'Boarded')}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 min-w-[130px]">
                            <div className="flex justify-between text-[0.84rem]">
                              <span className="text-slate-500 font-semibold">{t('booking.boarded', 'Boarded')}</span>
                              <strong className="text-slate-900 font-black">{boarded}</strong>
                            </div>
                            <div className="flex justify-between text-[0.84rem]">
                              <span className="text-slate-500 font-semibold">{t('conductor.remaining', 'Remaining')}</span>
                              <strong className="text-slate-900 font-black">{remaining}</strong>
                            </div>
                            <div className="flex justify-between text-[0.84rem] border-t border-slate-100 pt-2">
                              <span className="text-slate-500 font-semibold">{t('common.total', 'Total')}</span>
                              <strong className="text-slate-900 font-black">{assignedSeats}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-[18px] p-6 border border-slate-200">
                        <h3 className="m-0 mb-4.5 text-base font-black text-slate-900">
                          {t('conductor.boardingByStatus', 'Boarding by Status')}
                        </h3>

                        <div className="flex items-center justify-around gap-5">
                          <div className="relative w-[120px] h-[120px] shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
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

                          <div className="flex flex-col gap-2 min-w-[150px] text-[0.78rem]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-slate-500">{t('conductor.checkedIn', 'Checked-In')}</span>
                              </div>
                              <strong className="text-slate-900">{boarded} ({boardedPercent}%)</strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-slate-500">{t('conductor.notCheckedIn', 'Not Checked-In')}</span>
                              </div>
                              <strong className="text-slate-900">{remaining} ({remainingPercent}%)</strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span className="text-slate-500">{t('conductor.noShow', 'No Show')}</span>
                              </div>
                              <strong className="text-slate-900">0 (0%)</strong>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                <span className="text-slate-500">{t('booking.cancelled', 'Cancelled')}</span>
                              </div>
                              <strong className="text-slate-900">0 (0%)</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="bg-white rounded-[18px] p-6 border border-slate-200">
                <h3 className="m-0 mb-4 text-base font-black text-slate-900">
                  {t('conductor.quickActions', 'Quick Actions')}
                </h3>

                <div className="flex gap-3.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('scan_board')}
                    className="flex items-center gap-2 px-5.5 py-3 bg-indigo-600 text-white border-none rounded-[10px] font-extrabold text-[0.85rem] cursor-pointer shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-colors"
                  >
                    <FaQrcode /> {t('conductor.scanBoardPassenger', 'Scan / Board Passenger')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('passenger_list')}
                    className="flex items-center gap-2 px-5.5 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-[10px] font-extrabold text-[0.85rem] cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <FaClipboardList className="text-orange-600" /> {t('conductor.viewPassengerManifest', 'View Passenger Manifest')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assigned_trips' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="m-0 mb-4 text-[1.2rem] font-black text-slate-900">{t('conductor.allAssignedTrips', 'All Assigned Trips')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[0.88rem]">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200 text-left text-slate-600">
                      <th className="p-3">{t('conductor.tripId', 'Trip ID')}</th>
                      <th className="p-3">{t('conductor.date', 'Date')}</th>
                      <th className="p-3">{t('admin.bus', 'Bus')}</th>
                      <th className="p-3">{t('admin.route', 'Route')}</th>
                      <th className="p-3">{t('conductor.departure', 'Departure')}</th>
                      <th className="p-3">{t('booking.bookedSeats', 'Booked Seats')}</th>
                      <th className="p-3">{t('common.actions', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTrips.map((tr) => (
                      <tr key={tr._id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-extrabold text-indigo-600">{tr.tripId}</td>
                        <td className="p-3 font-semibold text-slate-800">{tr.date}</td>
                        <td className="p-3 text-slate-700">{tr.bus?.busNumber || '—'}</td>
                        <td className="p-3 text-slate-700">{t(tr.route?.from, tr.route?.from)} → {t(tr.route?.to, tr.route?.to)}</td>
                        <td className="p-3 font-bold text-slate-900">{tr.departureTime}</td>
                        <td className="p-3 text-slate-800"><strong>{(tr.bookedSeats || []).length}</strong> {t('passenger.passengers', 'passengers')}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setSelectedTrip(tr);
                              setActiveTab('passenger_list');
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white border-none rounded-md text-[0.78rem] font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
                          >
                            {t('conductor.openManifest', 'Open Manifest')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'passenger_list' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2.5">
                <div>
                  <h3 className="m-0 mb-1 text-[1.2rem] font-black text-slate-900">
                    {t('conductor.passengerManifest', 'Passenger Manifest')} ({selectedTrip?.tripId || t('conductor.selectedTrip', 'Selected Trip')})
                  </h3>
                  <p className="m-0 text-slate-500 text-[0.82rem]">
                    {t(selectedTrip?.route?.from, selectedTrip?.route?.from)} → {t(selectedTrip?.route?.to, selectedTrip?.route?.to)} {t('conductor.on', 'on')} {selectedTrip?.date} ({selectedTrip?.departureTime})
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <select
                    value={manifestFilter}
                    onChange={(e) => setManifestFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border-[1.5px] border-slate-300 text-[0.85rem] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">{t('common.allPassengers', 'All Passengers')} ({manifest.length})</option>
                    <option value="BOARDED">{t('booking.boarded', 'Boarded')} ({manifestStats.boarded})</option>
                    <option value="NOT_BOARDED">{t('booking.notBoarded', 'Not Boarded')} ({manifestStats.notBoarded})</option>
                    <option value="VERIFIED">{t('conductor.agentVerified', 'Agent Verified')} ({manifestStats.verified})</option>
                    <option value="INVALID">{t('conductor.agentPendingInvalid', 'Agent Pending / Invalid')} ({manifestStats.pendingVerification})</option>
                  </select>
                </div>
              </div>

              {loadingManifest ? (
                <div className="text-center py-7.5 text-slate-400">{t('conductor.loadingManifest', 'Loading manifest...')}</div>
              ) : filteredManifest.length === 0 ? (
                <div className="text-center py-7.5 text-slate-400">{t('conductor.noPaxFilter', 'No passengers matching the filter.')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[0.88rem]">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200 text-left text-slate-600">
                        <th className="p-2.5">{t('booking.seat', 'Seat')}</th>
                        <th className="p-2.5">{t('forms.fullName', 'Passenger Name')}</th>
                        <th className="p-2.5">{t('conductor.contact', 'Contact')}</th>
                        <th className="p-2.5">{t('ticket.ticketNumber', 'Ticket No')}</th>
                        <th className="p-2.5">{t('agent.agentVerification', 'Agent Verification')}</th>
                        <th className="p-2.5">{t('booking.boardingStatus', 'Boarding Status')}</th>
                        <th className="p-2.5">{t('conductor.bookingDetailsBoarding', 'Booking Details & Boarding')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredManifest.map((p) => {
                        const isVerified = p.verificationStatus === 'VERIFIED';
                        const isBoarded = p.boardingStatus === 'BOARDED';
                        return (
                          <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="p-2.5 font-black text-indigo-600 text-base">{p.seatNumber}</td>
                            <td className="p-2.5 font-bold text-slate-900">{p.passengerName}</td>
                            <td className="p-2.5 text-slate-500 text-[0.82rem]">{p.passengerPhone || p.user?.phone || '0911223344'}</td>
                            <td className="p-2.5 font-mono text-[0.82rem] font-bold text-slate-700">{p.ticketNumber}</td>
                            <td className="p-2.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold ${
                                  isVerified ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                }`}
                              >
                                {isVerified ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                {t(p.verificationStatus || 'PENDING', p.verificationStatus || 'PENDING')}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.72rem] font-extrabold ${
                                  isBoarded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {isBoarded ? <FaCheckCircle /> : <FaClock />}
                                {t(p.boardingStatus, p.boardingStatus)}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPassengerForModal(p)}
                                  className="px-2.5 py-1 bg-slate-50 border-[1.5px] border-slate-300 rounded-lg text-[0.75rem] font-bold text-slate-700 cursor-pointer flex items-center gap-1 hover:bg-slate-100 transition-colors"
                                >
                                  <FaEye /> {t('common.details', 'Details')}
                                </button>
                                {!isBoarded && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('scan_board');
                                      setTicketQuery(p.ticketNumber);
                                      handleValidateTicket(p.ticketNumber);
                                    }}
                                    className={`px-3 py-1 text-white border-none rounded-lg text-[0.75rem] font-extrabold cursor-pointer flex items-center gap-1 transition-colors ${
                                      isVerified ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-500 hover:bg-slate-600'
                                    }`}
                                  >
                                    <FaQrcode /> {t('conductor.scanToBoard', 'Scan to Board')}
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

          {(activeTab === 'scan_board' || activeTab === 'verify_ticket' || activeTab === 'confirm_boarding') && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#1e1b4b] text-white rounded-2xl p-4 px-5 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <div className="text-[0.72rem] uppercase tracking-wider text-indigo-300 font-bold">
                    {t('conductor.activeBoardingTrip', 'Active Boarding Trip')}
                  </div>
                  <div className="text-[1.1rem] font-black flex items-center gap-2">
                    <FaBus className="text-sky-400" /> {selectedTrip?.tripId || t('conductor.trip', 'Trip')} — {t(selectedTrip?.route?.from, selectedTrip?.route?.from)} → {t(selectedTrip?.route?.to, selectedTrip?.route?.to)}
                  </div>
                </div>
                <div className="flex gap-4 text-[0.82rem]">
                  <div><strong>{t('conductor.date', 'Date:')}</strong> {selectedTrip?.date}</div>
                  <div><strong>{t('conductor.departure', 'Departure:')}</strong> {selectedTrip?.departureTime}</div>
                  <div><strong>{t('admin.bus', 'Bus:')}</strong> {selectedTrip?.bus?.busNumber}</div>
                  <div><strong>{t('conductor.boarded', 'Boarded:')}</strong> <span className="text-emerald-400 font-extrabold">{manifestStats.boarded} / {manifestStats.total}</span></div>
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-5.5 px-7 border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center gap-3.5 flex-wrap">
                <div className="flex-1 min-w-[260px] relative flex items-center">
                  <FaSearch className="absolute left-4 text-slate-400 text-base pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t('conductor.ticketPlaceholder', 'Scan QR or enter ticket number...')}
                    value={ticketQuery}
                    onChange={(e) => setTicketQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleValidateTicket(); }}
                    className="w-full py-3.5 pr-4.5 pl-11 rounded-[14px] border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 bg-white focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleValidateTicket()}
                  disabled={validating}
                  className="px-7 py-3.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none rounded-[14px] font-extrabold text-[0.95rem] cursor-pointer inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(79,70,229,0.3)] whitespace-nowrap hover:opacity-95 transition-opacity disabled:opacity-70"
                >
                  <FaCheckCircle className="text-base" /> {t('conductor.validate', 'Validate')}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCameraModal(prev => !prev)}
                  className={`px-6 py-3.5 border-[1.5px] border-indigo-500 rounded-[14px] font-extrabold text-[0.95rem] cursor-pointer inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                    showCameraModal ? 'bg-indigo-600 text-white' : 'bg-purple-50 text-indigo-600 hover:bg-purple-100'
                  }`}
                >
                  <FaQrcode className="text-[1.1rem]" /> {showCameraModal ? t('conductor.closeScanner', 'Close Scanner') : t('conductor.scan', 'Scan')}
                </button>
              </div>

              {showCameraModal && (
                <div className="max-w-[420px] mx-auto">
                  <CameraQRScanner
                    onScan={(scannedCode) => handleValidateTicket(scannedCode)}
                    onClose={() => setShowCameraModal(false)}
                    isScanning={validating}
                    activeSchedule={selectedTrip}
                  />
                </div>
              )}

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  {validating && (
                    <div className="bg-white rounded-2xl border border-slate-200 text-center p-10 px-5 text-slate-500 shadow-sm">
                      <div className="w-11 h-11 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                      <div className="font-extrabold text-base text-slate-900">{t('conductor.verifyingTicket', 'Verifying Passenger Ticket & Agent Status...')}</div>
                      <div className="text-[0.8rem] mt-1">{t('conductor.verifyingDetailsSub', 'Checking company database, trip assignment, and agent validation')}</div>
                    </div>
                  )}

                  {!validating && validationResult && validationResult.verificationStatus === 'VERIFIED' && (
                    <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-500 p-6 shadow-[0_10px_25px_rgba(16,185,129,0.1)]">
                      <div className="flex items-center gap-2.5 text-green-600 font-black text-[1.15rem] mb-3.5">
                        <FaCheckCircle className="text-[1.4rem]" /> {t('conductor.agentVerifiedReady', 'TICKET AGENT VERIFIED — READY FOR BOARDING')}
                      </div>

                      <div className="bg-white rounded-[14px] p-4.5 border border-emerald-200 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <div className="text-[0.72rem] text-slate-500 font-bold">{t('passenger.passenger', 'Passenger')}</div>
                            <div className="font-extrabold text-slate-900 text-base">{validationResult.passengerName}</div>
                            <div className="text-xs text-slate-500">{validationResult.passengerPhone || '0911223344'}</div>
                          </div>

                          <div>
                            <div className="text-[0.72rem] text-slate-500 font-bold">{t('booking.seats', 'Seat Number')}</div>
                            <div className="font-black text-indigo-600 text-[1.4rem]">{validationResult.seatNumber}</div>
                          </div>

                          <div>
                            <div className="text-[0.72rem] text-slate-500 font-bold">{t('ticket.ticketNumber', 'Ticket No')}</div>
                            <div className="font-mono font-extrabold text-slate-900">{validationResult.ticketNumber}</div>
                          </div>

                          <div>
                            <div className="text-[0.72rem] text-slate-500 font-bold">{t('ticket.fareStatus', 'Fare & Payment')}</div>
                            <div className="font-extrabold text-green-600">ETB {validationResult.price || selectedTrip?.price || 950} ({t('payment.paid', 'PAID')})</div>
                          </div>

                          <div>
                            <div className="text-[0.72rem] text-slate-500 font-bold">{t('agent.agentVerification', 'Counter Verification')}</div>
                            <div className="font-extrabold text-green-600 flex items-center gap-1">
                              <FaCheckCircle /> {t('agent.verifiedBy', 'Verified by')} {validationResult.verifiedBy?.name || (typeof validationResult.verifiedBy === 'string' ? validationResult.verifiedBy : null) || t('ticket agent', 'Ticket Agent')}
                            </div>
                          </div>

                          <div>
                            <div className="text-[0.72rem] text-slate-500 font-bold">{t('admin.route', 'Bus Route')}</div>
                            <div className="font-bold text-slate-700">{validationResult.route || `${selectedTrip?.route?.from} → ${selectedTrip?.route?.to}`}</div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfirmBoarding(validationResult)}
                        disabled={actionLoading}
                        className="w-full p-4 bg-green-600 text-white border-none rounded-[14px] font-black text-[1.05rem] cursor-pointer flex items-center justify-center gap-2.5 shadow-[0_6px_16px_rgba(22,163,74,0.35)] hover:bg-green-700 transition-colors disabled:opacity-75"
                      >
                        <FaCheckCircle className="text-[1.2rem]" />
                        {actionLoading ? t('conductor.recordingBoarding', 'Recording Boarding...') : `${t('conductor.confirmBoardingForSeat', 'Confirm Boarding for Seat')} ${validationResult.seatNumber}`}
                      </button>
                    </div>
                  )}

                  {!validating && validationResult && validationResult.verificationStatus !== 'VERIFIED' && (
                    <div className="bg-amber-50 rounded-2xl border-2 border-amber-500 p-6 shadow-[0_10px_25px_rgba(245,158,11,0.12)]">
                      <div className="flex items-center gap-2.5 text-amber-600 font-black text-[1.1rem] mb-2.5">
                        <FaExclamationTriangle className="text-[1.3rem]" /> {t('conductor.notAllowedNotVerified', 'BOARDING NOT ALLOWED — NOT VERIFIED BY AGENT')}
                      </div>
                      <p className="text-amber-900 text-[0.85rem] m-0 mb-3.5 leading-relaxed">
                        {t('conductor.notVerifiedNotice', "This passenger's ticket is paid, but has NOT been verified by a counter Ticket Agent. Conductor cannot confirm boarding until the passenger validates their ticket at the station counter.")}
                      </p>

                      <div className="bg-white rounded-[14px] p-4 border border-amber-200 mb-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[0.85rem]">
                          <div><strong>{t('passenger.passenger', 'Passenger:')}</strong> {validationResult.passengerName}</div>
                          <div><strong>{t('booking.seat', 'Seat:')}</strong> <span className="text-amber-600 font-black">{validationResult.seatNumber}</span></div>
                          <div><strong>{t('ticket.ticketNumber', 'Ticket No:')}</strong> {validationResult.ticketNumber}</div>
                          <div><strong>{t('common.status', 'Status:')}</strong> <span className="text-amber-600 font-extrabold">{t('conductor.pendingAgentVerification', 'PENDING AGENT VERIFICATION')}</span></div>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-100 rounded-[10px] text-[0.8rem] text-amber-900 font-bold text-center">
                        {t('conductor.directToCounter', 'Please direct passenger to the ticket counter for Agent ID & ticket verification.')}
                      </div>
                    </div>
                  )}

                  {!validating && validationError && (!validationResult || validationResult.verificationStatus === 'VERIFIED') && (
                    <div className="bg-red-50 rounded-2xl border-2 border-red-500 p-6">
                      <div className="flex items-center gap-2.5 text-red-600 font-black text-[1.05rem] mb-1.5">
                        <FaTimesCircle className="text-[1.3rem]" /> {t('conductor.rejectedInvalid', 'BOARDING REJECTED / INVALID TICKET')}
                      </div>
                      <div className="text-[0.88rem] text-red-800">{validationError}</div>
                    </div>
                  )}

                  {boardingSuccess && (
                    <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-500 text-center p-6">
                      <div className="w-[52px] h-[52px] rounded-full bg-emerald-100 text-green-600 flex items-center justify-center mx-auto mb-3 text-[1.6rem]">
                        <FaCheckCircle />
                      </div>
                      <div className="font-black text-[1.1rem] text-emerald-900 mb-1.5">
                        {t('conductor.paxBoardedSuccess', 'Passenger Boarded Successfully!')}
                      </div>
                      <div className="text-[0.85rem] text-emerald-700 mb-4">
                        {boardingSuccess}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBoardingSuccess('');
                          setValidationResult(null);
                          setTicketQuery('');
                        }}
                        className="px-5 py-2.5 bg-indigo-600 text-white border-none rounded-[10px] font-extrabold cursor-pointer hover:bg-indigo-700 transition-colors"
                      >
                        {t('conductor.scanNextPax', 'Scan Next Passenger')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report_problem' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="m-0 mb-1.5 text-[1.2rem] font-black text-slate-900">
                  ⚠️ {t('conductor.reportProblemTitle', 'Report Passenger / Ticket Problem')}
                </h3>
                <p className="text-slate-500 text-[0.82rem] mb-5">
                  {t('conductor.reportProblemSub', 'Directly report seat mismatches, duplicate tickets, or passenger incidents to Company Admin')}
                </p>

                <form onSubmit={handleSubmitProblem} className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">{t('conductor.categoryTrip', 'Problem Category *')}</label>
                    <select
                      value={problemCategory}
                      onChange={(e) => setProblemCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-slate-300 text-[0.9rem] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Passenger problem">{t('conductor.paxProblem', 'Passenger problem')}</option>
                      <option value="Ticket problem">{t('conductor.ticketProblem', 'Ticket problem')}</option>
                      <option value="Payment problem">{t('conductor.paymentProblem', 'Payment problem')}</option>
                      <option value="Seat mismatch">{t('conductor.seatMismatch', 'Seat mismatch')}</option>
                      <option value="Passenger information mismatch">{t('conductor.paxInfoMismatch', 'Passenger information mismatch')}</option>
                      <option value="Invalid ticket">{t('conductor.invalidTicket', 'Invalid ticket')}</option>
                      <option value="Duplicate boarding">{t('conductor.duplicateBoarding', 'Duplicate boarding')}</option>
                      <option value="Wrong trip">{t('conductor.wrongTrip', 'Wrong trip')}</option>
                      <option value="Other issue">{t('conductor.otherIssue', 'Other issue')}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">{t('conductor.passengerNameOpt', 'Passenger Name (Optional)')}</label>
                      <input
                        type="text"
                        placeholder=""
                        value={problemPassenger}
                        onChange={(e) => setProblemPassenger(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-[1.5px] border-slate-300 text-[0.85rem] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">{t('conductor.ticketNumberOpt', 'Ticket Number (Optional)')}</label>
                      <input
                        type="text"
                        placeholder=""
                        value={problemTicket}
                        onChange={(e) => setProblemTicket(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-[1.5px] border-slate-300 text-[0.85rem] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">{t('conductor.descriptionDetails', 'Description & Details *')}</label>
                    <textarea
                      rows={4}
                      required
                      placeholder=""
                      value={problemDescription}
                      onChange={(e) => setProblemDescription(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-slate-300 text-[0.85rem] focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingProblem}
                    className="py-3 px-5 bg-red-600 text-white border-none rounded-[10px] font-extrabold cursor-pointer flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-75"
                  >
                    <FaPaperPlane /> {submittingProblem ? t('common.submitting', 'Submitting...') : t('conductor.submitReportToAdmin', 'Submit Report to Company Admin')}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="m-0 mb-4 text-[1.2rem] font-black text-slate-900">
                  📋 {t('conductor.mySubmittedReports', 'My Submitted Problem Reports')}
                </h3>

                {loadingReports ? (
                  <div className="text-center py-7.5 text-slate-400">{t('conductor.loadingReports', 'Loading reports...')}</div>
                ) : myReports.length === 0 ? (
                  <div className="text-center py-7.5 text-slate-400">
                    {t('conductor.noReportsFiled', 'No problem reports filed yet.')}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
                    {myReports.map((rep) => {
                      const isOpen = rep.status === 'OPEN';
                      const isResolved = rep.status === 'RESOLVED' || rep.status === 'CLOSED';
                      return (
                        <div key={rep._id} className="p-3.5 rounded-[10px] border border-slate-200 bg-slate-50">
                          <div className="flex justify-between mb-1">
                            <span className="font-extrabold text-red-600 text-[0.88rem]">{t(rep.category, rep.category)}</span>
                            <span
                              className={`text-[0.72rem] font-extrabold px-2 py-0.5 rounded-full ${
                                isOpen ? 'bg-red-100 text-red-600' : isResolved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                              }`}
                            >
                              {t(rep.status, rep.status)}
                            </span>
                          </div>
                          <div className="text-[0.82rem] text-slate-700 mb-1.5">{rep.description}</div>
                          {rep.resolutionNotes && (
                            <div className="text-[0.78rem] text-green-600 bg-green-50 p-1.5 rounded-md mb-1">
                              <strong>{t('conductor.adminResolution', 'Admin Resolution:')}</strong> {rep.resolutionNotes}
                            </div>
                          )}
                          <div className="text-[0.72rem] text-slate-400">
                            {new Date(rep.createdAt).toLocaleString()} {rep.tripId ? `• ${t('conductor.trip', 'Trip:')} ${rep.tripId}` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-[600px]">
              <h3 className="m-0 mb-1.5 text-[1.2rem] font-black text-slate-900">{t('conductor.conductorProfile', 'Conductor Profile')}</h3>
              <p className="text-slate-500 text-[0.85rem] mb-5">{t('conductor.updateContactPassword', 'Update your contact information and password')}</p>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">{t('forms.fullName', 'Full Name')}</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">{t('forms.phone', 'Phone Number')}</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    maxLength={10}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    onKeyDown={e => {
                      if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[0.8rem] font-bold mb-1 text-slate-700">
                    {t('auth.newPassword', 'New Password')} <span className="text-slate-400 font-normal">({t('conductor.leaveBlankKeepCurrent', 'Leave blank to keep current')})</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="py-3 px-5 bg-indigo-600 text-white border-none rounded-lg font-extrabold cursor-pointer self-start hover:bg-indigo-700 transition-colors disabled:opacity-75"
                >
                  {savingProfile ? t('common.saving', 'Saving...') : t('conductor.updateProfileBtn', 'Update Conductor Profile')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

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
