import React, { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaCheckCircle, FaCamera } from 'react-icons/fa';
import { authAPI } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../i18n';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '../../../utils/cloudinary';

const PassengerProfile = () => {
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', city: user?.city || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const url = await uploadToCloudinary(file);
      setAvatar(url);
      const currentToken = storage.getToken();
      const updated = await authAPI.updateProfile({ avatar: url });
      login({ ...user, ...updated, avatar: url }, currentToken);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error('Photo upload failed. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const updated = await authAPI.updateProfile({ name: form.name, phone: form.phone, city: form.city });
      const currentToken = storage.getToken();
      login({ ...user, ...updated }, currentToken);
      toast.success('Profile updated successfully!');
    } catch (err) { toast.error(err.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message || 'Password change failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {}
      <div className="flex items-center gap-[18px] mb-6 py-[18px] px-[22px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#078930] to-[#056325] text-white text-[1.4rem] font-black flex items-center justify-center overflow-hidden shadow-sm">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'P'
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#078930] text-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-[#056325] transition" title={uploadingAvatar ? 'Uploading...' : 'Change Photo'}>
            <FaCamera className="text-[8px]" />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
          </label>
        </div>
        <div>
          <h2 className="m-0 mb-1 text-[1.1rem] font-extrabold text-slate-900 dark:text-white">{user?.name || 'Passenger'}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.78rem] text-slate-500 dark:text-slate-400">{user?.email}</span>
          </div>
        </div>
      </div>

      {}
      <div className="flex gap-1 mb-5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 max-w-[360px]">
        {[{ id: 'info', label: t('profile info', 'Profile Info') }, { id: 'password', label: t('change password', 'Change Password') }].map(tabItem => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 py-2.5 px-3 rounded-lg border-none font-bold text-[0.85rem] cursor-pointer transition-all ${
              tab === tabItem.id
                ? 'bg-white dark:bg-slate-900 text-[#078930] dark:text-emerald-400 shadow-sm'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-6 px-7">
          <h4 className="font-extrabold text-slate-900 dark:text-white mb-5">{t('personal information', 'Personal Information')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: t('full name', 'Full Name'), field: 'name', icon: <FaUser />, type: 'text', required: true },
              { label: t('email address', 'Email Address'), field: 'email', icon: <FaEnvelope />, type: 'email', disabled: true },
              { label: t('phone number', 'Phone Number'), field: 'phone', icon: <FaPhone />, type: 'text' },
              { label: t('city', 'City'), field: 'city', icon: <FaMapMarkerAlt />, type: 'text' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-[0.8rem] font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {f.label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[0.85rem]">{f.icon}</span>
                  <input
                    type={f.type}
                    value={form[f.field]}
                    disabled={f.disabled}
                    required={f.required}
                    maxLength={f.field === 'phone' ? 10 : undefined}
                    onChange={e => {
                      const val = f.field === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
                      setForm(p => ({ ...p, [f.field]: val }));
                    }}
                    onKeyDown={e => {
                      if (f.field === 'phone' && !/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className={`w-full py-[11px] pr-[14px] pl-9 rounded-xl border border-slate-200 dark:border-slate-700 text-[0.88rem] outline-none transition focus:border-emerald-500 box-border ${
                      f.disabled
                        ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`mt-5 py-3 px-7 border-none rounded-xl font-bold flex items-center gap-2 text-white shadow-sm transition ${
              saving
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-[#078930] to-[#056325] hover:opacity-95 cursor-pointer shadow-emerald-700/20'
            }`}
          >
            <FaCheckCircle />{saving ? t('saving...', 'Saving...') : t('save changes', 'Save Changes')}
          </button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-6 px-7 max-w-[480px]">
          <h4 className="font-extrabold text-slate-900 dark:text-white mb-5">{t('change password', 'Change Password')}</h4>
          {[
            { label: t('current password', 'Current Password'), field: 'currentPassword' },
            { label: t('new password', 'New Password'), field: 'newPassword' },
            { label: t('confirm new password', 'Confirm New Password'), field: 'confirmPassword' },
          ].map(f => (
            <div key={f.field} className="mb-4">
              <label className="block text-[0.8rem] font-bold text-slate-700 dark:text-slate-300 mb-2">{f.label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><FaLock /></span>
                <input
                  type="password"
                  value={pwForm[f.field]}
                  required
                  onChange={e => setPwForm(p => ({ ...p, [f.field]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full py-[11px] pr-[14px] pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[0.88rem] outline-none transition focus:border-emerald-500 box-border"
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className={`py-3 px-7 border-none rounded-xl font-bold transition ${
              saving
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-700 dark:to-emerald-800 text-white hover:opacity-95 cursor-pointer shadow-md'
            }`}
          >
            {saving ? t('saving...', 'Saving...') : t('change password', 'Change Password')}
          </button>
        </form>
      )}
    </div>
  );
};

export default PassengerProfile;
