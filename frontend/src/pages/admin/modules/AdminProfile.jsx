import React, { useState } from 'react';
import {
  FaUserShield, FaLock, FaEnvelope, FaUser,
  FaCheckCircle, FaShieldAlt, FaKey, FaBuilding, FaPhone, FaIdBadge,
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../utils/api';
import { toast } from 'react-toastify';

const AdminProfile = () => {
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authAPI.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
      });
      login({ ...user, ...updated }, localStorage.getItem('ethiobus_token'));
      toast.success('Administrator profile updated successfully! 🎉');
    } catch {
      toast.error('Profile update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (pwForm.newPw !== pwForm.confirmPw) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
      toast.success('Password changed securely! 🔐');
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
      {/* ── Clean Profile Header Card ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '18px 22px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {initial}
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{profileForm.name || user?.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{profileForm.email}</span>
            {profileForm.employeeId && <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{profileForm.employeeId}</span>}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4, maxWidth: 360 }}>
        {[{ id: 'info', label: 'Profile Info' }, { id: 'security', label: 'Change Password' }].map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: activeTab === t.id ? '#fff' : 'transparent', color: activeTab === t.id ? '#1d4ed8' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all .2s', boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Info Tab ── */}
      {activeTab === 'info' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Administrator Profile Details</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Update your administrative account identity for Ethio Trip system
            </p>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaUser style={{ color: '#1d4ed8', marginRight: 6 }} /> Full Administrator Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaEnvelope style={{ color: '#1d4ed8', marginRight: 6 }} /> Email Address (Protected)
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', fontSize: '0.92rem', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'inline-block' }}>
                  Email is immutable — contact Super Admin to change.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaPhone style={{ color: '#1d4ed8', marginRight: 6 }} /> Mobile Contact Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+251 9XX XXX XXX"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaBuilding style={{ color: '#1d4ed8', marginRight: 6 }} /> Bus Company / Operator
                </label>
                <input
                  type="text"
                  value={profileForm.company}
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1d4ed8', fontWeight: 800, fontSize: '0.92rem', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaIdBadge style={{ color: '#1d4ed8', marginRight: 6 }} /> Admin Employee ID
                </label>
                <input
                  type="text"
                  value={profileForm.employeeId}
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.92rem', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaShieldAlt style={{ color: '#1d4ed8', marginRight: 6 }} /> System Access Role
                </label>
                <input
                  type="text"
                  value="Company Admin — Full Fleet & Schedule Access"
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1d4ed8', fontWeight: 800, fontSize: '0.88rem', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #1d4ed8, #1e3a5f)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: savingProfile ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)',
                opacity: savingProfile ? 0.7 : 1,
              }}
            >
              <FaCheckCircle /> {savingProfile ? 'Saving...' : 'Save Administrator Details'}
            </button>
          </form>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === 'security' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', maxWidth: '580px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Security &amp; Password</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Keep your system administrator account protected
            </p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                <FaLock style={{ color: '#1d4ed8', marginRight: 6 }} /> Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                <FaKey style={{ color: '#1d4ed8', marginRight: 6 }} /> New Password
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
              />

              {/* Password Strength Bar */}
              {pwForm.newPw.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ height: '4px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'all 0.3s ease',
                        width: pwForm.newPw.length > 8 ? '100%' : pwForm.newPw.length > 5 ? '60%' : '30%',
                        background: pwForm.newPw.length > 8 ? '#16a34a' : pwForm.newPw.length > 5 ? '#ca8a04' : '#dc2626',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', marginTop: '4px', display: 'inline-block', color: pwForm.newPw.length > 8 ? '#16a34a' : pwForm.newPw.length > 5 ? '#ca8a04' : '#dc2626', fontWeight: 700 }}>
                    {pwForm.newPw.length > 8 ? '✓ Strong Password' : pwForm.newPw.length > 5 ? '↑ Good — use 9+ characters for best security' : '⚠ Weak — at least 6 characters required'}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                <FaShieldAlt style={{ color: '#1d4ed8', marginRight: 6 }} /> Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={pwForm.confirmPw}
                onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1.5px solid ${pwForm.confirmPw && pwForm.confirmPw !== pwForm.newPw ? '#fca5a5' : '#cbd5e1'}`,
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              {pwForm.confirmPw && pwForm.confirmPw !== pwForm.newPw && (
                <span style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 4, display: 'inline-block', fontWeight: 700 }}>
                  ✗ Passwords do not match
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={savingPw}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: savingPw ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                opacity: savingPw ? 0.7 : 1,
              }}
            >
              <FaShieldAlt /> {savingPw ? 'Changing Password...' : 'Update Admin Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
