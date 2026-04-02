/**
 * Card Component - Reusable Card Container
 * Used for displaying content in organized sections
 */

import React from 'react';
import './Card.css';

export default function Card({
  children,
  className = '',
  clickable = false,
  elevated = true,
  padding = 'md',
  ...props
}) {
  const classNames = [
    'card',
    `card-padding-${padding}`,
    elevated && 'card-elevated',
    clickable && 'card-clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Header Component
 */
export function CardHeader({ children, title, subtitle, className = '' }) {
  return (
    <div className={`card-header ${className}`.trim()}>
      {title && <h3 className="card-title">{title}</h3>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {!title && children}
    </div>
  );
}

/**
 * Card Body Component
 */
export function CardBody({ children, className = '' }) {
  return (
    <div className={`card-body ${className}`.trim()}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`card-footer ${className}`.trim()}>
      {children}
    </div>
  );
}
