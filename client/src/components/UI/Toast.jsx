import React from 'react';
import { VscCheck, VscClose, VscError, VscInfo, VscWarning } from 'react-icons/vsc';
import './Toast.css';

const ICON_BY_VARIANT = {
  info: VscInfo,
  success: VscCheck,
  warning: VscWarning,
  error: VscError,
};

export default function Toast({ variant = 'info', message = '', onClose }) {
  if (!message) return null;

  const IconComponent = ICON_BY_VARIANT[variant] || VscInfo;

  return (
    <div className="wm-toast-shell" role={variant === 'error' ? 'alert' : 'status'} aria-live={variant === 'error' ? 'assertive' : 'polite'}>
      <div key={`${variant}-${message}`} className={`wm-toast wm-toast-${variant}`}>
        <IconComponent className="wm-toast-icon" />
        <p className="wm-toast-text">{message}</p>
        <button type="button" className="wm-toast-close" aria-label="Dismiss notification" onClick={onClose}>
          <VscClose />
        </button>
      </div>
    </div>
  );
}