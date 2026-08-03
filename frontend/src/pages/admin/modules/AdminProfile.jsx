import React, { useState } from 'react';
import {
  FaUserShield, FaLock, FaEnvelope, FaUser, FaCamera,
  FaCheckCircle, FaShieldAlt, FaKey
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../modules.css';

const AdminProfile = () => {
  const { user, login } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Abebe Admin',
    email: user?.email || 'admin@ethiobus.com',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirmPw: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authAPI.updateProfile({ name: profileForm.name });
      login({ ...user, ...updated }, localStorage.getItem('ethiobus_token'));
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw) { toast.error('Please fill all password fields'); return; }
    if (pwForm.newPw !== pwForm.confirmPw) { toast.error('New passwords do not match'); return; }
    if (pwForm.newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed successfully!');
      setPwForm({ current: '', newPw: '', confirmPw: '' });
    } catch (err) {
      toast.error(err.message || 'Password change failed');
    } finally {
      setSavingPw(false);
    }
  };

  const initial = (profileForm.name || 'A')[0].toUpperCase();

  return (
    <div className="mod-wrapper">
      {/* ── Banner ── */}
      <div className="ap-banner">
        <div className="ap-banner-content">
          <div className="ap-avatar-wrap">
            <div className="ap-avatar">{initial}</div>
            <button className="ap-avatar-edit-btn" title="Change photo"><FaCamera /></button>
          </div>
          <div className="ap-banner-info">
            <h2>{profileForm.name}</h2>
            <p>{profileForm.email}</p>
            <span className="ap-role-badge"><FaShieldAlt /> System Administrator</span>
          </div>
        </div>
        <div className="ap-banner-stats">
          <div className="ap-bstat">
            <strong>EthioBus</strong>
            <span>Organization</span>
          </div>
          <div className="ap-bstat">
            <strong>Admin</strong>
            <span>Role Level</span>
          </div>
          <div className="ap-bstat">
            <strong>Active</strong>
            <span>Status</span>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="ap-cards-row">
        {/* Profile Info */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-icon blue"><FaUser /></div>
            <div>
              <h3>Profile Information</h3>
              <p>Update your administrator account details</p>
            </div>
          </div>
          <form onSubmit={handleUpdateProfile} className="ap-form">
            <div className="ap-field">
              <label><FaUser /> Administrator Full Name</label>
              <div className="ap-input-wrap">
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
            </div>
            <div className="ap-field">
              <label><FaEnvelope /> Email Address</label>
              <div className="ap-input-wrap disabled">
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  style={{ cursor: 'not-allowed' }}
                />
              </div>
              <span className="ap-hint">Email cannot be changed for security reasons.</span>
            </div>
            <button type="submit" className="ap-btn ap-btn-blue" disabled={savingProfile}>
              {savingProfile
                ? <><span className="ap-spinner" /> Saving...</>
                : <><FaCheckCircle /> Save Changes</>
              }
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-icon green"><FaKey /></div>
            <div>
              <h3>Security &amp; Password</h3>
              <p>Keep your account secure with a strong password</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="ap-form">
            <div className="ap-field">
              <label><FaLock /> Current Password</label>
              <div className="ap-input-wrap">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.current}
                  onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                />
              </div>
            </div>
            <div className="ap-field">
              <label><FaLock /> New Password</label>
              <div className="ap-input-wrap">
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={pwForm.newPw}
                  onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })}
                />
              </div>
            </div>
            <div className="ap-field">
              <label><FaLock /> Confirm New Password</label>
              <div className="ap-input-wrap">
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={pwForm.confirmPw}
                  onChange={e => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                />
              </div>
            </div>

            {/* Strength hint */}
            <div className="ap-pw-strength">
              <div className="ap-pw-bar"><div style={{ width: pwForm.newPw.length > 8 ? '100%' : pwForm.newPw.length > 5 ? '66%' : pwForm.newPw.length > 0 ? '33%' : '0%' }} className={pwForm.newPw.length > 8 ? 'strong' : pwForm.newPw.length > 5 ? 'medium' : 'weak'} /></div>
              <span>{pwForm.newPw.length > 8 ? 'Strong password ✓' : pwForm.newPw.length > 5 ? 'Good password' : 'Use 6+ characters'}</span>
            </div>

            <button type="submit" className="ap-btn ap-btn-green" disabled={savingPw}>
              {savingPw
                ? <><span className="ap-spinner" /> Changing...</>
                : <><FaShieldAlt /> Change Password</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
