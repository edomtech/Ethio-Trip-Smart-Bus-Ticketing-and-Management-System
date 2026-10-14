import React, { useState } from 'react';
import { FaBuilding, FaIdCard, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaUser, FaTimes, FaCheckCircle, FaCreditCard, FaCloudUploadAlt } from 'react-icons/fa';
import { companyAPI } from '../utils/api';
import { uploadToCloudinary } from '../utils/cloudinary';
import { toast } from 'react-toastify';

const CompanyRegisterModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    licenseNumber: '',
    tinNumber: '',
    phone: '',
    email: '',
    address: '',
    city: 'Addis Ababa',
    logo: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    telebirrEnabled: true,
    telebirrNumber: '0911002233',
    cbeEnabled: true,
    cbeAccountNumber: '1000123456789',
    chapaEnabled: false,
    chapaKey: 'CHAPA-ET-2026-LIVE',
  });

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const url = await uploadToCloudinary(file);
      setForm(prev => ({ ...prev, logo: url }));
      toast.success('Company logo uploaded!');
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.companyName.trim() ||
      !form.licenseNumber.trim() ||
      !form.tinNumber.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.address.trim()
    ) {
      toast.warning('Please fill in all company legal details.');
      return;
    }
    if (
      !form.adminName.trim() ||
      !form.adminEmail.trim() ||
      !form.adminPhone.trim() ||
      !form.adminPassword
    ) {
      toast.warning('Please provide all company admin details (name, email, phone, password).');
      return;
    }
    if (form.adminPassword.length < 6) {
      toast.warning('Admin password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        licenseNumber: form.licenseNumber.trim(),
        registrationNumber: form.licenseNumber.trim(),
        tinNumber: form.tinNumber.trim(),
        phone: form.phone.trim(),
        email: form.email.toLowerCase().trim(),
        address: form.address.trim(),
        city: form.city || 'Addis Ababa',
        logo: form.logo || '',
        status: 'pending',
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.toLowerCase().trim(),
        adminPhone: form.adminPhone.trim(),
        adminPassword: form.adminPassword,
        paymentMethods: {
          telebirr: { enabled: !!form.telebirrEnabled, merchantId: form.telebirrNumber || '' },
          cbe: { enabled: !!form.cbeEnabled, accountNumber: form.cbeAccountNumber || '' },
          chapa: { enabled: !!form.chapaEnabled, apiKey: form.chapaEnabled ? (form.chapaKey || 'CHAPA-ET-LIVE') : '' },
        },
        payment: {
          provider: 'CHAPA',
          enabled: !!form.chapaEnabled,
          mode: 'LIVE',
          splitType: 'percentage',
          splitValue: 90,
        },
      };

      await companyAPI.registerCompany(payload);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || 'Company registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-lg">
              <FaBuilding />
            </div>
            <div>
              <h3 className="text-base font-black m-0 leading-tight">Register Your Bus Company</h3>
              <p className="text-[11px] text-emerald-100 m-0">Join Ethio Trip platform network</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition border-0">
            <FaTimes />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mx-auto border border-amber-200 dark:border-amber-800">
              ⏳
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Registration Submitted Successfully!</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Your company <strong>{form.companyName}</strong> has been submitted and is currently <strong>PENDING approval</strong> by the Platform Admin.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 text-left space-y-2">
              <div className="font-bold flex items-center gap-2">
                <FaCheckCircle className="text-amber-600" /> What happens next?
              </div>
              <ol className="list-decimal list-inside text-[11px] space-y-1 text-amber-700 dark:text-amber-400 m-0">
                <li>The Platform Admin will review your company license and TIN details.</li>
                <li>Upon approval, an email will be sent to <strong>{form.adminEmail}</strong>.</li>
                <li>You can then log in to manage your buses, routes, schedules, and staff.</li>
              </ol>
            </div>
            <button
              onClick={() => { setSubmitted(false); onClose(); }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              Got It, Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div>
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FaBuilding /> Company Legal Information
              </h4>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Company Logo (Optional)</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors"
                    onClick={() => document.getElementById('logo-upload-input').click()}
                  >
                    {form.logo ? (
                      <img src={form.logo} alt="logo" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400">
                        <FaCloudUploadAlt className="text-2xl" />
                        <span className="text-[9px] font-semibold text-center leading-tight">Upload Logo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => document.getElementById('logo-upload-input').click()}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {uploadingLogo ? 'Uploading...' : 'Choose Image'}
                    </button>
                    <input
                      id="logo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Selam Bus Line S.C."
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Operating License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ET-MOT-2026-081"
                    value={form.licenseNumber}
                    onChange={e => setForm({ ...form, licenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tax Identification Number (TIN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0019283746"
                    value={form.tinNumber}
                    onChange={e => setForm({ ...form, tinNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+251 115 512 345"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@selambus.et"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Head Office City</label>
                  <select
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    {['Addis Ababa', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 'Gondar', 'Mekelle', 'Jimma', 'Dessie', 'Adama'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Office Physical Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meskel Square, Office 402, Addis Ababa"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FaUser /> Company Administrator Account
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abebe Bikila"
                    value={form.adminName}
                    onChange={e => setForm({ ...form, adminName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Email (Login Email) *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@company.com"
                    value={form.adminEmail}
                    onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+251 911 223 344"
                    value={form.adminPhone}
                    onChange={e => setForm({ ...form, adminPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={form.adminPassword}
                    onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FaCreditCard /> Payment & Settlement Options
              </h4>

              {/* Chapa Question Box with Interactive Yes/No Display */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                    Did you want to use Chapa?
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                    Choose whether your company wants to enable online digital payments via Chapa.
                  </p>
                </div>

                {/* Box that displays Yes and No */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, chapaEnabled: true }))}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      form.chapaEnabled
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      form.chapaEnabled ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {form.chapaEnabled ? '✓' : ''}
                    </span>
                    <span>Yes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, chapaEnabled: false }))}
                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      !form.chapaEnabled
                        ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 ring-2 ring-slate-400/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                      !form.chapaEnabled ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {!form.chapaEnabled ? '✓' : ''}
                    </span>
                    <span>No</span>
                  </button>
                </div>

                {/* Form displays based on the user's choice */}
                {form.chapaEnabled ? (
                  <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <FaCheckCircle className="text-emerald-600" />
                      <span>Chapa payment enabled for your company</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Chapa Secret / Merchant Key (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="CHASECK_TEST-xxxx or leave blank to configure later"
                        value={form.chapaKey}
                        onChange={e => setForm({ ...form, chapaKey: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Chapa payment gateway is disabled for this company.
                  </div>
                )}
              </div>

              {/* Direct Payout Channels */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Additional Direct Channels (Optional)
                </span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.telebirrEnabled}
                      onChange={e => setForm({ ...form, telebirrEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <span>Telebirr Direct</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.cbeEnabled}
                      onChange={e => setForm({ ...form, cbeEnabled: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                    <span>CBE Bank Account</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {form.telebirrEnabled && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Telebirr Merchant Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="0911002233"
                        value={form.telebirrNumber}
                        onChange={e => setForm({ ...form, telebirrNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  )}
                  {form.cbeEnabled && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">CBE Account Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="1000123456789"
                        value={form.cbeAccountNumber}
                        onChange={e => setForm({ ...form, cbeAccountNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                {loading ? 'Submitting Registration...' : 'Submit Registration for Platform Admin Approval'} <FaCheckCircle />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyRegisterModal;
