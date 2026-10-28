/**
 * Modal — WayMate canonical dialog component.
 *
 * Features:
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Escape key to close
 * - Closing animation (is-closing class → CSS plays exit keyframe)
 * - Portal via React portal (renders into document.body)
 * - Scroll lock on body while open
 * - Mobile: bottom sheet behaviour via CSS
 *
 * Usage:
 *   <Modal isOpen={open} onClose={() => setOpen(false)} title="Edit trip">
 *     <p>Content here</p>
 *     <Modal.Footer>
 *       <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
 *       <Button variant="primary" onClick={save}>Save</Button>
 *     </Modal.Footer>
 *   </Modal>
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { VscClose } from 'react-icons/vsc';
import './Modal.css';

const FOCUS_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ── Sub-components ─────────────────────────────────────────────────────────

function ModalFooter({ children, className = '' }) {
  return (
    <div className={`modal-footer ${className}`.trim()}>
      {children}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',          // sm | md | lg | xl | full
  closable = true,      // show × button
  closeOnBackdrop = true,
  children,
  className = '',
  'aria-labelledby': ariaLabelledBy,
  ...props
}) {
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = ariaLabelledBy || `modal-title-${Math.random().toString(36).slice(2)}`;

  // ── Animated close ──────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (!closable) return;
    setIsClosing(true);
    // Wait for CSS exit animation to finish before unmounting
    setTimeout(() => {
      setIsClosing(false);
      onClose?.();
    }, 240);
  }, [closable, onClose]);

  // ── Keyboard handler ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape' && closable) {
        handleClose();
        return;
      }

      // Focus trap
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll(FOCUS_SELECTORS) ?? []
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, closable, handleClose]);

  // ── Body scroll lock + focus management ────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      // Focus first focusable element after render
      requestAnimationFrame(() => {
        const first = dialogRef.current?.querySelector(FOCUS_SELECTORS);
        (first ?? dialogRef.current)?.focus();
      });
    } else {
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div
      className={`modal-backdrop ${isClosing ? 'is-closing' : ''}`}
      role="presentation"
      onClick={closeOnBackdrop ? handleClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-dialog modal-dialog-${size} ${className}`.trim()}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {/* Header */}
        {(title || closable) && (
          <div className="modal-header">
            <div>
              {title && <h2 id={titleId} className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {closable && (
              <button
                type="button"
                className="modal-close"
                onClick={handleClose}
                aria-label="Close dialog"
              >
                <VscClose aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Attach sub-component
Modal.Footer = ModalFooter;

export default Modal;
