import { useEffect, useRef } from 'react';
import Button from './Button';
import Icon from './Icon';

// Modal accesible (reemplaza confirm() nativo, fix UX-07):
// role="dialog" aria-modal, foco inicial dentro, Tab atrapado, Escape cierra,
// backdrop cierra, foco restaurado al cerrar.
export default function Modal({ open, title, children, footer, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const el = ref.current;
    const focusables = () =>
      [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
    focusables()[0]?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-modal-title"
        ref={ref}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="dm-modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Diálogo de confirmación (sustituto directo de window.confirm)
export function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', loading = false, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={onConfirm} loading={loading} icon={loading ? undefined : 'check-circle'}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="modal-message"><Icon name="warning" size={18} /> {message}</p>
    </Modal>
  );
}
