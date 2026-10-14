import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBus, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaFacebook, FaTelegram, FaTwitter, FaArrowRight, FaBuilding } from 'react-icons/fa';
import { platformSettingAPI } from '../utils/api';
import CompanyRegisterModal from './CompanyRegisterModal';

const Footer = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [contact, setContact] = useState({
    supportPhone: '+251 911 002 233',
    supportEmail: 'support@ethiotrip.et',
    systemAddress: 'Emare ICT Hub, Debre Birhan, Ethiopia',
  });
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    platformSettingAPI.getSettings().then((data) => {
      if (data) {
        setContact({
          supportPhone: data.supportPhone || '+251 911 002 233',
          supportEmail: data.supportEmail || 'support@ethiotrip.et',
          systemAddress: data.systemAddress || 'Emare ICT Hub, Debre Birhan, Ethiopia',
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* Own a Bus Company Banner (Shown only on Home page) */}
      {isHomePage && (
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 border-t-2 border-emerald-600/50 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-lg shadow-emerald-600/40 shrink-0">
              <FaBuilding />
            </div>
            <div>
              <h3 className="text-base font-black text-white m-0">Own a Bus Company?</h3>
              <p className="text-xs text-emerald-200/80 m-0 mt-0.5">Register on Ethio Trip and reach passengers across Ethiopia.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-black text-xs rounded-xl hover:bg-emerald-50 transition-all cursor-pointer shadow-md shrink-0"
          >
            <FaBuilding /> Register Your Bus Company
          </button>
        </div>
      </div>
      )}

      <footer className="bg-[#051d14] text-slate-400 font-poppins border-t-4 border-emerald-600 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-6 border-b border-white/10">

          {}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shadow-md">
                <FaBus />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-black text-white tracking-wide">
                  ETHIO<span className="text-emerald-400">TRIP</span>
                </div>
                <div className="text-[10px] text-white/50 font-medium tracking-wider">
                  Emare ICT Hub
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-white/60">
              Ethiopia's leading bus ticketing platform — safe, affordable and reliable inter-city travel.
            </p>
            <div className="flex items-center gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="w-8 h-8 rounded-lg bg-white/[0.07] border border-white/10 text-white/70 flex items-center justify-center text-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all hover:-translate-y-0.5">
                <FaFacebook />
              </a>
              <a href="https://telegram.org" target="_blank" rel="noreferrer" aria-label="Telegram" className="w-8 h-8 rounded-lg bg-white/[0.07] border border-white/10 text-white/70 flex items-center justify-center text-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all hover:-translate-y-0.5">
                <FaTelegram />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="w-8 h-8 rounded-lg bg-white/[0.07] border border-white/10 text-white/70 flex items-center justify-center text-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all hover:-translate-y-0.5">
                <FaTwitter />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">Navigation</h4>
            <a href="/" className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-emerald-300 hover:translate-x-1 transition-all">
              <FaArrowRight className="text-[10px] text-emerald-500 shrink-0" /> Home
            </a>
            <Link to="/about" className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-emerald-300 hover:translate-x-1 transition-all">
              <FaArrowRight className="text-[10px] text-emerald-500 shrink-0" /> About Us
            </Link>
            <Link to="/contact" className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-emerald-300 hover:translate-x-1 transition-all">
              <FaArrowRight className="text-[10px] text-emerald-500 shrink-0" /> Contact Us
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <h4 className="text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">Contact</h4>
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <FaPhoneAlt className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[10px] text-white/40 uppercase">Phone</span>
                <strong className="text-white">{contact.supportPhone}</strong>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <FaEnvelope className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[10px] text-white/40 uppercase">Email</span>
                <strong className="text-white">{contact.supportEmail}</strong>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/60">
              <FaMapMarkerAlt className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="block text-[10px] text-white/40 uppercase">Office</span>
                <strong className="text-white">{contact.systemAddress}</strong>
              </div>
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-3 text-xs text-white/40">
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-1 rounded-sm bg-emerald-600" />
            <span className="w-3.5 h-1 rounded-sm bg-amber-400" />
            <span className="w-3.5 h-1 rounded-sm bg-rose-500" />
          </div>
          <p>© {new Date().getFullYear()} Ethio Trip — Emare ICT Hub. All Rights Reserved.</p>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-1 rounded-sm bg-emerald-600" />
            <span className="w-3.5 h-1 rounded-sm bg-amber-400" />
            <span className="w-3.5 h-1 rounded-sm bg-rose-500" />
          </div>
        </div>
      </div>
    </footer>

      {showRegister && (
        <CompanyRegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
      )}
    </>
  );
};

export default Footer;
