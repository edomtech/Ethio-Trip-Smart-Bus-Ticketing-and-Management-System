import React, { useCallback, useMemo } from 'react';
import { ToastContainer as BaseToastContainer, Slide } from 'react-toastify';
import { useTheme } from '../../contexts/ThemeContext';

const CustomCloseButton = ({ closeToast, type }) => (
  <button
    type="button"
    className="et-toast__close"
    aria-label={`Dismiss ${type || 'notification'}`}
    onClick={(event) => {
      event.stopPropagation();
      closeToast?.(true);
    }}
  >
    <svg aria-hidden="true" viewBox="0 0 14 16" focusable="false">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.71 8.23l3.75 3.75-1.48 1.48-3.75-3.75-3.75 3.75L1 11.21l3.75-3.75L1 3.71l1.48-1.48 3.75 3.75 3.75-3.75L11.46 3.7 7.71 7.46 11.46 11.21z"
      />
    </svg>
  </button>
);

export const TOAST_DURATIONS = {
  success: 4000,
  info: 4500,
  warning: 6000,
  error: 7000,
  default: 5000,
};

export const resolveDuration = (type) => TOAST_DURATIONS[type] || TOAST_DURATIONS.default;

export const toastClassNameFor = ({ type, defaultClassName }) =>
  [defaultClassName, 'et-toast', `et-toast--${type || 'default'}`].filter(Boolean).join(' ');

export const progressClassNameFor = ({ type, defaultClassName }) =>
  [defaultClassName, 'et-toast__progress', `et-toast__progress--${type || 'default'}`]
    .filter(Boolean)
    .join(' ');

export function ToastContainer() {
  return null;
}

export default ToastContainer;

