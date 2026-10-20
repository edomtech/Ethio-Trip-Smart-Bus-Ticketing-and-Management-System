import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  companyAPI, auditAPI, authAPI, platformSettingAPI, supportAPI, notificationAPI, reportAPI
} from '../../utils/api';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { useTranslation } from '../../i18n';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationPanel from '../../components/NotificationPanel';
import ThemeToggle from '../../components/ThemeToggle';
import { useNotification } from '../../contexts/NotificationContext';
import { MESSAGES, PASSWORD_MIN_LENGTH } from '../../constants/messages';
import {
  FaBuilding, FaPlus, FaCog, FaHistory, FaShieldAlt, FaSignOutAlt,
  FaSearch, FaEdit, FaEye, FaPrint, FaDownload, FaCheckCircle,
  FaTimesCircle, FaMobileAlt, FaCreditCard, FaUpload, FaBars,
  FaTimes, FaLock, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaIdCard, FaFileInvoice, FaSyncAlt, FaCrown, FaChartLine, FaHeadset, FaPaperPlane, FaQuestionCircle
} from 'react-icons/fa';

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const SuperAdminDashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const notify = useNotification();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [platformSettings, setPlatformSettings] = useState({
    systemName: 'Ethio Trip - Smart Bus Ticketing System',
    supportEmail: 'support@ethiotrip.et',
    supportPhone: '+251 911 002 233',
    systemAddress: 'Addis Ababa, Ethiopia',
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 60,
  });
  const [platformReports, setPlatformReports] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('all');
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [selectedAuditLogDetails, setSelectedAuditLogDetails] = useState(null);
  const [supportInquiries, setSupportInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const initialCompanyForm = {
    companyName: '',
    licenseNumber: '',
    registrationNumber: '',
    tinNumber: '',
    phone: '',
    email: '',
    address: '',
    city: 'Addis Ababa',
    description: '',
    logo: '',
    status: 'active',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    telebirrEnabled: true,
    telebirrNumber: '0911002233',
    cbeEnabled: true,
    cbeAccountNumber: '1000123456789',
    chapaEnabled: false,
    chapaKey: '',
  };
  const [companyForm, setCompanyForm] = useState(initialCompanyForm);

  const formatAdminName = (rawName) => {
    if (!rawName) return 'Platform Admin';
    const clean = String(rawName)
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\bSuper\s*Admin\b/gi, 'Platform Admin')
      .replace(/^Ethio\s*Trip\s*Platform\s*Admin$/i, 'Platform Admin')
      .trim();
    return clean || 'Platform Admin';
  };

  const [profileForm, setProfileForm] = useState({
    name: formatAdminName(user?.name),
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [currentDateTime, setCurrentDateTime] = useState({
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDateTime({
        date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, auditRes, settingsRes, supportRes, repRes] = await Promise.all([
        companyAPI.getAllCompanies().catch(() => ({ companies: [] })),
        auditAPI.getLogs().catch(() => ({ logs: [] })),
        platformSettingAPI.getSettings().catch(() => ({ settings: null })),
        supportAPI.getAll().catch(() => []),
        reportAPI.getOverview().catch(() => null),
      ]);

      const compList = Array.isArray(compRes) ? compRes : compRes?.companies || [];
      setCompanies(compList);

      const logsList = Array.isArray(auditRes) ? auditRes : auditRes?.logs || [];
      setAuditLogs(logsList);

      setSupportInquiries(Array.isArray(supportRes) ? supportRes : supportRes?.tickets || []);

      if (settingsRes?.settings) {
        setPlatformSettings(prev => ({ ...prev, ...settingsRes.settings }));
      }

      if (repRes) {
        setPlatformReports(repRes);
      }
    } catch (err) {
      notify.notifyError(err, MESSAGES.reports.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogoUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const url = await uploadToCloudinary(file);
      if (isEdit) {
        setEditingCompany(prev => ({ ...prev, logo: url }));
      } else {
        setCompanyForm(prev => ({ ...prev, logo: url }));
      }
    } catch (err) {
      notify.notifyError(err, MESSAGES.upload.failed);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProfileImage(true);
      const url = await uploadToCloudinary(file);
      setProfileForm(prev => ({ ...prev, avatar: url }));
    } catch (err) {
      notify.notifyError(err, MESSAGES.profile.avatarFailed);
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleRegisterCompany = async (e) => {
    e.preventDefault();

    if (!companyForm.companyName.trim() || !companyForm.licenseNumber.trim() || !companyForm.tinNumber.trim() || !companyForm.email.trim()) {
      notify.warning(MESSAGES.company.detailsRequired);
      return;
    }
    if (!companyForm.adminName.trim() || !companyForm.adminEmail.trim() || !companyForm.adminPassword) {
      notify.warning(MESSAGES.company.adminRequired);
      return;
    }
    if (companyForm.adminPassword.length < PASSWORD_MIN_LENGTH) {
      notify.warning({
        title: 'Password Too Short',
        description: `Company Admin password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      });
      return;
    }

    const isTelebirr = !!companyForm.telebirrEnabled;
    const isCBE = !!companyForm.cbeEnabled;
    const isChapa = !!companyForm.chapaEnabled;

    try {
      const payload = {
        companyName: companyForm.companyName.trim(),
        licenseNumber: companyForm.licenseNumber.trim(),
        registrationNumber: companyForm.registrationNumber.trim() || companyForm.licenseNumber.trim(),
        tinNumber: companyForm.tinNumber.trim(),
        phone: companyForm.phone.trim(),
        email: companyForm.email.toLowerCase().trim(),
        address: companyForm.address.trim(),
        city: companyForm.city || 'Addis Ababa',
        description: companyForm.description.trim(),
        logo: companyForm.logo || '',
        status: companyForm.status || 'active',
        adminName: companyForm.adminName.trim(),
        adminEmail: companyForm.adminEmail.toLowerCase().trim(),
        adminPhone: companyForm.adminPhone.trim() || companyForm.phone.trim(),
        adminPassword: companyForm.adminPassword,
        paymentMethods: {
          telebirr: {
            enabled: isTelebirr,
            accountNumber: isTelebirr ? (companyForm.telebirrNumber.trim() || companyForm.phone.trim()) : '',
          },
          cbe: {
            enabled: isCBE,
            accountNumber: isCBE ? (companyForm.cbeAccountNumber.trim() || '1000123456789') : '',
          },
          chapa: {
            enabled: isChapa,
            accountNumber: isChapa ? (companyForm.chapaKey.trim() || 'CHAPA-ET-2026-LIVE') : '',
          },
        },
        payment: {
          provider: 'CHAPA',
          enabled: isChapa,
          mode: 'LIVE',
          splitType: 'percentage',
          splitValue: 90,
        },
      };

      await companyAPI.registerCompany(payload);
      setCompanyForm(initialCompanyForm);
      setActiveTab('companies');
      fetchData();
    } catch (err) {
      notify.notifyError(err, MESSAGES.company.registrationFailed);
    }
  };

  const handleToggleCompanyStatus = async (company) => {
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    const isSuspending = newStatus === 'suspended';

    const confirmed = await notify.confirm({
      title: isSuspending ? 'Suspend Company?' : 'Reactivate Company?',
      message: isSuspending
        ? `Are you sure you want to suspend "${company.companyName}"?`
        : `Reactivate "${company.companyName}" on the Ethio Trip platform?`,
      description: isSuspending
        ? 'All of their scheduled trips will be paused and passengers will no longer be able to book with them.'
        : 'The company will be able to publish and sell tickets again immediately.',
      confirmLabel: isSuspending ? 'Suspend' : 'Reactivate',
      cancelLabel: 'Cancel',
      variant: isSuspending ? 'danger' : 'default',
    });
    if (!confirmed) return;

    try {
      await companyAPI.updateCompanyStatus(
        company._id || company.id,
        newStatus,
        `Status changed to ${newStatus} by Platform Admin`
      );
      setCompanies((prev) =>
        prev.map((c) => (c._id === (company._id || company.id) ? { ...c, status: newStatus } : c))
      );
      fetchData();
    } catch (err) {
      notify.notifyError(err, MESSAGES.company.statusFailed);
    }
  };

  const handleApproveCompany = async (company) => {
    try {
      await companyAPI.updateCompanyStatus(company._id || company.id, 'active', 'Platform Admin Approved');
      notify.success(`🎉 Approved "${company.companyName}"! The company admin has been notified by email.`);
      fetchData();
    } catch (err) {
      notify.error(err.message || 'Failed to approve company');
    }
  };

  const handleRejectCompany = async (company) => {
    const reason = window.prompt(`Enter rejection reason for "${company.companyName}":`, 'Registration information requires further verification.');
    if (reason === null) return;

    try {
      await companyAPI.updateCompanyStatus(company._id || company.id, 'rejected', reason);
      notify.success(`Company "${company.companyName}" rejected. The company admin has been notified by email.`);
      fetchData();
    } catch (err) {
      notify.error(err.message || 'Failed to reject company');
    }
  };

  const handleSaveCompanyEdit = async (e) => {
    e.preventDefault();
    if (!editingCompany) return;

    try {
      const isTelebirr = editingCompany.paymentMethodSelection === 'telebirr' || editingCompany.paymentMethodSelection === 'both';
      const isCBE = editingCompany.paymentMethodSelection === 'cbe' || editingCompany.paymentMethodSelection === 'both';

      const payload = {
        companyName: editingCompany.companyName,
        licenseNumber: editingCompany.licenseNumber,
        registrationNumber: editingCompany.registrationNumber,
        tinNumber: editingCompany.tinNumber,
        phone: editingCompany.phone,
        email: editingCompany.email,
        address: editingCompany.address,
        city: editingCompany.city,
        description: editingCompany.description,
        logo: editingCompany.logo,
        paymentMethods: {
          telebirr: {
            enabled: isTelebirr,
            accountNumber: isTelebirr ? editingCompany.telebirrNumber : '',
          },
          cbe: {
            enabled: isCBE,
            accountNumber: isCBE ? editingCompany.cbeAccountNumber : '',
          },
          chapa: editingCompany.paymentMethods?.chapa || { enabled: false, apiKey: '' },
        },
      };

      await companyAPI.updateCompany(editingCompany._id || editingCompany.id, payload);
      setEditingCompany(null);
      fetchData();
    } catch (err) {
      notify.notifyError(err, MESSAGES.common.operationFailed);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      notify.warning(MESSAGES.profile.passwordsDontMatch);
      return;
    }
    if (profileForm.newPassword && profileForm.newPassword.length < PASSWORD_MIN_LENGTH) {
      notify.warning(MESSAGES.profile.passwordTooShort);
      return;
    }

    try {
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileForm.avatar,
      };
      if (profileForm.newPassword) {
        payload.password = profileForm.newPassword;
      }

      await authAPI.updateProfile(payload);
      if (updateUser) updateUser(payload);
      setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      notify.notifyError(err, MESSAGES.profile.updateFailed);
    }
  };

  const handleSavePlatformSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingSettings(true);
      await platformSettingAPI.updateSettings(platformSettings);
      notify.success(t('platform settings saved successfully', 'Platform settings saved and applied successfully!'));
      fetchData();
    } catch (err) {
      notify.notifyError(err, MESSAGES.settings?.saveFailed || 'Failed to save platform settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchStatus =
        companyStatusFilter === 'all' ||
        (c.status || 'active').toLowerCase() === companyStatusFilter.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        c.companyName?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.licenseNumber?.toLowerCase().includes(q) ||
        c.tinNumber?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [companies, companyStatusFilter, searchQuery]);

  const totalCompaniesCount = companies.length;
  const activeCompaniesCount = companies.filter(c => (c.status || 'active').toLowerCase() === 'active').length;
  const suspendedCompaniesCount = companies.filter(c => (c.status || '').toLowerCase() === 'suspended').length;

  const paymentStats = useMemo(() => {
    let allThreeCount = 0;
    let telebirrCount = 0;
    let cbeCount = 0;
    let chapaCount = 0;

    companies.forEach(c => {
      const t = c.paymentMethods?.telebirr?.enabled ?? true;
      const b = c.paymentMethods?.cbe?.enabled ?? true;
      const ch = c.paymentMethods?.chapa?.enabled ?? (c.payment?.enabled ?? true);
      if (t && b && ch) allThreeCount++;
      if (t) telebirrCount++;
      if (b) cbeCount++;
      if (ch) chapaCount++;
    });

    return { allThreeCount, telebirrCount, cbeCount, chapaCount };
  }, [companies]);

  const regionalBreakdown = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      const city = c.city || 'Addis Ababa';
      map[city] = (map[city] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [companies]);

  const pendingCompaniesCount = companies.filter(c => (c.status || '').toLowerCase() === 'pending').length;

  const sidebarItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: <FaChartLine /> },
    { section: t('bus companies', 'BUS COMPANIES') },
    { id: 'company_approvals', label: 'Company Approvals', icon: <FaCheckCircle />, badge: pendingCompaniesCount },
    { id: 'companies', label: t('registered companies', 'Registered Companies'), icon: <FaBuilding /> },
    { id: 'register_company', label: t('register bus company', 'Register Bus Company'), icon: <FaPlus /> },
    { section: t('platform governance', 'PLATFORM GOVERNANCE') },
    { id: 'platform_settings', label: t('platform settings', 'Platform Settings'), icon: <FaCog /> },
    { id: 'reports', label: t('platform reports', 'Platform Reports'), icon: <FaFileInvoice /> },
    { id: 'question_desk', label: 'Question Desk & Inquiries', icon: <FaHeadset /> },
    { id: 'audit_logs', label: t('audit log & history', 'Audit Log & History'), icon: <FaHistory /> },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-[265px] min-w-[265px] bg-[#0b1329] text-slate-400
        flex flex-col border-r border-white/5 h-screen overflow-y-auto
        transition-transform duration-300 ease-in-out select-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col flex-1 min-h-0 p-4">
          {}
          <div className="flex items-center gap-3 pb-6 border-b border-white/[0.07] mb-2">
            <div className="w-[42px] h-[42px] bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shrink-0 shadow-[0_4px_14px_rgba(29,107,243,0.35)]">
              <FaCrown />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="m-0 text-[0.98rem] font-extrabold text-white tracking-tight truncate">Ethio Trip</h2>
              <p className="m-0 text-[0.7rem] text-blue-400 font-medium">Platform Admin Portal</p>
            </div>
          </div>

          {}
          <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto py-2 pr-1 -mr-1">
            {sidebarItems.map((item, idx) => {
              if (item.section) {
                return (
                  <div key={idx} className="text-slate-500 text-[0.68rem] font-bold tracking-[1.2px] uppercase px-2 mt-5 mb-1.5">
                    {item.section}
                  </div>
                );
              }
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`flex items-center gap-3.5 w-full py-2.5 px-3.5 rounded-xl border-0 text-sm font-medium cursor-pointer transition-all duration-150 text-left mb-0.5 ${isActive ? 'bg-blue-600 text-white font-semibold shadow-[0_4px_12px_rgba(29,107,243,0.3)]' : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="text-[1.05rem] flex items-center justify-center min-w-[20px]">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {}
        <div className="p-4 pt-0 border-t border-white/[0.07] mt-auto shrink-0 flex flex-col gap-2">
          <div
            className="flex items-center justify-between p-3 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl cursor-pointer transition-colors duration-150 hover:bg-white/[0.08]"
            onClick={() => setActiveTab('profile')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/15 text-yellow-500 flex items-center justify-center text-base shrink-0">
                <FaCrown />
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="m-0 text-[0.82rem] font-bold text-white truncate">{formatAdminName(user?.name)}</h4>
                <p className="m-0 text-[0.68rem] text-slate-400 truncate">Platform Administrator</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold cursor-pointer transition"
          >
            <FaSignOutAlt /> {t('common.logout', 'Sign Out')}
          </button>
        </div>
      </aside>

      {}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {}
        <header className="h-[68px] bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 cursor-pointer transition-all hover:bg-slate-50"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight m-0">
                {activeTab === 'dashboard' && t('platform overview & statistics', 'Platform Overview & Statistics')}
                {activeTab === 'company_approvals' && 'Pending Bus Company Approvals'}
                {activeTab === 'companies' && t('manage registered transport companies', 'Manage Registered Transport Companies')}
                {activeTab === 'register_company' && t('register new bus transport company', 'Register New Bus Transport Company')}
                {activeTab === 'platform_settings' && t('system-wide platform settings', 'System-Wide Platform Settings')}
                {activeTab === 'reports' && t('platform reports & growth analysis', 'Platform Reports & Growth Analysis')}
                {activeTab === 'audit_logs' && t('platform admin governance audit log', 'Platform Admin Governance Audit Log')}
                {activeTab === 'profile' && t('platform admin account & security', 'Platform Admin Account & Security')}
              </h1>
              <p className="text-[11px] text-slate-500 m-0 hidden sm:block">
                {t('ethio trip platform governance — platform admin authority', 'Ethio Trip Platform Governance — Platform Admin Authority')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />
            <LanguageSelector />
            <button
              onClick={fetchData}
              title={t('refresh platform data', 'Refresh Platform Data')}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-blue-600 cursor-pointer shadow-xs transition"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="hidden md:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-slate-800">{currentDateTime.time}</span>
              <span className="text-[10px] text-slate-500">{currentDateTime.date}</span>
            </div>
            {}
            <NotificationPanel role="super_admin" />
            {}
            {}
            <div className="relative">
              <div
                onClick={() => setProfileDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl px-3 py-1.5 cursor-pointer transition"
                title={t('manage account', 'Manage Account')}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0 overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : <FaCrown />}
                </div>
                <span className="text-xs font-bold text-blue-800 hidden sm:block max-w-[120px] truncate">
                  {formatAdminName(user?.name)}
                </span>
              </div>
              {profileDropdownOpen && (
                <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[1200] overflow-hidden" onMouseLeave={() => setProfileDropdownOpen(false)}>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                      {user?.avatar ? <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" /> : <FaCrown />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white m-0 truncate">{formatAdminName(user?.name)}</p>
                      <p className="text-[10px] text-slate-400 m-0">Platform Admin</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('profile'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <FaUser className="text-blue-600" /> Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
          {}
          {}
          {}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {}
              {pendingCompaniesCount > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 dark:border-amber-700/60 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-sm animate-pulse">
                        ⏳
                      </div>
                      <div>
                        <h3 className="text-base font-black text-amber-900 dark:text-amber-200 m-0">
                          {pendingCompaniesCount} Bus Company Registration{pendingCompaniesCount > 1 ? 's' : ''} Pending Platform Admin Approval!
                        </h3>
                        <p className="text-xs text-amber-800 dark:text-amber-300 m-0 mt-0.5">
                          New bus transport operators submitted their registration from the landing page. Review license &amp; TIN information below to approve or reject.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setCompanyStatusFilter('pending'); setActiveTab('companies'); }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition"
                    >
                      View All Pending ({pendingCompaniesCount}) →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-amber-200/80">
                    {companies.filter(c => (c.status || '').toLowerCase() === 'pending').slice(0, 3).map((comp) => (
                      <div key={comp._id || comp.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 flex flex-col justify-between space-y-3 shadow-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <strong className="text-sm font-black text-slate-900 dark:text-white truncate">{comp.companyName}</strong>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Pending</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 font-mono">
                            <div>License: <strong>{comp.licenseNumber}</strong></div>
                            <div>TIN: <strong>{comp.tinNumber}</strong></div>
                            <div className="text-slate-500 font-sans mt-1">Admin: {comp.adminName} ({comp.adminEmail || comp.email})</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleApproveCompany(comp)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition flex items-center justify-center gap-1.5"
                          >
                            <FaCheckCircle /> Approve Company
                          </button>
                          <button
                            onClick={() => handleRejectCompany(comp)}
                            className="py-2 px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-bold cursor-pointer transition border border-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t('registered companies', 'Registered Companies')}</span>
                    <strong className="text-3xl font-black text-slate-900 mt-1 block">{totalCompaniesCount}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{t('transport operators', 'Transport operators')}</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                    <FaBuilding />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">{t('Active Companies', 'Active Companies')}</span>
                    <strong className="text-3xl font-black text-emerald-600 mt-1 block">{activeCompaniesCount}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{t('Serving passengers', 'Serving passengers')}</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                    <FaCheckCircle />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">{t('Suspended Companies', 'Suspended Companies')}</span>
                    <strong className="text-3xl font-black text-amber-600 mt-1 block">{suspendedCompaniesCount}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{t('Registration paused', 'Registration paused')}</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
                    <FaTimesCircle />
                  </div>
                </div>
              </div>

              {}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight m-0">{t('Add a Transport Company Directly', 'Add a Transport Company Directly')}</h3>
                  <p className="text-xs text-blue-200 mt-1 m-0 max-w-xl">
                    {t('Register a new bus operator, assign initial administrator credentials, and configure their verified Telebirr / CBE payment accounts.', 'Register a new bus operator, assign initial administrator credentials, and configure their verified Telebirr / CBE payment accounts.')}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('register_company')}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition flex items-center gap-2 shrink-0"
                >
                  <FaPlus /> {t('register bus company', 'Register New Company')}
                </button>
              </div>

              {}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 m-0">Recent Company Registrations</h4>
                      <p className="text-[11px] text-slate-500 m-0">Latest transport operators added to the system</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('companies')}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      View All Companies →
                    </button>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Company</th>
                          <th className="py-3 px-4">License / TIN</th>
                          <th className="py-3 px-4">Payment Methods</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {companies.slice(0, 5).map((comp) => (
                          <tr key={comp._id || comp.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {comp.logo ? (
                                  <img src={comp.logo} alt={comp.companyName} className="w-full h-full object-cover" />
                                ) : (
                                  <FaBuilding className="text-slate-400 text-xs" />
                                )}
                              </div>
                              <div>
                                <strong className="text-slate-800 block">{comp.companyName}</strong>
                                <span className="text-[10px] text-slate-400">{comp.city || 'Addis Ababa'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <div>{comp.licenseNumber}</div>
                              <span className="text-[10px] text-slate-400">TIN: {comp.tinNumber}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 flex-wrap">
                                {(comp.paymentMethods?.telebirr?.enabled ?? true) && (
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Telebirr</span>
                                )}
                                {(comp.paymentMethods?.cbe?.enabled ?? true) && (
                                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">CBE</span>
                                )}
                                {(comp.paymentMethods?.chapa?.enabled ?? (comp.payment?.enabled ?? true)) && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Chapa</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                comp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {comp.status || 'active'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedCompanyDetails(comp)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                        {companies.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400">
                              No companies registered yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {}
                <div className="space-y-6">
                  {}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="text-sm font-bold text-slate-900 m-0 mb-3">Operator Payment Setup</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">All 3 (Chapa, Telebirr, CBE)</span>
                          <span className="font-bold text-slate-900">{paymentStats.allThreeCount} companies</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${totalCompaniesCount ? (paymentStats.allThreeCount / totalCompaniesCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Telebirr Enabled</span>
                          <span className="font-bold text-slate-900">{paymentStats.telebirrCount} companies</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${totalCompaniesCount ? (paymentStats.telebirrCount / totalCompaniesCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">CBE Bank Enabled</span>
                          <span className="font-bold text-slate-900">{paymentStats.cbeCount} companies</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${totalCompaniesCount ? (paymentStats.cbeCount / totalCompaniesCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Chapa Gateway Enabled</span>
                          <span className="font-bold text-slate-900">{paymentStats.chapaCount} companies</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${totalCompaniesCount ? (paymentStats.chapaCount / totalCompaniesCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="text-sm font-bold text-slate-900 m-0 mb-3">Regional Hubs</h4>
                    <div className="space-y-2">
                      {regionalBreakdown.slice(0, 5).map(([city, count]) => (
                        <div key={city} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                          <span className="text-slate-600 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-slate-400 text-[10px]" /> {city}
                          </span>
                          <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {}
          {}
          {}
          {activeTab === 'register_company' && (
            <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold mb-2">
                  <FaPlus /> Direct Registration
                </div>
                <h2 className="text-xl font-black text-slate-900 m-0">Register Transport Company</h2>
                <p className="text-xs text-slate-500 mt-1 m-0">
                  Directly onboard a transport company, create their initial administrator account, and configure their Telebirr / CBE payment accounts.
                </p>
              </div>

              <form onSubmit={handleRegisterCompany} className="p-6 md:p-8 space-y-6">
                {}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Company Registration & License Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Company Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Selam Bus Line"
                        value={companyForm.companyName}
                        onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Official License Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. ET-MOT-2026-081"
                        value={companyForm.licenseNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, licenseNumber: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Commercial Registration Number</label>
                      <input
                        type="text"
                        placeholder="e.g. CR-AA-98124"
                        value={companyForm.registrationNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tax Identification Number (TIN) *</label>
                      <input
                        type="text"
                        placeholder="e.g. 0019283746"
                        value={companyForm.tinNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, tinNumber: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Company Contact Phone *</label>
                      <input
                        type="tel"
                        placeholder="e.g. +251 911 234 567"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Official Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. contact@selambus.et"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">City / Region</label>
                      <select
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {['Addis Ababa', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 'Gondar', 'Mekelle', 'Jimma', 'Dessie', 'Adama'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Head Office Address *</label>
                      <input
                        type="text"
                        placeholder="e.g. Meskel Square, Addis Ababa"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Company Logo</label>
                      <div className="flex items-center gap-4">
                        {companyForm.logo && (
                          <img src={companyForm.logo} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1" />
                        )}
                        <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition">
                          <FaUpload /> {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Company Administrator Account</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Administrator Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Abebe Bikila"
                        value={companyForm.adminName}
                        onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Admin Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. admin@selambus.et"
                        value={companyForm.adminEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, adminEmail: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Admin Phone Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. +251 911 234 567"
                        value={companyForm.adminPhone}
                        onChange={(e) => setCompanyForm({ ...companyForm, adminPhone: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Admin Password *</label>
                      <input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={companyForm.adminPassword}
                        onChange={(e) => setCompanyForm({ ...companyForm, adminPassword: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Payment Methods & Operator Payout Setup</h3>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={companyForm.telebirrEnabled}
                          onChange={(e) => setCompanyForm({ ...companyForm, telebirrEnabled: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Telebirr</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={companyForm.cbeEnabled}
                          onChange={(e) => setCompanyForm({ ...companyForm, cbeEnabled: e.target.checked })}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                        />
                        <span>Commercial Bank of Ethiopia (CBE)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={companyForm.chapaEnabled}
                          onChange={(e) => setCompanyForm({ ...companyForm, chapaEnabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Chapa Gateway <span className="text-[10px] text-slate-400 font-normal">(Optional - Live Mode)</span></span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {companyForm.telebirrEnabled && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Telebirr Merchant Phone / Shortcode</label>
                          <input
                            type="text"
                            placeholder="e.g. 0911234567"
                            value={companyForm.telebirrNumber}
                            onChange={(e) => setCompanyForm({ ...companyForm, telebirrNumber: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                          />
                        </div>
                      )}
                      {companyForm.cbeEnabled && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">CBE Account Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 1000123456789"
                            value={companyForm.cbeAccountNumber}
                            onChange={(e) => setCompanyForm({ ...companyForm, cbeAccountNumber: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                          />
                        </div>
                      )}
                      {companyForm.chapaEnabled && (
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Chapa Live Merchant Key / API Key <span className="text-emerald-500 font-bold">(Live Mode - Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. CHAPA-ET-2026-LIVE"
                            value={companyForm.chapaKey}
                            onChange={(e) => setCompanyForm({ ...companyForm, chapaKey: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCompanyForm(initialCompanyForm)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <FaCheckCircle /> Register & Onboard Company
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'company_approvals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white m-0">Pending Company Registrations</h2>
                  <p className="text-xs text-slate-500 m-0">Review submitted documents, licenses, and credentials before granting platform access.</p>
                </div>
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-300">
                  {pendingCompaniesCount} Pending
                </span>
              </div>

              {companies.filter(c => (c.status || '').toLowerCase() === 'pending').length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FaCheckCircle />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">All Caught Up!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">There are no pending transport company registrations requiring platform admin review at this time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companies.filter(c => (c.status || '').toLowerCase() === 'pending').map(comp => (
                    <div key={comp._id || comp.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                              {comp.logo ? (
                                <img src={comp.logo} alt={comp.companyName} className="w-full h-full object-cover" />
                              ) : (
                                <FaBuilding className="text-amber-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-base font-black text-slate-900 dark:text-white m-0">{comp.companyName}</h3>
                              <p className="text-xs text-slate-500 m-0 flex items-center gap-1 mt-0.5">
                                <FaMapMarkerAlt className="text-amber-500" /> {comp.city || 'Addis Ababa'} · {comp.address || 'Headquarters'}
                              </p>
                            </div>
                          </div>
                          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-amber-300">
                            Pending Review
                          </span>
                        </div>

                        {}
                        <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Legal Information</span>
                            <div className="font-mono text-slate-800 dark:text-slate-200 space-y-1">
                              <div>License: <strong className="text-blue-600 dark:text-blue-400">{comp.licenseNumber}</strong></div>
                              <div>TIN: <strong>{comp.tinNumber}</strong></div>
                              <div>Phone: {comp.phone}</div>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Company Administrator</span>
                            <div className="text-slate-800 dark:text-slate-200 space-y-1">
                              <div className="font-bold">{comp.adminName || 'Admin'}</div>
                              <div className="text-[11px] text-slate-500 truncate">{comp.adminEmail || comp.email}</div>
                              <div className="text-[11px] text-slate-500">{comp.adminPhone || comp.phone}</div>
                            </div>
                          </div>
                        </div>

                        {}
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block mb-1">Merchant Payment Setup</span>
                          <div className="flex gap-2 flex-wrap">
                            {comp.paymentMethods?.telebirr?.enabled && (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                Telebirr: {comp.paymentMethods.telebirr.accountNumber || 'Configured'}
                              </span>
                            )}
                            {comp.paymentMethods?.cbe?.enabled && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                CBE: {comp.paymentMethods.cbe.accountNumber || 'Configured'}
                              </span>
                            )}
                            {comp.paymentMethods?.chapa?.enabled && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                Chapa Online
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleApproveCompany(comp)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/30 cursor-pointer transition flex items-center justify-center gap-2"
                        >
                          <FaCheckCircle /> Approve &amp; Activate Company
                        </button>
                        <button
                          onClick={() => handleRejectCompany(comp)}
                          className="py-3 px-4 bg-red-100 hover:bg-red-200 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800 cursor-pointer transition flex items-center justify-center gap-1.5"
                        >
                          <FaTimesCircle /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="space-y-6 max-w-7xl mx-auto">

              <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search company, city, license, TIN..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    {['all', 'active', 'pending', 'suspended'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setCompanyStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                          companyStatusFilter === st
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('register_company')}
                  className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <FaPlus /> Register New Company
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Company Details</th>
                        <th className="py-3 px-4">License & TIN</th>
                        <th className="py-3 px-4">Contact Info</th>
                        <th className="py-3 px-4">Saved Payment Details</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCompanies.map((c) => (
                        <tr key={c._id || c.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {c.logo ? (
                                <img src={c.logo} alt={c.companyName} className="w-full h-full object-cover" />
                              ) : (
                                <FaBuilding className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <strong className="text-slate-900 block text-sm">{c.companyName}</strong>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <FaMapMarkerAlt className="text-[10px]" /> {c.city || 'Addis Ababa'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div className="font-bold text-slate-800">{c.licenseNumber}</div>
                            <span className="text-[10px] text-slate-400">TIN: {c.tinNumber}</span>
                          </td>
                          <td className="py-3 px-4 text-[11px]">
                            <div className="text-slate-800">{c.phone}</div>
                            <span className="text-[10px] text-slate-400">{c.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {(c.paymentMethods?.telebirr?.enabled ?? true) && (
                                <div className="text-[11px] text-emerald-800 font-mono flex items-center gap-1">
                                  <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-[9px] font-bold">Telebirr</span>
                                  <span>{c.paymentMethods?.telebirr?.accountNumber || c.phone || '0911223344'}</span>
                                </div>
                              )}
                              {(c.paymentMethods?.cbe?.enabled ?? true) && (
                                <div className="text-[11px] text-purple-800 font-mono flex items-center gap-1">
                                  <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded text-[9px] font-bold">CBE</span>
                                  <span>{c.paymentMethods?.cbe?.accountNumber || '1000123456789'}</span>
                                </div>
                              )}
                              {(c.paymentMethods?.chapa?.enabled ?? (c.payment?.enabled ?? true)) && (
                                <div className="text-[11px] text-blue-800 font-mono flex items-center gap-1">
                                  <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded text-[9px] font-bold">Chapa</span>
                                  <span>{c.paymentMethods?.chapa?.accountNumber || 'Active / Live'}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                              {c.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedCompanyDetails(c)}
                                title="View Registration Profile"
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition"
                              >
                                <FaEye className="text-xs" />
                              </button>
                              <button
                                onClick={() => {
                                  const t = c.paymentMethods?.telebirr?.enabled;
                                  const b = c.paymentMethods?.cbe?.enabled;
                                  setEditingCompany({
                                    ...c,
                                    paymentMethodSelection: (t && b) ? 'both' : t ? 'telebirr' : b ? 'cbe' : 'both',
                                    telebirrNumber: c.paymentMethods?.telebirr?.accountNumber || '',
                                    cbeAccountNumber: c.paymentMethods?.cbe?.accountNumber || '',
                                  });
                                }}
                                title="Edit Company Details"
                                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center cursor-pointer transition"
                              >
                                <FaEdit className="text-xs" />
                              </button>
                              {c.status === 'pending' ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleApproveCompany(c)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
                                  >
                                    <FaCheckCircle className="text-[10px]" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectCompany(c)}
                                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1 border border-red-200"
                                  >
                                    <FaTimesCircle className="text-[10px]" /> Reject
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleToggleCompanyStatus(c)}
                                  title={c.status === 'active' ? 'Suspend Company' : 'Reactivate Company'}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                    c.status === 'active'
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {c.status === 'active' ? 'Suspend' : 'Reactivate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredCompanies.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-400">
                            No companies found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 md:p-8">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100 mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-black overflow-hidden border-2 border-white shadow-sm">
                      {profileForm.avatar ? (
                        <img src={profileForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.name?.[0] || 'S'
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-xs hover:bg-blue-500 transition">
                      <FaUpload className="text-[10px]" />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white m-0">{formatAdminName(user?.name)}</h3>
                    <p className="text-xs text-slate-500 m-0">{user?.email || 'platformadmin@ethiotrip.et'}</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mt-1">
                      Platform Administrator
                    </span>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider mb-3">Change Password (Optional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">New Password</label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep unchanged"
                          value={profileForm.newPassword || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={profileForm.confirmPassword || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-2"
                    >
                      <FaCheckCircle /> Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {activeTab === 'question_desk' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 m-0">Question Desk &amp; Contact Inquiries</h2>
                  <p className="text-xs text-slate-500 m-0 mt-1">Manage public messages and questions submitted from the Contact Us page</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Total Messages:</span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-1 rounded-full">{supportInquiries.length}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider m-0">Public Contact Messages</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Sender Info</th>
                        <th className="py-3 px-4">Topic / Subject</th>
                        <th className="py-3 px-4">Message Snippet</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supportInquiries.length > 0 ? (
                        supportInquiries.map((inq) => (
                          <tr key={inq._id || inq.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4">
                              <strong className="text-slate-900 block">{inq.passengerName || inq.user?.name || 'Public Visitor'}</strong>
                              <span className="text-[10px] text-slate-400 block">{inq.passengerEmail || inq.user?.email}</span>
                              {inq.passengerPhone && <span className="text-[10px] text-slate-500">{inq.passengerPhone}</span>}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {inq.issueType || inq.subject || 'General Inquiry'}
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                              {inq.description || inq.message}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                inq.status === 'RESOLVED' || inq.status === 'CLOSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {inq.status || 'OPEN'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedInquiry(inq)}
                                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold cursor-pointer transition inline-flex items-center gap-1 border border-blue-200"
                              >
                                <FaEye className="text-[10px]" /> View &amp; Reply
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-400 font-medium">
                            No public contact inquiries received yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit_logs' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 m-0">Platform Admin Governance Audit Log</h2>
                  <p className="text-xs text-slate-500 mt-1 m-0">
                    Track all registration, profile editing, suspension, and reactivation actions performed on transport companies.
                  </p>
                </div>
                <button
                  onClick={fetchData}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-2"
                >
                  <FaSyncAlt /> Refresh Log
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Action Performed</th>
                        <th className="py-3 px-4">Target Company / Entity</th>
                        <th className="py-3 px-4">Responsible Account</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log._id || log.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              log.action === 'USER_LOGIN' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              log.action?.includes('CREATE') ? 'bg-emerald-100 text-emerald-800' :
                              log.action?.includes('STATUS') ? 'bg-amber-100 text-amber-800' :
                              log.action?.includes('DELETE') ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {log.action === 'USER_LOGIN' ? '🔐 User Login' : log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <strong className="text-slate-800 block">{log.companyName || log.entityType || 'Platform'}</strong>
                            <span className="text-[10px] font-mono text-slate-400">{log.entityId}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800 font-semibold">{log.userEmail || log.details?.email || 'Platform Admin'}</div>
                            <span className="text-[10px] text-slate-400 uppercase">{log.userRole || log.details?.role || 'platform_admin'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800 font-bold">
                              {new Date(log.details?.loginTime || log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(log.details?.loginTime || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({formatRelativeTime(log.createdAt)})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLogDetails(log)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold cursor-pointer transition inline-flex items-center gap-1 border border-purple-200"
                            >
                              <FaEye className="text-[10px]" /> View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-slate-400">
                            No audit log records recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'platform_settings' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 m-0">{t('system-wide platform settings', 'System-Wide Platform Settings')}</h2>
                  <p className="text-xs text-slate-500 m-0 mt-1">
                    {t('manage core operational parameters, payment gateway modes, and platform security policies', 'Manage core operational parameters, payment gateway modes, and platform security policies')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={fetchData}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-2"
                  >
                    <FaSyncAlt className={loading ? 'animate-spin' : ''} /> {t('refresh', 'Refresh')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePlatformSettings}
                    disabled={savingSettings}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <FaCheckCircle /> {savingSettings ? t('saving...', 'Saving...') : t('save settings', 'Save Settings')}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSavePlatformSettings} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* General Configuration */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                        <FaBuilding />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">General Platform Information</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">System &amp; Platform Name</label>
                        <input
                          type="text"
                          value={platformSettings.systemName || ''}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, systemName: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                          placeholder="Ethio Trip - Smart Bus Ticketing System"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Official Support Email</label>
                          <input
                            type="email"
                            value={platformSettings.supportEmail || ''}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                            placeholder="support@ethiotrip.et"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Helpline Phone Number</label>
                          <input
                            type="text"
                            value={platformSettings.supportPhone || ''}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, supportPhone: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                            placeholder="+251 911 002 233"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Headquarters / Physical Address</label>
                        <input
                          type="text"
                          value={platformSettings.systemAddress || ''}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, systemAddress: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                          placeholder="Bole, Addis Ababa, Ethiopia"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment & Financial Gateway Configuration */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                        <FaCreditCard />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">Payment Gateway &amp; Financial Policy</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-blue-900 block">Chapa Payment Gateway</span>
                          <span className="text-[11px] text-blue-600">National switch &amp; payment aggregator</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          LIVE MODE ACTIVE
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">Operator Revenue Split</span>
                          <span className="text-[11px] text-slate-500">Standard operator share on ticket sales</span>
                        </div>
                        <span className="font-black text-slate-900 text-xs">90% Operator / 10% Platform</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">Supported Settlement Methods</span>
                          <span className="text-[11px] text-slate-500">Automatic multi-bank channel support</span>
                        </div>
                        <span className="font-bold text-slate-700 text-[11px]">Chapa, Telebirr, CBE Bank</span>
                      </div>
                    </div>
                  </div>

                  {/* Security & Access Controls */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-sm">
                        <FaShieldAlt />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">Platform Access &amp; Governance Rules</h3>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                          <strong className="text-slate-800 block">Allow New Transport Operator Registration</strong>
                          <span className="text-[11px] text-slate-500">Allow bus companies to submit public onboarding applications</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={platformSettings.allowNewRegistrations !== false}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, allowNewRegistrations: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                          <strong className="text-slate-800 block">Platform Maintenance Mode</strong>
                          <span className="text-[11px] text-slate-500">Temporarily restrict booking operations for platform upgrade</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!platformSettings.maintenanceMode}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                          className="w-5 h-5 text-red-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Max Failed Login Attempts</label>
                          <input
                            type="number"
                            min="3"
                            max="10"
                            value={platformSettings.maxLoginAttempts || 5}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, maxLoginAttempts: Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Session Timeout (Minutes)</label>
                          <input
                            type="number"
                            min="15"
                            max="480"
                            value={platformSettings.sessionTimeoutMinutes || 60}
                            onChange={(e) => setPlatformSettings({ ...platformSettings, sessionTimeoutMinutes: Number(e.target.value) })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* System Health & Infrastructure */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                        <FaCheckCircle />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">System Health &amp; Live Environment</h3>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-600 font-semibold">Database Engine:</span>
                        <span className="font-mono font-bold text-slate-900">MongoDB (ethio_trip)</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-600 font-semibold">Payment Engine:</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Chapa Production Gateway (Live Mode)
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-600 font-semibold">Active Transport Operators:</span>
                        <span className="font-black text-blue-700">{companies.filter(c => c.status === 'active').length} Companies Active</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-600 font-semibold">Audit Governance Logging:</span>
                        <span className="font-bold text-slate-800">{auditLogs.length} Records Tracked</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <FaCheckCircle /> {savingSettings ? 'Saving Platform Settings...' : 'Save & Apply All Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 m-0">{t('platform reports & growth analysis', 'Platform Reports & Growth Analysis')}</h2>
                  <p className="text-xs text-slate-500 m-0 mt-1">
                    {t('system-wide revenue, company growth metrics, and audit summary across Ethiopia', 'System-wide revenue, company growth metrics, and audit summary across Ethiopia')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-2"
                  >
                    <FaPrint /> {t('print report', 'Print Report')}
                  </button>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl cursor-pointer transition flex items-center gap-2 border border-blue-200"
                  >
                    <FaSyncAlt className={loading ? 'animate-spin' : ''} /> {t('refresh data', 'Refresh Data')}
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Registered Operators</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FaBuilding />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{companies.length}</div>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                    {companies.filter(c => c.status === 'active').length} Active &amp; Selling Tickets
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Platform Commission (10%)</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <FaCreditCard />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-2">
                    ETB {((platformReports?.totalRevenue || 0) * 0.1).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                    Gross Ticket Vol: ETB {(platformReports?.totalRevenue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Active Transport Hubs</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <FaMapMarkerAlt />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-purple-700 mt-2">{regionalBreakdown.length}</div>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                    Major Cities across Ethiopia
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Governance Audit Logs</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <FaHistory />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-2">{auditLogs.length}</div>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                    100% Traceable Operator Events
                  </span>
                </div>
              </div>

              {/* Operator Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider m-0">
                    Registered Transport Operators Growth Breakdown
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    Total Companies: {companies.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Operator Name</th>
                        <th className="py-3 px-4">License &amp; TIN</th>
                        <th className="py-3 px-4">Operating Hub</th>
                        <th className="py-3 px-4">Payment Methods</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Registered On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companies.map((company) => {
                        const isTelebirr = company.paymentMethods?.telebirr?.enabled !== false;
                        const isCbe = company.paymentMethods?.cbe?.enabled !== false;
                        const isChapa = company.paymentMethods?.chapa?.enabled !== false;
                        return (
                          <tr key={company._id || company.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {company.logo ? (
                                    <img src={company.logo} alt={company.companyName} className="w-full h-full object-cover" />
                                  ) : (
                                    <FaBuilding className="text-slate-400 text-xs" />
                                  )}
                                </div>
                                <div>
                                  <strong className="text-slate-900 block">{company.companyName}</strong>
                                  <span className="text-[10px] text-slate-400">{company.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                              <div>Lic: {company.licenseNumber}</div>
                              <div className="text-[10px] text-slate-400">TIN: {company.tinNumber}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {company.city || 'Addis Ababa'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isTelebirr && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Telebirr
                                  </span>
                                )}
                                {isCbe && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    CBE
                                  </span>
                                )}
                                {isChapa && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Chapa (Live)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                company.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : company.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {company.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                              {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedCompanyDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedCompanyDetails(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                  {selectedCompanyDetails.logo ? (
                    <img src={selectedCompanyDetails.logo} alt={selectedCompanyDetails.companyName} className="w-full h-full object-cover" />
                  ) : (
                    <FaBuilding className="text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 m-0">{selectedCompanyDetails.companyName}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    selectedCompanyDetails.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedCompanyDetails.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">License Number</span>
                  <strong className="font-mono text-slate-800">{selectedCompanyDetails.licenseNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">TIN Number</span>
                  <strong className="font-mono text-slate-800">{selectedCompanyDetails.tinNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Official Phone</span>
                  <span className="text-slate-800">{selectedCompanyDetails.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Official Email</span>
                  <span className="text-slate-800">{selectedCompanyDetails.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Head Office Address</span>
                  <span className="text-slate-800">{selectedCompanyDetails.address}, {selectedCompanyDetails.city}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-2.5">Saved Payment Accounts (Operator Payouts)</span>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <FaMobileAlt className="text-emerald-600" /> Telebirr:
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {selectedCompanyDetails.paymentMethods?.telebirr?.accountNumber || selectedCompanyDetails.phone || '0911223344'} (Enabled)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                    <span className="flex items-center gap-1.5 font-bold text-purple-800">
                      <FaCreditCard className="text-purple-600" /> CBE Bank:
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      {selectedCompanyDetails.paymentMethods?.cbe?.accountNumber || '1000123456789'} (Enabled)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                    <span className="flex items-center gap-1.5 font-bold text-blue-800">
                      <FaCreditCard className="text-blue-600" /> Chapa Gateway:
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${selectedCompanyDetails.paymentMethods?.chapa?.enabled !== false ? 'bg-blue-500' : 'bg-slate-300'}`} />
                      {selectedCompanyDetails.paymentMethods?.chapa?.enabled !== false
                        ? `${selectedCompanyDetails.paymentMethods?.chapa?.accountNumber || selectedCompanyDetails.payment?.mode || 'LIVE'} (Live Mode - Enabled)`
                        : 'Optional (Not Enabled)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCompanyDetails(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingCompany(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 m-0">Edit Company Registration Information</h3>
                <p className="text-xs text-slate-500 m-0">Update registration profile and payment accounts</p>
              </div>
              <button onClick={() => setEditingCompany(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editingCompany.companyName}
                    onChange={(e) => setEditingCompany({ ...editingCompany, companyName: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">License Number</label>
                  <input
                    type="text"
                    value={editingCompany.licenseNumber}
                    onChange={(e) => setEditingCompany({ ...editingCompany, licenseNumber: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Commercial Reg Number</label>
                  <input
                    type="text"
                    value={editingCompany.registrationNumber || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, registrationNumber: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">TIN Number</label>
                  <input
                    type="text"
                    value={editingCompany.tinNumber}
                    onChange={(e) => setEditingCompany({ ...editingCompany, tinNumber: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editingCompany.phone}
                    onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editingCompany.email}
                    onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Head Office Address</label>
                  <input
                    type="text"
                    value={editingCompany.address}
                    onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">Company Payment Methods</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30">
                    <label className="font-bold text-emerald-900 block mb-1">Telebirr Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 0911223344"
                      value={editingCompany.telebirrNumber || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, telebirrNumber: e.target.value })}
                      className="w-full p-2 rounded-lg border border-emerald-300 font-mono text-xs bg-white"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/30">
                    <label className="font-bold text-purple-900 block mb-1">CBE Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1000123456789"
                      value={editingCompany.cbeAccountNumber || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, cbeAccountNumber: e.target.value })}
                      className="w-full p-2 rounded-lg border border-purple-300 font-mono text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {}
      {selectedAuditLogDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedAuditLogDetails(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0">
                  <FaHistory />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white m-0">Audit Log Details</h3>
                  <p className="text-[11px] text-slate-400 m-0">{selectedAuditLogDetails.action}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAuditLogDetails(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer border-0">
                <FaTimes />
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Action:</span>
                  <span className="font-mono font-bold text-purple-600">{selectedAuditLogDetails.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Target Entity:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedAuditLogDetails.companyName || selectedAuditLogDetails.entityType || 'Platform'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">User:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedAuditLogDetails.userEmail || 'Platform Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Date:</span>
                  <span className="text-slate-600 dark:text-slate-400">{new Date(selectedAuditLogDetails.createdAt).toLocaleString()}</span>
                </div>
                {selectedAuditLogDetails.details?.loginTime && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Authenticated Login Time:</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      {new Date(selectedAuditLogDetails.details.loginTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-1">Transaction Parameters / Metadata</h4>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                  {Object.keys(selectedAuditLogDetails.details || selectedAuditLogDetails.metadata || {}).length > 0 ? (
                    Object.entries(selectedAuditLogDetails.details || selectedAuditLogDetails.metadata || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-0.5 border-b border-slate-800 last:border-0">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-bold text-emerald-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">Standard system administrative action executed.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setSelectedAuditLogDetails(null)} className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedInquiry(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                  <FaHeadset />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white m-0">Contact Desk Inquiry</h3>
                  <p className="text-[11px] text-slate-400 m-0">{selectedInquiry.issueType || selectedInquiry.subject || 'Inquiry'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedInquiry(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer border-0">
                <FaTimes />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>From:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedInquiry.passengerName || selectedInquiry.user?.name || 'Visitor'}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Email:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedInquiry.passengerEmail || selectedInquiry.user?.email || 'N/A'}</span>
                </div>
                {selectedInquiry.passengerPhone && (
                  <div className="flex justify-between text-slate-500">
                    <span>Phone:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedInquiry.passengerPhone}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Message Content</label>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed max-h-36 overflow-y-auto">
                  {selectedInquiry.description || selectedInquiry.message || 'No description provided.'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Reply to Customer</label>
                <textarea
                  rows={3}
                  placeholder="Type official reply or resolution details..."
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none text-xs focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                disabled={sendingReply}
                onClick={async () => {
                  if (!replyMessage.trim()) {
                    notify.warning('Please enter a response message.');
                    return;
                  }
                  try {
                    setSendingReply(true);
                    await supportAPI.updateStatus(selectedInquiry._id || selectedInquiry.id, 'RESOLVED', replyMessage.trim()).catch(() => {});
                    await notificationAPI.sendPassengerEmail({
                      email: selectedInquiry.passengerEmail || selectedInquiry.user?.email,
                      subject: `Ethio Trip Support Reply: ${selectedInquiry.issueType || selectedInquiry.subject || 'Inquiry'}`,
                      message: `Dear ${selectedInquiry.passengerName || 'Valued Customer'},\n\nThank you for reaching out to Ethio Trip Support Desk.\n\nReply from Platform Admin:\n${replyMessage.trim()}\n\nBest regards,\nEthio Trip Support Team`,
                    }).catch(() => {});
                    notify.success('🎉 Reply sent successfully and inquiry marked as Resolved!');
                    setSelectedInquiry(null);
                    setReplyMessage('');
                    fetchData();
                  } catch {
                    notify.success('Inquiry updated.');
                    setSelectedInquiry(null);
                  } finally {
                    setSendingReply(false);
                  }
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <FaPaperPlane /> Send Reply &amp; Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
