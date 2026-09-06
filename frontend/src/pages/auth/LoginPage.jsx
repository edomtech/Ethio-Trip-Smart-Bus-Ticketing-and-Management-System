import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBus, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaExclamationCircle,
  FaArrowRight
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { useTranslation } from '../../i18n.jsx';
import LanguageSelector from '../../components/LanguageSelector';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const redirectUserByRole = (usr) => {
    if (usr.role === 'super_admin' || (usr.role === 'admin' && !usr.companyId)) {
      navigate('/super-admin/dashboard', { replace: true });
    } else if (usr.role === 'company_admin' || (usr.role === 'admin' && usr.companyId)) {
      navigate('/company-admin/dashboard', { replace: true });
    } else if (usr.role === 'conductor') {
      navigate('/conductor/dashboard', { replace: true });
    } else if (usr.role === 'company_staff' || usr.role === 'agent') {
      navigate('/agent/dashboard', { replace: true });
    } else {
      navigate('/passenger/dashboard', { replace: true });
    }
  };

  useEffect(() => {
    if (user) {
      redirectUserByRole(user);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      const res = await authAPI.login({ email: email.trim().toLowerCase(), password });
      login(res.user, res.token);
      toast.success(`Welcome back, ${res.user.name}! 👋`);
      setEmail('');
      setPassword('');
      redirectUserByRole(res.user);
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info('Redirecting to Google Account Sign-In / Account Creation...');
    setTimeout(() => {
      window.location.href = 'https://accounts.google.com/signin';
    }, 600);
  };

  return (
    <div className="eb-auth-page-bg">
      {/* Left-Side Showcase Panel with ONLY the Hero Bus Image as full background (No Text) */}
      <div className="eb-auth-showcase-panel" />

      {/* Right-Side Login Card */}
      <div className="eb-auth-card eb-auth-card-left">
        {/* Mobile Header Brand */}
        <div className="eb-auth-card-brand">
          <div className="eb-auth-logo-badge">
            <FaBus />
          </div>
          <div className="eb-auth-brand-text">
            <h1><span className="eb-brand-green">ETHIO</span> <span className="eb-brand-black">TRIP</span></h1>
            <p>Smart Bus Travel Platform</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <LanguageSelector />
        </div>

        <div className="eb-auth-card-header">
          <h2>{t('auth.loginTitle', 'Account Login')}</h2>
          <p>{t('auth.loginSubtitle', 'Sign in to manage your tickets and bookings')}</p>
        </div>

        <form onSubmit={handleSubmit} className="eb-auth-form" autoComplete="off">
          {error && (
            <div className="eb-auth-error">
              <FaExclamationCircle /> {error}
            </div>
          )}

          <div className="eb-auth-field">
            <label>{t('auth.emailAddress', 'Email Address')}</label>
            <div className="eb-auth-input-box">
              <FaEnvelope className="eb-input-icon" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="eb-auth-field">
            <label>{t('auth.password', 'Password')}</label>
            <div className="eb-auth-input-box">
              <FaLock className="eb-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="eb-pw-eye-btn"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="eb-auth-row-between">
            <label className="eb-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>{t('auth.rememberMe', 'Remember me')}</span>
            </label>
            <Link to="/contact" className="eb-forgot-link">
              {t('auth.forgotPassword', 'Forgot Password?')}
            </Link>
          </div>

          <button type="submit" className="eb-btn-pure-green" disabled={loading}>
            {loading ? t('common.loading', 'Authenticating...') : <><span>{t('auth.signInButton', 'Sign In')}</span> <FaArrowRight /></>}
          </button>
        </form>

        <div style={{ margin: '1.25rem 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#fff',
            border: '1.5px solid #cbd5e1',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#1e293b',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            marginBottom: '1.25rem'
          }}
        >
          <FcGoogle style={{ fontSize: '1.3rem' }} /> Continue with Google
        </button>

        <div className="eb-auth-footer-text" style={{ paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
          <div>{t('auth.noAccount', "Don't have an account?")} <Link to="/register" className="eb-link-highlight">{t('auth.createAccount', 'Sign Up')}</Link></div>
          <div><Link to="/register-company" className="eb-link-highlight" style={{ fontSize: '0.82rem' }}>{t('auth.registerCompany', 'Register Bus Company')}</Link></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
