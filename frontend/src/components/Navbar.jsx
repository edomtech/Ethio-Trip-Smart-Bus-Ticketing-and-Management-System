import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBus, FaUser, FaUserPlus, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_LINKS = [
    { label: t('nav.home', 'Home'),                     to: '/' },
    { label: t('nav.buses', 'Buses'),                   to: '/buses' },
    { label: t('nav.aboutUs', 'About Us'),             to: '/about' },
    { label: t('nav.contactUs', 'Contact Us'),         to: '/contact' },
  ];

  const dashRoute = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.companyId) ? '/platform-admin/dashboard'
    : user?.role === 'company_admin' || (user?.role === 'admin' && user?.companyId) ? '/company-admin/dashboard'
    : user?.role === 'company_staff' || user?.role === 'agent' ? '/company-staff/dashboard'
    : '/passenger/dashboard';

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#071410] border-b border-emerald-100 dark:border-[#1a3028] shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">

        <Link to="/" className="flex items-center gap-3 no-underline shrink-0 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-600/30">
            <FaBus />
          </div>
          <div className="flex flex-col leading-tight">
            <div className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-wide">
              ETHIO<span className="text-emerald-600 dark:text-emerald-400">TRIP</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
              Emare ICT Hub
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(l => {
            const isActive = location.pathname === l.to;
            return l.href ? (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                className={`relative py-1 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 after:absolute after:-bottom-[18px] after:left-0 after:right-0 after:h-[3px] after:bg-emerald-600 dark:after:bg-emerald-400 after:rounded-full'
                    : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <LanguageSelector />

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to={dashRoute}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-[#0d2418] border border-emerald-200 dark:border-[#1a3a28] text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-[#123121] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {(user.name || 'U')[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-sm"
                title={t('common.logout', 'Logout')}
              >
                <FaSignOutAlt />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 border border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-xs transition-colors"
              >
                <FaUser /> {t('nav.login', 'Login')}
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-lg font-bold text-xs shadow-md shadow-emerald-600/30 transition-all"
              >
                <FaUserPlus /> {t('nav.register', 'Register')}
              </Link>
            </>
          )}

          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#071410] px-4 py-4 space-y-2 shadow-xl">
          {NAV_LINKS.map(l => l.href ? (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"
            >
              {l.label}
            </Link>
          ))}
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('common.theme', 'Theme')}</span>
            <ThemeToggle />
          </div>
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('common.language', 'Language')}</span>
            <LanguageSelector />
          </div>
          <hr className="border-slate-100 dark:border-slate-800 my-2" />
          {user ? (
            <>
              <Link
                to={dashRoute}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
              >
                {t('nav.dashboard', 'My Dashboard')}
              </Link>
              <button
                onClick={() => { logout(); navigate('/'); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <FaSignOutAlt /> {t('common.logout', 'Logout')}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2 border border-emerald-600 text-emerald-600 rounded-lg text-xs font-bold"
              >
                <FaUser /> {t('nav.login', 'Login')}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
              >
                <FaUserPlus /> {t('nav.register', 'Register')}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
