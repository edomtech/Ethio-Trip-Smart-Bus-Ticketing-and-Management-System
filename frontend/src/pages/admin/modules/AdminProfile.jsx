import React, { useState } from 'react';
import {
  FaLock, FaEnvelope, FaUser,
  FaCheckCircle, FaShieldAlt, FaKey, FaBuilding, FaPhone, FaIdBadge, FaCamera,
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { useTranslation } from '../../../i18n';

const AdminProfile = () => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Abebe Girma',
    email: user?.email || 'admin@ethiotrip.com',
    phone: user?.phone || '+251 912 345 678',
    company: user?.companyId?.companyName || 'Ethio Trip Transport',
    employeeId: user?._id ? `ADM-${user._id.slice(-6).toUpperCase()}` : 'ADM-ZX8823',
  });

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirmPw: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
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
      toast.success(t('passenger.avatarUpdated', 'Profile photo updated!'));
    } catch {
      toast.error(t('passenger.avatarFailed', 'Photo upload failed.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authAPI.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
      });
      const currentToken = storage.getToken();
      login({ ...user, ...updated }, currentToken);
      toast.success(t('admin.profileUpdated', 'Administrator profile updated successfully! 🎉'));
    } catch {
      toast.error(t('admin.profileUpdateFailed', 'Profile update failed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw) {
      toast.error(t('forms.required', 'Please fill in all password fields'));
      return;
    }
    if (pwForm.newPw !== pwForm.confirmPw) {
      toast.error(t('auth.passwordMismatch', 'New passwords do not match'));
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast.error(t('auth.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }
    setSavingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success(t('auth.passwordChanged', 'Password changed securely! 🔐'));
      setPwForm({ current: '', newPw: '', confirmPw: '' });
    } catch (err) {
      toast.error(err.message || t('auth.passwordChangeFailed', 'Password change failed'));
    } finally {
      setSavingPw(false);
    }
  };

  const initial = (profileForm.name || 'A')[0].toUpperCase();

  return (
    <div className="mod-wrapper">
      <div className="flex items-center gap-[18px] mb-6 py-[18px] px-[22px] bg-white rounded-2xl border border-slate-200">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-700 to-blue-600 text-white text-[1.4rem] font-black flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-blue-700 transition" title={uploadingAvatar ? t('common.loading', 'Uploading...') : t('common.changePhoto', 'Change Photo')}>
            <FaCamera className="text-[8px]" />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
          </label>
        </div>
        <div>
          <h2 className="m-0 mb-1 text-[1.1rem] font-extrabold text-slate-900">{profileForm.name || user?.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.78rem] text-slate-500">{profileForm.email}</span>
            {profileForm.employeeId && <span className="bg-slate-100 text-slate-500 text-[0.72rem] font-bold py-0.5 px-[9px] rounded-full">{profileForm.employeeId}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 max-w-[360px]">
        {[
          { id: 'info', label: t('nav.profile', 'Profile Info') },
          { id: 'security', label: t('auth.changePassword', 'Change Password') }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 p-2.5 rounded-lg border-none font-bold text-[0.85rem] cursor-pointer transition-all ${
              activeTab === tab.id ? 'bg-white text-blue-700 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'bg-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="bg-white rounded-[20px] py-7 px-8 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="mb-6 border-b border-slate-100 pb-3.5">
            <h3 className="m-0 text-[1.2rem] font-black text-slate-900">{t('admin.profileDetails', 'Administrator Profile Details')}</h3>
            <p className="mt-1 text-[0.85rem] text-slate-500">
              {t('admin.profileSub', 'Update your administrative account identity for Ethio Trip system')}
            </p>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 mb-7">
              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaUser className="text-blue-700 mr-1.5 inline" /> {t('forms.fullName', 'Full Administrator Name')}
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaEnvelope className="text-blue-700 mr-1.5 inline" /> {t('forms.email', 'Email Address (Protected)')}
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-400 text-[0.92rem] cursor-not-allowed"
                />
                <span className="text-[0.72rem] text-slate-400 mt-1 inline-block">
                  {t('admin.emailProtectedNotice', 'Email is immutable — contact Super Admin to change.')}
                </span>
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaPhone className="text-blue-700 mr-1.5 inline" /> {t('forms.phone', 'Mobile Contact Number')}
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  maxLength={10}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  onKeyDown={e => {
                    if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder=""
                  className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaBuilding className="text-blue-700 mr-1.5 inline" /> {t('admin.busCompany', 'Bus Company / Operator')}
                </label>
                <input
                  type="text"
                  value={profileForm.company}
                  disabled
                  className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-blue-700 font-extrabold text-[0.92rem] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaIdBadge className="text-blue-700 mr-1.5 inline" /> {t('admin.employeeId', 'Admin Employee ID')}
                </label>
                <input
                  type="text"
                  value={profileForm.employeeId}
                  disabled
                  className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 text-[0.92rem] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaShieldAlt className="text-blue-700 mr-1.5 inline" /> {t('admin.systemRole', 'System Access Role')}
                </label>
                <input
                  type="text"
                  value={t('admin.roleDesc', 'Company Admin — Full Fleet & Schedule Access')}
                  disabled
                  className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-blue-700 font-extrabold text-[0.88rem] cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-3 px-7 bg-gradient-to-br from-blue-700 to-slate-800 text-white border-none rounded-xl font-extrabold text-[0.92rem] inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(29,78,216,0.3)] transition-opacity disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:opacity-95"
            >
              <FaCheckCircle /> {savingProfile ? t('common.saving', 'Saving...') : t('admin.saveDetails', 'Save Administrator Details')}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-[20px] py-7 px-8 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] max-w-[580px]">
          <div className="mb-6 border-b border-slate-100 pb-3.5">
            <h3 className="m-0 text-[1.2rem] font-black text-slate-900">{t('auth.changePassword', 'Security & Password')}</h3>
            <p className="mt-1 text-[0.85rem] text-slate-500">
              {t('admin.securitySub', 'Keep your system administrator account protected')}
            </p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="mb-4.5">
              <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                <FaLock className="text-blue-700 mr-1.5 inline" /> {t('auth.currentPassword', 'Current Password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                required
                className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none focus:border-blue-700"
              />
            </div>

            <div className="mb-4.5">
              <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                <FaKey className="text-blue-700 mr-1.5 inline" /> {t('auth.newPassword', 'New Password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                required
                className="w-full py-3 px-3.5 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none focus:border-blue-700"
              />

              {pwForm.newPw.length > 0 && (
                <div className="mt-2">
                  <div className="h-1 rounded bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-300 ${
                        pwForm.newPw.length > 8 ? 'w-full bg-green-600' : pwForm.newPw.length > 5 ? 'w-3/5 bg-yellow-600' : 'w-[30%] bg-red-600'
                      }`}
                    />
                  </div>
                  <span className={`text-[0.72rem] mt-1 inline-block font-bold ${
                    pwForm.newPw.length > 8 ? 'text-green-600' : pwForm.newPw.length > 5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {pwForm.newPw.length > 8 ? `✓ ${t('auth.strongPassword', 'Strong Password')}` : pwForm.newPw.length > 5 ? `↑ ${t('auth.goodPassword', 'Good — use 9+ characters for best security')}` : `⚠ ${t('auth.weakPassword', 'Weak — at least 6 characters required')}`}
                  </span>
                </div>
              )}
            </div>

            <div className="mb-7">
              <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                <FaShieldAlt className="text-blue-700 mr-1.5 inline" /> {t('auth.confirmNewPassword', 'Confirm New Password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.confirmPw}
                onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                required
                className={`w-full py-3 px-3.5 rounded-xl border-[1.5px] text-[0.92rem] outline-none ${
                  pwForm.confirmPw && pwForm.confirmPw !== pwForm.newPw ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-blue-700'
                }`}
              />
              {pwForm.confirmPw && pwForm.confirmPw !== pwForm.newPw && (
                <span className="text-[0.72rem] text-red-600 mt-1 inline-block font-bold">
                  ✗ {t('auth.passwordsDontMatch', 'Passwords do not match')}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={savingPw}
              className="py-3 px-7 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none rounded-xl font-extrabold text-[0.92rem] inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(15,23,42,0.2)] transition-opacity disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:opacity-95"
            >
              <FaShieldAlt /> {savingPw ? t('common.loading', 'Changing Password...') : t('auth.updatePassword', 'Update Admin Password')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
