import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBus, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaExclamationCircle,
  FaArrowRight, FaArrowLeft
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { useTranslation } from '../../i18n';
import { useNotification } from '../../contexts/NotificationContext';
import { MESSAGES } from '../../constants/messages';
import { validators, validateSequentially } from '../../utils/validation';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';
import { useGoogleLogin } from '@react-oauth/google';

import { getDashboardPath } from '../../utils/roleUtils';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { user, login } = useAuth();
  const { t, changeLanguage } = useTranslation();
  const notify = useNotification();
  const navigate = useNavigate();

  const redirectUserByRole = (usr) => {
    const target = getDashboardPath(usr?.role, usr?.companyId);
    navigate(target, { replace: true });
  };

  useEffect(() => {
    if (user) {
      redirectUserByRole(user);
    }
  }, [user, navigate]);

  const fieldError = (field) =>
    fieldErrors[field] ? fieldErrors[field].description || fieldErrors[field].title : '';

  const inputBorder = (field) =>
    fieldErrors[field]
      ? 'border-rose-300 dark:border-rose-800'
      : 'border-slate-200 dark:border-slate-700';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const result = validateSequentially(
      {
        email: validators.email(email),
        password: validators.required(password, MESSAGES.login.passwordRequired),
      },
      (field, fieldMessage) => setFieldErrors({ [field]: fieldMessage })
    );

    if (!result.valid) {
      setError(result.error.title || MESSAGES.login.failed.title);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login({ email: email.trim().toLowerCase(), password });
      login(res.user, res.token);
      if (res.user?.preferredLanguage) {
        changeLanguage(res.user.preferredLanguage);
      }
      setEmail('');
      setPassword('');
      redirectUserByRole(res.user);
    } catch (err) {
      if (
        err.code === 'EMAIL_NOT_VERIFIED' ||
        err.data?.code === 'EMAIL_NOT_VERIFIED' ||
        err.code === 'VERIFICATION_PENDING' ||
        err.data?.code === 'VERIFICATION_PENDING'
      ) {
        const unverifiedEmail = err.data?.email || err.email || email.trim().toLowerCase();
        if (err.code === 'VERIFICATION_PENDING' || err.data?.code === 'VERIFICATION_PENDING') {
          notify.warning({
            title: MESSAGES.login.verificationPending.title,
            description: MESSAGES.login.verificationPending.description,
          });
        }
        navigate('/verify-email', { state: { email: unverifiedEmail, newlyRegistered: true } });
        return;
      }
      notify.notifyError(err, MESSAGES.login.failed);
      setError(err?.response?.data?.message || MESSAGES.login.failed.title);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.googleLogin({
        accessToken: tokenResponse.access_token,
      });
      login(res.user, res.token);
      if (res.user?.preferredLanguage) {
        changeLanguage(res.user.preferredLanguage);
      }
      redirectUserByRole(res.user);
    } catch (err) {
      notify.notifyError(err, MESSAGES.login.googleFailed);
      setError(MESSAGES.login.googleFailed.title);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(MESSAGES.login.googleCancelled.title);
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-poppins p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl">
          {}
          <div
            className="hidden lg:block relative bg-[url('/images/hero_bus_clean.jpg')] bg-cover bg-center min-h-[480px]"
          >
            {}
            <div className="absolute inset-0 bg-emerald-500/5 hover:bg-transparent transition-colors" />
          </div>

          {}
          <div className="flex flex-col justify-center px-8 py-8 bg-white dark:bg-slate-900 relative transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition"
              >
                <FaArrowLeft className="text-[10px]" /> {t('Back to Home', 'Back to Home')}
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSelector />
              </div>
            </div>

            <div className="w-full space-y-4">
              {}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-600/30">
                  <FaBus />
                </div>
                <div className="leading-tight">
                  <h1 className="text-base font-black m-0 tracking-wide">
                    <span className="text-emerald-600 dark:text-emerald-400">ETHIO</span>{' '}
                    <span className="text-slate-900 dark:text-white">TRIP</span>
                  </h1>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider m-0">Emare ICT Hub</p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white m-0">{t('auth.loginTitle', 'Account Login')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">{t('auth.loginSubtitle', 'Sign in to manage your tickets and bookings')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <FaExclamationCircle className="shrink-0" /> <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{t('auth.emailAddress', 'Email Address')}</label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3.5 py-2.5 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('email')}`}>
                    <FaEnvelope className="text-slate-400 mr-2 text-xs shrink-0" />
                    <input
                      type="email"
                      name="email"
                      data-field="email"
                      placeholder=""
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        setFieldErrors(prev => (prev.email ? { ...prev, email: null } : prev));
                      }}
                      aria-invalid={Boolean(fieldErrors.email)}
                      autoComplete="off"
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                  {fieldErrors.email ? (
                    <span className="flex items-center gap-1 text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
                      <FaExclamationCircle className="shrink-0" /> {fieldError('email')}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{t('auth.password', 'Password')}</label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3.5 py-2.5 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('password')}`}>
                    <FaLock className="text-slate-400 mr-2 text-xs shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      data-field="password"
                      placeholder=""
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        setFieldErrors(prev => (prev.password ? { ...prev, password: null } : prev));
                      }}
                      aria-invalid={Boolean(fieldErrors.password)}
                      autoComplete="current-password"
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer ml-2 p-1"
                      onClick={() => setShowPassword(p => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <span className="flex items-center gap-1 text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
                      <FaExclamationCircle className="shrink-0" /> {fieldError('password')}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{t('auth.rememberMe', 'Remember me')}</span>
                  </label>
                  <Link to="/forgot-password" className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
                    {t('auth.forgotPassword', 'Forgot Password?')}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? t('common.loading', 'Authenticating...') : <><span>{t('auth.signInButton', 'Sign In')}</span> <FaArrowRight /></>}
                </button>
              </form>

              {}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => triggerGoogleLogin()}
                  title="Sign in with Google"
                  aria-label="Sign in with Google"
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44.5 20H24v8.5h11.7C34.2 33.5 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l6-6C34.2 5.9 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z" fill="#FFC107"/>
                    <path d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 5.9 1.2 8 3.1l6-6C34.2 5.9 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" fill="#FF3D00"/>
                    <path d="M24 44c5.3 0 10.1-1.8 13.8-4.8L31 33.6c-2 1.4-4.5 2.4-7 2.4-5.6 0-10.3-3.7-11.9-8.8l-6.9 5.3C8.6 39.7 15.8 44 24 44z" fill="#4CAF50"/>
                    <path d="M44.5 20H24v8.5h11.7c-.8 2.4-2.4 4.4-4.4 5.8l6.8 5.6C41.8 36.5 44.5 30.7 44.5 24c0-1.3-.1-2.7-.2-4H44.5z" fill="#1976D2"/>
                  </svg>
                </button>
              </div>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                {t('auth.noAccount', "Don't have an account?")}{' '}
                <Link to="/register" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  {t('auth.createAccount', 'Sign Up')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default LoginPage;
