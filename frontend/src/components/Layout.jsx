import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../api';
import { ROLE_HOME, useAuth } from '../auth/AuthContext';
import brandLogo from '../assets/logo1.png';

function LineIcon({ name }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M16 5a3 3 0 0 1 0 6" />
        <path d="M18 15c2 .7 3 2.4 3 5" />
      </>
    ),
    products: (
      <>
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </>
    ),
    warehouses: (
      <>
        <path d="M3 10l9-6 9 6v10H3z" />
        <path d="M3 10h18" />
        <path d="M8 20v-6h8v6" />
      </>
    ),
    suppliers: (
      <>
        <path d="M4 9h16l-1 11H5z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    transactions: (
      <>
        <path d="M4 8h13l-3-3" />
        <path d="M20 16H7l3 3" />
      </>
    ),
    orders: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),
    low: (
      <>
        <path d="M12 3l9 16H3z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    inventory: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M4 7l2-3h12l2 3" />
        <path d="M9 11h6" />
      </>
    ),
    stock: (
      <>
        <path d="M12 3v18" />
        <path d="M5 10l7-7 7 7" />
        <path d="M5 14l7 7 7-7" />
      </>
    ),
    requests: (
      <>
        <path d="M4 5h16v11H8l-4 4z" />
        <path d="M8 10h8" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.6 3H9.4l-.2 2a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.2 2h5.2l.2-2a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H5v16h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 16H6l1.5-2V9a4.5 4.5 0 0 1 9 0v5z" />
        <path d="M10 20h4" />
      </>
    ),
  };
  return (
    <svg
      className="line-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || null}
    </svg>
  );
}

const NAV = {
  admin: [
    {
      label: '',
      links: [
        { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
        { to: '/admin/users', label: 'Users', icon: 'users' },
        { to: '/admin/products', label: 'Products', icon: 'products' },
        { to: '/admin/warehouses', label: 'Warehouses', icon: 'warehouses' },
        { to: '/admin/suppliers', label: 'Suppliers', icon: 'suppliers' },
        { to: '/admin/transactions', label: 'Transactions', icon: 'transactions' },
        { to: '/admin/orders', label: 'Orders', icon: 'orders' },
        { to: '/admin/low-stock', label: 'Low Stock', icon: 'low' },
      ],
    },
    {
      label: 'Settings',
      links: [
        { to: '/profile', label: 'Profile', icon: 'profile' },
        { to: '/profile', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
  warehouseManager: [
    {
      label: '',
      links: [
        { to: '/manager', label: 'Dashboard', icon: 'dashboard', end: true },
        { to: '/manager/inventory', label: 'Inventory', icon: 'inventory' },
        { to: '/manager/products', label: 'Products', icon: 'products' },
        { to: '/manager/stock', label: 'Stock In / Out', icon: 'stock' },
        { to: '/manager/transactions', label: 'Transactions', icon: 'transactions' },
        { to: '/manager/low-stock', label: 'Low Stock', icon: 'low' },
      ],
    },
    {
      label: 'Settings',
      links: [
        { to: '/profile', label: 'Profile', icon: 'profile' },
        { to: '/profile', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
  supplier: [
    {
      label: '',
      links: [
        { to: '/supplier', label: 'Dashboard', icon: 'dashboard', end: true },
        { to: '/supplier/products', label: 'My Products', icon: 'products' },
        { to: '/supplier/requests', label: 'Supply Requests', icon: 'requests' },
      ],
    },
    {
      label: 'Settings',
      links: [
        { to: '/profile', label: 'Profile', icon: 'profile' },
        { to: '/profile', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
  salesRepresentative: [
    {
      label: '',
      links: [
        { to: '/sales', label: 'Dashboard', icon: 'dashboard', end: true },
        { to: '/sales/products', label: 'Browse Products', icon: 'products' },
        { to: '/sales/orders', label: 'My Orders', icon: 'orders' },
      ],
    },
    {
      label: 'Settings',
      links: [
        { to: '/profile', label: 'Profile', icon: 'profile' },
        { to: '/profile', label: 'Settings', icon: 'settings' },
      ],
    },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const groups = NAV[user?.role] || [];
  const today = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const alertsTo = user?.role === 'warehouseManager' ? '/manager/low-stock' : '/admin/low-stock';

  useEffect(() => {
    let active = true;
    if (!['admin', 'warehouseManager'].includes(user?.role)) {
      setAlertCount(0);
      return undefined;
    }
    api
      .get('/stock/low')
      .then(({ data }) => {
        if (active) setAlertCount((data.data || []).length);
      })
      .catch(() => {
        if (active) setAlertCount(0);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const search = (event) => {
    event.preventDefault();
    const home = ROLE_HOME[user?.role] || '/admin';
    navigate(`${home}/products`, { state: { search: query } });
    setOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img className="side-logo" src={brandLogo} alt="" />
        </div>
        <nav className="side-nav">
          {groups.map((group, groupIndex) => (
            <div className="nav-group" key={group.label || `group-${groupIndex}`}>
              {group.label && <span className="nav-caption">{group.label}</span>}
              {group.links.map((link) => (
                <NavLink
                  key={`${link.to}-${link.label}`}
                  to={link.to}
                  end={link.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  <LineIcon name={link.icon} />
                  <span className="nav-text">{link.label}</span>
                </NavLink>
              ))}
              {group.label === 'Settings' && (
                <button type="button" className="nav-link nav-logout" onClick={signOut}>
                  <LineIcon name="logout" />
                  <span className="nav-text">Logout</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <div className="main-shell">
        <button type="button" className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
          <LineIcon name="dashboard" />
        </button>
        <header className="topbar">
          <form className="top-search" onSubmit={search}>
            <LineIcon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or orders..."
              aria-label="Search products or orders"
            />
          </form>
          <span className="top-date">{today}</span>
          <Link to={alertsTo} className="top-bell" aria-label="Low-stock alerts">
            <LineIcon name="bell" />
            {alertCount > 0 && <span className="top-bell-badge">{alertCount}</span>}
          </Link>
          <Link to="/profile" className="top-avatar" aria-label="My profile">
            {(user?.name || 'U')[0]}
          </Link>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
