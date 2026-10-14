import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { resolveDuration } from '../components/ui/ToastContainer';
import { resolveToastPayload, resolveToastVariant } from '../components/ui/Toast';
import { MESSAGES } from '../constants/messages';
import ConfirmModal from '../components/ui/ConfirmModal';

const NotificationContext = createContext(null);

const TECHNICAL_PATTERNS = [
  /axios ?error/i,
  /err_/i,
  /econnrefused/i,
  /econnreset/i,
  /etimedout/i,
  /mongo(server)? ?error/i,
  /mongodb(\.js)?/i,
  /duplicate key/i,
  /validationerror/i,
  /cast to (objectid|string|number)/i,
  /internal server error/i,
  /bad gateway/i,
  /service unavailable/i,
  /gateway time-?out/i,
  /\bstack\b/i,
  /at .+\.(js|jsx|ts):\d+/i,
  /https?:\/\//i,
  /localhost/i,
  /127\.0\.0\.1/i,
  /\bat [A-Za-z_$][\w$]* \(/i,
  /\b0x[0-9a-f]+\b/i,
  /jsonwebtoken/i,
  /bcrypt/i,
  /jwt\b/i,
];

const TECHNICAL_TERMS = ['traceback', 'node_modules', 'require(', 'undefined is not', 'null pointer'];

export const isTechnicalMessage = (message) => {
  if (!message || typeof message !== 'string') return false;
  const text = message.trim();
  if (!text) return false;
  if (text.length > 240) return true;
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(text))) return true;
  return TECHNICAL_TERMS.some((term) => text.toLowerCase().includes(term));
};

export const logTechnicalError = (context, error) => {
  if (import.meta.env?.DEV) {
    
    console.error(`[${context}]`, error);
  }
};

const NETWORK_FALLBACK = MESSAGES.network.offline;

const ERROR_TITLE_BY_STATUS = {
  400: 'Invalid Request',
  401: 'Session Expired',
  403: 'Access Denied',
  404: 'Not Found',
  408: 'Request Timed Out',
  409: 'Conflict',
  413: 'File Too Large',
  422: 'Invalid Request',
  429: 'Too Many Attempts',
  500: 'Server Error',
  502: 'Server Error',
  503: 'Server Error',
  504: 'Request Timed Out',
};


export const toSafeNotification = (error, fallback) => {
  const base = fallback || MESSAGES.common.somethingWentWrong;

  if (!error) return base;

  const status = error.status;
  const code = error.code;
  const isNetwork =
    !status &&
    (error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('Failed to fetch'));

  if (isNetwork) {
    logTechnicalError('Notification/network', error);
    return NETWORK_FALLBACK;
  }

  const statusFallback = status ? ERROR_TITLE_BY_STATUS[status] : null;
  if (status && status >= 500) {
    logTechnicalError('Notification/server', error);
    return MESSAGES.network.serverError;
  }

  const rawMessage = typeof error === 'string' ? error : error.message;
  if (rawMessage && !isTechnicalMessage(rawMessage)) {
    const resolved = resolveToastPayload(rawMessage);
    return {
      title: resolved.title || statusFallback || base.title,
      description: resolved.description,
    };
  }

  if (rawMessage) logTechnicalError('Notification/technical', error);

  if (statusFallback) {
    return { title: statusFallback, description: base.description };
  }
  return base;
};

const ToastBody = ({ title, description }) => (
  <div className="et-toast__body">
    <span className="et-toast__title">{title}</span>
    {description ? <span className="et-toast__description">{description}</span> : null}
  </div>
);

export function NotificationProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolver = useRef(null);
  const pendingLoaders = useRef(new Map());

  const dismiss = useCallback(() => {}, []);

  const dismissByType = useCallback(() => {}, []);

  const push = useCallback((type, input, options = {}) => {
    const { title, description } = resolveToastPayload(
      typeof input === 'function' ? input() : input
    );
    if (import.meta.env?.DEV && (title || description)) {
      console.log(`[Notification:${type}]`, title, description);
    }
    return null;
  }, []);

  const success = useCallback((input, options) => push('success', input, options), [push]);
  const error = useCallback((input, options) => push('error', input, options), [push]);
  const warning = useCallback((input, options) => push('warning', input, options), [push]);
  const info = useCallback((input, options) => push('info', input, options), [push]);

  const loading = useCallback(() => 'loading-id', []);

  const loadingDone = useCallback(() => {}, []);

  const notifyError = useCallback(
    (caught, fallback, options) => {
      const payload = toSafeNotification(caught, fallback);
      return error(payload, options);
    },
    [error]
  );

  const confirm = useCallback((options = {}) => {
    if (confirmResolver.current) {
      confirmResolver.current(false);
      confirmResolver.current = null;
    }
    const payload = typeof options === 'string' ? { message: options } : options;

    setConfirmState({
      open: true,
      title: payload.title || 'Are you sure?',
      message: payload.message || 'This action cannot be undone.',
      description: payload.description || '',
      confirmLabel: payload.confirmLabel || 'Confirm',
      cancelLabel: payload.cancelLabel || 'Cancel',
      variant: payload.variant || 'danger',
      icon: payload.icon || null,
      itemName: payload.itemName || '',
      action: typeof payload.action === 'function' ? payload.action : null,
    });

    return new Promise((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const settleConfirm = useCallback((result) => {
    setConfirmState((prev) => (prev ? { ...prev, open: false } : prev));
    window.setTimeout(() => setConfirmState(null), 220);
    const resolver = confirmResolver.current;
    confirmResolver.current = null;
    if (resolver) resolver(result);
  }, []);

  const handleConfirmClick = useCallback(async () => {
    const action = confirmState?.action;
    if (action) {
      try {
        await action();
      } catch {
        logTechnicalError('Notification/confirm-action', new Error('Confirmation action failed'));
      }
    }
    settleConfirm(true);
  }, [confirmState?.action, settleConfirm]);

  const handleCancelClick = useCallback(() => settleConfirm(false), [settleConfirm]);

  const value = useMemo(
    () => ({
      success,
      error,
      warning,
      info,
      loading,
      loadingDone,
      dismiss,
      dismissByType,
      notifyError,
      confirm,
      messages: MESSAGES,
    }),
    [success, error, warning, info, loading, loadingDone, dismiss, dismissByType, notifyError, confirm]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ConfirmModal
        state={confirmState}
        onCancel={handleCancelClick}
        onConfirm={handleConfirmClick}
      />
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context) return context;

  logTechnicalError('Notification/provider-missing', new Error('NotificationProvider is not mounted'));

  return {
    success: (input, options) => pushGlobal('success', input, options),
    error: (input, options) => pushGlobal('error', input, options),
    warning: (input, options) => pushGlobal('warning', input, options),
    info: (input, options) => pushGlobal('info', input, options),
    loading: () => null,
    loadingDone: () => {},
    dismiss: () => toast.dismiss(),
    dismissByType: (type) => toast.dismiss({ type }),
    notifyError: (caught, fallback, options) =>
      pushGlobal('error', toSafeNotification(caught, fallback), options),
    confirm: () => Promise.resolve(false),
    messages: MESSAGES,
  };
};

const pushGlobal = (type, input, options) => {
  return null;
};


export default NotificationContext;
