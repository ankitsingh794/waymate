import React, { useEffect, useRef } from 'react';
import { VscCheck, VscClose, VscError, VscInfo, VscWarning } from 'react-icons/vsc';
import './Toast.css';

const ICON_BY_VARIANT = {
  info:    VscInfo,
  success: VscCheck,
  warning: VscWarning,
  error:   VscError,
};

/**
 * Toast — slide-up notification (Phase 2, plan spec)
 *
 * Props:
 *   variant       — 'info' | 'success' | 'warning' | 'error'
 *   message       — string
 *   onClose       — called when the user dismisses or auto-dismiss fires
 *   autoDismiss   — ms until auto-dismiss; 0 = no auto-dismiss (default 4000)
 */
export default function Toast({ variant = 'info', message = '', onClose, autoDismiss = 4000 }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!autoDismiss || !onClose) return;
    timerRef.current = setTimeout(onClose, autoDismiss);
    return () => clearTimeout(timerRef.current);
  }, [autoDismiss, onClose]);

  if (!message) return null;

  const IconComponent = ICON_BY_VARIANT[variant] || VscInfo;
  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div className="wm-toast-shell" role={role} aria-live={variant === 'error' ? 'assertive' : 'polite'}>
      <div key={`${variant}-${message}`} className={`wm-toast wm-toast-${variant}`}>
        <IconComponent className="wm-toast-icon" aria-hidden="true" />
        <p className="wm-toast-text">{message}</p>
        {onClose && (
          <button type="button" className="wm-toast-close" aria-label="Dismiss notification" onClick={onClose}>
            <VscClose aria-hidden="true" />
          </button>
        )}
        {/* Auto-dismiss progress bar — Tier 2 motion, data-state driven */}
        {autoDismiss > 0 && <span className="wm-toast-progress" aria-hidden="true" />}
      </div>
    </div>
  );
}