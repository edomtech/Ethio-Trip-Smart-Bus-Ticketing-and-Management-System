import React, { useState } from 'react';
import {
  FaUserTie, FaLock, FaEnvelope, FaUser, FaBuilding, FaPhone,
  FaMapMarkerAlt, FaCheckCircle, FaShieldAlt, FaKey, FaCamera,
  FaClock, FaCalendarCheck, FaIdBadge, FaTicketAlt, FaStar, FaAward
} from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../utils/api';
import { toast } from 'react-toastify';

const AgentProfile = () => {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

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
      login({ ...user, ...updated }, localStorage.getItem('ethiobus_token'));
      toast.success('Staff profile details updated successfully! 🎉');
    } catch (err) {
      toast.error(err.message || 'Profile update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw) {
      toast.error('Please enter both current and new password');
      return;
    }
    if (pwForm.newPw !== pwForm.confirmPw) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSavingPw(true);
    try {
      await authAPI.changePassword({
        currentPassword: pwForm.current,
        newPassword: pwForm.newPw,
      });
      toast.success('Password changed securely! Please use your new password next time.');
      setPwForm({ current: '', newPw: '', confirmPw: '' });
    } catch (err) {
      toast.error(err.message || 'Password update failed');
    } finally {
      setSavingPw(false);
    }
  };

  const initial = (profileForm.name || user?.name || 'A')[0].toUpperCase();

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };
  const disabledInput = {
    ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed',
  };

  return (
    <div className="mod-wrapper">
      {/* ── Clean Profile Header Card ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '18px 22px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#047857,#065f46)', color: '#fff', fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4, maxWidth: 360 }}>
        {[{ id: 'details', label: 'Profile Info' }, { id: 'security', label: 'Change Password' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: activeTab === t.id ? '#fff' : 'transparent', color: activeTab === t.id ? '#047857' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all .2s', boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Contents ── */}
      {activeTab === 'details' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Staff Account Details</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Manage your personal staff contact info and station identity
            </p>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaUser style={{ color: '#047857', marginRight: 6 }} /> Full Name
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
                  <FaEnvelope style={{ color: '#047857', marginRight: 6 }} /> Official Staff Email (Protected)
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.92rem', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaPhone style={{ color: '#047857', marginRight: 6 }} /> Mobile Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  required
                  placeholder="0911234567"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaBuilding style={{ color: '#047857', marginRight: 6 }} /> Assigned Station / Terminal
                </label>
                <input
                  type="text"
                  value={profileForm.station}
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '0.92rem', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaMapMarkerAlt style={{ color: '#047857', marginRight: 6 }} /> Terminal City / Region
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  <FaIdBadge style={{ color: '#047857', marginRight: 6 }} /> Staff Access Role
                </label>
                <input
                  type="text"
                  value="Ticket Counter Agent / Boarding Staff"
                  disabled
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#047857', fontWeight: 800, fontSize: '0.92rem', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #047857, #065f46)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(4, 120, 87, 0.3)',
              }}
            >
              <FaCheckCircle /> {savingProfile ? 'Saving Details...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', maxWidth: '580px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Security &amp; Password</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Ensure your ticketing terminal account remains secure
            </p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                <FaLock style={{ color: '#047857', marginRight: 6 }} /> Current Password
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
                <FaKey style={{ color: '#047857', marginRight: 6 }} /> New Password
              </label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                <FaShieldAlt style={{ color: '#047857', marginRight: 6 }} /> Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={pwForm.confirmPw}
                onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
              />
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
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
              }}
            >
              <FaShieldAlt /> {savingPw ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AgentProfile;
