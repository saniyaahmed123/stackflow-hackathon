import { useEffect, useState } from 'react';
import api, { apiError, formatDate, money } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import ImageUpload from '../../components/ImageUpload';
import {
  Amount, Badge, ConfirmDialog, Empty, Field, Loading, Modal, PageHeader,
  StatCard, Table, Toolbar, useToast,
} from '../../components/ui';

const useLoad = (loader, deps = []) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = async () => {
    try {
      setData(await loader());
      setError('');
    } catch (err) {
      setError(apiError(err));
    }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, deps);
  return { data, error, reload, setData };
};

const Status = ({ value }) => <Badge status={value} />;

export function AdminOverview() {
  const { data, error } = useLoad(async () => {
    const [summary, users, products, warehouses, suppliers, low, orders, transactions] = await Promise.all([
      api.get('/orders/summary'),
      api.get('/users'),
      api.get('/products'),
      api.get('/warehouses'),
      api.get('/users/suppliers/summary'),
      api.get('/stock/low'),
      api.get('/orders'),
      api.get('/transactions?limit=6'),
    ]);
    return {
      summary: summary.data.data,
      users: users.data.data,
      products: products.data.data,
      warehouses: warehouses.data.data,
      suppliers: suppliers.data.data,
      low: low.data.data,
      orders: orders.data.data,
      transactions: transactions.data.data,
    };
  }, []);
  const { user } = useAuth();

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle={`${data.summary.pending} pending orders · ${money(data.summary.revenue)} revenue (excludes cancelled)`}
      />
      <div className="stat-grid six">
        <StatCard to="/admin/users" label="Users" value={data.users.length} hint="Accounts in the system" />
        <StatCard to="/admin/products" label="Products" value={data.products.length} tone="info" />
        <StatCard to="/admin/warehouses" label="Warehouses" value={data.warehouses.length} tone="info" />
        <StatCard to="/admin/suppliers" label="Suppliers" value={data.suppliers.length} tone="success" />
        <StatCard to="/admin/orders" label="Orders" value={data.summary.totalOrders} hint={`${data.summary.pending} pending`} tone="warn" />
        <StatCard to="/admin/low-stock" label="Low-stock products" value={data.low.length} hint="Needs attention" tone="danger" />
      </div>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>Recent orders</h2></div>
          <Table head={['Order', 'Customer', 'Total', 'Status']} empty={!data.orders.length}>
            {data.orders.slice(0, 6).map((order) => (
              <tr key={order._id}>
                <td><strong>{order.orderNumber}</strong><small>{formatDate(order.createdAt)}</small></td>
                <td>{order.customerName}</td>
                <td><Amount value={order.totalAmount} /></td>
                <td><Status value={order.status} /></td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Low stock</h2></div>
          <Table head={['Product', 'Warehouse', 'Qty / Limit']} empty={!data.low.length}>
            {data.low.slice(0, 6).map((row) => (
              <tr key={row._id}>
                <td><strong>{row.product?.name}</strong><small>{row.product?.sku}</small></td>
                <td>{row.warehouse?.name}</td>
                <td><span className="danger-text">{row.quantity}</span> / {row.product?.lowStockLimit}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Recent stock movements</h2></div>
        <Table head={['Date', 'Product', 'Type', 'Qty', 'By']} empty={!data.transactions.length}>
          {data.transactions.map((tx) => (
            <tr key={tx._id}>
              <td>{formatDate(tx.date)}</td>
              <td>{tx.product?.name || 'Deleted product'}<small>{tx.warehouse?.name}</small></td>
              <td><Status value={tx.transactionType} /></td>
              <td>{tx.quantity}</td>
              <td>{tx.performedBy?.name || '-'}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

const emptyUser = { name: '', email: '', password: '', phone: '', role: 'salesRepresentative', assignedWarehouses: [], image: '', imageFileId: '' };

export function UserModal({ open, onClose, user, warehouses, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyUser);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setTouched(false);
    setForm(user
      ? { ...emptyUser, ...user, password: '', assignedWarehouses: (user.assignedWarehouses || []).map((w) => w._id || w) }
      : emptyUser);
  }, [user]);

  const nameError = form.name.trim() ? '' : 'Name is required.';
  const emailError = /^\S+@\S+\.\S+$/.test(form.email) ? '' : 'A valid email is required.';
  const passwordError = user || form.password.length >= 6 ? '' : 'Password must be at least 6 characters.';
  const canSave = !nameError && !emailError && !passwordError && !busy;

  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(), email: form.email.trim(), phone: form.phone, role: form.role,
        assignedWarehouses: form.assignedWarehouses, image: form.image, imageFileId: form.imageFileId,
      };
      if (form.password) payload.password = form.password;
      if (user) {
        await api.put(`/users/${user._id}`, payload);
      } else {
        const created = await api.post('/auth/register', {
          name: payload.name, email: payload.email, password: form.password, phone: form.phone, role: 'salesRepresentative',
        });
        await api.put(`/users/${created.data.data.user._id}`, payload);
      }
      toast.success(user ? 'User updated' : 'User created');
      onClose();
      onSaved?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Edit user' : 'Create user'}>
      <form onSubmit={save} className="form-grid">
        <Field label="Name" required>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {touched && nameError && <small className="field-error">{nameError}</small>}
        </Field>
        <Field label="Email" required>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {touched && emailError && <small className="field-error">{emailError}</small>}
        </Field>
        <Field label="Password" hint={user ? 'Leave blank to keep current' : 'At least 6 characters'}>
          <input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {touched && passwordError && <small className="field-error">{passwordError}</small>}
        </Field>
        <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Role" required>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {['admin', 'warehouseManager', 'supplier', 'salesRepresentative'].map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </Field>
        <Field label="Assigned warehouses" hint="Applies to warehouse managers">
          <select multiple value={form.assignedWarehouses} onChange={(e) => setForm({ ...form, assignedWarehouses: [...e.target.selectedOptions].map((option) => option.value) })}>
            {(warehouses || []).map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
          </select>
        </Field>
        <div className="grid-full">
          <ImageUpload label="Profile picture" value={form.image || ''} fileId={form.imageFileId || ''} onChange={({ url, fileId }) => setForm({ ...form, image: url, imageFileId: fileId })} />
        </div>
        <div className="grid-full form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!canSave}>{busy ? 'Saving...' : 'Save user'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminUsers() {
  const toast = useToast();
  const { data, error, reload } = useLoad(async () => {
    const [users, warehouses] = await Promise.all([api.get('/users'), api.get('/warehouses')]);
    return { users: users.data.data, warehouses: warehouses.data.data };
  }, []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const start = (user) => {
    setEditing(user || null);
    setOpen(true);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/users/${deleting._id}`);
      toast.success('User deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts and assign roles" action={<button className="btn primary" onClick={() => start(null)}>+ Add user</button>} />
      <section className="panel">
        <Table head={['User', 'Role', 'Warehouses', 'Created', 'Actions']} empty={!data.users.length}>
          {data.users.map((user) => (
            <tr key={user._id}>
              <td><div className="person"><span className="avatar">{(user.name || '?')[0]}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td>
              <td><Status value={user.role} /></td>
              <td>{(user.assignedWarehouses || []).map((w) => w.name).join(', ') || '-'}</td>
              <td>{formatDate(user.createdAt)}</td>
              <td className="row-actions">
                <button className="btn small" onClick={() => start(user)}>Edit</button>
                <button className="btn small danger-ghost" onClick={() => setDeleting(user)}>Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <UserModal open={open} onClose={() => setOpen(false)} user={editing} warehouses={data.warehouses} onSaved={reload} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy}
        title="Delete user" message={`Delete ${deleting?.name}? This cannot be undone.`} />
    </>
  );
}

const emptyProduct = { name: '', sku: '', description: '', category: 'Electronics', price: '', lowStockLimit: 5, supplier: '', imageUrl: '', imageFileId: '' };

function ProductsPage({ canDelete = true }) {
  const toast = useToast();
  const { data, error, reload } = useLoad(async () => {
    const [products, suppliers] = await Promise.all([api.get('/products'), api.get('/users/suppliers')]);
    return { products: products.data.data, suppliers: suppliers.data.data };
  }, []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [imageDirty, setImageDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState(false);

  const nameError = form.name.trim() ? '' : 'Name is required.';
  const skuError = form.sku.trim() ? '' : 'SKU is required.';
  const priceError = Number(form.price) >= 0 && form.price !== '' ? '' : 'Price is required and must be a non-negative number.';
  const limitError = Number.isInteger(Number(form.lowStockLimit)) && Number(form.lowStockLimit) >= 0
    ? '' : 'Low stock limit must be a whole number of 0 or greater.';
  const canSave = !nameError && !skuError && !priceError && !limitError && !busy;

  const start = (product) => {
    setEditing(product || null);
    setTouched(false);
    setImageDirty(false);
    setForm(product ? { ...emptyProduct, ...product, supplier: product.supplier?._id || '' } : emptyProduct);
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSave) return;
    setBusy(true);
    try {
      const payload = {
        name: form.name, sku: form.sku, description: form.description, category: form.category,
        price: form.price, lowStockLimit: form.lowStockLimit, supplier: form.supplier || null,
      };
      if (imageDirty) {
        payload.imageUrl = form.imageUrl;
        payload.imageFileId = form.imageFileId;
      }
      if (editing) await api.put(`/products/${editing._id}`, payload);
      else await api.post('/products', payload);
      toast.success(editing ? 'Product updated' : 'Product created');
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
      toast.success('Product deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const categories = [...new Set(data.products.map((product) => product.category))];
  const filtered = data.products.filter((product) =>
    (!search || `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())) &&
    (!category || product.category === category)
  );

  return (
    <>
      <PageHeader
        title={canDelete ? 'Products' : 'Product catalog'}
        subtitle={canDelete ? `${data.products.length} catalog items` : `${data.products.length} products · create and edit with images`}
        action={<button className="btn primary" onClick={() => start(null)}>+ Add product</button>}
      />
      <Toolbar>
        <input className="search" placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Toolbar>
      <section className="panel">
        <Table head={['Product', 'SKU', 'Category', 'Price', 'Stock', 'Supplier', 'Actions']} empty={!filtered.length}>
          {filtered.map((product) => (
            <tr key={product._id}>
              <td><div className="person"><img className="thumb" src={product.imageUrl} alt="" /><div><strong>{product.name}</strong><small>{product.description || '-'}</small></div></div></td>
              <td><span className="mono">{product.sku}</span></td>
              <td>{product.category}</td>
              <td><Amount value={product.price} /></td>
              <td><Badge status={product.availableStock < product.lowStockLimit ? 'low' : 'ok'}>{product.availableStock}</Badge></td>
              <td>{product.supplier?.name || '-'}</td>
              <td className="row-actions">
                <button className="btn small" onClick={() => start(product)}>Edit</button>
                {canDelete && <button className="btn small danger-ghost" onClick={() => setDeleting(product)}>Delete</button>}
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit product' : 'Add product'} wide>
        <form onSubmit={save} className="form-grid">
          <Field label="Name" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {touched && nameError && <small className="field-error">{nameError}</small>}
          </Field>
          <Field label="SKU" required>
            <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            {touched && skuError && <small className="field-error">{skuError}</small>}
          </Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Price (PKR)" required>
            <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            {touched && priceError && <small className="field-error">{priceError}</small>}
          </Field>
          <Field label="Low stock limit">
            <input type="number" min="0" value={form.lowStockLimit} onChange={(e) => setForm({ ...form, lowStockLimit: e.target.value })} />
            {touched && limitError && <small className="field-error">{limitError}</small>}
          </Field>
          <Field label="Supplier">
            <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}>
              <option value="">None</option>
              {data.suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
            </select>
          </Field>
          <div className="grid-full"><Field label="Description"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <div className="grid-full">
            <ImageUpload label="Product image" value={form.imageUrl} fileId={form.imageFileId}
              onChange={({ url, fileId }) => { setForm((current) => ({ ...current, imageUrl: url, imageFileId: fileId })); setImageDirty(true); }} />
          </div>
          <div className="grid-full form-actions">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!canSave}>{busy ? 'Saving...' : 'Save product'}</button>
          </div>
        </form>
      </Modal>
      {canDelete && (
        <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy}
          title="Delete product" message={`Delete ${deleting?.name}? Its stock records will be removed.`} />
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

const emptyWarehouse = { name: '', location: '', capacity: 0, manager: '' };

export function AdminWarehouses() {
  const toast = useToast();
  const { data, error, reload } = useLoad(async () => {
    const [warehouses, managers] = await Promise.all([api.get('/warehouses'), api.get('/users?role=warehouseManager')]);
    return { warehouses: warehouses.data.data, managers: managers.data.data };
  }, []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyWarehouse);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState(false);

  const nameError = form.name.trim() ? '' : 'Warehouse name is required.';
  const locationError = form.location.trim() ? '' : 'Warehouse location is required.';
  const capacityError = Number.isInteger(Number(form.capacity)) && Number(form.capacity) >= 0
    ? '' : 'Capacity must be a whole number of 0 or greater.';
  const canSave = !nameError && !locationError && !capacityError && !busy;

  const start = (warehouse) => {
    setEditing(warehouse || null);
    setTouched(false);
    setForm(warehouse ? { ...emptyWarehouse, ...warehouse, manager: warehouse.manager?._id || '' } : emptyWarehouse);
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
      else await api.post('/warehouses', payload);
      toast.success(editing ? 'Warehouse updated' : 'Warehouse created');
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
      toast.success('Warehouse deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  return (
    <>
      <PageHeader title="Warehouses" subtitle="Locations and assigned managers" action={<button className="btn primary" onClick={() => start(null)}>+ Add warehouse</button>} />
      <section className="panel">
        <Table head={['Warehouse', 'Location', 'Manager', 'Capacity', 'Actions']} empty={!data.warehouses.length}>
          {data.warehouses.map((warehouse) => (
            <tr key={warehouse._id}>
              <td><strong>{warehouse.name}</strong></td>
              <td>{warehouse.location}</td>
              <td>{warehouse.manager?.name || 'Unassigned'}</td>
              <td>{warehouse.capacity.toLocaleString()} units</td>
              <td className="row-actions">
                <button className="btn small" onClick={() => start(warehouse)}>Edit</button>
                <button className="btn small danger-ghost" onClick={() => setDeleting(warehouse)}>Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit warehouse' : 'Add warehouse'}>
        <form onSubmit={save} className="form-grid">
          <Field label="Name" required>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {touched && nameError && <small className="field-error">{nameError}</small>}
          </Field>
          <Field label="Location" required>
            <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            {touched && locationError && <small className="field-error">{locationError}</small>}
          </Field>
          <Field label="Capacity">
            <input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            {touched && capacityError && <small className="field-error">{capacityError}</small>}
          </Field>
          <Field label="Manager">
            <select value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}>
              <option value="">Unassigned</option>
              {data.managers.map((manager) => <option key={manager._id} value={manager._id}>{manager.name}</option>)}
            </select>
          </Field>
          <div className="grid-full form-actions">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!canSave}>{busy ? 'Saving...' : 'Save warehouse'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy}
        title="Delete warehouse" message={`Delete ${deleting?.name}?`} />
    </>
  );
}

export function AdminOrders() {
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api.get('/orders').then((response) => response.data.data), []);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');

  const change = async (order, action) => {
    setBusy(order._id);
    try {
      if (action === 'cancel') await api.put(`/orders/${order._id}/cancel`);
      else await api.put(`/orders/${order._id}/status`, { status: action });
      toast.success(`Order ${order.orderNumber} updated`);
      const refreshed = await api.get(`/orders/${order._id}`);
      setSelected(refreshed.data.data);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy('');
    }
  };

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const rows = data.filter((order) => !status || order.status === status);
  return (
    <>
      <PageHeader title="All orders" subtitle="Review and progress customer orders" />
      <Toolbar>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'Processing', 'Completed', 'Cancelled'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Toolbar>
      <section className="panel">
        <Table head={['Order', 'Customer', 'Warehouse', 'Total', 'Status', 'Created', '']} empty={!rows.length}>
          {rows.map((order) => (
            <tr key={order._id}>
              <td><strong>{order.orderNumber}</strong></td>
              <td>{order.customerName}<small>{order.customerPhone}</small></td>
              <td>{order.warehouse?.name || '-'}</td>
              <td><Amount value={order.totalAmount} /></td>
              <td><Status value={order.status} /></td>
              <td>{formatDate(order.createdAt)}</td>
              <td><button className="btn small" onClick={() => setSelected(order)}>Details</button></td>
            </tr>
          ))}
        </Table>
      </section>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.orderNumber || 'Order details'} wide>
        {selected && (
          <>
            <div className="detail-grid">
              <div><small>Customer</small><strong>{selected.customerName}</strong><span>{selected.customerPhone}</span></div>
              <div><small>Warehouse</small><strong>{selected.warehouse?.name}</strong><span>{selected.warehouse?.location}</span></div>
              <div><small>Created by</small><strong>{selected.createdBy?.name}</strong><span>{formatDate(selected.createdAt)}</span></div>
              <div><small>Status</small><Status value={selected.status} /></div>
            </div>
            <Table head={['Product', 'Qty', 'Unit price', 'Line total']} empty={!selected.products.length}>
              {selected.products.map((line, index) => (
                <tr key={line.product?._id || index}>
                  <td>{line.product?.name || 'Deleted product'}<small>{line.product?.sku}</small></td>
                  <td>{line.quantity}</td>
                  <td>{money(line.price)}</td>
                  <td>{money(line.price * line.quantity)}</td>
                </tr>
              ))}
            </Table>
            <div className="total-row"><span>Total</span><strong>{money(selected.totalAmount)}</strong></div>
            <div className="form-actions">
              {selected.status === 'Pending' && (
                <>
                  <button className="btn primary" disabled={busy === selected._id} onClick={() => change(selected, 'Processing')}>Mark processing</button>
                  <button className="btn danger-ghost" disabled={busy === selected._id} onClick={() => change(selected, 'cancel')}>Cancel order</button>
                </>
              )}
              {selected.status === 'Processing' && (
                <button className="btn primary" disabled={busy === selected._id} onClick={() => change(selected, 'Completed')}>Mark completed</button>
              )}
              {['Completed', 'Cancelled'].includes(selected.status) && <p className="muted">This order is final.</p>}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

export function AdminTransactions() {
  const [filters, setFilters] = useState({ type: '', q: '' });
  const { data, error, reload } = useLoad(() => api.get('/transactions', { params: filters }).then((r) => r.data.data), [filters.type, filters.q]);
  return (
    <>
      <PageHeader title="Stock transactions" subtitle="Complete movement audit trail" action={<button className="btn" onClick={reload}>Refresh</button>} />
      <Toolbar>
        <input className="search" placeholder="Search note or product..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All movements</option>
          <option value="stock-in">Stock in</option>
          <option value="stock-out">Stock out</option>
        </select>
      </Toolbar>
      {!data ? (error ? <Empty message={error} /> : <Loading />) : (
        <section className="panel">
          <Table head={['Date', 'Product', 'Warehouse', 'Type', 'Qty', 'Performed by', 'Note']} empty={!data.length}>
            {data.map((tx) => (
              <tr key={tx._id}>
                <td>{formatDate(tx.date)}</td>
                <td>{tx.product?.name || 'Deleted product'}<small>{tx.product?.sku}</small></td>
                <td>{tx.warehouse?.name || '-'}</td>
                <td><Status value={tx.transactionType} /></td>
                <td><strong>{tx.transactionType === 'stock-in' ? '+' : '-'}{tx.quantity}</strong></td>
                <td>{tx.performedBy?.name || '-'}</td>
                <td>{tx.note}</td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}

export function AdminLowStock() {
  const { data, error } = useLoad(() => api.get('/stock/low').then((r) => r.data.data), []);
  return (
    <>
      <PageHeader title="Low stock alerts" subtitle="Items at or below their reorder point" />
      {!data ? (error ? <Empty message={error} /> : <Loading />) : (
        <section className="panel">
          <Table head={['Product', 'SKU', 'Warehouse', 'Quantity', 'Limit', 'Shortfall']} empty={!data.length}>
            {data.map((row) => (
              <tr key={row._id}>
                <td><div className="person"><img className="thumb" src={row.product?.imageUrl} alt="" /><strong>{row.product?.name}</strong></div></td>
                <td><span className="mono">{row.product?.sku}</span></td>
                <td>{row.warehouse?.name}</td>
                <td><Badge status="low">{row.quantity}</Badge></td>
                <td>{row.product?.lowStockLimit}</td>
                <td className="danger-text">{row.shortfall} units</td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}
