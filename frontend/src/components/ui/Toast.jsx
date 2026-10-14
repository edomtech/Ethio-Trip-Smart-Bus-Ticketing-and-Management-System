import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

export const TOAST_VARIANTS = {
  success: {
    Icon: FaCheckCircle,
    label: 'Success',
    role: 'status',
    live: 'polite',
  },
  error: {
    Icon: FaExclamationCircle,
    label: 'Error',
    role: 'alert',
    live: 'assertive',
  },
  warning: {
    Icon: FaExclamationTriangle,
    label: 'Warning',
    role: 'alert',
    live: 'assertive',
  },
  info: {
    Icon: FaInfoCircle,
    label: 'Information',
    role: 'status',
    live: 'polite',
  },
  default: {
    Icon: FaInfoCircle,
    label: 'Notification',
    role: 'status',
    live: 'polite',
  },
};

export function resolveToastVariant(type) {
  if (!type) return TOAST_VARIANTS.default;
  return TOAST_VARIANTS[type] || TOAST_VARIANTS.default;
}

export function resolveToastPayload(input) {
  if (input === null || input === undefined) return { title: '', description: '' };

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const splitIndex = trimmed.indexOf('\n');
    if (splitIndex > 0) {
      return {
        title: trimmed.slice(0, splitIndex).trim(),
        description: trimmed.slice(splitIndex + 1).trim(),
      };
    }
    return { title: trimmed, description: '' };
  }

  if (Array.isArray(input)) {
    const [first, ...rest] = input;
    return {
      title: String(first ?? ''),
      description: rest.filter(Boolean).map(String).join(' '),
    };
  }

  if (typeof input === 'object') {
    return {
      title: String(input.title ?? '').trim(),
      description: String(input.description ?? '').trim(),
    };
  }

  return { title: String(input), description: '' };
}

export function ToastIcon({ type = 'default', className = '' }) {
  const { Icon } = resolveToastVariant(type);
  return <Icon className={className} aria-hidden="true" />;
}

export default ToastIcon;
