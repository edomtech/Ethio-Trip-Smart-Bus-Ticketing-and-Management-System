import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBus, FaUser, FaUserPlus, FaBars, FaTimes, FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home',           to: '/' },
  { label: 'Popular Routes', href: '/#popular-routes' },
  { label: 'About Us',       to: '/about' },
  { label: 'Contact Us',     to: '/contact' },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashRoute = user?.role === 'admin' ? '/admin/dashboard'
    : user?.role === 'agent' ? '/agent/dashboard'
    : '/passenger/dashboard';

  return (
    <header className="eb-navbar-wrap">
      <div className="eb-navbar-container">

        <Link to="/" className="eb-brand">
          <div className="eb-brand-icon"><FaBus /></div>
          <div className="eb-brand-text">
            <div className="eb-brand-title">ETHIO<span className="eb-green-accent">BUS</span></div>
            <div className="eb-brand-subtitle">Smart Ticketing System</div>
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

          {user ? (
            <div className="eb-user-menu">
              <Link to={dashRoute} className="eb-btn-dashboard">
                <div className="eb-avatar-circle">{(user.name || 'U')[0].toUpperCase()}</div>
                <span>{user.name?.split(' ')[0]}</span>
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} className="eb-btn-logout-icon" title="Logout">
                <FaSignOutAlt />
              </button>
            </div>
          ) : (
            <div className="eb-auth-btns">
              <Link to="/login"    className="eb-btn-login"><FaUser /> Login</Link>
              <Link to="/register" className="eb-btn-register"><FaUserPlus /> Register</Link>
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
              <Link to={dashRoute} onClick={() => setMobileOpen(false)} className="eb-mobile-link">My Dashboard</Link>
              <button onClick={() => { logout(); navigate('/'); setMobileOpen(false); }} className="eb-mobile-logout">
                <FaSignOutAlt /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="eb-mobile-link"><FaUser /> Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="eb-mobile-link"><FaUserPlus /> Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
