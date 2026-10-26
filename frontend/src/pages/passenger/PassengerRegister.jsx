import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBus, FaEnvelope, FaLock, FaUser, FaPhone, FaIdCard,
  FaEye, FaEyeSlash, FaArrowRight, FaArrowLeft, FaExclamationCircle, FaCheckCircle
} from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { useTranslation } from '../../i18n';
import { useNotification } from '../../contexts/NotificationContext';
import { MESSAGES } from '../../constants/messages';
import { validators, validateSequentially } from '../../utils/validation';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeToggle from '../../components/ThemeToggle';

import { useGoogleLogin } from '@react-oauth/google';

const PassengerRegister = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', nationalId: '', password: '', confirm: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const notify = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.isEmailVerified) {
      if (user.role === 'super_admin' || (user.role === 'admin' && !user.companyId)) navigate('/super-admin/dashboard', { replace: true });
      else if (user.role === 'company_admin' || (user.role === 'admin' && user.companyId)) navigate('/company-admin/dashboard', { replace: true });
      else if (user.role === 'company_staff' || user.role === 'agent') navigate('/company-staff/dashboard', { replace: true });
      else navigate('/passenger/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const set = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setFieldErrors(prev => (prev[field] ? { ...prev, [field]: null } : prev));
    if (error) setError('');
  };

  const fieldError = (field) =>
    fieldErrors[field] ? fieldErrors[field].description || fieldErrors[field].title : '';

  const inputBorder = (field) =>
    fieldErrors[field]
      ? 'border-rose-300 dark:border-rose-800'
      : 'border-slate-200 dark:border-slate-700';

  const FieldError = ({ field }) =>
    fieldErrors[field] ? (
      <span className="flex items-center gap-1 text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
        <FaExclamationCircle className="shrink-0" /> {fieldError(field)}
      </span>
    ) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const result = validateSequentially(
      {
        name: validators.fullName(formData.name),
        email: validators.email(formData.email),
        phone: validators.phone(formData.phone),
        nationalId: validators.nationalId(formData.nationalId),
        password: validators.password(formData.password),
        confirm: validators.confirmPassword(formData.confirm, formData.password),
        agreed: validators.terms(agreed),
      },
      (field, fieldMessage) => setFieldErrors({ [field]: fieldMessage })
    );

    if (!result.valid) {
      setError(result.error.title || MESSAGES.registration.failed.title);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        nationalId: formData.nationalId.trim(),
        password: formData.password
      });
      notify.success({
        title: MESSAGES?.registration?.verificationSent?.title || 'Verification Code Sent',
        description: `Verification code sent to ${formData.email.trim()}. Please check your email inbox and enter the code.`,
      });
      navigate('/verify-email', {
        state: {
          email: formData.email.trim(),
          newlyRegistered: true,
        }
      });
    } catch (err) {
      const backendMessage = err?.data?.message || err?.message || '';
      const alreadyRegistered = /already registered|already in use/i.test(backendMessage);
      const message = alreadyRegistered ? MESSAGES.registration.emailTaken : MESSAGES.registration.failed;
      notify.notifyError(err, message);
      setError(message.title);
      setFieldErrors(alreadyRegistered ? { email: message } : {});
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
      notify.success({
        title: 'Welcome to Ethio Trip',
        description: `Your account is ready, ${res.user.name}.`,
      });
      if (res.user.role === 'super_admin' || (res.user.role === 'admin' && !res.user.companyId)) {
        navigate('/super-admin/dashboard', { replace: true });
      } else if (res.user.role === 'company_admin' || (res.user.role === 'admin' && res.user.companyId)) {
        navigate('/company-admin/dashboard', { replace: true });
      } else if (res.user.role === 'company_staff' || res.user.role === 'agent') {
        navigate('/company-staff/dashboard', { replace: true });
      } else {
        navigate('/passenger/dashboard', { replace: true });
      }
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

  const triggerGoogleAuth = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-poppins p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl">
        {}
        <div
          className="hidden lg:block relative bg-[url('/images/hero_bus_clean.jpg')] bg-cover bg-center min-h-[520px]"
        >
          {}
          <div className="absolute inset-0 bg-emerald-500/5 hover:bg-transparent transition-colors" />
        </div>

        {}
        <div className="flex flex-col justify-center px-8 py-8 bg-white dark:bg-slate-900 relative transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
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
            <div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-sm mb-2">
                <FaCheckCircle />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white m-0">
                {t('auth.createAccount', 'Create Passenger Account')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-1">
                {t('auth.loginSubtitle', 'Fill in your details to get started with Ethio Trip')}
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit} autoComplete="off">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <FaExclamationCircle className="shrink-0 text-sm" /> {error}
                </div>
              )}

              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.fullName', 'Full Name')} *
                  </label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('name')}`}>
                    <FaUser className="text-slate-400 mr-2 shrink-0 text-xs" />
                    <input
                      type="text"
                      name="name"
                      data-field="name"
                      placeholder=""
                      value={formData.name}
                      onChange={e => set('name', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.name)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-800 dark:text-slate-100"
                      autoComplete="off"
                    />
                  </div>
                  <FieldError field="name" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.emailAddress', 'Email Address')} *
                  </label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('email')}`}>
                    <FaEnvelope className="text-slate-400 mr-2 shrink-0 text-xs" />
                    <input
                      type="email"
                      name="email"
                      data-field="email"
                      placeholder=""
                      value={formData.email}
                      onChange={e => set('email', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.email)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-800 dark:text-slate-100"
                      autoComplete="off"
                    />
                  </div>
                  <FieldError field="email" />
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.phoneNumber', 'Phone Number')} *
                  </label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('phone')}`}>
                    <FaPhone className="text-slate-400 mr-2 shrink-0 text-xs" />
                    <input
                      type="tel"
                      name="phone"
                      data-field="phone"
                      placeholder=""
                      maxLength={10}
                      value={formData.phone}
                      onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={e => {
                        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-800 dark:text-slate-100"
                      autoComplete="off"
                    />
                  </div>
                  <FieldError field="phone" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.nationalId', 'National ID Number')} *
                  </label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('nationalId')}`}>
                    <FaIdCard className="text-slate-400 mr-2 shrink-0 text-xs" />
                    <input
                      type="text"
                      name="nationalId"
                      data-field="nationalId"
                      placeholder=""
                      value={formData.nationalId}
                      onChange={e => set('nationalId', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.nationalId)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-800 dark:text-slate-100"
                      autoComplete="off"
                    />
                  </div>
                  <FieldError field="nationalId" />
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.password', 'Password')} *
                  </label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('password')}`}>
                    <FaLock className="text-slate-400 mr-2 shrink-0 text-xs" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      data-field="password"
                      placeholder=""
                      value={formData.password}
                      onChange={e => set('password', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.password)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-800 dark:text-slate-100"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 text-xs cursor-pointer"
                      onClick={() => setShowPassword(p => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <FieldError field="password" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.confirmPassword', 'Confirm Password')} *
                  </label>
                  <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${inputBorder('confirm')}`}>
                    <FaLock className="text-slate-400 mr-2 shrink-0 text-xs" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      name="confirm"
                      data-field="confirm"
                      placeholder=""
                      value={formData.confirm}
                      onChange={e => set('confirm', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.confirm)}
                      className="w-full bg-transparent border-0 outline-none text-xs font-medium text-slate-800 dark:text-slate-100"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 text-xs cursor-pointer"
                      onClick={() => setShowConfirm(p => !p)}
                      aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                      tabIndex={-1}
                    >
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <FieldError field="confirm" />
                </div>
              </div>

              {}
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-600 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  name="agreed"
                  data-field="agreed"
                  checked={agreed}
                  onChange={e => {
                    setAgreed(e.target.checked);
                    setFieldErrors(prev => (prev.agreed ? { ...prev, agreed: null } : prev));
                  }}
                  aria-invalid={Boolean(fieldErrors.agreed)}
                  className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>
                  {t('auth.agreeTerms', 'I agree to the')}{' '}
                  <Link to="/about" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
                    {t('auth.termsAndConditions', 'Terms & Conditions')}
                  </Link>
                  {' '}{t('auth.and', 'and')}{' '}
                  <Link to="/about" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
                    {t('auth.privacyPolicy', 'Privacy Policy')}
                  </Link>
                </span>
              </label>
              <FieldError field="agreed" />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  t('common.loading', 'Creating Account…')
                ) : (
                  <>
                    <span>{t('auth.createAccountBtn', 'Create Account')}</span>
                    <FaArrowRight />
                  </>
                )}
              </button>
            </form>

            {}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                {t('auth.orContinueWith', 'or continue with')}
              </span>
            </div>

            <div>
              <button
                type="button"
                onClick={() => triggerGoogleAuth()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm"
              >
                <FcGoogle className="text-lg" />
                <span>{t('auth.continueGoogle', 'Continue with Google')}</span>
              </button>
            </div>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
              <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                {t('auth.signInButton', 'Sign in')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerRegister;
