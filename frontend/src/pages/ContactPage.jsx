import React, { useState, useEffect } from 'react';
import {
  FaPhoneAlt, FaEnvelope, FaMapMarkerAlt,
  FaPaperPlane, FaHeadset, FaBuilding, FaCheckCircle
} from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import { supportAPI, companyAPI, platformSettingAPI } from '../utils/api';
import { useTranslation } from '../i18n';
const CENTRAL_SUPPORT = { _id: 'all', companyName: 'Ethio Trip General Support Desk (Central)' };

const ContactPage = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([CENTRAL_SUPPORT]);
  const [platformSettings, setPlatformSettings] = useState({
    supportPhone: '+251 911 002 233',
    supportEmail: 'support@ethiotrip.et',
    systemAddress: 'Emare ICT Hub, Debre Birhan, Ethiopia',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyId: 'all',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await companyAPI.getActiveCompanies();
        const list = Array.isArray(res) ? res : (res?.companies || []);
        if (list.length > 0) {
          setCompanies([
            CENTRAL_SUPPORT,
            ...list
          ]);
        }
      } catch (err) {
        console.error('Error fetching registered companies:', err);
      }
    };
    const fetchPlatformSettings = async () => {
      try {
        const data = await platformSettingAPI.getSettings();
        if (data) {
          setPlatformSettings({
            supportPhone: data.supportPhone || '+251 911 002 233',
            supportEmail: data.supportEmail || 'support@ethiotrip.et',
            systemAddress: data.systemAddress || 'Emare ICT Hub, Debre Birhan, Ethiopia',
          });
        }
      } catch {}
    };
    fetchCompanies();
    fetchPlatformSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supportAPI.create({
        companyId: formData.companyId !== 'all' ? formData.companyId : null,
        issueType: formData.subject || 'General Inquiry',
        description: formData.message,
        passengerName: formData.name,
        passengerEmail: formData.email,
        passengerPhone: formData.phone,
        subject: formData.subject,
      });
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', companyId: 'all', subject: '', message: '' });
    } catch (err) {
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', companyId: 'all', subject: '', message: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="w-full bg-slate-50 dark:bg-[#071410] font-poppins text-slate-900 dark:text-slate-100 transition-colors duration-200">

        {/* Compact Green Header */}
        <section className="relative bg-gradient-to-br from-[#042d17] via-[#078930] to-[#034b17] py-8 sm:py-10 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {t('contact.heroTitle', 'Contact')} <span className="text-amber-300">{t('contact.heroUs', 'Us')}</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl m-0">
                {t('contact.heroSubtitle', "We'd love to hear from you. Reach out to us for inquiries, support or feedback.")}
              </p>

              {/* Quick Contacts */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                  <FaPhoneAlt className="text-emerald-300 text-[10px]" />
                  <span>{platformSettings.supportPhone}</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                  <FaEnvelope className="text-emerald-300 text-[10px]" />
                  <span>{platformSettings.supportEmail}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 hidden sm:flex justify-end">
              <div className="rounded-xl overflow-hidden border border-white/20 shadow-lg p-1 bg-emerald-950/40 max-w-xs w-full">
                <img
                  src="/images/hero_bus_clean.jpg"
                  alt="Ethio Trip Contact"
                  className="w-full h-28 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop';
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-16 px-4 sm:px-6 bg-slate-50 dark:bg-[#071410]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

              {}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white m-0">
                  {t('contact.getInTouch', 'Get in Touch')}
                </h2>

                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
                      <FaCheckCircle />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white m-0">Message Sent!</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 m-0 max-w-xs">Thank you! Your inquiry has been submitted to our support desk. We'll get back to you soon.</p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder={t('contact.yourName', 'Your Name')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      placeholder={t('contact.emailAddress', 'Email Address')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="tel"
                      placeholder={t('contact.phoneNumber', 'Phone Number')}
                      maxLength={10}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      onKeyDown={e => {
                        if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('contact.chooseOperator', 'Choose Bus Operator / Company to Contact *')}
                    </label>
                    <select
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      {companies.map((c) => (
                        <option key={c._id} value={c._id} className="dark:bg-slate-900">
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder={t('contact.subject', 'Inquiry Subject / Topic')}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={4}
                      placeholder={t('contact.message', 'Type your question, message, or feedback in detail...')}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {loading ? t('contact.sending', 'Sending...') : t('contact.sendMessage', 'Send Message')} <FaPaperPlane />
                  </button>
                </form>
                )}
              </div>

              {}
              <div className="lg:col-span-5 space-y-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white m-0 mb-2">
                  {t('contact.ourOffices', 'Our Offices')}
                </h2>

                <div className="space-y-3">
                  {}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">Emare ICT Hub (Platform Support & Tech Center)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{platformSettings.systemAddress}</p>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                        <FaPhoneAlt className="text-[10px]" /> {platformSettings.supportPhone}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <FaEnvelope className="text-[10px]" /> {platformSettings.supportEmail}
                      </span>
                    </div>
                  </div>

                  {}
                  {companies.filter(c => c._id !== 'all').length > 0 && (
                    <>
                      <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2">
                        <FaBuilding /> Registered Bus Companies
                      </h3>
                      {companies.filter(c => c._id !== 'all').map((comp) => (
                        <div key={comp._id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0 border border-slate-200 dark:border-slate-700">
                            <FaBuilding />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white m-0">{comp.companyName}</h4>
                            {comp.city && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 flex items-center gap-1">
                                <FaMapMarkerAlt className="text-[9px] shrink-0" />
                                {comp.address ? `${comp.address}, ` : ''}{comp.city}
                              </p>
                            )}
                            {comp.phone && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <FaPhoneAlt className="text-[9px]" /> {comp.phone}
                              </span>
                            )}
                            {comp.email && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <FaEnvelope className="text-[9px]" /> {comp.email}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {}
        <section className="py-12 px-4 sm:px-6 bg-slate-100 dark:bg-slate-900/60">
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-slate-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl text-white">
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-xl sm:text-2xl font-black text-white m-0">{t('home.supportAlways', '24/7 Support')}</h2>
              <p className="text-xs sm:text-sm text-slate-300 m-0">{t('home.supportAlwaysDesc', 'Our customer support team is available 24/7 to assist you with your booking and travel needs.')}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-md">
                24/7
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl text-emerald-400">
                <FaHeadset />
              </div>
            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  );
};

export default ContactPage;
