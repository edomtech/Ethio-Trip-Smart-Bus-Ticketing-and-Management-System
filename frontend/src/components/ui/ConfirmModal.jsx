import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTrashAlt, FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

const VARIANTS = {
  danger: {
    Icon: FaTrashAlt,
    ring: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
    icon: 'text-rose-600 dark:text-rose-400',
    confirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30',
    label: 'Delete',
  },
  warning: {
    Icon: FaExclamationTriangle,
    ring: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    icon: 'text-amber-600 dark:text-amber-400',
    confirm: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30',
    label: 'Confirm',
  },
  info: {
    Icon: FaInfoCircle,
    ring: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
    confirm: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30',
    label: 'Confirm',
  },
  success: {
    Icon: FaCheckCircle,
    ring: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
    confirm: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30',
    label: 'Confirm',
  },
};

function ConfirmModal({ state, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const previousFocus = useRef(null);

  const open = Boolean(state?.open);
  const variantKey = state?.variant || 'danger';
  const variant = VARIANTS[variantKey] || VARIANTS.danger;
  const Icon = state?.icon || variant.Icon;

  useEffect(() => {
    if (!open) {
      setBusy(false);
      return undefined;
    }

    previousFocus.current = document.activeElement;
    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 60);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        event.stopPropagation();
        onCancel?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = Array.from(
        document.querySelectorAll('.et-modal button:not([disabled])')
      ).filter((node) => document.querySelector('.et-modal')?.contains(node));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !document.querySelector('.et-modal')?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      const restore = previousFocus.current;
      if (restore && typeof restore.focus === 'function') {
        window.setTimeout(() => restore.focus(), 40);
      }
    };
  }, [open, busy, onCancel]);

  const handleConfirm = useCallback(async () => {
    if (busy) return;
    const result = onConfirm?.();
    if (!result || typeof result.then !== 'function') return;
    setBusy(true);
    try {
      await result;
    } finally {
      setBusy(false);
    }
  }, [busy, onConfirm]);

  if (typeof document === 'undefined') return null;

  if (!open && !state) return null;

  const titleId = 'et-confirm-title';
  const messageId = 'et-confirm-message';

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      aria-hidden={!open}
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-center transform animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl mb-4 ${variant.ring}`}>
          <span className={variant.icon}>
            {typeof Icon === 'function' ? <Icon aria-hidden="true" /> : Icon}
          </span>
        </div>

        <h2 id={titleId} className="text-lg font-black text-slate-900 dark:text-white m-0 mb-2">
          {state?.title}
        </h2>

        <p id={messageId} className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0 mb-4">
          {state?.message}
        </p>

        {state?.description ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{state.description}</p>
        ) : null}

        {state?.itemName ? (
          <div className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-4 truncate border border-slate-200 dark:border-slate-700">
            {state.itemName}
          </div>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button
            ref={cancelRef}
            type="button"
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            {state?.cancelLabel || 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${variant.confirm}`}
            onClick={handleConfirm}
            disabled={busy}
            data-busy={busy ? 'true' : 'false'}
          >
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span>Processing…</span>
              </>
            ) : (
              <span>{state?.confirmLabel || variant.label}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export { ConfirmModal };
export default ConfirmModal;
