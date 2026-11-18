import { createContext, useCallback, useContext, useState } from 'react';
import { money } from '../api';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }, []);
  const toast = {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((item) => (
          <div key={item.id} className={`toast ${item.type}`}>
            <span>{item.type === 'success' ? '✓' : '!'}</span>
            <p>{item.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function Loading({ label = 'Loading...' }) {
  return (
    <div className="loading">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = 'primary' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

const badgeTone = {
  pending: 'warn',
  processing: 'info',
  completed: 'success',
  cancelled: 'danger',
  approved: 'success',
  rejected: 'danger',
  'stock-in': 'success',
  'stock-out': 'danger',
  low: 'warn',
  ok: 'success',
};

export function Badge({ status, children }) {
  const value = String(children ?? status ?? '');
  return <span className={`badge ${badgeTone[value.toLowerCase()] || 'muted'}`}>{value}</span>;
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, busy = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="muted">{message}</p>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Working...' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

export function Field({ label, children, hint, required = false }) {
  return (
    <label className="field">
      <span>{label}{required && <em> *</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Empty({ title = 'Nothing here yet', message }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  );
}

export function Table({ head, children, empty = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((item) => <th key={item}>{item}</th>)}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={head.length}><Empty message="No matching records found." /></td></tr> : children}</tbody>
      </table>
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}

export function Amount({ value }) {
  return <span className="amount">{money(value)}</span>;
}
