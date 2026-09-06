import React, { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaCheckCircle } from 'react-icons/fa';
import { authAPI } from '../../../utils/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'react-toastify';

const PassengerProfile = () => {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', city: user?.city || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const updated = await authAPI.updateProfile({ name: form.name, phone: form.phone, city: form.city });
      login({ ...user, ...updated }, localStorage.getItem('ethiobus_token'));
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
      {/* ── Clean Profile Header Card ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '18px 22px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#078930,#056325)', color: '#fff', fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {user?.name?.charAt(0).toUpperCase() || 'P'}
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{user?.name || 'Passenger'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 4, maxWidth: 360 }}>
        {[{ id: 'info', label: 'Profile Info' }, { id: 'password', label: 'Change Password' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#078930' : '#64748b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all .2s', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <form onSubmit={handleSave} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px' }}>
          <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Personal Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Full Name', field: 'name', icon: <FaUser />, type: 'text', required: true },
              { label: 'Email Address', field: 'email', icon: <FaEnvelope />, type: 'email', disabled: true },
              { label: 'Phone Number', field: 'phone', icon: <FaPhone />, type: 'text' },
              { label: 'City', field: 'city', icon: <FaMapMarkerAlt />, type: 'text' },
            ].map(f => (
              <div key={f.field}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  {f.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}>{f.icon}</span>
                  <input type={f.type} value={form[f.field]} disabled={f.disabled} required={f.required}
                    onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                    style={{ width: '100%', padding: '11px 14px 11px 36px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', background: f.disabled ? '#f8fafc' : '#fff', color: f.disabled ? '#94a3b8' : '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving}
            style={{ marginTop: 20, padding: '12px 28px', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#078930,#056325)', color: saving ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaCheckCircle />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handleChangePassword} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', maxWidth: 480 }}>
          <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Change Password</h4>
          {[
            { label: 'Current Password', field: 'currentPassword' },
            { label: 'New Password', field: 'newPassword' },
            { label: 'Confirm New Password', field: 'confirmPassword' },
          ].map(f => (
            <div key={f.field} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>{f.label}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><FaLock /></span>
                <input type="password" value={pwForm[f.field]} required
                  onChange={e => setPwForm(p => ({ ...p, [f.field]: e.target.value }))} placeholder="••••••••"
                  style={{ width: '100%', padding: '11px 14px 11px 36px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          ))}
          <button type="submit" disabled={saving}
            style={{ padding: '12px 28px', background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#0f172a,#1e293b)', color: saving ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      )}
    </div>
  );
};

export default PassengerProfile;
