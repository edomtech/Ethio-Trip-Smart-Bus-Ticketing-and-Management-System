import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBus, FaEnvelope, FaLock, FaUser, FaPhone, FaIdCard,
  FaEye, FaEyeSlash, FaArrowRight, FaExclamationCircle, FaCheckCircle
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { useTranslation } from '../../i18n.jsx';
import LanguageSelector from '../../components/LanguageSelector';
import { toast } from 'react-toastify';

const PassengerRegister = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', nationalId: '', password: '', confirm: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.isEmailVerified) {
      if (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId)) navigate('/super-admin/dashboard', { replace: true });
      else if (user.role === 'company_admin' || (user.role === 'admin' && user.companyId)) navigate('/company-admin/dashboard', { replace: true });
      else if (user.role === 'company_staff' || user.role === 'agent') navigate('/company-staff/dashboard', { replace: true });
      else navigate('/passenger/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agreed) { setError('Please agree to the Terms & Conditions.'); return; }
    if (!formData.nationalId.trim()) { setError('Please enter your National ID number.'); return; }
    if (formData.password !== formData.confirm) { setError('Passwords do not match.'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      await authAPI.register({
        name: formData.name,
        email: formData.email.trim(),
        phone: formData.phone,
        nationalId: formData.nationalId.trim(),
        password: formData.password
      });
      toast.success('Account created! Please verify your email with the 6-digit OTP code 🎉');
      // Redirect to OTP verification page immediately after account creation
      navigate('/verify-email', { state: { email: formData.email.trim(), newlyRegistered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    toast.info('Redirecting to Google Account Creation...');
    setTimeout(() => {
      window.location.href = 'https://accounts.google.com/signup';
    }, 600);
  };

  return (
    <div className="eb-reg2-root">
      {/* LEFT PANEL */}
      <div className="eb-reg2-left">
        <div className="eb-reg2-blob eb-reg2-blob-1" />
        <div className="eb-reg2-blob eb-reg2-blob-2" />
        <div className="eb-reg2-brand">
          <div className="eb-reg2-brand-icon"><FaBus /></div>
          <div className="eb-reg2-brand-text">
            <h1><span>ETHIO</span> TRIP</h1>
          </div>
        </div>
        <div className="eb-reg2-flag" style={{ marginTop: 'auto' }}>
          <span /><span /><span />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="eb-reg2-right">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <LanguageSelector />
        </div>
        <div className="eb-reg2-header">
          <div className="eb-reg2-header-badge"><FaCheckCircle /></div>
          <h2>{t('auth.createAccount', 'Create Passenger Account')}</h2>
          <p>{t('auth.loginSubtitle', 'Fill in your details to get started with Ethio Trip')}</p>
        </div>

        <form className="eb-reg2-form" onSubmit={handleSubmit} autoComplete="off">
          {error && (
            <div className="eb-auth-error" style={{ marginBottom: 8 }}>
              <FaExclamationCircle /> {error}
            </div>
          )}

          {/* Row 1: Name + Email */}
          <div className="eb-reg2-grid-2">
            <div className="eb-reg2-field">
              <label>Full Name</label>
              <div className="eb-reg2-input-wrap">
                <FaUser className="eb-reg2-input-icon" />
                <input type="text" placeholder="Full Name" value={formData.name} onChange={e => set('name', e.target.value)} required autoComplete="off" />
              </div>
            </div>
            <div className="eb-reg2-field">
              <label>Email Address</label>
              <div className="eb-reg2-input-wrap">
                <FaEnvelope className="eb-reg2-input-icon" />
                <input type="email" placeholder="Email Address" value={formData.email} onChange={e => set('email', e.target.value)} required autoComplete="off" />
              </div>
            </div>
          </div>

          {/* Row 2: Phone + National ID */}
          <div className="eb-reg2-grid-2">
            <div className="eb-reg2-field">
              <label>Phone Number</label>
              <div className="eb-reg2-input-wrap">
                <FaPhone className="eb-reg2-input-icon" />
                <input type="tel" placeholder="+2519..." value={formData.phone} onChange={e => set('phone', e.target.value)} required autoComplete="off" />
              </div>
            </div>
            <div className="eb-reg2-field">
              <label>National ID Number</label>
              <div className="eb-reg2-input-wrap">
                <FaIdCard className="eb-reg2-input-icon" />
                <input type="text" placeholder="e.g. ETH-90821-NID" value={formData.nationalId} onChange={e => set('nationalId', e.target.value)} required autoComplete="off" />
              </div>
            </div>
          </div>

          {/* Row 3: Password + Confirm */}
          <div className="eb-reg2-grid-2">
            <div className="eb-reg2-field">
              <label>Password</label>
              <div className="eb-reg2-input-wrap">
                <FaLock className="eb-reg2-input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={e => set('password', e.target.value)} required autoComplete="new-password" />
                <button type="button" className="eb-reg2-eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div className="eb-reg2-field">
              <label>Confirm Password</label>
              <div className="eb-reg2-input-wrap">
                <FaLock className="eb-reg2-input-icon" />
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password" value={formData.confirm} onChange={e => set('confirm', e.target.value)} required />
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

        {/* Google Sign-In */}
        <div className="eb-social-divider"><span>or continue with</span></div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' }}
          >
            <FcGoogle style={{ fontSize: '1.4rem' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Continue with Google</span>
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
