/**
 * ConfirmDialog — replaces window.confirm() across the codebase.
 *
 * Wraps Modal with a two-button layout.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 *
 * USAGE (hook-based, programmatic — mirrors window.confirm API):
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: 'Delete trip',
 *     message: 'This action cannot be undone.',
 *     confirmLabel: 'Delete',
 *     variant: 'error',
 *   });
 *   if (ok) { ... }
 *
 * USAGE (declarative):
 *   <ConfirmDialog
 *     isOpen={open}
 *     title="Remove member"
 *     message="Are you sure?"
 *     confirmLabel="Remove"
 *     variant="error"
 *     onConfirm={handleConfirm}
 *     onCancel={() => setOpen(false)}
 *   />
 */

import { useState, useCallback, useRef, createContext, useContext } from 'react';
import Modal from './Modal';
import Button from './Button';

// ── Declarative variant ────────────────────────────────────────────────────

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'error',   // 'error' | 'warning' | 'primary'
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      closeOnBackdrop={false}
      closable={false}
    >
      {message && <p style={{ margin: 0, color: 'var(--ds-text-secondary)', fontSize: 'var(--ds-text-sm)' }}>{message}</p>}

      <Modal.Footer>
        <Button variant="ghost" size="md" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={variant} size="md" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ── Programmatic hook ──────────────────────────────────────────────────────

const ConfirmContext = createContext(null);

/**
 * Wrap your app (or a subtree) with <ConfirmProvider> then call
 * const confirm = useConfirm() anywhere inside.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, isOpen: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(null);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(null);
    resolveRef.current?.(false);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialog
          isOpen={state.isOpen}
          title={state.title}
          message={state.message}
          confirmLabel={state.confirmLabel}
          cancelLabel={state.cancelLabel}
          variant={state.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Returns the imperative confirm() function.
 * Must be used inside <ConfirmProvider>.
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return confirm;
}

export default ConfirmDialog;
