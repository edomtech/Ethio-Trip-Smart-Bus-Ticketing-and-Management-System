import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBus, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaExclamationCircle, FaArrowRight, FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import '../modules.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

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
      if (res.user.role === 'admin') navigate('/admin/dashboard');
      else if (res.user.role === 'agent') navigate('/agent/dashboard');
      else navigate('/passenger/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eb-auth-page-bg">
      {/* Left-Side Floating Card */}
      <div className="eb-auth-card eb-auth-card-left">
        {/* Brand Header Inside Card */}
        <div className="eb-auth-card-brand">
          <div className="eb-auth-logo-badge">
            <FaBus />
          </div>
          <div className="eb-auth-brand-text">
            <h1><span className="eb-brand-green">ETHIO</span> <span className="eb-brand-black">BUS</span></h1>
            <p>Smart Bus Ticketing System</p>
          </div>
        </div>

        <div className="eb-auth-card-header">
          <h2>Welcome Back <span className="eb-hand-wave">👋</span></h2>
          <p>Login to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="eb-auth-form" autoComplete="off">
          {error && (
            <div className="eb-auth-error">
              <FaExclamationCircle /> {error}
            </div>
          )}

          <div className="eb-auth-field">
            <label>Email Address</label>
            <div className="eb-auth-input-box">
              <FaEnvelope className="eb-input-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="eb-auth-field">
            <label>Password</label>
            <div className="eb-auth-input-box">
              <FaLock className="eb-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
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
              <span>Remember me</span>
            </label>
            <Link to="/contact" className="eb-forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="eb-btn-pure-green" disabled={loading}>
            {loading ? 'Logging in...' : <>Login <FaArrowRight /></>}
          </button>
        </form>

        <div className="eb-social-divider">
          <span>or continue with</span>
        </div>

        <div className="eb-social-buttons">
          <button type="button" className="eb-social-btn" onClick={() => toast.info('Google sign-in option')}>
            <FcGoogle className="eb-social-icon" />
          </button>
          <button type="button" className="eb-social-btn" onClick={() => toast.info('Facebook sign-in option')}>
            <FaFacebook className="eb-social-icon fb" />
          </button>
        </div>

        <div className="eb-auth-footer-text">
          Don't have an account? <Link to="/passenger/register" className="eb-link-highlight">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
