import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaBus, FaShieldAlt, FaKey, FaCheckCircle,
  FaExclamationCircle, FaArrowRight, FaEnvelope, FaRedo
} from 'react-icons/fa';
import { authAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  // Email can come from navigation state (after register) or from logged-in user
  const emailFromState = location.state?.email || user?.email || '';

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [demoOTP, setDemoOTP] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  // Auto-send OTP when page loads if email is known
  useEffect(() => {
    if (email) {
      handleSendOTP(email, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async (targetEmail, isAuto = false) => {
    if (!targetEmail.trim()) { setError('Please enter your email address.'); return; }
    setResending(true);
    setError('');
    try {
      const res = await authAPI.sendOTP(targetEmail.trim());
      setDemoOTP(res.demoOTP || '');
      setSent(true);
      setCountdown(60); // 60 second cooldown before resend
      if (!isAuto) toast.success(`Verification code sent to ${targetEmail}`);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Handle individual digit input
  const handleDigit = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-advance focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits of your verification code.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyOTP(email.trim(), code);
      toast.success('✅ Email verified successfully! Welcome to Ethio Trip.');
      if (res.user && res.token) {
        login(res.user, res.token);
        if (res.user.role === 'super_admin' || (res.user.role === 'admin' && !res.user.companyId)) {
          navigate('/super-admin/dashboard', { replace: true });
        } else if (res.user.role === 'company_admin' || (res.user.role === 'admin' && res.user.companyId)) {
          navigate('/company-admin/dashboard', { replace: true });
        } else if (res.user.role === 'company_staff' || res.user.role === 'agent') {
          navigate('/company-staff/dashboard', { replace: true });
        } else {
          navigate('/passenger/dashboard', { replace: true });
        }
      } else if (user) {
        navigate('/passenger/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
      // Clear OTP input on failure
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user) navigate('/passenger/dashboard', { replace: true });
    else navigate('/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Poppins', sans-serif"
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '48px 40px',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaBus style={{ color: '#fff', fontSize: '1.2rem' }} />
            </div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
              <span style={{ color: '#34d399' }}>ETHIO</span>BUS
            </span>
          </Link>

          <div style={{ width: 64, height: 64, background: 'rgba(52,211,153,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FaShieldAlt style={{ fontSize: '1.8rem', color: '#34d399' }} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px' }}>
            Verify Your Email
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            {sent
              ? <>A 6-digit code was sent to <strong style={{ color: '#f8fafc' }}>{email}</strong></>
              : 'Enter your email and we\'ll send a verification code'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', marginBottom: 20 }}>
            <FaExclamationCircle /> {error}
          </div>
        )}

        {/* Email input (if not auto-sent) */}
        {!sent && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: '10px 16px' }}>
              <FaEnvelope style={{ color: '#64748b' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{ border: 'none', background: 'transparent', color: '#f8fafc', outline: 'none', width: '100%', fontSize: '0.9rem' }}
              />
            </div>
            <button
              onClick={() => handleSendOTP(email)}
              disabled={resending}
              style={{ width: '100%', marginTop: 12, padding: '12px', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
            >
              {resending ? 'Sending Code...' : <><FaEnvelope style={{ marginRight: 8 }} />Send Verification Code</>}
            </button>
          </div>
        )}

        {/* OTP Input — 6 digit boxes */}
        {sent && (
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                <FaKey style={{ marginRight: 6 }} />Enter 6-Digit Verification Code
              </label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }} onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    style={{
                      width: 52, height: 60,
                      textAlign: 'center',
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      background: digit ? 'rgba(52,211,153,0.1)' : '#0f172a',
                      border: digit ? '2px solid #34d399' : '2px solid #334155',
                      borderRadius: 12,
                      color: '#f8fafc',
                      outline: 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>

              {/* Demo OTP hint */}
              {demoOTP && (
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                  Demo code: <span style={{ letterSpacing: 3 }}>{demoOTP}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              style={{
                width: '100%', padding: '14px',
                background: otp.join('').length === 6 ? 'linear-gradient(135deg, #059669, #10b981)' : '#334155',
                color: '#fff', border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: '1rem', cursor: otp.join('').length === 6 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 16,
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Verifying...' : <><FaCheckCircle /> Verify Email Address</>}
            </button>

            {/* Resend link */}
            <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              {countdown > 0 ? (
                <span style={{ color: '#64748b' }}>Resend code in <strong style={{ color: '#f8fafc' }}>{countdown}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOTP(email)}
                  disabled={resending}
                  style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <FaRedo style={{ marginRight: 6 }} />{resending ? 'Sending...' : 'Resend Verification Code'}
                </button>
              )}
            </div>
          </form>
        )}

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={handleSkip}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.82rem' }}
          >
            Skip for now → Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
