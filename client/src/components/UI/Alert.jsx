/**
 * Alert Component - For displaying alerts/notifications
 */

import React from 'react';
import { VscClose, VscInfo, VscWarning, VscError, VscCheck } from 'react-icons/vsc';
import './Alert.css';

export default function Alert({
  children,
  variant = 'info',
  title,
  closable = false,
  onClose,
  icon,
  className = '',
  ...props
}) {
  const [closed, setClosed] = React.useState(false);

  if (closed) return null;

  const iconMap = {
    info: VscInfo,
    success: VscCheck,
    warning: VscWarning,
    error: VscError,
  };

  const IconComponent = icon || iconMap[variant];

  const handleClose = () => {
    setClosed(true);
    onClose?.();
  };

  const classNames = [
    'alert',
    `alert-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role="alert" {...props}>
      {IconComponent && <IconComponent className="alert-icon" />}
      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        {children && <p className="alert-message">{children}</p>}
      </div>
      {closable && (
        <button
          type="button"
          className="alert-close"
          aria-label="Close alert"
          onClick={handleClose}
        >
          <VscClose />
        </button>
      )}
    </div>
  );
}
