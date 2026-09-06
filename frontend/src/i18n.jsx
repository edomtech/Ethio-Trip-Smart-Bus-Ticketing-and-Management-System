import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './locales/en.json';
import am from './locales/am.json';
import om from './locales/om.json';

const resources = { en, am, om };

const LanguageContext = createContext({
  t: (k) => k,
  i18n: { language: 'en', changeLanguage: () => {} },
  currentLang: 'en',
  changeLanguage: () => {},
});

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('ethiotrip_language') || 'en';
  });

  const changeLanguage = (code) => {
    if (resources[code]) {
      setCurrentLang(code);
      localStorage.setItem('ethiotrip_language', code);
      document.documentElement.lang = code;
    }
  };

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const t = (keyPath, defaultText = '') => {
    if (!keyPath) return '';
    const keys = keyPath.split('.');
    const dict = resources[currentLang] || resources.en;

    let val = dict;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        // Fallback to English translation
        let fallbackVal = resources.en;
        for (const fk of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && fk in fallbackVal) {
            fallbackVal = fallbackVal[fk];
          } else {
            return defaultText || keyPath;
          }
        }
        return fallbackVal || defaultText || keyPath;
      }
    }
    return val || defaultText || keyPath;
  };

  const i18n = {
    language: currentLang,
    changeLanguage,
    languages: ['en', 'am', 'om'],
  };

  return (
    <LanguageContext.Provider value={{ t, i18n, currentLang, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  return useContext(LanguageContext);
};

export default LanguageProvider;
