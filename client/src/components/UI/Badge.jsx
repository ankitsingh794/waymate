/**
 * Badge Component - Small label/tag component
 */

import React from 'react';
import './Badge.css';

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  ...props
}) {
  const classNames = [
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {Icon && <Icon className="badge-icon" />}
      {children}
    </span>
  );
}
