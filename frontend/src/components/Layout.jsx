import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV = {
  admin: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/warehouses', label: 'Warehouses' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/transactions', label: 'Stock Transactions' },
    { to: '/admin/low-stock', label: 'Low Stock' },
  ],
  warehouseManager: [
    { to: '/manager', label: 'Overview', end: true },
    { to: '/manager/inventory', label: 'Inventory' },
    { to: '/manager/stock', label: 'Stock In / Out' },
    { to: '/manager/transactions', label: 'Transaction History' },
    { to: '/manager/low-stock', label: 'Low Stock' },
  ],
  supplier: [
    { to: '/supplier', label: 'My Profile' },
    { to: '/supplier/products', label: 'My Products' },
    { to: '/supplier/requests', label: 'Supply Requests' },
  ],
  salesRepresentative: [
    { to: '/sales', label: 'Overview', end: true },
    { to: '/sales/products', label: 'Browse Products' },
    { to: '/sales/orders', label: 'My Orders' },
  ],
};

const ROLE_LABEL = {
  admin: 'Administrator',
  warehouseManager: 'Warehouse Manager',
  supplier: 'Supplier',
  salesRepresentative: 'Sales Representative',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = NAV[user?.role] || [];

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">SF</span>
          <div>
            <strong>StockFlow</strong>
            <small>Inventory Suite</small>
          </div>
        </div>
        <nav className="side-nav">
          <span className="nav-caption">Workspace</span>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span className="nav-dot" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <div className="side-user">
            {user?.image ? <img src={user.image} alt="" /> : <span className="avatar">{(user?.name || 'U')[0]}</span>}
            <div>
              <strong>{user?.name}</strong>
              <small>{ROLE_LABEL[user?.role]}</small>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <button type="button" className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">≡</button>
          <span className="topbar-title">{ROLE_LABEL[user?.role]} workspace</span>
          <span className="role-chip">{ROLE_LABEL[user?.role]}</span>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
