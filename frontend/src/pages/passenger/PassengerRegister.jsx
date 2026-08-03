import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBus, FaEnvelope, FaLock, FaUser, FaPhone,
  FaEye, FaEyeSlash, FaArrowRight, FaExclamationCircle,
  FaFacebook, FaUserShield, FaCheckCircle
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import '../modules.css';

const PassengerRegister = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'passenger' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agreed) { setError('Please agree to the Terms & Conditions.'); return; }
    if (formData.password !== formData.confirm) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await authAPI.register({
        name: formData.name, email: formData.email, phone: formData.phone, password: formData.password
      });
      login(res.user, res.token);
      toast.success('Account created! Welcome to EthioBus 🎉');
      setFormData({ name: '', email: '', phone: '', password: '', confirm: '', role: 'passenger' });
      navigate('/passenger/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eb-reg2-root">

      {/* ── LEFT PANEL — Clean green background only ── */}
      <div className="eb-reg2-left">
        <div className="eb-reg2-blob eb-reg2-blob-1" />
        <div className="eb-reg2-blob eb-reg2-blob-2" />
        <div className="eb-reg2-brand">
          <div className="eb-reg2-brand-icon"><FaBus /></div>
          <div className="eb-reg2-brand-text">
            <h1><span>ETHIO</span>BUS</h1>
          </div>
        </div>
        <div className="eb-reg2-flag" style={{ marginTop: 'auto' }}>
          <span /><span /><span />
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="eb-reg2-right">

        {/* Header */}
        <div className="eb-reg2-header">
          <div className="eb-reg2-header-badge"><FaCheckCircle /></div>
          <h2>Create Account</h2>
          <p>Fill in the details below to get started</p>
        </div>

        {/* Form */}
        <form className="eb-reg2-form" onSubmit={handleSubmit} autoComplete="off">

          {error && (
            <div className="eb-auth-error" style={{ marginBottom: 4 }}>
              <FaExclamationCircle /> {error}
            </div>
          )}

          {/* Row 1: Name + Email */}
          <div className="eb-reg2-grid-2">
            <div className="eb-reg2-field">
              <label>Full Name</label>
              <div className="eb-reg2-input-wrap">
                <FaUser className="eb-reg2-input-icon" />
                <input type="text" placeholder="Your full name" value={formData.name} onChange={e => set('name', e.target.value)} required autoComplete="off" />
              </div>
            </div>
            <div className="eb-reg2-field">
              <label>Email Address</label>
              <div className="eb-reg2-input-wrap">
                <FaEnvelope className="eb-reg2-input-icon" />
                <input type="email" placeholder="you@email.com" value={formData.email} onChange={e => set('email', e.target.value)} required autoComplete="off" />
              </div>
            </div>
          </div>

          {/* Row 2: Phone + Role */}
          <div className="eb-reg2-grid-2">
            <div className="eb-reg2-field">
              <label>Phone Number</label>
              <div className="eb-reg2-input-wrap">
                <FaPhone className="eb-reg2-input-icon" />
                <input type="tel" placeholder="0911 234 567" value={formData.phone} onChange={e => set('phone', e.target.value)} required autoComplete="off" />
              </div>
            </div>
            <div className="eb-reg2-field">
              <label>Account Role</label>
              <div className="eb-reg2-input-wrap">
                <FaUserShield className="eb-reg2-input-icon" />
                <select value={formData.role} onChange={e => set('role', e.target.value)} className="eb-reg2-select">
                  <option value="passenger">Passenger</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 3: Password + Confirm */}
          <div className="eb-reg2-grid-2">
            <div className="eb-reg2-field">
              <label>Password</label>
              <div className="eb-reg2-input-wrap">
                <FaLock className="eb-reg2-input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={formData.password} onChange={e => set('password', e.target.value)} required autoComplete="new-password" />
                <button type="button" className="eb-reg2-eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div className="eb-reg2-field">
              <label>Confirm Password</label>
              <div className="eb-reg2-input-wrap">
                <FaLock className="eb-reg2-input-icon" />
                <input type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" value={formData.confirm} onChange={e => set('confirm', e.target.value)} required />
                <button type="button" className="eb-reg2-eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms */}
          <label className="eb-reg2-checkbox-label">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>
              I agree to the{' '}
              <Link to="/about" className="eb-link-highlight">Terms &amp; Conditions</Link>
              {' '}and{' '}
              <Link to="/about" className="eb-link-highlight">Privacy Policy</Link>
            </span>
          </label>

          <button type="submit" className="eb-reg2-submit-btn" disabled={loading}>
            {loading ? 'Creating Account…' : <><span>Create Account</span> <FaArrowRight /></>}
          </button>
        </form>

        {/* Social */}
        <div className="eb-social-divider"><span>or continue with</span></div>
        <div className="eb-social-buttons">
          <button type="button" className="eb-social-btn" onClick={() => toast.info('Google sign-up coming soon')}>
            <FcGoogle className="eb-social-icon" />
          </button>
          <button type="button" className="eb-social-btn" onClick={() => toast.info('Facebook sign-up coming soon')}>
            <FaFacebook className="eb-social-icon fb" />
          </button>
        </div>

        <div className="eb-auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="eb-link-highlight">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default PassengerRegister;
