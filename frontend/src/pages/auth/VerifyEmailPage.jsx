import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaBus, FaShieldAlt, FaKey, FaCheckCircle,
  FaExclamationCircle, FaArrowRight, FaEnvelope, FaRedo
} from 'react-icons/fa';
import { authAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { MESSAGES } from '../../constants/messages';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const notify = useNotification();

  const emailFromState = location.state?.email || user?.email || '';
  const newlyRegistered = location.state?.newlyRegistered || false;

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(newlyRegistered || !!emailFromState);
  const [countdown, setCountdown] = useState(newlyRegistered ? 60 : 0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (email && !newlyRegistered) {
      handleSendOTP(email, true);
    }
    
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async (targetEmail, isAuto = false) => {
    if (!targetEmail.trim()) {
      setError(MESSAGES.verification.emailRequired.title);
      return;
    }
    setResending(true);
    setError('');
    try {
      await authAPI.resendOTP(targetEmail.trim());
      setSent(true);
      setCountdown(60);
      if (!isAuto) {
      }
    } catch (err) {
      if (err?.status === 429) {
        setSent(true);
        setCountdown(60);
        if (!isAuto) {
          notify.info({
            title: MESSAGES.verification.alreadySent.title,
            description: MESSAGES.verification.alreadySent.description,
          });
        }
        return;
      }
      notify.notifyError(err, MESSAGES.verification.failed);
      setError(err?.response?.data?.message || MESSAGES.verification.failed.title);
    } finally {
      setResending(false);
    }
  };

  const handleDigit = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
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
    if (code.length !== 6) {
      setError(MESSAGES.verification.codeIncomplete.title);
      inputRefs.current[0]?.focus();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyEmail(email.trim(), code);
      setOtp(['', '', '', '', '', '']);
      if (res.user && res.token) {
        login(res.user, res.token);
        if (res.user.role === 'super_admin') {
          navigate('/super-admin/dashboard', { replace: true });
        } else if (res.user.role === 'company_admin') {
          navigate('/company-admin/dashboard', { replace: true });
        } else if (res.user.role === 'company_staff') {
          navigate('/company-staff/dashboard', { replace: true });
        } else if (res.user.role === 'conductor') {
          navigate('/conductor/dashboard', { replace: true });
        } else {
          navigate('/passenger/dashboard', { replace: true });
        }
      } else if (user) {
        navigate('/passenger/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      notify.notifyError(err, MESSAGES.verification.codeInvalid);
      setError(err?.response?.data?.message || MESSAGES.verification.codeInvalid.title);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-5 font-poppins">
      <div className="bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 max-w-[490px] w-full shadow-2xl">
        {}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5 hover:opacity-90 transition">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FaBus className="text-white text-xl" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              <span className="text-emerald-400">ETHIO</span> <span className="text-amber-400">TRIP</span>
            </span>
          </Link>

          <div className="w-14 h-14 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
            <FaShieldAlt className="text-2xl text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            Verify Your Email
          </h2>
          {sent ? (
            <div className="text-slate-300 text-sm">
              <span>Verification code sent to </span>
              <strong className="text-emerald-400 break-all">{email}</strong>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="ml-2 text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                (Change)
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              Enter your email and we will send a 6-digit verification code.
            </p>
          )}
        </div>

        {}
        {error && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs mb-5">
            <FaExclamationCircle className="shrink-0 text-red-400 text-sm" /> {error}
          </div>
        )}

        {}
        {!sent ? (
          <div className="mb-5 space-y-3">
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wide">
              Email Address
            </label>
            <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 focus-within:border-emerald-500 transition">
              <FaEnvelope className="text-slate-400 shrink-0 text-sm" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSendOTP(email)}
              disabled={resending || !email.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {resending ? 'Sending Code...' : <><FaEnvelope /> Send Verification Code</>}
            </button>
            {emailFromState && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setSent(true)}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  I already have my code, enter it now →
                </button>
              </div>
            )}
          </div>
        ) : (
          
          <form onSubmit={handleVerify}>
            <div className="mb-6">
              <label className="block text-slate-300 text-xs font-semibold mb-3 text-center uppercase tracking-wide flex items-center justify-center gap-1.5">
                <FaKey className="text-emerald-400" /> Enter 6-Digit Code
              </label>
              <div className="flex gap-2 sm:gap-2.5 justify-center" onPaste={handlePaste}>
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
                    className={`w-11 sm:w-13 h-14 sm:h-15 text-center text-2xl font-black rounded-xl text-white outline-none transition-all ${
                      digit
                        ? 'bg-emerald-500/15 border-2 border-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-slate-900/90 border-2 border-slate-700 focus:border-emerald-500 focus:bg-slate-900'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className={`w-full py-3.5 px-4 font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 mb-4 ${
                otp.join('').length === 6
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/25 cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Verifying...' : <><FaCheckCircle /> Verify Email Address</>}
            </button>

            {}
            <div className="text-center text-sm">
              {countdown > 0 ? (
                <span className="text-slate-400 text-xs">
                  Resend code in <strong className="text-white">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOTP(email)}
                  disabled={resending}
                  className="text-emerald-400 hover:text-emerald-300 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FaRedo className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Sending...' : 'Resend Verification Code'}
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default VerifyEmailPage;
