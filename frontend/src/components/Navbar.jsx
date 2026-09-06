import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBus, FaUser, FaUserPlus, FaBars, FaTimes, FaSignOutAlt, FaMoon, FaSun, FaBuilding } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n.jsx';
import LanguageSelector from './LanguageSelector';

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
    { label: t('nav.popularRoutes', 'Popular Routes'), href: '/#popular-routes' },
    { label: t('nav.aboutUs', 'About Us'),             to: '/about' },
    { label: t('nav.contactUs', 'Contact Us'),         to: '/contact' },
  ];

  const dashRoute = user?.role === 'super_admin' || (user?.role === 'admin' && !user?.companyId) ? '/super-admin/dashboard'
    : user?.role === 'company_admin' || (user?.role === 'admin' && user?.companyId) ? '/company-admin/dashboard'
    : user?.role === 'company_staff' || user?.role === 'agent' ? '/company-staff/dashboard'
    : '/passenger/dashboard';

  return (
    <header className="eb-navbar-wrap">
      <div className="eb-navbar-container">

        <Link to="/" className="eb-brand">
          <div className="eb-brand-icon"><FaBus /></div>
          <div className="eb-brand-text">
            <div className="eb-brand-title">ETHIO<span className="eb-green-accent">TRIP</span></div>
            <div className="eb-brand-subtitle">Smart Bus Travel Platform</div>
          </div>
        </Link>

        <nav className="eb-nav-links">
          {NAV_LINKS.map(l => l.href ? (
            <a key={l.label} href={l.href} className="eb-nav-item">{l.label}</a>
          ) : (
            <Link key={l.label} to={l.to} className={`eb-nav-item ${location.pathname === l.to ? 'active' : ''}`}>{l.label}</Link>
          ))}
        </nav>

        <div className="eb-nav-actions">
          <button className="eb-theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
          </button>

          <LanguageSelector />

          {user ? (
            <div className="eb-user-menu">
              <Link to={dashRoute} className="eb-btn-dashboard">
                <div className="eb-avatar-circle">{(user.name || 'U')[0].toUpperCase()}</div>
                <span>{user.name?.split(' ')[0]}</span>
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} className="eb-btn-logout-icon" title={t('common.logout', 'Logout')}>
                <FaSignOutAlt />
              </button>
            </div>
          ) : (
            <div className="eb-auth-btns">
              <Link to="/login" className="eb-btn-login"><FaUser /> {t('nav.login', 'Login')}</Link>
              <Link to="/register" className="eb-btn-register"><FaUserPlus /> {t('nav.register', 'Register')}</Link>
            </div>
          )}

          <button className="eb-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="eb-mobile-menu">
          {NAV_LINKS.map(l => l.href ? (
            <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="eb-mobile-link">{l.label}</a>
          ) : (
            <Link key={l.label} to={l.to} onClick={() => setMobileOpen(false)} className="eb-mobile-link">{l.label}</Link>
          ))}
          <hr />
          {user ? (
            <>
              <Link to={dashRoute} onClick={() => setMobileOpen(false)} className="eb-mobile-link">{t('nav.dashboard', 'My Dashboard')}</Link>
              <button onClick={() => { logout(); navigate('/'); setMobileOpen(false); }} className="eb-mobile-logout">
                <FaSignOutAlt /> {t('common.logout', 'Logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="eb-mobile-link"><FaUser /> {t('nav.login', 'Login')}</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="eb-mobile-link"><FaUserPlus /> {t('nav.register', 'Register')}</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
