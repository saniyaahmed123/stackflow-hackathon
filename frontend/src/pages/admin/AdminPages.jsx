import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import api, { apiError, formatDate, money, readList } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import ImageUpload from "../../components/ImageUpload";
import {
  Amount,
  Badge,
  ConfirmDialog,
  Empty,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  Table,
  Toolbar,
  useToast,
} from "../../components/ui";

const useLoad = (loader, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const reload = async () => {
    try {
      setData(await loader());
      setError("");
    } catch (err) {
      setError(apiError(err));
    }
  };
  useEffect(() => {
    reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, deps);
  return { data, error, reload, setData };
};

const Status = ({ value }) => <Badge status={value} />;

const StatIcon = ({ name }) => {
  const paths = {
    products: (
      <>
        <path d="M4 8l8-4 8 4-8 4-8-4z" />
        <path d="M4 8v8l8 4 8-4V8" />
        <path d="M12 12v8" />
      </>
    ),
    orders: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),
    alert: (
      <>
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ),
  };
  return (
    <span className="dash-stat-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </svg>
    </span>
  );
};

export const RowIcon = ({ name }) => {
  const paths = {
    view: (
      <>
        <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    edit: (
      <>
        <path d="M4 20h4L18 10l-4-4L4 16v4z" />
        <path d="M13 7l4 4" />
      </>
    ),
    delete: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    archive: (
      <>
        <path d="M3 5h18v4H3z" />
        <path d="M5 9v10h14V9" />
        <path d="M10 13h4" />
      </>
    ),
    restore: (
      <>
        <path d="M4 10h16v10H4z" />
        <path d="M12 10V3" />
        <path d="M9 6l3-3 3 3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-4.5L4 9" />
        <path d="M4 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14 4.5L20 15" />
        <path d="M20 20v-5h-5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

const ROLE_TILES = [
  {
    value: "admin",
    label: "Admin",
    icon: (
      <>
        <path d="M12 3l7 3v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    value: "warehouseManager",
    label: "Warehouse Manager",
    icon: (
      <>
        <path d="M3 10l9-6 9 6v10H3z" />
        <path d="M3 10h18" />
        <path d="M8 20v-6h8v6" />
      </>
    ),
  },
  {
    value: "supplier",
    label: "Supplier",
    icon: (
      <>
        <path d="M4 9h16l-1 11H5z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
  },
  {
    value: "salesRepresentative",
    label: "Sales Rep",
    icon: (
      <>
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M3 4h2l2.2 10h11l2-7H7" />
      </>
    ),
  },
];

const RoleTiles = ({ value, onChange, isDisabled }) => {
  const moveFocus = (event, index) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    let next = index;
    for (let attempt = 0; attempt < ROLE_TILES.length; attempt += 1) {
      next = (next + step + ROLE_TILES.length) % ROLE_TILES.length;
      if (!isDisabled?.(ROLE_TILES[next].value)) break;
    }
    if (isDisabled?.(ROLE_TILES[next].value)) return;
    onChange(ROLE_TILES[next].value);
    event.currentTarget.parentElement
      .querySelectorAll('[role="radio"]')
      [next]?.focus();
  };

  return (
    <div className="role-tiles" role="radiogroup" aria-label="Role">
      {ROLE_TILES.map((tile, index) => {
        const checked = value === tile.value;
        const disabled = Boolean(isDisabled?.(tile.value));
        return (
          <button
            key={tile.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={tile.label}
            disabled={disabled}
            className={`role-tile${checked ? " selected" : ""}`}
            onClick={() => onChange(tile.value)}
            onKeyDown={(event) => moveFocus(event, index)}
          >
            <span className="role-tile-mark" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {tile.icon}
              </svg>
            </span>
            <span className="role-tile-label">{tile.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const emptyMovementTrend = () =>
  Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + index);
    return {
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      stockIn: 0,
      stockOut: 0,
    };
  });

const StockMovementGraph = ({ points }) => {
  const [active, setActive] = useState(null);
  const width = 640;
  const height = 200;
  const top = 18;
  const bottom = 26;
  const step = width / (points.length - 1 || 1);
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.stockIn, point.stockOut]),
  );
  const x = (index) => index * step;
  const y = (value) => top + (1 - value / max) * (height - top - bottom);
  const line = (key) =>
    points
      .map(
        (point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point[key])}`,
      )
      .join(" ");
  const area = (key) =>
    `${line(key)} L ${x(points.length - 1)} ${height - bottom} L 0 ${height - bottom} Z`;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, index)));
  };

  const activePoint = active === null ? null : points[active];

  return (
    <section className="panel dash-panel dash-graph">
      <div className="panel-head">
        <h2>Stock movement</h2>
        <span className="dash-graph-range">Last 7 days</span>
      </div>
      <div className="dash-graph-legend">
        <span>
          <i className="dash-key ok" />
          Stock in
        </span>
        <span>
          <i className="dash-key out" />
          Stock out
        </span>
        <strong>
          {activePoint
            ? `${activePoint.label}: +${activePoint.stockIn} / -${activePoint.stockOut}`
            : `Peak ${max}`}
        </strong>
      </div>
      <div className="dash-graph-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Stock in and stock out quantities over the last 7 days"
          onMouseMove={handleMove}
          onMouseLeave={() => setActive(null)}
        >
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              className="dash-graph-grid"
              x1="0"
              x2={width}
              y1={top + ratio * (height - top - bottom)}
              y2={top + ratio * (height - top - bottom)}
            />
          ))}
          <path className="dash-graph-area in" d={area("stockIn")} />
          <path className="dash-graph-area out" d={area("stockOut")} />
          <path className="dash-graph-line in" d={line("stockIn")} />
          <path className="dash-graph-line out" d={line("stockOut")} />
          {active !== null && (
            <line
              className="dash-graph-cursor"
              x1={x(active)}
              x2={x(active)}
              y1={top}
              y2={height - bottom}
            />
          )}
          {points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              <circle
                className="dash-graph-dot in"
                cx={x(index)}
                cy={y(point.stockIn)}
                r="4"
              />
              <circle
                className="dash-graph-dot out"
                cx={x(index)}
                cy={y(point.stockOut)}
                r="4"
              />
            </g>
          ))}
        </svg>
        <div className="dash-graph-labels">
          {points.map((point, index) => (
            <span key={`${point.label}-${index}`}>{point.label}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export function AdminOverview({ manager = false } = {}) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const routes = manager
    ? {
        products: "/manager/products",
        secondary: "/manager/transactions",
        low: "/manager/low-stock",
        transactions: "/manager/transactions",
      }
    : {
        products: "/admin/products",
        secondary: "/admin/orders",
        low: "/admin/low-stock",
        transactions: "/admin/transactions",
      };
  const { data, error } = useLoad(async () => {
    const [summary, lowRows] = await Promise.all([
      api
        .get(manager ? "/dashboard/manager" : "/dashboard/admin")
        .then((response) => response.data.data),
      api.get("/stock/low").then((response) => response.data.data),
    ]);
    return { ...summary, lowRows };
  }, [manager]);

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  const products = Number(data.totals?.products || 0);
  const lowCount = Number(data.lowStockCount || 0);
  const outCount = Number(data.outOfStockCount || 0);
  const healthy = Math.max(products - lowCount - outCount, 0);
  const health = products ? Math.round((healthy / products) * 100) : 0;
  const firstName = user?.name?.split(" ")[0] || "there";
  const assignedWarehouses = data.warehouses || [];
  const capacity = assignedWarehouses.reduce(
    (sum, warehouse) => sum + Number(warehouse.capacity || 0),
    0,
  );
  const usedCapacity = assignedWarehouses.reduce(
    (sum, warehouse) => sum + Number(warehouse.usedCapacity || 0),
    0,
  );
  const capacityPercent = capacity
    ? Math.round((usedCapacity / capacity) * 100)
    : 0;
  const lowRows = [...(data.lowRows || [])].sort(
    (a, b) => Number(a.quantity) - Number(b.quantity),
  );
  const movementTrend = data.stockMovementTrend?.length
    ? data.stockMovementTrend
    : emptyMovementTrend();

  return (
    <>
      <div className="dash-layout">
        <div className="dash-main">
          <section className="dash-hero">
            <span className="dash-eyebrow">Dashboard overview</span>
            <h1>Hello {firstName}</h1>
            <div className="dash-hero-stats">
              <Link to={routes.products} className="dash-hero-stat">
                <StatIcon name="products" />
                <div className="dash-stat-copy">
                  <span className="dash-stat-label">Total products</span>
                  <strong>{products.toLocaleString()}</strong>
                  <small>{manager ? "In your warehouses" : "Catalog items"}</small>
                </div>
              </Link>
              <Link to={routes.secondary} className="dash-hero-stat">
                <StatIcon name="orders" />
                <div className="dash-stat-copy">
                  <span className="dash-stat-label">
                    {manager ? "Stock movements" : "Total orders"}
                  </span>
                  <strong>
                    {manager
                      ? Number(data.todayStockTransactions || 0).toLocaleString()
                      : Number(data.totals?.orders || 0).toLocaleString()}
                  </strong>
                  <small>
                    {manager
                      ? "Today"
                      : `${data.ordersByStatus?.Pending || 0} pending`}
                  </small>
                </div>
              </Link>
              <Link to={routes.low} className="dash-hero-stat danger">
                <StatIcon name="alert" />
                <div className="dash-stat-copy">
                  <span className="dash-stat-label">Low stock</span>
                  <strong>{lowCount.toLocaleString()}</strong>
                  <small>Below their limit</small>
                </div>
              </Link>
            </div>
          </section>

          <StockMovementGraph points={movementTrend} />
        </div>

        <div className="dash-right">
          <section className="panel dash-panel dash-health">
            <div className="panel-head">
              <h2>Stock health</h2>
            </div>
            <div className="dash-health-body">
              <div
                className="dash-donut"
                style={{
                  background: `conic-gradient(var(--teal) ${health}%, var(--line) 0)`,
                }}
              >
                <div className="dash-donut-inner">
                  <strong>{health}%</strong>
                  <span>well stocked</span>
                </div>
              </div>
              <div className="dash-health-list">
                <div>
                  <span className="dash-key ok" />
                  Well stocked<strong>{healthy}</strong>
                </div>
                <div>
                  <span className="dash-key low" />
                  Low stock<strong>{lowCount}</strong>
                </div>
                <div>
                  <span className="dash-key out" />
                  Out of stock<strong>{outCount}</strong>
                </div>
              </div>
              <Link to={routes.low} className="dash-white-btn">
                View low stock
              </Link>
            </div>
          </section>

          <aside className="dash-top-stats">
            {manager ? (
              <>
                <div className="dash-top-stat">
                  <span>Warehouses</span>
                  <strong>{assignedWarehouses.length.toLocaleString()}</strong>
                </div>
                <Link to={routes.low} className="dash-top-stat">
                  <span>Out of stock</span>
                  <strong>{outCount.toLocaleString()}</strong>
                </Link>
                <Link to="/manager/inventory" className="dash-top-stat">
                  <span>Capacity used</span>
                  <strong>{capacityPercent}%</strong>
                </Link>
              </>
            ) : (
              <>
                <Link to="/admin/users" className="dash-top-stat">
                  <span>Users</span>
                  <strong>
                    {Number(data.totals?.users || 0).toLocaleString()}
                  </strong>
                </Link>
                <Link to="/admin/warehouses" className="dash-top-stat">
                  <span>Warehouses</span>
                  <strong>
                    {Number(data.totals?.warehouses || 0).toLocaleString()}
                  </strong>
                </Link>
                <Link to="/admin/suppliers" className="dash-top-stat">
                  <span>Suppliers</span>
                  <strong>
                    {Number(data.totals?.suppliers || 0).toLocaleString()}
                  </strong>
                </Link>
              </>
            )}
          </aside>
        </div>

        <div className="dash-lower">
          <section className="panel dash-panel dash-transactions">
            <div className="panel-head">
              <h2>Latest stock transactions</h2>
              <Link to={routes.transactions} className="dash-link">
                View all
              </Link>
            </div>
            <Table
              head={["Reference", "Product", "Date", "Qty", "Type", ""]}
              empty={!data.recentTransactions?.length}
            >
              {(data.recentTransactions || []).map((tx) => (
                <tr key={tx.id}>
                  <td className="mono">{tx.reference}</td>
                  <td>
                    <div className="person">
                      <span className="dash-letter">
                        {(tx.productName || "P")[0]}
                      </span>
                      <div>
                        <strong>{tx.productName}</strong>
                        <small>{tx.sku}</small>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(tx.at)}</td>
                  <td>
                    <span
                      className={`dash-qty ${tx.transactionType === "stock-in" ? "in" : "out"}`}
                    >
                      {tx.transactionType === "stock-in" ? "+" : "-"}
                      {tx.quantity}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`dash-type-pill ${tx.transactionType === "stock-in" ? "in" : "out"}`}
                    >
                      {tx.transactionType === "stock-in"
                        ? "Stock in"
                        : "Stock out"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dash-detail"
                      onClick={() => setSelected(tx)}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          </section>

          <div className="dash-side">
            <section className="panel dash-panel dash-low-stock-panel">
              <div className="panel-head">
              <h2>Low stock products</h2>
              <Link to={routes.low} className="dash-link">
                View all
              </Link>
              </div>
              <div className="dash-low-list">
                {lowRows.slice(0, 5).map((row) => (
                  <div className="dash-low-item" key={row._id}>
                    <span className="dash-letter">
                      {(row.product?.name || "P")[0]}
                    </span>
                    <div>
                      <strong>{row.product?.name || "Product"}</strong>
                      <small>{row.warehouse?.name || "Warehouse"}</small>
                    </div>
                    <span
                      className={`dash-qty ${row.outOfStock || row.quantity <= Number(row.threshold || 0) / 2 ? "out" : "low"}`}
                    >
                      {row.quantity} left
                    </span>
                  </div>
                ))}
                {!lowRows.length && (
                  <p className="muted dash-empty">No low-stock products.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.reference || "Transaction detail"}
      >
        {selected && (
          <div className="detail-grid">
            <div>
              <small>Product</small>
              <strong>{selected.productName}</strong>
              <span>{selected.sku}</span>
            </div>
            <div>
              <small>Warehouse</small>
              <strong>{selected.warehouseName}</strong>
            </div>
            <div>
              <small>Quantity</small>
              <strong>
                {selected.transactionType === "stock-in" ? "+" : "-"}
                {selected.quantity}
              </strong>
            </div>
            <div>
              <small>Type</small>
              <Status
                value={
                  selected.transactionType === "stock-in"
                    ? "Stock-in"
                    : "Stock-out"
                }
              />
            </div>
            <div>
              <small>Performed by</small>
              <strong>{selected.performedBy}</strong>
            </div>
            <div>
              <small>Date</small>
              <strong>{formatDate(selected.at)}</strong>
            </div>
            <div className="grid-full">
              <small>Note</small>
              <strong>{selected.note || "-"}</strong>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

const emptyUser = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "salesRepresentative",
  isActive: true,
  assignedWarehouses: [],
  image: "",
  imageFileId: "",
};

export function UserModal({ open, onClose, user, warehouses, onSaved }) {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState(emptyUser);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setTouched(false);
    setForm(
      user
        ? {
            ...emptyUser,
            ...user,
            password: "",
            assignedWarehouses:
              user.role === "warehouseManager"
                ? (user.assignedWarehouses || []).map((w) => w._id || w)
                : [],
          }
        : emptyUser,
    );
  }, [user]);

  const nameError = form.name.trim() ? "" : "Name is required.";
  const emailError = /^\S+@\S+\.\S+$/.test(form.email)
    ? ""
    : "A valid email is required.";
  const passwordError =
    user || form.password.length >= 6
      ? ""
      : "Password must be at least 6 characters.";
  const canSave = !nameError && !emailError && !passwordError && !busy;
  const selfRoleLocked = Boolean(
    user && currentUser?._id === user._id && currentUser?.role === "admin",
  );
  const isRoleDisabled = (roleValue) => selfRoleLocked && roleValue !== "admin";
  const warehousesLocked = form.role !== "warehouseManager";

  const warnWarehouseAssignment = () => {
    if (!warehousesLocked) return;
    Swal.fire({
      title: "Not available",
      text: "Only a Warehouse Manager can be assigned to warehouses. Change the role to Warehouse Manager first.",
      icon: "info",
      background: "#0d0d0f",
      color: "#f3f3f4",
      confirmButtonColor: "#b6f36b",
      customClass: {
        popup: "user-swal-popup",
        confirmButton: "user-swal-confirm",
      },
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        role: form.role,
        isActive: form.isActive,
        assignedWarehouses:
          form.role === "warehouseManager" ? form.assignedWarehouses : [],
        image: form.image,
        imageFileId: form.imageFileId,
      };
      if (form.password) payload.password = form.password;
      if (user) {
        await api.put(`/users/${user._id}`, payload);
      } else {
        await api.post("/users", payload);
      }
      await Swal.fire({
        title: user ? "User Edited" : "User Created",
        text: user
          ? "The user has been edited successfully."
          : "The user has been created successfully.",
        icon: "success",
        background: "#0d0d0f",
        color: "#f3f3f4",
        confirmButtonColor: "#b6f36b",
        customClass: {
          popup: "user-swal-popup",
          confirmButton: "user-swal-confirm",
        },
      });
      onClose();
      onSaved?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? "Edit user" : "Create user"}
      wide
      className="user-modal"
    >
      <form onSubmit={save} className="form-grid">
        <Field label="Name" required>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {touched && nameError && (
            <small className="field-error">{nameError}</small>
          )}
        </Field>
        <Field label="Email" required>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {touched && emailError && (
            <small className="field-error">{emailError}</small>
          )}
        </Field>
        <Field
          label="Password"
          hint={user ? "Leave blank to keep current" : "At least 6 characters"}
        >
          <input
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {touched && passwordError && (
            <small className="field-error">{passwordError}</small>
          )}
        </Field>
        <Field label="Phone">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Role" required className="role-field">
          <RoleTiles
            value={form.role}
            onChange={(role) =>
              setForm((current) => ({
                ...current,
                role,
                assignedWarehouses:
                  role === "warehouseManager" ? current.assignedWarehouses : [],
              }))
            }
            isDisabled={isRoleDisabled}
          />
        </Field>
        <ImageUpload
          label="Profile picture"
          value={form.image || ""}
          fileId={form.imageFileId || ""}
          onChange={({ url, fileId }) =>
            setForm({ ...form, image: url, imageFileId: fileId })
          }
        />
        <Field
          label="Assigned warehouses"
          hint={
            warehousesLocked
              ? "Only warehouse managers can be assigned to warehouses"
              : "Applies to warehouse managers"
          }
          className={warehousesLocked ? "warehouse-field locked" : "warehouse-field"}
        >
          <span
            className="warehouse-field-control"
            tabIndex={warehousesLocked ? 0 : undefined}
            onClick={warnWarehouseAssignment}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                warnWarehouseAssignment();
              }
            }}
          >
            <select
              disabled={warehousesLocked}
              aria-disabled={warehousesLocked}
              value={form.assignedWarehouses?.[0] || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  assignedWarehouses: e.target.value ? [e.target.value] : [],
                })
              }
            >
              <option value="">No warehouse</option>
              {(warehouses || []).map((warehouse) => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </span>
        </Field>
        <Field
          label="Status"
          hint={
            user && currentUser?._id === user._id
              ? "You cannot deactivate your own account"
              : "Inactive users cannot sign in"
          }
        >
          <label className="check">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              disabled={Boolean(user && currentUser?._id === user._id)}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        </Field>
        <div className="grid-full form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!canSave}>
            {busy ? "Saving..." : "Save user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminUsers() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const [users, warehouses] = await Promise.all([
      readList(
        api.get("/users", { params: { q, role, isActive, page, limit: 20 } }),
      ),
      readList(api.get("/warehouses", { params: { limit: 100 } })),
    ]);
    return {
      users: users.items,
      pagination: users.pagination,
      warehouses: warehouses.items,
    };
  }, [q, role, isActive, page]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [deleting, setDeleting] = useState(null);

  const start = (user) => {
    setEditing(user || null);
    setOpen(true);
  };

  const toggleActive = async (target) => {
    setBusyId(target._id);
    try {
      const response = await api.put(`/users/${target._id}`, {
        isActive: !target.isActive,
      });
      toast.success(
        response.data.message ||
          `User ${target.isActive ? "deactivated" : "activated"}`,
      );
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId("");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${deleting._id}`);
      toast.success("User deleted");
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${data.pagination.total} accounts`}
      />
      <Toolbar>
        <input
          className="search"
          placeholder="Search name, email or phone..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {["admin", "warehouseManager", "supplier", "salesRepresentative"].map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ),
          )}
        </select>
        <select
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </Toolbar>
      <div className="users-add-row">
        <button
          type="button"
          className="add-user-bubble"
          title="Add user"
          aria-label="Add user"
          onClick={() => start(null)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <section className="panel users-table-panel">
        <Table
          head={["User", "Role", "Warehouses", "Status", "Created", "Actions"]}
          empty={!data.users.length}
        >
          {data.users.map((user) => (
            <tr key={user._id}>
              <td>
                <div className="person">
                  {user.image ? (
                    <img className="avatar" src={user.image} alt={`${user.name} profile`} />
                  ) : (
                    <span className="avatar">{(user.name || "?")[0]}</span>
                  )}
                  <div>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                </div>
              </td>
              <td>
                <Status value={user.role} />
              </td>
              <td>
                {(user.assignedWarehouses || [])
                  .map((w) => w.name)
                  .join(", ") || "-"}
              </td>
              <td>
                <span
                  className={`badge ${user.isActive === false ? "danger" : "success"}`}
                >
                  {user.isActive === false ? "Inactive" : "Active"}
                </span>
              </td>
              <td>{formatDate(user.createdAt)}</td>
              <td className="row-actions">
                <span
                  className="icon-action"
                  role="button"
                  tabIndex={0}
                  title="Edit"
                  aria-label={`Edit ${user.name}`}
                  onClick={() => start(user)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      start(user);
                    }
                  }}
                >
                  <RowIcon name="edit" />
                </span>
                <button
                  type="button"
                  className="btn small"
                  disabled={
                    busyId === user._id || currentUser?._id === user._id
                  }
                  onClick={() => toggleActive(user)}
                >
                  {user.isActive === false ? "Activate" : "Deactivate"}
                </button>
                <span
                  className="icon-action delete"
                  role="button"
                  tabIndex={0}
                  title="Delete"
                  aria-label={`Delete ${user.name}`}
                  onClick={() => setDeleting(user)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setDeleting(user);
                    }
                  }}
                >
                  <RowIcon name="delete" />
                </span>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <UserModal
        open={open}
        onClose={() => setOpen(false)}
        user={editing}
        warehouses={data.warehouses}
        onSaved={reload}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        title="Delete user"
        message={`Delete ${deleting?.name}? This cannot be undone.`}
      />
    </>
  );
}

const emptyProduct = {
  name: "",
  sku: "",
  description: "",
  category: "Electronics",
  price: "",
  lowStockLimit: 5,
  archived: false,
  supplier: "",
  imageUrl: "",
  imageFileId: "",
};

function ProductsPage({ canDelete = true }) {
  const toast = useToast();
  const location = useLocation();
  const [search, setSearch] = useState(location.state?.search || "");
  const [category, setCategory] = useState("");
  const [archived, setArchived] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const [products, suppliers] = await Promise.all([
      readList(
        api.get("/products", {
          params: { q: search, category, archived, page, limit: 20 },
        }),
      ),
      readList(api.get("/users/suppliers", { params: { limit: 100 } })),
    ]);
    return {
      products: products.items,
      pagination: products.pagination,
      suppliers: suppliers.items,
    };
  }, [search, category, archived, page]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [imageDirty, setImageDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState(false);

  const nameError = form.name.trim() ? "" : "Name is required.";
  const skuError = form.sku.trim() ? "" : "SKU is required.";
  const priceError =
    Number(form.price) >= 0 && form.price !== ""
      ? ""
      : "Price is required and must be a non-negative number.";
  const limitError =
    Number.isInteger(Number(form.lowStockLimit)) &&
    Number(form.lowStockLimit) >= 0
      ? ""
      : "Low stock limit must be a whole number of 0 or greater.";
  const canSave =
    !nameError && !skuError && !priceError && !limitError && !busy;

  const start = (product) => {
    setEditing(product || null);
    setTouched(false);
    setImageDirty(false);
    setForm(
      product
        ? { ...emptyProduct, ...product, supplier: product.supplier?._id || "" }
        : emptyProduct,
    );
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        description: form.description,
        category: form.category,
        price: form.price,
        lowStockLimit: form.lowStockLimit,
        archived: form.archived,
        supplier: form.supplier || null,
      };
      if (imageDirty) {
        payload.imageUrl = form.imageUrl;
        payload.imageFileId = form.imageFileId;
      }
      if (editing) await api.put(`/products/${editing._id}`, payload);
      else await api.post("/products", payload);
      await Swal.fire({
        title: editing ? "Product Edited" : "Product Created",
        text: editing
          ? "The product has been edited successfully."
          : "The product has been created successfully.",
        icon: "success",
        background: "#0d0d0f",
        color: "#f3f3f4",
        confirmButtonColor: "#b6f36b",
        customClass: {
          popup: "user-swal-popup",
          confirmButton: "user-swal-confirm",
        },
      });
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/products/${deleting._id}`);
      toast.success("Product deleted");
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const toggleArchived = async (product) => {
    setBusyId(product._id);
    try {
      const response = await api.put(`/products/${product._id}`, {
        archived: !product.archived,
      });
      toast.success(
        response.data.message ||
          `Product ${product.archived ? "restored" : "archived"}`,
      );
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusyId("");
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const categories = [
    ...new Set(data.products.map((product) => product.category)),
  ];

  return (
    <>
      <PageHeader
        title={canDelete ? "Products" : "Product catalog"}
        subtitle={
          canDelete
            ? `${data.pagination.total} catalog items`
            : `${data.pagination.total} products · create and edit with images`
        }
      />
      <Toolbar>
        <input
          className="search"
          placeholder="Search by name, SKU or category..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={archived}
          onChange={(e) => {
            setArchived(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All products</option>
          <option value="false">Active only</option>
          <option value="true">Archived only</option>
        </select>
      </Toolbar>
      <div className="users-add-row">
        <button
          type="button"
          className="add-user-bubble"
          title="Add product"
          aria-label="Add product"
          onClick={() => start(null)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <section className="panel products-table-panel">
        <Table
          head={[
            "Product",
            "SKU",
            "Category",
            "Price",
            "Stock",
            "Supplier",
            "Status",
            "Actions",
          ]}
          empty={!data.products.length}
        >
          {data.products.map((product) => (
            <tr key={product._id}>
              <td>
                <div className="person">
                  <img className="thumb" src={product.imageUrl} alt="" />
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.description || "-"}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className="mono">{product.sku}</span>
              </td>
              <td>{product.category}</td>
              <td>
                <Amount value={product.price} />
              </td>
              <td>
                <Badge
                  status={
                    product.availableStock < product.lowStockLimit
                      ? "low"
                      : "ok"
                  }
                >
                  {product.availableStock}
                </Badge>
              </td>
              <td>{product.supplier?.name || "-"}</td>
              <td>
                <span
                  className={`badge ${product.archived ? "danger" : "success"}`}
                >
                  {product.archived ? "Archived" : "Active"}
                </span>
              </td>
              <td className="row-actions">
                <span
                  className="icon-action"
                  role="button"
                  tabIndex={0}
                  title="Edit"
                  aria-label={`Edit ${product.name}`}
                  onClick={() => start(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      start(product);
                    }
                  }}
                >
                  <RowIcon name="edit" />
                </span>
                <span
                  className="icon-action"
                  role="button"
                  tabIndex={busyId === product._id ? -1 : 0}
                  aria-disabled={busyId === product._id}
                  title={product.archived ? "Restore" : "Archive"}
                  aria-label={`${product.archived ? "Restore" : "Archive"} ${product.name}`}
                  onClick={() => {
                    if (busyId !== product._id) toggleArchived(product);
                  }}
                  onKeyDown={(event) => {
                    if (busyId === product._id) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleArchived(product);
                    }
                  }}
                >
                  <RowIcon name={product.archived ? "restore" : "archive"} />
                </span>
                {canDelete && (
                  <span
                    className="icon-action delete"
                    role="button"
                    tabIndex={0}
                    title="Delete"
                    aria-label={`Delete ${product.name}`}
                    onClick={() => setDeleting(product)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDeleting(product);
                      }
                    }}
                  >
                    <RowIcon name="delete" />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </Table>
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit product" : "Create product"}
        wide
        className="user-modal product-modal"
      >
        <form onSubmit={save} className="form-grid">
          <Field label="Name" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {touched && nameError && (
              <small className="field-error">{nameError}</small>
            )}
          </Field>
          <Field label="SKU" required>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            {touched && skuError && (
              <small className="field-error">{skuError}</small>
            )}
          </Field>
          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </Field>
          <Field label="Price (PKR)" required>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            {touched && priceError && (
              <small className="field-error">{priceError}</small>
            )}
          </Field>
          <Field label="Low stock limit">
            <input
              type="number"
              min="0"
              value={form.lowStockLimit}
              onChange={(e) =>
                setForm({ ...form, lowStockLimit: e.target.value })
              }
            />
            {touched && limitError && (
              <small className="field-error">{limitError}</small>
            )}
          </Field>
          <Field label="Status">
            <label className="check">
              <input
                type="checkbox"
                checked={Boolean(form.archived)}
                onChange={(e) =>
                  setForm({ ...form, archived: e.target.checked })
                }
              />
              Archived
            </label>
          </Field>
          <Field label="Supplier" className="grid-full">
            <select
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            >
              <option value="">None</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="description-field">
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <ImageUpload
            label="Product image"
            value={form.imageUrl}
            fileId={form.imageFileId}
            onChange={({ url, fileId }) => {
              setForm((current) => ({
                ...current,
                imageUrl: url,
                imageFileId: fileId,
              }));
              setImageDirty(true);
            }}
          />
          <div className="grid-full form-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!canSave}>
              {busy ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>
      </Modal>
      {canDelete && (
        <ConfirmDialog
          open={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
          title="Delete product"
          message={`Delete ${deleting?.name}? Its stock records will be removed.`}
        />
      )}
    </>
  );
}

export function AdminProducts() {
  return <ProductsPage canDelete />;
}

export function ManagerProducts() {
  return <ProductsPage canDelete={false} />;
}

const emptyWarehouse = { name: "", location: "", capacity: 0, manager: "" };

export function AdminWarehouses() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [manager, setManager] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const [warehouses, managers] = await Promise.all([
      readList(
        api.get("/warehouses", {
          params: { q, location, manager, page, limit: 20 },
        }),
      ),
      readList(
        api.get("/users", { params: { role: "warehouseManager", limit: 100 } }),
      ),
    ]);
    return {
      warehouses: warehouses.items,
      pagination: warehouses.pagination,
      managers: managers.items,
    };
  }, [q, location, manager, page]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyWarehouse);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState(false);

  const nameError = form.name.trim() ? "" : "Warehouse name is required.";
  const locationError = form.location.trim()
    ? ""
    : "Warehouse location is required.";
  const capacityError =
    Number.isInteger(Number(form.capacity)) && Number(form.capacity) >= 0
      ? ""
      : "Capacity must be a whole number of 0 or greater.";
  const canSave = !nameError && !locationError && !capacityError && !busy;

  const start = (warehouse) => {
    setEditing(warehouse || null);
    setTouched(false);
    setForm(
      warehouse
        ? {
            ...emptyWarehouse,
            ...warehouse,
            manager: warehouse.manager?._id || "",
          }
        : emptyWarehouse,
    );
    setOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = { ...form, manager: form.manager || null };
      if (editing) await api.put(`/warehouses/${editing._id}`, payload);
      else await api.post("/warehouses", payload);
      await Swal.fire({
        title: editing ? "Warehouse Edited" : "Warehouse Created",
        text: editing
          ? "The warehouse has been edited successfully."
          : "The warehouse has been created successfully.",
        icon: "success",
        background: "#0d0d0f",
        color: "#f3f3f4",
        confirmButtonColor: "#b6f36b",
        customClass: {
          popup: "user-swal-popup",
          confirmButton: "user-swal-confirm",
        },
      });
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/warehouses/${deleting._id}`);
      toast.success("Warehouse deleted");
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  return (
    <>
      <PageHeader
        title="Warehouses"
        subtitle={`${data.pagination.total} locations and assigned managers`}
      />
      <Toolbar>
        <input
          className="search"
          placeholder="Search name or location..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={location}
          onChange={(e) => {
            setLocation(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All locations</option>
          {[...new Set(data.warehouses.map((item) => item.location))].map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ),
          )}
        </select>
        <select
          value={manager}
          onChange={(e) => {
            setManager(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All managers</option>
          {data.managers.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>
      </Toolbar>
      <div className="users-add-row">
        <button
          type="button"
          className="add-user-bubble"
          title="Add warehouse"
          aria-label="Add warehouse"
          onClick={() => start(null)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <section className="panel warehouses-table-panel">
        <Table
          head={["Warehouse", "Location", "Manager", "Capacity", "Actions"]}
          empty={!data.warehouses.length}
        >
          {data.warehouses.map((warehouse) => (
            <tr key={warehouse._id}>
              <td>
                <strong>{warehouse.name}</strong>
              </td>
              <td>{warehouse.location}</td>
              <td>{warehouse.manager?.name || "Unassigned"}</td>
              <td>{Number(warehouse.capacity || 0).toLocaleString()} units</td>
              <td className="row-actions">
                <span
                  className="icon-action"
                  role="button"
                  tabIndex={0}
                  title="Edit"
                  aria-label={`Edit ${warehouse.name}`}
                  onClick={() => start(warehouse)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      start(warehouse);
                    }
                  }}
                >
                  <RowIcon name="edit" />
                </span>
                <span
                  className="icon-action delete"
                  role="button"
                  tabIndex={0}
                  title="Delete"
                  aria-label={`Delete ${warehouse.name}`}
                  onClick={() => setDeleting(warehouse)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setDeleting(warehouse);
                    }
                  }}
                >
                  <RowIcon name="delete" />
                </span>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit warehouse" : "Create warehouse"}
        wide
        className="user-modal warehouse-modal"
      >
        <form onSubmit={save} className="form-grid">
          <Field label="Name" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {touched && nameError && (
              <small className="field-error">{nameError}</small>
            )}
          </Field>
          <Field label="Location" required>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            {touched && locationError && (
              <small className="field-error">{locationError}</small>
            )}
          </Field>
          <Field label="Capacity">
            <input
              type="number"
              min="0"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            {touched && capacityError && (
              <small className="field-error">{capacityError}</small>
            )}
          </Field>
          <Field label="Manager">
            <select
              value={form.manager}
              onChange={(e) => setForm({ ...form, manager: e.target.value })}
            >
              <option value="">Unassigned</option>
              {data.managers.map((manager) => (
                <option key={manager._id} value={manager._id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid-full form-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!canSave}>
              {busy ? "Saving..." : "Save warehouse"}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        busy={busy}
        title="Delete warehouse"
        message={`Delete ${deleting?.name}?`}
      />
    </>
  );
}

export function AdminOrders() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(
    () =>
      readList(api.get("/orders", { params: { status, q, page, limit: 20 } })),
    [status, q, page],
  );
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");

  const change = async (order, action) => {
    setBusy(order._id);
    try {
      if (action === "cancel") await api.put(`/orders/${order._id}/cancel`);
      else await api.put(`/orders/${order._id}/status`, { status: action });
      toast.success(`Order ${order.orderNumber} updated`);
      const refreshed = await api.get(`/orders/${order._id}`);
      setSelected(refreshed.data.data);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy("");
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  return (
    <>
      <PageHeader
        title="All orders"
        subtitle={`${data.pagination.total} orders · review and progress customer orders`}
      />
      <Toolbar>
        <input
          className="search"
          placeholder="Search order, customer or phone..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {["Pending", "Processing", "Completed", "Cancelled"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </Toolbar>
      <section className="panel orders-table-panel">
        <Table
          head={[
            "Order",
            "Customer",
            "Warehouse",
            "Total",
            "Status",
            "Created",
            "Actions",
          ]}
          empty={!data.items.length}
        >
          {data.items.map((order) => (
            <tr key={order._id}>
              <td>
                <strong>{order.orderNumber}</strong>
              </td>
              <td>
                {order.customerName}
                <small>{order.customerPhone}</small>
              </td>
              <td>{order.warehouse?.name || "-"}</td>
              <td>
                <Amount value={order.totalAmount} />
              </td>
              <td>
                <Status value={order.status} />
              </td>
              <td>{formatDate(order.createdAt)}</td>
              <td className="row-actions">
                <span
                  className="icon-action"
                  role="button"
                  tabIndex={0}
                  title="Details"
                  aria-label={`View order ${order.orderNumber}`}
                  onClick={() => setSelected(order)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(order);
                    }
                  }}
                >
                  <RowIcon name="view" />
                </span>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.orderNumber || "Order details"}
        wide
        className="user-modal order-details-modal"
      >
        {selected && (
          <>
            <div className="detail-grid">
              <div>
                <small>Customer</small>
                <strong>{selected.customerName}</strong>
                <span>{selected.customerPhone}</span>
              </div>
              <div>
                <small>Warehouse</small>
                <strong>{selected.warehouse?.name}</strong>
                <span>{selected.warehouse?.location}</span>
              </div>
              <div>
                <small>Created by</small>
                <strong>{selected.createdBy?.name}</strong>
                <span>{formatDate(selected.createdAt)}</span>
              </div>
              <div>
                <small>Status</small>
                <Status value={selected.status} />
              </div>
            </div>
            <Table
              head={["Product", "Qty", "Unit price", "Line total"]}
              empty={!selected.products.length}
            >
              {selected.products.map((line, index) => (
                <tr key={line.product?._id || index}>
                  <td>
                    {line.product?.name || "Deleted product"}
                    <small>{line.product?.sku}</small>
                  </td>
                  <td>{line.quantity}</td>
                  <td>{money(line.price)}</td>
                  <td>{money(line.price * line.quantity)}</td>
                </tr>
              ))}
            </Table>
            <div className="total-row">
              <span>Total</span>
              <strong>{money(selected.totalAmount)}</strong>
            </div>
            <div className="form-actions">
              {selected.status === "Pending" && (
                <>
                  <button
                    className="btn primary"
                    disabled={busy === selected._id}
                    onClick={() => change(selected, "Processing")}
                  >
                    Mark processing
                  </button>
                  <button
                    className="btn danger-ghost"
                    disabled={busy === selected._id}
                    onClick={() => change(selected, "cancel")}
                  >
                    Cancel order
                  </button>
                </>
              )}
              {selected.status === "Processing" && (
                <button
                  className="btn primary"
                  disabled={busy === selected._id}
                  onClick={() => change(selected, "Completed")}
                >
                  Mark completed
                </button>
              )}
              {["Completed", "Cancelled"].includes(selected.status) && (
                <p className="muted">This order is final.</p>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

export function AdminTransactions() {
  const [filters, setFilters] = useState({
    type: "",
    q: "",
    warehouseId: "",
    productId: "",
    date: "",
  });
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { data, error } = useLoad(async () => {
    const [transactions, warehouses, products] = await Promise.all([
      readList(
        api.get("/transactions", {
          params: { ...filters, page, limit: 20, _: refreshToken },
        }),
      ),
      readList(api.get("/warehouses", { params: { limit: 100 } })),
      readList(api.get("/products", { params: { limit: 100 } })),
    ]);
    return {
      transactions: transactions.items,
      pagination: transactions.pagination,
      warehouses: warehouses.items,
      products: products.items,
    };
  }, [
    filters.type,
    filters.q,
    filters.warehouseId,
    filters.productId,
    filters.date,
    page,
    refreshToken,
  ]);

  const update = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const refresh = () => {
    setRefreshing(true);
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    setRefreshing(false);
  }, [data, error]);

  return (
    <>
      <PageHeader
        title="Stock transactions"
        subtitle={
          data
            ? `${data.pagination.total} movements · complete audit trail`
            : "Complete movement audit trail"
        }
        action={
          <button
            type="button"
            className={`add-user-bubble refresh-bubble ${
              refreshing ? "is-refreshing" : ""
            }`}
            title="Refresh transactions"
            aria-label="Refresh transactions"
            disabled={refreshing}
            onClick={refresh}
          >
            <RowIcon name="refresh" />
          </button>
        }
      />
      <Toolbar className="transactions-toolbar">
        <input
          className="search"
          placeholder="Search note or product..."
          value={filters.q}
          onChange={(e) => update("q", e.target.value)}
        />
        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">All movements</option>
          <option value="stock-in">Stock in</option>
          <option value="stock-out">Stock out</option>
        </select>
        <select
          value={filters.warehouseId}
          onChange={(e) => update("warehouseId", e.target.value)}
        >
          <option value="">All warehouses</option>
          {(data?.warehouses || []).map((warehouse) => (
            <option key={warehouse._id} value={warehouse._id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <select
          value={filters.productId}
          onChange={(e) => update("productId", e.target.value)}
        >
          <option value="">All products</option>
          {(data?.products || []).map((product) => (
            <option key={product._id} value={product._id}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          className="date-filter"
          type="date"
          value={filters.date}
          onChange={(e) => update("date", e.target.value)}
          title="Filter by date"
          aria-label="Filter by date"
        />
      </Toolbar>
      {!data ? (
        error ? (
          <Empty message={error} />
        ) : (
          <Loading />
        )
      ) : (
        <section className="panel transactions-table-panel">
          <Table
            head={[
              "Date",
              "Product",
              "Warehouse",
              "Type",
              "Qty",
              "Performed by",
              "Note",
            ]}
            empty={!data.transactions.length}
          >
            {data.transactions.map((tx) => (
              <tr key={tx._id}>
                <td>{formatDate(tx.date)}</td>
                <td>
                  {tx.product?.name || "Deleted product"}
                  <small>{tx.product?.sku}</small>
                </td>
                <td>{tx.warehouse?.name || "-"}</td>
                <td>
                  <Status value={tx.transactionType} />
                </td>
                <td
                  className={`tx-qty ${
                    tx.transactionType === "stock-in" ? "in" : "out"
                  }`}
                >
                  <strong>
                    {tx.transactionType === "stock-in" ? "+" : "-"}
                    {tx.quantity}
                  </strong>
                </td>
                <td>{tx.performedBy?.name || "-"}</td>
                <td className="tx-note" title={tx.note || ""}>
                  {tx.note || "-"}
                </td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </section>
      )}
    </>
  );
}

export function LowStockPage({ scope = "admin" }) {
  const [warehouseId, setWarehouseId] = useState("");
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { data, error } = useLoad(async () => {
    const params = { _: refreshToken };
    if (scope === "admin" && warehouseId) params.warehouseId = warehouseId;
    const [rows, warehouses] = await Promise.all([
      api.get("/stock/low", { params }),
      api.get("/warehouses"),
    ]);
    return { rows: rows.data.data, warehouses: warehouses.data.data };
  }, [scope, warehouseId, refreshToken]);

  const refresh = () => {
    setRefreshing(true);
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    setRefreshing(false);
  }, [data, error]);

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const outCount = data.rows.filter((row) => row.outOfStock).length;
  const lowCount = data.rows.filter(
    (row) => row.lowStock && !row.outOfStock,
  ).length;
  const rows = data.rows.filter((row) => {
    const warehouseMatches =
      scope === "manager"
        ? !warehouseId || row.warehouse?._id === warehouseId
        : true;
    const viewMatches =
      view === "all" ||
      (view === "out" ? row.outOfStock : row.lowStock && !row.outOfStock);
    const searchMatches =
      !search ||
      `${row.product?.name || ""} ${row.product?.sku || ""} ${row.product?.category || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return warehouseMatches && viewMatches && searchMatches;
  });

  return (
    <>
      <PageHeader
        title={scope === "manager" ? "My low-stock alerts" : "Low stock alerts"}
        subtitle={`${lowCount} low · ${outCount} out of stock · items below their reorder point`}
        action={
          <button
            type="button"
            className={`add-user-bubble refresh-bubble ${
              refreshing ? "is-refreshing" : ""
            }`}
            title="Refresh low stock alerts"
            aria-label="Refresh low stock alerts"
            disabled={refreshing}
            onClick={refresh}
          >
            <RowIcon name="refresh" />
          </button>
        }
      />
      <Toolbar>
        <input
          className="search"
          placeholder="Search product, SKU or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        >
          <option value="">All warehouses</option>
          {data.warehouses.map((warehouse) => (
            <option key={warehouse._id} value={warehouse._id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <select value={view} onChange={(e) => setView(e.target.value)}>
          <option value="all">Low and out of stock</option>
          <option value="low">Low stock only</option>
          <option value="out">Out of stock only</option>
        </select>
      </Toolbar>
      <section className="panel products-table-panel">
        <Table
          head={[
            "Product",
            "SKU",
            "Warehouse",
            "Quantity",
            "Limit",
            "Shortfall",
            "Status",
          ]}
          empty={!rows.length}
        >
          {rows.map((row) => (
            <tr key={row._id}>
              <td>
                <div className="person">
                  <img className="thumb" src={row.product?.imageUrl} alt="" />
                  <strong>{row.product?.name}</strong>
                </div>
              </td>
              <td>
                <span className="mono">{row.product?.sku}</span>
              </td>
              <td>{row.warehouse?.name}</td>
              <td>
                <Badge status={row.outOfStock ? "cancelled" : "low"}>
                  {row.quantity}
                </Badge>
              </td>
              <td>{row.threshold}</td>
              <td className="danger-text">{row.shortfall} units</td>
              <td>
                <span className={`badge ${row.outOfStock ? "danger" : "warn"}`}>
                  {row.outOfStock ? "Out of stock" : "Low stock"}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

export function AdminLowStock() {
  return <LowStockPage scope="admin" />;
}
