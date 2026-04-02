/**
 * Input Component - Modern Form Input
 * Supports different types, states, and validation
 */

import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  error,
  success,
  disabled = false,
  fullWidth = false,
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  helperText,
  required = false,
  className = '',
  ...props
}, ref) => {
  const classNames = [
    'input-wrapper',
    fullWidth && 'input-full-width',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inputClassNames = [
    'input',
    `input-${size}`,
    error && 'input-error',
    success && 'input-success',
    disabled && 'input-disabled',
    Icon && `input-has-icon-${iconPosition}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-field-wrapper">
        {Icon && iconPosition === 'left' && (
          <Icon className="input-icon input-icon-left" />
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassNames}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <Icon className="input-icon input-icon-right" />
        )}
      </div>
      {(error || helperText) && (
        <span className={`input-helper ${error ? 'input-helper-error' : ''}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
