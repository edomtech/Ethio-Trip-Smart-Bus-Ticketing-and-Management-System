import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n.jsx';
import { FaGlobeAmericas, FaCheck } from 'react-icons/fa';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'am', label: 'አማርኛ', nativeName: 'አማርኛ', flag: '🇪🇹' },
  { code: 'om', label: 'Afaan Oromoo', nativeName: 'Afaan Oromoo', flag: '🇪🇹' },
];

const LanguageSelector = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = i18n.language || 'en';
  const currentLang = LANGUAGES.find(l => l.code === currentLangCode) || LANGUAGES[0];

  const handleSelectLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('ethiotrip_language', code);
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
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.75rem',
          background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 600,
          color: isDark ? '#f8fafc' : '#334155',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Select Language / ቋንቋ ይምረጡ"
      >
        <FaGlobeAmericas style={{ color: '#1d6bf3', fontSize: '0.9rem' }} />
        <span>{currentLang.flag}</span>
        <span>{currentLang.label}</span>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>▾</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            zIndex: 1000,
            minWidth: 170,
            padding: '0.35rem',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.35rem 0.65rem', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Choose Language
          </div>
          {LANGUAGES.map((lang) => {
            const isSelected = currentLangCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  border: 'none',
                  borderRadius: 8,
                  background: isSelected ? '#eff6ff' : 'transparent',
                  color: isSelected ? '#1d6bf3' : '#1e293b',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {isSelected && <FaCheck style={{ fontSize: '0.72rem', color: '#1d6bf3' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
