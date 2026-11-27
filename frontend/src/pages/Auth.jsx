import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROLE_HOME, useAuth } from "../auth/AuthContext";
import { apiError, retryAfterSeconds } from "../api";
import { useToast } from "../components/ui";
import brandLogo from "../assets/logo1.png";
import authSideImage from "../assets/header.png";
import authVideo from "../assets/video.mp4";
import "./Auth.css";

const formatWait = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const parts = [];
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (rest) parts.push(`${rest} second${rest === 1 ? "" : "s"}`);
  return parts.join(" ") || "a moment";
};

function useLockout(setError) {
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!lockUntil) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);
  const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = remaining > 0;
  const applyError = (err) => {
    const seconds = retryAfterSeconds(err);
    if (seconds) {
      const until = Date.now() + seconds * 1000;
      setLockUntil(until);
      setNow(Date.now());
    }
    setError(apiError(err));
  };
  const clearLock = () => {
    setLockUntil(0);
    setError("");
  };
  return { locked, remaining, applyError, clearLock };
}

function EyeIcon({ off }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function AuthLogo() {
  return <img className="ap-logo" src={brandLogo} alt="Parcel Point" />;
}

function AuthField({ label, hideLabel, children }) {
  return (
    <label className="ap-field">
      <span className={hideLabel ? "ap-sr" : "ap-label"}>{label}</span>
      {children}
    </label>
  );
}

function PasswordField({
  value,
  onChange,
  autoComplete = "current-password",
  minLength,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField label="Password" hideLabel>
      <div className="ap-password">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          placeholder="Password"
        />
        <button
          type="button"
          className="ap-eye"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon off={visible} />
        </button>
      </div>
    </AuthField>
  );
}

function AuthPanel() {
  return (
    <aside className="ap-side">
      <video
        className="ap-side-video"
        src={authVideo}
        poster={authSideImage}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="ap-side-top">
        <div className="ap-brand">
          <AuthLogo />
        </div>
        <Link to="/" className="ap-pill">
          Back to website <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="ap-side-bottom">
        <span className="ap-side-eyebrow">YARD STUDIO 2.0</span>
        <h2>
          Every unit <span>accounted for.</span>
        </h2>
        <p>
          Your all-in-one workspace for inventory, yard, fleet, and team
          control.
        </p>
      </div>
    </aside>
  );
}

function ProviderButtons() {
  return (
    <div className="ap-providers">
      <button
        type="button"
        className="ap-provider"
        disabled
        title="Google sign-in coming soon"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8a6 6 0 1 1 0-12c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.7 9.7 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-2H12z"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}

function EmailDivider({ children }) {
  return (
    <div className="ap-divider">
      <span>{children}</span>
    </div>
  );
}

function Alerts({ error, locked, remaining }) {
  return (
    <>
      {error && (
        <div className="ap-error" role="alert">
          {error}
        </div>
      )}
      {locked && (
        <div className="ap-error" role="alert">
          Try again in {formatWait(remaining)}.
        </div>
      )}
    </>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { locked, remaining, applyError, clearLock } = useLockout(setError);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    clearLock();
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}`);
      navigate(location.state?.from || ROLE_HOME[user.role] || "/", {
        replace: true,
      });
    } catch (err) {
      applyError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ap-page">
      <div className="ap-card">
        <AuthPanel />
        <main className="ap-box">
          <form className="ap-form" onSubmit={submit}>
            <div className="ap-auth-brand">
              <div className="ap-brand">
                <AuthLogo />
              </div>
            </div>
            <h1>Welcome to Parcel Point</h1>
            <p className="ap-sub">Sign in to unlock all features</p>

            <Alerts error={error} locked={locked} remaining={remaining} />

            <ProviderButtons />
            <EmailDivider>or</EmailDivider>

            <AuthField label="Email" hideLabel>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="Email address"
              />
            </AuthField>
            <PasswordField
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <button type="submit" className="ap-submit" disabled={busy || locked}>
              {locked
                ? `Locked for ${formatWait(remaining)}`
                : busy
                  ? "Logging in..."
                  : "Log in"}
            </button>
            <p className="ap-auth-switch">
              New to Parcel Point? <Link to="/register">Create an account</Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "salesRepresentative",
  });
  const [optOut, setOptOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { locked, remaining, applyError, clearLock } = useLockout(setError);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    clearLock();
    try {
      const user = await register(form);
      toast.success("Account created");
      navigate(location.state?.from || ROLE_HOME[user.role] || "/", {
        replace: true,
      });
    } catch (err) {
      applyError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ap-page">
      <div className="ap-card">
        <AuthPanel />
        <main className="ap-box">
          <form className="ap-form" onSubmit={submit}>
            <div className="ap-auth-brand">
              <div className="ap-brand">
                <AuthLogo />
              </div>
            </div>
            <h1>Welcome to Parcel Point</h1>
            <p className="ap-sub">Sign up to unlock all features</p>

            <Alerts error={error} locked={locked} remaining={remaining} />

            <ProviderButtons />
            <EmailDivider>or</EmailDivider>

            <AuthField label="Name" hideLabel>
              <input
                required
                value={form.name}
                placeholder="Name"
                autoComplete="name"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </AuthField>
            <AuthField label="Email" hideLabel>
              <input
                required
                type="email"
                value={form.email}
                placeholder="Email address"
                autoComplete="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </AuthField>
            <AuthField label="Phone" hideLabel>
              <input
                required
                type="tel"
                value={form.phone}
                placeholder="Phone"
                autoComplete="tel"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </AuthField>
            <AuthField label="Account type" hideLabel>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="salesRepresentative">Sales Representative</option>
                <option value="supplier">Supplier</option>
              </select>
            </AuthField>
            <PasswordField
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              minLength={6}
            />

            <label className="ap-check">
              <input
                type="checkbox"
                checked={optOut}
                onChange={(e) => setOptOut(e.target.checked)}
              />
              <span>I prefer not to receive news or promos by email</span>
            </label>
            <button type="submit" className="ap-submit" disabled={busy || locked}>
              {locked
                ? `Locked for ${formatWait(remaining)}`
                : busy
                  ? "Creating..."
                  : "Create account"}
            </button>
            <p className="ap-auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}

export function AccessDenied() {
  const { user } = useAuth();
  const target = ROLE_HOME[user?.role] || "/";
  return (
    <div className="ap-page">
      <div className="ap-card ap-card-single">
        <main className="ap-box">
          <div className="ap-form ap-center">
            <div className="ap-auth-brand">
              <div className="ap-brand">
                <AuthLogo />
              </div>
            </div>
            <span className="ap-deny">!</span>
            <p className="ap-note">ERROR 403</p>
            <h1>Access denied</h1>
            <p className="ap-sub">
              Your role does not have permission to view this page.
            </p>
            <Link to={target} className="ap-submit ap-linkbtn">
              Back to dashboard
            </Link>
            <Link to="/" className="ap-textlink">
              Go to Home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
