import { useState, useCallback, useMemo } from 'react';
import { ToastContext } from './toastContext';
import Icon from './Icon';

const EXIT_MS = 180; // duración de dm-toast-out

// Toast v2 (fix A11Y-05): región aria-live, role alert/status según tipo,
// botón de cierre manual y animación de salida antes de desmontar.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), EXIT_MS);
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, closing: false }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="region" aria-label="Notificaciones">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.closing ? ' closing' : ''}`}
            role={t.type === 'error' ? 'alert' : 'status'}
          >
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar notificación">
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
