import { createContext, useContext, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { money } from '../api';

const swalTheme = {
  background: '#0d0d0f',
  color: '#f3f3f4',
  confirmButtonColor: '#b6f36b',
  customClass: {
    popup: 'user-swal-popup',
    confirmButton: 'user-swal-confirm',
    cancelButton: 'user-swal-cancel',
  },
};

const notify = (icon, title, message) =>
  Swal.fire({ ...swalTheme, icon, title, text: message });

const toast = {
  success: (message) => notify('success', 'Success', message),
  error: (message) => notify('error', 'Error', message),
};

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>;
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

export function StatCard({ label, value, hint, tone = 'primary', to }) {
  const content = (
    <>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </>
  );
  return to
    ? <Link to={to} className={`stat-card ${tone} link`}>{content}</Link>
    : <div className={`stat-card ${tone}`}>{content}</div>;
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
  'out of stock': 'danger',
  transfer: 'info',
  low: 'warn',
  ok: 'success',
};

export function Pagination({ pagination, onPage }) {
  if (!pagination?.hasPagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="pagination">
      <button type="button" className="btn small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages} · {total} total</span>
      <button type="button" className="btn small" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

export function Badge({ status, children }) {
  const value = String(children ?? status ?? '');
  return <span className={`badge ${badgeTone[value.toLowerCase()] || 'muted'}`}>{value}</span>;
}

export function Modal({ open, onClose, title, children, wide = false, className = '' }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''} ${className}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message }) {
  const confirmRef = useRef(onConfirm);
  const closeRef = useRef(onClose);
  confirmRef.current = onConfirm;
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    Swal.fire({
      ...swalTheme,
      title,
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      preConfirm: () => {
        confirmRef.current();
        return true;
      },
    }).then((result) => {
      if (active && result.isDismissed) closeRef.current();
    });
    return () => {
      active = false;
    };
  }, [open, title, message]);

  return null;
}

export function Field({ label, children, hint, required = false, className = '' }) {
  return (
    <label className={['field', className].filter(Boolean).join(' ')}>
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

export function Toolbar({ children, className = '' }) {
  return <div className={`toolbar ${className}`.trim()}>{children}</div>;
}

export function Amount({ value }) {
  return <span className="amount">{money(value)}</span>;
}
