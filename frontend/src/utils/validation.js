import { MESSAGES, PASSWORD_MIN_LENGTH } from '../constants/messages';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ETHIOPIAN_PHONE_PATTERN = /^(09|07)\d{8}$/;
export const PHONE_FLEXIBLE_PATTERN = /^[0-9+\s-]{7,20}$/;
export const NATIONAL_ID_PATTERN = /^[A-Za-z0-9]{4,20}$/;
export const PLATE_PATTERN = /^[A-Za-z]{2,3}\s?-?\d{2,4}\s?[A-Za-z]{0,2}$/;
export const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]{1,59}$/u;

const toMessage = (value, fallbackTitle) => {
  if (!value) return null;
  if (typeof value === 'string') return { title: fallbackTitle, description: value };
  return {
    title: value.title || fallbackTitle,
    description: value.description || '',
  };
};

export const validators = {
  required: (value, msg) =>
    value !== null && value !== undefined && String(value).trim().length > 0
      ? null
      : toMessage(msg, 'Required'),

  fullName: (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return MESSAGES.registration.fullNameRequired;
    if (!NAME_PATTERN.test(trimmed) || /\s{2,}/.test(trimmed)) {
      return MESSAGES.registration.fullNameInvalid;
    }
    return null;
  },

  email: (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return MESSAGES.registration.emailRequired;
    if (!EMAIL_PATTERN.test(trimmed)) return MESSAGES.registration.emailInvalid;
    return null;
  },

  phone: (value, { required = true } = {}) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return required ? MESSAGES.registration.phoneRequired : null;
    const digits = trimmed.replace(/[\s-]/g, '');
    if (ETHIOPIAN_PHONE_PATTERN.test(digits)) return null;
    if (PHONE_FLEXIBLE_PATTERN.test(trimmed)) return null;
    return MESSAGES.registration.phoneInvalid;
  },

  nationalId: (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return MESSAGES.registration.nationalIdRequired;
    if (!NATIONAL_ID_PATTERN.test(trimmed)) return MESSAGES.registration.nationalIdInvalid;
    return null;
  },

  password: (value) => {
    const raw = String(value || '');
    if (!raw) return MESSAGES.registration.passwordRequired;
    if (raw.length < PASSWORD_MIN_LENGTH) return MESSAGES.registration.passwordTooShort;
    return null;
  },

  confirmPassword: (value, password) => {
    const raw = String(value || '');
    if (!raw) return MESSAGES.registration.confirmRequired;
    if (raw !== String(password || '')) return MESSAGES.registration.passwordsDontMatch;
    return null;
  },

  terms: (accepted) =>
    accepted ? null : MESSAGES.registration.termsRequired,

  plate: (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return MESSAGES.bus.plateRequired;
    if (!PLATE_PATTERN.test(trimmed)) return MESSAGES.bus.plateInvalid;
    return null;
  },

  positiveNumber: (value, msg) => {
    const num = Number(value);
    if (value === '' || value === null || value === undefined || Number.isNaN(num) || num <= 0) {
      return toMessage(msg, 'Invalid Value');
    }
    return null;
  },
};

export const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim());
export const isValidEthiopianPhone = (value) =>
  ETHIOPIAN_PHONE_PATTERN.test(String(value || '').replace(/[\s-]/g, ''));

const focusField = (name) => {
  if (typeof document === 'undefined') return;
  const element =
    document.querySelector(`[data-field="${name}"]`) ||
    document.getElementById(`field-${name}`) ||
    document.querySelector(`[name="${name}"]`);
  if (!element) return;
  const focusable = element.matches?.('input,select,textarea,button,[tabindex]')
    ? element
    : element.querySelector?.('input,select,textarea');
  if (!focusable) return;
  try {
    focusable.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => focusable.focus({ preventScroll: true }), 120);
  } catch {
    try { focusable.focus(); } catch {  }
  }
};

export const focusFormField = focusField;

export const validateSequentially = (rules, onInvalid) => {
  const entries = Object.entries(rules);
  for (let i = 0; i < entries.length; i += 1) {
    const [field, error] = entries[i];
    if (error) {
      if (onInvalid) onInvalid(field, error);
      focusField(field);
      return { valid: false, field, error };
    }
  }
  return { valid: true, field: null, error: null };
};
