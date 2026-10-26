import React, { useState } from 'react';
import {
  FaBuilding,
  FaPlus,
  FaUpload,
  FaCheckCircle,
  FaTimes,
  FaBus,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCreditCard,
  FaCloudUploadAlt,
} from 'react-icons/fa';
import { companyAPI } from '../utils/api';
import { uploadToCloudinary } from '../utils/cloudinary';
import { toast } from 'react-toastify';

const CITIES = [
  'Addis Ababa',
  'Bahir Dar',
  'Hawassa',
  'Dire Dawa',
  'Gondar',
  'Mekelle',
  'Jimma',
  'Dessie',
  'Adama',
];

const CompanyRegisterModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBusImage, setUploadingBusImage] = useState(false);

  const initialFormState = {
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
    busImage: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    telebirrEnabled: true,
    telebirrNumber: '0911002233',
    cbeEnabled: true,
    cbeAccountNumber: '1000123456789',
    chapaEnabled: true,
    chapaKey: 'CHAPA-ET-2026-LIVE',
  };

  const [form, setForm] = useState(initialFormState);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, logo: url }));
      toast.success('Company logo uploaded successfully!');
    } catch {
      toast.error('Logo upload failed. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBusImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBusImage(true);
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, busImage: url }));
      toast.success('Bus fleet photo uploaded successfully!');
    } catch {
      toast.error('Bus photo upload failed. Please try again.');
    } finally {
      setUploadingBusImage(false);
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
        registrationNumber: form.registrationNumber.trim() || form.licenseNumber.trim(),
        tinNumber: form.tinNumber.trim(),
        phone: form.phone.trim(),
        email: form.email.toLowerCase().trim(),
        address: form.address.trim(),
        city: form.city || 'Addis Ababa',
        description: form.description.trim(),
        logo: form.logo || '',
        busImage: form.busImage || '',
        status: 'pending',
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.toLowerCase().trim(),
        adminPhone: form.adminPhone.trim() || form.phone.trim(),
        adminPassword: form.adminPassword,
        paymentMethods: {
          telebirr: {
            enabled: !!form.telebirrEnabled,
            accountNumber: form.telebirrNumber?.trim() || form.phone.trim(),
          },
          cbe: {
            enabled: !!form.cbeEnabled,
            accountNumber: form.cbeAccountNumber?.trim() || '1000123456789',
          },
          chapa: {
            enabled: !!form.chapaEnabled,
            accountNumber: form.chapaKey?.trim() || 'CHAPA-ET-2026-LIVE',
          },
        },
        payment: {
          provider: 'CHAPA',
          enabled: !!form.chapaEnabled,
          mode: 'LIVE',
          splitType: 'percentage',
          splitValue: 90,
        },
      };

      await companyAPI.registerCompanyPublic(payload);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.message || 'Company registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Platform Admin style */}
        <div className="p-6 md:p-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full text-xs font-bold mb-2">
              <FaPlus /> Direct Operator Onboarding
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white m-0">Register Your Bus Company</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
              Join Ethio Trip platform network, create your company administrator account, and configure Telebirr, CBE, and Chapa payment accounts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition border-0 shrink-0"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto border border-emerald-200 dark:border-emerald-800">
              <FaCheckCircle />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Registration Submitted Successfully!</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Your company <strong>{form.companyName}</strong> has been submitted and is currently <strong>PENDING approval</strong> by the Platform Admin.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-xs text-emerald-800 dark:text-emerald-300 text-left space-y-2 max-w-md mx-auto">
              <div className="font-bold flex items-center gap-2">
                <FaCheckCircle className="text-emerald-600" /> What happens next?
              </div>
              <ol className="list-decimal list-inside text-[11px] space-y-1 text-emerald-700 dark:text-emerald-400 m-0">
                <li>The Platform Admin will review your company license and TIN details.</li>
                <li>Upon approval, an email confirmation will be sent to <strong>{form.adminEmail}</strong>.</li>
                <li>You can then log in using your admin credentials to manage buses, routes, schedules, and staff.</li>
              </ol>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              Got It, Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[78vh] overflow-y-auto">
            {/* 1. Company Registration & License Details */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
                1. Company Registration &amp; License Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Selam Bus Line"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Official License Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. ET-MOT-2026-081"
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Commercial Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. CR-AA-98124"
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tax Identification Number (TIN) *</label>
                  <input
                    type="text"
                    placeholder="e.g. 0019283746"
                    value={form.tinNumber}
                    onChange={(e) => setForm({ ...form, tinNumber: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Contact Phone *</label>
                  <input
                    type="tel"
                    placeholder="e.g. +251 911 234 567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@selambus.et"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">City / Region Hub</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Head Office Address *</label>
                  <input
                    type="text"
                    placeholder="e.g. Meskel Square, Addis Ababa"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Two Image Uploaders: 1 for Logo, 1 for Bus Image shown on bus page */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Official Logo</label>
                    <div className="flex items-center gap-3">
                      {form.logo ? (
                        <img
                          src={form.logo}
                          alt="Logo preview"
                          className="w-14 h-14 rounded-xl object-contain border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs shrink-0">
                          Logo
                        </div>
                      )}
                      <div>
                        <label className="cursor-pointer px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 transition inline-flex">
                          <FaUpload /> {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        <span className="block text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Bus Fleet Image (Shown on Bus Page)</label>
                    <div className="flex items-center gap-3">
                      {form.busImage ? (
                        <img
                          src={form.busImage}
                          alt="Bus preview"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs shrink-0">
                          <FaBus />
                        </div>
                      )}
                      <div>
                        <label className="cursor-pointer px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2 transition border border-emerald-200 dark:border-emerald-800 inline-flex">
                          <FaUpload /> {uploadingBusImage ? 'Uploading...' : 'Upload Bus Image'}
                          <input type="file" accept="image/*" onChange={handleBusImageUpload} className="hidden" />
                        </label>
                        <span className="block text-[10px] text-slate-400 mt-1">Displayed on passenger bus fleet page</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Company Administrator Account */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
                2. Company Administrator Account
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Administrator Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Abebe Bikila"
                    value={form.adminName}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Admin Email Address (Login Email) *</label>
                  <input
                    type="email"
                    placeholder="e.g. admin@selambus.et"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Admin Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. +251 911 234 567"
                    value={form.adminPhone}
                    onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Admin Password *</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Methods & Operator Payout Setup */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-3">
                3. Payment Methods &amp; Operator Payout Setup
              </h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-5 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.telebirrEnabled}
                      onChange={(e) => setForm({ ...form, telebirrEnabled: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Telebirr</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.cbeEnabled}
                      onChange={(e) => setForm({ ...form, cbeEnabled: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <span>Commercial Bank of Ethiopia (CBE)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.chapaEnabled}
                      onChange={(e) => setForm({ ...form, chapaEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Chapa Gateway <span className="text-[10px] text-slate-400 font-normal">(Live Mode)</span></span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {form.telebirrEnabled && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Telebirr Merchant Phone / Shortcode
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0911234567"
                        value={form.telebirrNumber}
                        onChange={(e) => setForm({ ...form, telebirrNumber: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  )}
                  {form.cbeEnabled && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        CBE Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1000123456789"
                        value={form.cbeAccountNumber}
                        onChange={(e) => setForm({ ...form, cbeAccountNumber: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                      />
                    </div>
                  )}
                  {form.chapaEnabled && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Chapa Live Merchant Key / API Key
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CHAPA-ET-2026-LIVE"
                        value={form.chapaKey}
                        onChange={(e) => setForm({ ...form, chapaKey: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setForm(initialFormState)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Submitting Registration...' : 'Submit Company Registration'} <FaCheckCircle />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyRegisterModal;
