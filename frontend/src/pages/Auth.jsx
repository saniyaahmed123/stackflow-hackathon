import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '../auth/AuthContext';
import { apiError } from '../api';
import Barcode from '../components/Barcode';
import BrandMark from '../components/BrandMark';
import ImageUpload from '../components/ImageUpload';
import { Field, useToast } from '../components/ui';

const DEMO = [
  ['admin@parcelpoint.pk', 'admin123', 'Admin'],
  ['manager@parcelpoint.pk', 'manager123', 'Manager'],
  ['supplier@parcelpoint.pk', 'supplier123', 'Supplier'],
  ['sales@parcelpoint.pk', 'sales123', 'Sales Rep'],
];

function AuthPanel() {
  return (
    <aside className="auth-panel">
      <div className="auth-panel-top">
        <BrandMark size={34} />
        <span className="auth-panel-brand">Parcel Point</span>
      </div>
      <div className="auth-panel-message">
        <p className="auth-panel-micro">INVENTORY &amp; WAREHOUSE MANAGEMENT</p>
        <h1>Every unit accounted for.</h1>
      </div>
      <Barcode className="pp-barcode auth-barcode" />
    </aside>
  );
}

function PasswordField({ value, onChange, autoComplete = 'current-password', minLength, required = true }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label="Password" required={required}>
      <div className="auth-password">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          placeholder="••••••••"
        />
        <button
          type="button"
          className="auth-toggle"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </Field>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(location.state?.from || ROLE_HOME[user.role] || '/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthPanel />
        <form className="auth-form" onSubmit={submit}>
          <p className="auth-micro">ACCOUNT ACCESS</p>
          <h2>Sign in</h2>
          <p className="auth-sub">Use your account to continue.</p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          <PasswordField
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
          <Link to="/" className="auth-home-link">← Back to Home</Link>
          {!import.meta.env.PROD && (
            <div className="demo-list">
              <strong>SEEDED DEMO ACCOUNTS</strong>
              {DEMO.map(([email, password, label]) => (
                <button key={email} type="button" onClick={() => setForm({ email, password })}>
                  <span>{label}</span><small>{email} / {password}</small>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'salesRepresentative', image: '', imageFileId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await register(form);
      toast.success('Account created');
      navigate(location.state?.from || ROLE_HOME[user.role] || '/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <AuthPanel />
        <form className="auth-form" onSubmit={submit}>
          <p className="auth-micro">NEW ACCOUNT</p>
          <h2>Create account</h2>
          <p className="auth-sub">Admins are created only by an existing admin.</p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="form-grid">
            <Field label="Full name" required>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email" required>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <PasswordField
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              minLength={6}
            />
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
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
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Creating...' : 'Create account'}
          </button>
          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
          <Link to="/" className="auth-home-link">← Back to Home</Link>
        </form>
      </div>
    </div>
  );
}

export function AccessDenied() {
  const { user } = useAuth();
  const target = ROLE_HOME[user?.role] || '/';
  return (
    <div className="auth-page">
      <div className="auth-card auth-card-single">
        <div className="auth-form auth-form-centered">
          <span className="deny-mark">!</span>
          <p className="auth-micro">ERROR / 403</p>
          <h2>Access denied</h2>
          <p className="auth-sub">Your role does not have permission to view this page.</p>
          <Link to={target} className="auth-submit">Back to dashboard</Link>
          <Link to="/" className="auth-home-link">Go to Home</Link>
        </div>
      </div>
    </div>
  );
}
