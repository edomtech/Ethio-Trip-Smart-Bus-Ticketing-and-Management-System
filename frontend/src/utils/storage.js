
export const STORAGE_KEYS = Object.freeze({
  TOKEN: 'ethiotrip_token',
  USER: 'ethiotrip_user',
  LANGUAGE: 'ethiotrip_language',
  THEME: 'ethiotrip_theme',
});


const LEGACY_ALIASES = Object.freeze({
  ethiobus_token: STORAGE_KEYS.TOKEN,
  ethiobus_user: STORAGE_KEYS.USER,
  ethiobus_language: STORAGE_KEYS.LANGUAGE,
  ethiobus_theme: STORAGE_KEYS.THEME,
});

let migrated = false;


export const migrateLegacyStorage = () => {
  if (migrated) return;
  if (typeof window === 'undefined') return;

  try {
    Object.entries(LEGACY_ALIASES).forEach(([legacyKey, currentKey]) => {
      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue === null) return;

      const currentValue = window.localStorage.getItem(currentKey);
      if (currentValue === null) {
        window.localStorage.setItem(currentKey, legacyValue);
      }
      window.localStorage.removeItem(legacyKey);
    });
  } catch {
  }

  migrated = true;
};

const readItem = (key) => {
  migrateLegacyStorage();
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeItem = (key, value) => {
  migrateLegacyStorage();
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
};

const removeItem = (key) => {
  migrateLegacyStorage();
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