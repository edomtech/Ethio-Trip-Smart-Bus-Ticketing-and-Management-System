
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