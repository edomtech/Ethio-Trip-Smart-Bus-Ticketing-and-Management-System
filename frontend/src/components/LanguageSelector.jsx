import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import { FaCheck } from 'react-icons/fa';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', nativeName: 'አማርኛ', short: 'አማ', flag: '🇪🇹' },
  { code: 'om', label: 'Afaan Oromoo', nativeName: 'Afaan Oromoo', short: 'OM', flag: '🇪🇹' },
];

const LanguageSelector = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = i18n.language || 'en';
  const currentLang = LANGUAGES.find(l => l.code === currentLangCode) || LANGUAGES[0];

  const handleSelectLanguage = (code) => {
    i18n.changeLanguage(code);
    storage.setLanguage(code);
    if (user && updateUser) {
      updateUser({ preferredLanguage: code });
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = variant === 'dark';

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center">
      {}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language / ቋንቋ ይምረጡ / Afaan Filadhaa"
        title={`Language: ${currentLang.nativeName} (Click to switch)`}
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors outline-none cursor-pointer ${
          isDark
            ? 'text-white hover:bg-white/10'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
        }`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="block"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[1000] min-w-[200px] p-2 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-1.5 text-[0.68rem] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span>Choose Language / ቋንቋ</span>
            <span className="text-xs">🌐</span>
          </div>

          {LANGUAGES.map((lang) => {
            const isSelected = currentLangCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors cursor-pointer text-left text-sm ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold'
                    : 'text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{lang.flag}</span>
                  <div>
                    <div className={`leading-tight ${isSelected ? 'font-bold' : 'font-semibold'}`}>{lang.nativeName}</div>
                    <div className={`text-[0.7rem] ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>{lang.label}</div>
                  </div>
                </div>
                {isSelected && <FaCheck className="text-xs text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
