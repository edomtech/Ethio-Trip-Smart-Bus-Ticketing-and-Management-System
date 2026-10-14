import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBus, FaShieldAlt, FaUsers, FaLightbulb,
  FaCheckCircle, FaAward, FaRoute, FaArrowRight,
  FaHeart, FaStar, FaCog, FaCrown, FaChair
} from 'react-icons/fa';
import MainLayout from '../layouts/MainLayout';
import { useTranslation } from '../i18n';
import { reportAPI } from '../utils/api';

const AboutPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ totalBuses: null, totalRoutes: null, totalPassengers: null });

  useEffect(() => {
    reportAPI.getPublic().then((data) => {
      if (data) setStats(data);
    }).catch(() => {});
  }, []);

  const fmt = (val, suffix = '+') => val != null ? `${val}${suffix}` : '...';

  return (
    <MainLayout>
      <div className="w-full bg-slate-900 text-white font-poppins">
        
        {}
        <section className="relative bg-gradient-to-br from-slate-950 via-[#072418] to-slate-950 pt-16 pb-20 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {t('about.heroTitle', 'About')} <span className="text-emerald-400">Ethio Trip</span>
              </h1>
              <h3 className="text-lg sm:text-xl font-bold text-emerald-300">{t('about.movingForward', 'Moving Ethiopia Forward')}</h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                {t('about.heroDesc', 'Ethio Trip is dedicated to providing safe, reliable and comfortable travel across Ethiopia. We connect cities, communities and people with trust and commitment.')}
              </p>

              {}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                    <FaBus />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white m-0">{fmt(stats.totalBuses)}</h4>
                    <p className="text-xs text-slate-400 m-0">{t('about.statBuses', 'Buses')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                    <FaRoute />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white m-0">{fmt(stats.totalRoutes)}</h4>
                    <p className="text-xs text-slate-400 m-0">{t('about.statRoutes', 'Routes')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
                    <FaUsers />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white m-0">{fmt(stats.totalPassengers)}</h4>
                    <p className="text-xs text-slate-400 m-0">{t('about.statPassengers', 'Registered Passengers')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl p-2 bg-white/5 max-w-md w-full">
                <img
                  src="/images/hero_bus_clean.jpg"
                  alt="Ethio Trip Fleet"
                  className="w-full h-72 object-cover rounded-xl"
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
        <section className="py-16 px-4 sm:px-6 bg-[#09111e]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {}
              <div className="lg:col-span-6 space-y-4">
                <h2 className="text-2xl sm:text-3xl font-black text-white m-0">
                  {t('about.ourMission', 'Our Mission')}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t('about.missionDesc', 'To revolutionize bus travel in Ethiopia by delivering exceptional service, embracing technology and ensuring every journey is safe, comfortable and on time.')}
                </p>
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img
                    src="/images/bahir_dar.jpg"
                    alt="Bus Traveling in Ethiopia"
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop';
                    }}
                  />
                </div>
              </div>

              {}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-emerald-600/30">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white m-0 mb-1">{t('about.safetyFirst', 'Safety First')}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.safetyFirstDesc', 'We prioritize the safety of our passengers and crew on every journey.')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-emerald-600/30">
                    <FaUsers />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white m-0 mb-1">{t('about.customerFocused', 'Customer Focused')}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.customerFocusedDesc', 'Your satisfaction is our top priority. We listen, care and improve every day.')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-emerald-600/30">
                    <FaLightbulb />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white m-0 mb-1">{t('about.innovation', 'Innovation')}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.innovationDesc', 'We use modern technology to make booking and traveling easier for everyone.')}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {}
        <section className="py-16 px-4 sm:px-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-center text-2xl sm:text-3xl font-black text-white mb-10">
              {t('about.ourValues', 'Our Values')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
                  <FaShieldAlt />
                </div>
                <h3 className="text-base font-bold text-white m-0">{t('about.integrity', 'Integrity')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.integrityDesc', 'We operate with honesty and transparency.')}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
                  <FaAward />
                </div>
                <h3 className="text-base font-bold text-white m-0">{t('about.reliability', 'Reliability')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.reliabilityDesc', 'We keep our promises and deliver on time.')}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
                  <FaHeart />
                </div>
                <h3 className="text-base font-bold text-white m-0">{t('about.respect', 'Respect')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.respectDesc', 'We respect our customers, employees and partners.')}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">
                  <FaCrown />
                </div>
                <h3 className="text-base font-bold text-white m-0">{t('about.excellence', 'Excellence')}</h3>
                <p className="text-xs text-slate-400 leading-relaxed m-0">{t('about.excellenceDesc', 'We strive for excellence in everything we do.')}</p>
              </div>
            </div>
          </div>
        </section>

        {}
        <section className="py-16 px-4 sm:px-6 bg-[#09111e]">
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-950 border border-emerald-500/30 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl text-emerald-300 shrink-0">
              <FaChair />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-black text-white m-0 mb-2">{t('about.ctaTitle', 'Comfortable. Reliable. Always With You.')}</h2>
              <p className="text-sm text-emerald-100/80 m-0">{t('about.ctaSubtitle', 'Join thousands of happy passengers who trust Ethio Trip for their everyday travel.')}</p>
            </div>
            <Link
              to="/buses"
              className="px-6 py-3.5 rounded-xl bg-white text-emerald-950 font-bold text-sm hover:bg-emerald-50 transition-all shadow-lg flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {t('about.bookTicketNow', 'Book Your Ticket Now')} <FaArrowRight />
            </Link>
          </div>
        </section>

      </div>
    </MainLayout>
  );
};

export default AboutPage;
