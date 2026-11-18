import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiError } from '../api';
import ImageUpload from '../components/ImageUpload';
import { Field, useToast } from '../components/ui';

const DEMO = [
  ['admin@stockflow.pk', 'admin123', 'Admin'],
  ['manager@stockflow.pk', 'manager123', 'Manager'],
  ['supplier@stockflow.pk', 'supplier123', 'Supplier'],
  ['sales@stockflow.pk', 'sales123', 'Sales Rep'],
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-intro">
          <span className="brand-mark">SF</span>
          <h1>StockFlow</h1>
          <p>Inventory, warehouses and orders in one place.</p>
          <div className="demo-list">
            <strong>Seeded demo accounts</strong>
            {DEMO.map(([email, password, label]) => (
              <button key={email} type="button" onClick={() => setForm({ email, password })}>
                <span>{label}</span><small>{email} / {password}</small>
              </button>
            ))}
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Use your account to continue.</p>
          <Field label="Email" required>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" />
          </Field>
          <Field label="Password" required>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="••••••••" />
          </Field>
          <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'salesRepresentative', image: '', imageFileId: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await register(form);
      toast.success('Account created');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card auth-card-single" onSubmit={submit}>
        <div className="auth-form">
          <h1 className="auth-title">Create account</h1>
          <p className="muted">Admins are created only by an existing admin.</p>
          <div className="form-grid">
            <Field label="Full name" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email" required><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Password" required><input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Role">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="salesRepresentative">Sales Representative</option>
                <option value="warehouseManager">Warehouse Manager</option>
                <option value="supplier">Supplier</option>
              </select>
            </Field>
          </div>
          <ImageUpload
            label="Profile picture (optional)"
            value={form.image}
            fileId={form.imageFileId}
            onChange={({ url, fileId }) => setForm((current) => ({ ...current, image: url, imageFileId: fileId }))}
          />
          <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
        </div>
      </form>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card-single">
        <div className="auth-form center">
          <span className="deny-mark">!</span>
          <h1>Access denied</h1>
          <p className="muted">Your role does not have permission to view this page.</p>
          <Link to="/" className="btn primary">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
