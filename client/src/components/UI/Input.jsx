/**
 * Input — WayMate canonical form field component.
 *
 * Handles three element types through a single consistent API:
 *   type="text" | "email" | "password" | "date" | "number" | ...  → <input>
 *   type="select"   → <select> with custom Forest-Sand arrow
 *   type="textarea" → <textarea> with resize
 *
 * Usage:
 *   <Input label="Destination" type="text" value={v} onChange={fn} />
 *   <Input label="Mode" type="select" value={v} onChange={fn}>{options}</Input>
 *   <Input label="Notes" type="textarea" rows={4} value={v} onChange={fn} />
 */

import { forwardRef } from 'react';
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
  children,   // used when type="select"
  rows = 4,   // used when type="textarea"
  ...props
}, ref) => {

  const wrapperClass = [
    'input-wrapper',
    fullWidth && 'input-full-width',
    className,
  ].filter(Boolean).join(' ');

  const isSelect   = type === 'select';
  const isTextarea = type === 'textarea';

  const fieldClass = [
    isSelect   ? 'input-select'   :
    isTextarea ? 'input-textarea' : 'input',
    `input-${size}`,
    error   && 'input-error',
    success && 'input-success',
    disabled && 'input-disabled',
    !isSelect && Icon && `input-has-icon-${iconPosition}`,
  ].filter(Boolean).join(' ');

  const inputId = props.id || props.name || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={wrapperClass}>
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
          {required && <span className="input-required" aria-hidden="true"> *</span>}
        </label>
      )}

      <div className="input-field-wrapper">
        {/* Icon — only for text inputs */}
        {!isSelect && !isTextarea && Icon && iconPosition === 'left' && (
          <Icon className="input-icon input-icon-left" aria-hidden="true" />
        )}

        {isSelect ? (
          <select
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={fieldClass}
            {...props}
          >
            {children}
          </select>
        ) : isTextarea ? (
          <textarea
            ref={ref}
            id={inputId}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={fieldClass}
            {...props}
          />
        ) : (
          <input
            ref={ref}
            id={inputId}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={fieldClass}
            aria-invalid={!!error}
            aria-describedby={error || helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        )}

        {!isSelect && !isTextarea && Icon && iconPosition === 'right' && (
          <Icon className="input-icon input-icon-right" aria-hidden="true" />
        )}
      </div>

      {(error || helperText) && (
        <span
          id={`${inputId}-helper`}
          className={`input-helper ${error ? 'input-helper-error' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
