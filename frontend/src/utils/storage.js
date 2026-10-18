
export const STORAGE_KEYS = Object.freeze({
  TOKEN: 'ethiotrip_token',
  USER: 'ethiotrip_user',
  LANGUAGE: 'ethiotrip_language',
  THEME: 'ethiotrip_theme',
});


const readItem = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeItem = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
};

const removeItem = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
  }
};

export const storage = {
  getToken: () => readItem(STORAGE_KEYS.TOKEN),
  setToken: (value) => writeItem(STORAGE_KEYS.TOKEN, value),
  getUser: () => readItem(STORAGE_KEYS.USER),
  setUser: (value) => writeItem(STORAGE_KEYS.USER, value),
  getLanguage: () => readItem(STORAGE_KEYS.LANGUAGE),
  setLanguage: (value) => writeItem(STORAGE_KEYS.LANGUAGE, value),
  getTheme: () => readItem(STORAGE_KEYS.THEME),
  setTheme: (value) => writeItem(STORAGE_KEYS.THEME, value),
  clearAuth: () => {
    removeItem(STORAGE_KEYS.TOKEN);
    removeItem(STORAGE_KEYS.USER);
  },
};

const LEGACY_KEYS = {
  USER_INFO: 'userInfo',
  AUTH_TOKEN: 'authToken',
  TOKEN: 'token',
  USER: 'user',
  PREFERRED_LANG: 'preferredLang',
  LANGUAGE: 'language',
  THEME: 'theme',
};

export const migrateLegacyStorage = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const migrated = localStorage.getItem('ethiotrip_migrated');
    if (migrated === '1') return;

    const token = readItem(LEGACY_KEYS.AUTH_TOKEN) || readItem(LEGACY_KEYS.TOKEN);
    if (token && !readItem(STORAGE_KEYS.TOKEN)) {
      writeItem(STORAGE_KEYS.TOKEN, token);
    }

    const user = readItem(LEGACY_KEYS.USER_INFO) || readItem(LEGACY_KEYS.USER);
    if (user && !readItem(STORAGE_KEYS.USER)) {
      writeItem(STORAGE_KEYS.USER, user);
    }

    const lang = readItem(LEGACY_KEYS.PREFERRED_LANG) || readItem(LEGACY_KEYS.LANGUAGE);
    if (lang && !readItem(STORAGE_KEYS.LANGUAGE)) {
      writeItem(STORAGE_KEYS.LANGUAGE, lang);
    }

    const theme = readItem(LEGACY_KEYS.THEME);
    if (theme && !readItem(STORAGE_KEYS.THEME)) {
      writeItem(STORAGE_KEYS.THEME, theme);
    }

    localStorage.setItem('ethiotrip_migrated', '1');
  } catch {
    // ignore
  }
};