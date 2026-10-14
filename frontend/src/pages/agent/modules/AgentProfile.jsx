import React, { useState } from 'react';
import {
  FaLock, FaEnvelope, FaUser, FaBuilding, FaPhone,
  FaMapMarkerAlt, FaCheckCircle, FaShieldAlt, FaKey, FaCamera,
  FaIdBadge
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../utils/api';
import { storage } from '../../../utils/storage';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { useTranslation } from '../../../i18n';

const AgentProfile = () => {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
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
      toast.success(t('passenger.avatarUpdated', 'Profile photo updated successfully!'));
    } catch {
      toast.error(t('passenger.avatarFailed', 'Photo upload failed. Please try again.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Samuel Bekele',
    email: user?.email || 'agent.samuel@ethiotrip.com',
    phone: user?.phone || '+251 911 234 567',
    city: user?.city || 'Addis Ababa',
    station: user?.station || 'Meskel Square Central Terminal',
    employeeId: user?._id ? `STF-${user._id.slice(-6).toUpperCase()}` : 'STF-884920',
  });

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirmPw: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authAPI.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        city: profileForm.city,
      });
      const currentToken = storage.getToken();
      login({ ...user, ...updated }, currentToken);
      toast.success(t('agent.profileUpdated', 'Staff profile details updated successfully! 🎉'));
    } catch (err) {
      toast.error(err.message || t('admin.profileUpdateFailed', 'Profile update failed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw) {
      toast.error(t('forms.required', 'Please enter both current and new password'));
      return;
    }
    if (pwForm.newPw !== pwForm.confirmPw) {
      toast.error(t('auth.passwordMismatch', 'New passwords do not match'));
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast.error(t('auth.passwordTooShort', 'Password must be at least 6 characters long'));
      return;
    }

    setSavingPw(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.current,
        newPassword: pwForm.newPw,
      });
      toast.success(t('auth.passwordChanged', 'Password changed securely!'));
      setPwForm({ current: '', newPw: '', confirmPw: '' });
    } catch (err) {
      toast.error(err.message || t('auth.passwordChangeFailed', 'Password update failed'));
    } finally {
      setSavingPw(false);
    }
  };

  const initial = (profileForm.name || user?.name || 'A')[0].toUpperCase();

  return (
    <div className="mod-wrapper">
      <div className="flex items-center gap-4.5 mb-6 p-4.5 px-5.5 bg-white rounded-2xl border border-slate-200">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-[1.4rem] font-black flex items-center justify-center overflow-hidden shadow-sm">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer shadow-sm hover:bg-emerald-700 transition" title={uploadingAvatar ? t('common.loading', 'Uploading...') : t('common.changePhoto', 'Change Photo')}>
            <FaCamera className="text-[8px]" />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
          </label>
        </div>
        <div>
          <h2 className="m-0 mb-1 text-[1.1rem] font-extrabold text-slate-900">{profileForm.name || user?.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.78rem] text-slate-500">{profileForm.email}</span>
            {profileForm.employeeId && (
              <span className="bg-slate-100 text-slate-500 text-[0.72rem] font-bold px-2 py-0.5 rounded-full">
                {profileForm.employeeId}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 max-w-[360px]">
        {[
          { id: 'details', label: t('nav.profile', 'Profile Info') },
          { id: 'security', label: t('auth.changePassword', 'Change Password') }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 p-2.5 rounded-lg border-none font-bold text-[0.85rem] cursor-pointer transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-emerald-700 shadow-[0_1px_4px_rgba(0,0,0,0.08)]'
                : 'bg-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="bg-white rounded-[20px] p-7 px-8 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="mb-6 border-b border-slate-100 pb-3.5">
            <h3 className="m-0 text-[1.2rem] font-black text-slate-900">{t('agent.staffAccountDetails', 'Staff Account Details')}</h3>
            <p className="mt-1 mb-0 text-[0.85rem] text-slate-500">
              {t('agent.manageStaffContact', 'Manage your personal staff contact info and station identity')}
            </p>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaUser className="text-emerald-700 mr-1.5 inline" /> {t('forms.fullName', 'Full Name')}
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaEnvelope className="text-emerald-700 mr-1.5 inline" /> {t('agent.officialEmailProtected', 'Official Staff Email (Protected)')}
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 text-[0.92rem] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaPhone className="text-emerald-700 mr-1.5 inline" /> {t('forms.phone', 'Mobile Phone Number')}
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
                  required
                  placeholder=""
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaBuilding className="text-emerald-700 mr-1.5 inline" /> {t('agent.assignedStation', 'Assigned Station / Terminal')}
                </label>
                <input
                  type="text"
                  value={profileForm.station}
                  disabled
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 text-[0.92rem] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaMapMarkerAlt className="text-emerald-700 mr-1.5 inline" /> {t('agent.terminalCity', 'Terminal City / Region')}
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  required
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                  <FaIdBadge className="text-emerald-700 mr-1.5 inline" /> {t('agent.staffAccessRole', 'Staff Access Role')}
                </label>
                <input
                  type="text"
                  value={t('agent.roleDescription', 'Ticket Counter Agent / Boarding Staff')}
                  disabled
                  className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-emerald-700 font-extrabold text-[0.92rem] cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-3 px-7 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white border-none rounded-xl font-extrabold text-[0.92rem] cursor-pointer inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(4,120,87,0.3)] hover:opacity-95 transition-opacity disabled:opacity-75"
            >
              <FaCheckCircle /> {savingProfile ? t('common.saving', 'Saving Details...') : t('forms.saveChanges', 'Save Profile Changes')}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-[20px] p-7 px-8 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] max-w-[580px]">
          <div className="mb-6 border-b border-slate-100 pb-3.5">
            <h3 className="m-0 text-[1.2rem] font-black text-slate-900">{t('auth.changePassword', 'Security & Password')}</h3>
            <p className="mt-1 mb-0 text-[0.85rem] text-slate-500">
              {t('agent.securitySub', 'Ensure your ticketing terminal account remains secure')}
            </p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="mb-4.5">
              <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                <FaLock className="text-emerald-700 mr-1.5 inline" /> {t('auth.currentPassword', 'Current Password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                required
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 focus:border-emerald-600"
              />
            </div>

            <div className="mb-4.5">
              <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                <FaKey className="text-emerald-700 mr-1.5 inline" /> {t('auth.newPassword', 'New Password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                required
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 focus:border-emerald-600"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[0.8rem] font-extrabold text-slate-700 mb-2">
                <FaShieldAlt className="text-emerald-700 mr-1.5 inline" /> {t('auth.confirmNewPassword', 'Confirm New Password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.confirmPw}
                onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                required
                className="w-full px-3.5 py-3 rounded-xl border-[1.5px] border-slate-300 text-[0.92rem] outline-none text-slate-900 focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              disabled={savingPw}
              className="py-3 px-7 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none rounded-xl font-extrabold text-[0.92rem] cursor-pointer inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(15,23,42,0.2)] hover:opacity-95 transition-opacity disabled:opacity-75"
            >
              <FaShieldAlt /> {savingPw ? t('common.loading', 'Updating Password...') : t('auth.updatePassword', 'Update Password')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AgentProfile;
