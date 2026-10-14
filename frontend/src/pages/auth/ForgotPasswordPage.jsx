import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBus, FaEnvelope, FaLock, FaEye, FaEyeSlash,
  FaCheckCircle, FaExclamationCircle, FaArrowLeft, FaKey, FaShieldAlt
} from 'react-icons/fa';
import { authAPI } from '../../utils/api';
import { useNotification } from '../../contexts/NotificationContext';
import { MESSAGES } from '../../constants/messages';
import { validators } from '../../utils/validation';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const notify = useNotification();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    const emailVal = email.trim();
    const validation = validators.email(emailVal);
    if (!validation.valid) {
      setError(validation.message.title);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(emailVal);
      setStep(2);
      setCountdown(60);
      notify.success({
        title: 'Verification Code Sent',
        description: `We sent a 6-digit password reset code to ${emailVal}`,
      });
    } catch (err) {
      if (err?.status === 429) {
        setStep(2);
        setCountdown(60);
        notify.info({
          title: 'Code Already Sent',
          description: 'Please check your inbox or wait before requesting a new code.',
        });
        return;
      }
      notify.notifyError(err, { title: 'Failed to Send Code', description: err?.message || 'Could not send verification code.' });
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    const passVal = validators.password(newPassword);
    if (!passVal.valid) {
      setError(passVal.message.title);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword({ email: email.trim(), otp: code, newPassword });
      setStep(3);
      notify.success({
        title: 'Password Reset Successful',
        description: 'You can now log in with your new password.',
      });
    } catch (err) {
      notify.notifyError(err, { title: 'Password Reset Failed', description: err?.message || 'Invalid code or verification failed.' });
      setError(err?.message || 'Failed to reset password. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-poppins">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 mb-4 text-slate-400 hover:text-emerald-400 text-xs font-bold transition">
            <FaArrowLeft className="text-[10px]" /> Back to Login
          </Link>

          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/20 text-emerald-400 text-xl">
            <FaShieldAlt />
          </div>

          <h2 className="text-xl font-black text-white m-0">
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Enter Verification Code'}
            {step === 3 && 'Password Reset Complete'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            {step === 1 && 'Enter your email address to receive a recovery code.'}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && 'Your password has been updated successfully.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs font-bold text-rose-400 flex items-center gap-2 mb-4">
            <FaExclamationCircle className="shrink-0 text-sm" /> {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                <FaEnvelope className="text-slate-400 mr-2 shrink-0 text-xs" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="name@example.com"
                  className="w-full bg-transparent border-0 outline-none text-xs font-medium text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Recovery Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-[11px] font-bold uppercase tracking-wider mb-2 text-center">
                6-Digit Code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                    className={`w-10 h-12 text-center text-xl font-bold rounded-xl text-white outline-none transition-all ${
                      digit ? 'bg-emerald-950/40 border-2 border-emerald-500' : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                New Password
              </label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                <FaLock className="text-slate-400 mr-2 shrink-0 text-xs" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-transparent border-0 outline-none text-xs font-medium text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer ml-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition">
                <FaLock className="text-slate-400 mr-2 shrink-0 text-xs" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-transparent border-0 outline-none text-xs font-medium text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6 || !newPassword}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>

            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-[11px] text-slate-400">Resend code in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-xs text-emerald-400 hover:underline cursor-pointer font-bold"
                >
                  Resend Code
                </button>
              )}
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-3xl">
              <FaCheckCircle />
            </div>
            <p className="text-xs text-slate-300">
              Your password has been changed. You can now log in using your new credentials.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
