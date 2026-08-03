import React, { useState } from 'react';
import { FaUserTie, FaLock, FaEnvelope, FaUser, FaBuilding } from 'react-icons/fa';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../utils/api';
import { toast } from 'react-toastify';
import '../../modules.css';

const AgentProfile = () => {
  const { user, login } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Agent Samuel Bekele',
    email: user?.email || 'agent@ethiobus.com',
    phone: user?.phone || '0911002233',
    city: user?.city || 'Addis Ababa',
    station: user?.station || 'Main Terminal',
    currentPassword: '',
    newPassword: ''
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await authAPI.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        city: profileForm.city
      });
      login({ ...user, ...updated }, localStorage.getItem('ethiobus_token'));
      toast.success('Agent profile updated!');
    } catch {
      toast.error('Update failed');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!profileForm.currentPassword || !profileForm.newPassword) {
      toast.error('Please enter current and new passwords');
      return;
    }
    try {
      await authAPI.changePassword({
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword
      });
      toast.success('Password changed successfully!');
      setProfileForm({ ...profileForm, currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Password change failed');
    }
  };

  return (
    <div className="mod-wrapper">
      <div className="mod-header mod-header-teal">
        <div className="mod-header-text">
          <h2>Ticket Agent Profile</h2>
          <p>Station assignment &amp; terminal account settings</p>
        </div>
        <div className="mod-header-icon"><FaUserTie /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="mod-card">
          <h3 style={{ marginBottom: '20px' }}>Agent Details</h3>
          <form onSubmit={handleUpdateProfile}>
            <div className="mod-field">
              <label><FaUser /> Agent Full Name</label>
              <input
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>
            <div className="mod-field">
              <label><FaEnvelope /> Email Address</label>
              <input
                value={profileForm.email}
                disabled
                style={{ background: '#f1f5f9' }}
              />
            </div>
            <div className="mod-field">
              <label>Phone Number</label>
              <input
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="mod-field">
                <label>Terminal City</label>
                <input
                  value={profileForm.city}
                  onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                />
              </div>
              <div className="mod-field">
                <label>Assigned Station</label>
                <input
                  value={profileForm.station}
                  disabled
                  style={{ background: '#f1f5f9' }}
                />
              </div>
            </div>
            <button type="submit" className="mod-btn mod-btn-green">Update Profile Details</button>
          </form>
        </div>

        <div className="mod-card">
          <h3 style={{ marginBottom: '20px' }}>Security &amp; Password</h3>
          <form onSubmit={handleChangePassword}>
            <div className="mod-field">
              <label><FaLock /> Current Password</label>
              <input
                type="password"
                value={profileForm.currentPassword}
                onChange={e => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="mod-field">
              <label><FaLock /> New Password</label>
              <input
                type="password"
                value={profileForm.newPassword}
                onChange={e => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <button type="submit" className="mod-btn mod-btn-green">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentProfile;
