import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { companyAPI } from '../utils/api';
import { uploadToCloudinary } from '../utils/cloudinary';
import { useTranslation } from '../i18n.jsx';
import LanguageSelector from '../components/LanguageSelector';
import { FaBus, FaBuilding, FaIdCard, FaPhone, FaEnvelope, FaMapMarkerAlt, FaUserCheck, FaLock, FaCheckCircle, FaExclamationTriangle, FaUpload, FaImage } from 'react-icons/fa';

const CompanyRegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    companyName: '',
    licenseNumber: '',
    registrationNumber: '',
    tinNumber: '',
    phone: '',
    email: '',
    address: '',
    city: 'Addis Ababa',
    description: '',
    logo: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file, 'company_logos');
      setFormData(prev => ({ ...prev, logo: url }));
    } catch (err) {
      console.error('Logo upload error:', err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const ethiopianCities = [
    'Addis Ababa', 'Adama', 'Bahir Dar', 'Gondar', 'Mekelle', 'Hawassa',
    'Jimma', 'Dire Dawa', 'Harar', 'Dessie', 'Kombolcha', 'Jijiga', 'Arba Minch'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await companyAPI.registerCompany(formData);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Company registration failed. Please check form details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f8fafc', fontFamily: "'Poppins', sans-serif", paddingBottom: '3rem' }}>
      {/* Header Bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
          <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <FaBus style={{ color: '#fff', fontSize: '1.25rem' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, tracking: '-0.02em', background: 'linear-gradient(90deg, #34d399, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Ethio Trip
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Partner Portal</span>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <LanguageSelector variant="dark" />
          <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }}>
            Already registered? <span style={{ color: '#34d399' }}>{t('nav.login', 'Sign In')}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1000px', margin: '2.5rem auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '0.35rem 1rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Transportation Provider Registration
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            Register Your Ethiopian Transport Company
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto' }}>
            Join Ethio Trip Marketplace. Expand your passenger reach, manage buses, schedules, staff, and bookings seamlessly.
          </p>
        </div>

        {success ? (
          <div style={{ background: '#1e293b', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: 20, padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <FaCheckCircle style={{ fontSize: '4rem', color: '#34d399', marginBottom: '1.25rem' }} />
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Registration Submitted Successfully!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your company <strong style={{ color: '#fff' }}>{formData.companyName}</strong> application has been submitted to Ethio Trip Super Admin for verification. You will be able to log in once your company is approved.
            </p>
            <button onClick={() => navigate('/login')} style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', padding: '0.85rem 2rem', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
              Go to Login Page
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2.5rem', backdropFilter: 'blur(16px)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '1rem', borderRadius: 12, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <FaExclamationTriangle style={{ fontSize: '1.25rem', shrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Company Information */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                <FaBuilding style={{ color: '#34d399', fontSize: '1.25rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>Company Information</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Company Name *</label>
                  <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} placeholder="e.g. Selam Express Bus" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Transport License Number *</label>
                  <input type="text" name="licenseNumber" required value={formData.licenseNumber} onChange={handleChange} placeholder="e.g. ETH-BUS-9901" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Commercial Registration No. *</label>
                  <input type="text" name="registrationNumber" required value={formData.registrationNumber} onChange={handleChange} placeholder="e.g. REG-109920" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>TIN Number *</label>
                  <input type="text" name="tinNumber" required value={formData.tinNumber} onChange={handleChange} placeholder="e.g. 0012345678" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Official Phone Number *</label>
                  <input type="text" name="phone" required value={formData.phone} onChange={handleChange} placeholder="e.g. 0911002233" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Company Email *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="e.g. info@selambus.com" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Headquarter City *</label>
                  <select name="city" value={formData.city} onChange={handleChange} style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }}>
                    {ethiopianCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Company Logo (Upload or URL)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ background: '#059669', color: '#fff', padding: '0.75rem 1rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <FaUpload /> {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                    </label>
                    <input type="text" name="logo" value={formData.logo} onChange={handleChange} placeholder="Or paste logo URL" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                  </div>
                  {formData.logo && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={formData.logo} alt="Logo" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #10b981' }} />
                      <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Logo ready</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Physical Address *</label>
                <input type="text" name="address" required value={formData.address} onChange={handleChange} placeholder="e.g. Meskel Square, Legehar Bus Terminal Building 3rd Floor" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Company Description</label>
                <textarea name="description" rows={3} value={formData.description} onChange={handleChange} placeholder="Brief summary of your company travel routes, fleet luxury, and services..." style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
              </div>
            </div>

            {/* Section 2: Company Admin Account */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
                <FaUserCheck style={{ color: '#60a5fa', fontSize: '1.25rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>Company Admin Account Credentials</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Admin Full Name *</label>
                  <input type="text" name="adminName" required value={formData.adminName} onChange={handleChange} placeholder="e.g. Abebe Bikila" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Admin Login Email *</label>
                  <input type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleChange} placeholder="e.g. admin@selambus.com" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Admin Mobile Phone</label>
                  <input type="text" name="adminPhone" value={formData.adminPhone} onChange={handleChange} placeholder="e.g. 0911223344" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Admin National ID *</label>
                  <input type="text" name="adminNationalId" value={formData.adminNationalId || ''} onChange={handleChange} placeholder="e.g. ETH-1092-NID" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontWeight: 500 }}>Admin Password *</label>
                  <input type="password" name="adminPassword" required minLength={6} value={formData.adminPassword} onChange={handleChange} placeholder="Minimum 6 characters" style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f172a', border: '1px solid #334155', borderRadius: 10, color: '#fff', fontSize: '0.9rem' }} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: loading ? '#475569' : 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '1.05rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(16,185,129,0.4)', transition: 'all 0.2s' }}>
              {loading ? 'Submitting Application...' : 'Submit Company Registration Application'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default CompanyRegisterPage;
