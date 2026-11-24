import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

// Change these paths to match the role home routes in your App.jsx
const HOME_BY_ROLE = {
  admin: "/admin",
  warehouseManager: "/manager",
  supplier: "/supplier",
  salesRepresentative: "/sales",
};

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "Roles" },
];

const btn =
  "inline-flex items-center justify-center rounded-sm border border-pp-navy px-5 py-3.5 min-[900px]:py-[11px] text-[15px] font-semibold leading-none no-underline cursor-pointer transition-colors duration-150 [font-family:inherit] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-pp-navy";
const btnOutline = `${btn} bg-transparent text-pp-navy hover:bg-pp-cream-deep`;
const btnPrimary = `${btn} bg-pp-amber text-pp-navy hover:bg-pp-amber-deep`;

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);
  const dashboard = user ? HOME_BY_ROLE[user.role] || "/" : "/";

  const handleLogout = () => {
    logout();
    close();
    navigate("/");
  };

  let actions = null;
  if (!loading && user) {
    actions = (
      <>
        <Link to={dashboard} className={btnPrimary} onClick={close}>
          Go to Dashboard
        </Link>
        <button type="button" className={btnOutline} onClick={handleLogout}>
          Sign out
        </button>
      </>
    );
  } else if (!loading) {
    actions = (
      <>
        <Link to="/login" className={btnOutline} onClick={close}>
          Login
        </Link>
        <Link to="/register" className={btnPrimary} onClick={close}>
          Get Started
        </Link>
      </>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-pp-line bg-pp-cream font-body">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-6 px-6">
        <Link
          to="/"
          onClick={close}
          aria-label="Parcel Point home"
          className="flex items-center gap-3 font-heading text-xl font-bold tracking-tight text-pp-navy no-underline"
        >
          <span
            aria-hidden="true"
            className="grid h-[34px] w-[34px] place-items-center rounded-sm bg-pp-amber"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0B1A2F"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
              <path d="M4 7.5 12 12l8-4.5M12 12v9" />
            </svg>
          </span>
          Parcel Point
        </Link>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="pp-nav-menu"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-sm border border-pp-line bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-pp-navy min-[900px]:hidden"
        >
          <span className="block h-[2px] w-5 bg-pp-navy" />
          <span className="block h-[2px] w-5 bg-pp-navy" />
          <span className="block h-[2px] w-5 bg-pp-navy" />
        </button>

        <nav
          id="pp-nav-menu"
          className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col items-stretch gap-5 border-b border-pp-line bg-pp-cream px-6 pb-6 pt-5 min-[900px]:static min-[900px]:flex min-[900px]:flex-row min-[900px]:items-center min-[900px]:gap-8 min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:p-0`}
        >
          <ul className="m-0 flex list-none flex-col gap-1 p-0 min-[900px]:flex-row min-[900px]:gap-7">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={close}
                  className="block border-b border-dashed border-pp-line py-3 text-[15px] font-medium text-pp-navy no-underline transition-colors duration-150 min-[900px]:border-b-2 min-[900px]:border-solid min-[900px]:border-transparent min-[900px]:py-1.5 min-[900px]:hover:border-pp-amber"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-stretch gap-3 min-[900px]:flex-row min-[900px]:items-center">
            {actions}
          </div>
        </nav>
      </div>
    </header>
  );
}
