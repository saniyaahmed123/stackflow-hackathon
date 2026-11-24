import { useEffect, useState } from 'react';
import api, { apiError, formatDate, money } from '../../api';
import { Amount, Badge, Empty, Field, Loading, Modal, PageHeader, StatCard, Table, Toolbar, useToast } from '../../components/ui';

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
  return { data, error, reload };
};

const loadCatalog = async () => {
  const [products, warehouses, orders, stock] = await Promise.all([
    api.get('/products'), api.get('/warehouses'), api.get('/orders'), api.get('/stock'),
  ]);
  return {
    products: products.data.data,
    warehouses: warehouses.data.data,
    orders: orders.data.data,
    stock: stock.data.data,
  };
};

export function SalesOverview() {
  const { data, error } = useLoad(loadCatalog, []);
  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const revenue = data.orders.filter((order) => order.status !== 'Cancelled').reduce((sum, order) => sum + order.totalAmount, 0);
  return (
    <>
      <PageHeader title="Sales overview" subtitle="Products on hand and your order pipeline" />
      <div className="stat-grid">
        <StatCard label="Products available" value={data.products.filter((p) => p.availableStock > 0).length} />
        <StatCard label="My orders" value={data.orders.length} tone="info" />
        <StatCard label="Pending" value={data.orders.filter((o) => o.status === 'Pending').length} tone="warn" />
        <StatCard label="Order value" value={money(revenue)} tone="success" />
      </div>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>In-stock products</h2></div>
          <Table head={['Product', 'Price', 'Available']} empty={!data.products.length}>
            {data.products.slice(0, 6).map((product) => (
              <tr key={product._id}>
                <td>{product.name}<small>{product.sku}</small></td>
                <td><Amount value={product.price} /></td>
                <td><Badge status={product.availableStock ? 'ok' : 'low'}>{product.availableStock}</Badge></td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Recent orders</h2></div>
          <Table head={['Order', 'Customer', 'Status']} empty={!data.orders.length}>
            {data.orders.slice(0, 6).map((order) => (
              <tr key={order._id}>
                <td><strong>{order.orderNumber}</strong><small>{formatDate(order.createdAt)}</small></td>
                <td>{order.customerName}</td>
                <td><Badge status={order.status} /></td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}

function OrderForm({ products, warehouses, stock, presetProduct, onClose, onDone }) {
  const toast = useToast();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?._id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [lines, setLines] = useState([{ productId: presetProduct || products[0]?._id || '', quantity: 1 }]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const warehouse = warehouses.find((item) => item._id === warehouseId);
  const availableFor = (productId) =>
    stock.find((row) => row.product?._id === productId && row.warehouse?._id === warehouseId)?.quantity || 0;

  const lineError = (line) => {
    if (!line.productId) return 'Product is required.';
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return 'Quantity must be a whole number greater than 0.';
    const available = availableFor(line.productId);
    if (quantity > available) {
      const name = products.find((item) => item._id === line.productId)?.name || 'this product';
      return `Only ${available} units of ${name} are available in ${warehouse?.name || 'this warehouse'}, but you requested ${quantity}.`;
    }
    return '';
  };

  const errors = lines.map(lineError);
  const hasLineErrors = errors.some(Boolean);
  const customerError = customerName.trim() ? '' : 'Customer name is required.';
  const canSubmit = Boolean(warehouseId) && !customerError && lines.length > 0 && !hasLineErrors && !busy;

  const total = lines.reduce((sum, line) => {
    const product = products.find((item) => item._id === line.productId);
    return sum + (product?.price || 0) * (Number(line.quantity) || 0);
  }, 0);

  const updateLine = (index, patch) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const response = await api.post('/orders', {
        customerName: customerName.trim(),
        customerPhone,
        warehouseId,
        items: lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) })),
      });
      toast.success(`Order ${response.data.data.orderNumber} created`);
      onDone();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack-form">
      <Field label="Warehouse" required hint="Available stock is checked in this warehouse only">
        <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">Select warehouse</option>
          {warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        {touched && !warehouseId && <small className="field-error">Warehouse is required.</small>}
      </Field>
      <Field label="Customer name" required>
        <input required value={customerName} onBlur={() => setTouched(true)} onChange={(e) => setCustomerName(e.target.value)} />
        {touched && customerError && <small className="field-error">{customerError}</small>}
      </Field>
      <Field label="Customer phone"><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></Field>
      <div className="line-items">
        <div className="line-head"><span>Product</span><span>Qty</span><span>Available</span><span /></div>
        {lines.map((line, index) => (
          <div className="line-block" key={index}>
            <div className="line-row">
              <select required value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value })}>
                {products.map((product) => <option key={product._id} value={product._id}>{product.name} — {money(product.price)}</option>)}
              </select>
              <input required type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
              <span>{availableFor(line.productId)}</span>
              <button type="button" className="icon-btn" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))}>×</button>
            </div>
            {errors[index] && <small className="line-error">{errors[index]}</small>}
          </div>
        ))}
        <button type="button" className="btn small" onClick={() => setLines([...lines, { productId: products[0]?._id || '', quantity: 1 }])}>+ Add product</button>
      </div>
      <div className="total-row"><span>Estimated total</span><strong>{money(total)}</strong></div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn primary" disabled={!canSubmit || !products.length || !warehouses.length}>
          {busy ? 'Creating...' : 'Create order'}
        </button>
      </div>
    </form>
  );
}

export function SalesProducts() {
  const { data, error, reload } = useLoad(loadCatalog, []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [detail, setDetail] = useState(null);
  const [orderFor, setOrderFor] = useState(null);

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const categories = [...new Set(data.products.map((product) => product.category))];
  const rows = data.products.filter((product) =>
    (!search || `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase())) &&
    (!category || product.category === category) &&
    (!availableOnly || product.availableStock > 0)
  );
  const openDetail = async (product) => {
    try {
      const response = await api.get(`/products/${product._id}`);
      setDetail(response.data.data);
    } catch (err) {
      setDetail(product);
    }
  };

  return (
    <>
      <PageHeader title="Browse products" subtitle="Search the catalog and check available stock" />
      <Toolbar>
        <input className="search" placeholder="Search name, SKU or category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> In stock only</label>
      </Toolbar>
      <section className="panel">
        <Table head={['Product', 'SKU', 'Category', 'Price', 'Available', '']} empty={!rows.length}>
          {rows.map((product) => (
            <tr key={product._id}>
              <td><div className="person"><img className="thumb" src={product.imageUrl} alt="" /><div><strong>{product.name}</strong><small>{product.description || '-'}</small></div></div></td>
              <td><span className="mono">{product.sku}</span></td>
              <td>{product.category}</td>
              <td><Amount value={product.price} /></td>
              <td><Badge status={product.availableStock > 0 ? 'ok' : 'low'}>{product.availableStock}</Badge></td>
              <td className="row-actions">
                <button className="btn small" onClick={() => openDetail(product)}>Details</button>
                <button className="btn small primary" disabled={!product.availableStock} onClick={() => setOrderFor(product._id)}>Order</button>
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name || 'Product details'}>
        {detail && (
          <div className="detail-grid">
            <div><small>SKU</small><strong>{detail.sku}</strong></div>
            <div><small>Category</small><strong>{detail.category}</strong></div>
            <div><small>Price</small><strong>{money(detail.price)}</strong></div>
            <div><small>Total available</small><strong>{detail.availableStock ?? detail.stocks?.reduce((s, row) => s + row.quantity, 0)}</strong></div>
            <div className="grid-full"><small>Description</small><p>{detail.description || 'No description provided.'}</p></div>
            <div className="grid-full">
              <small>Stock by warehouse</small>
              <Table head={['Warehouse', 'Quantity']} empty={!detail.stocks?.length}>
                {detail.stocks?.map((row) => <tr key={row._id}><td>{row.warehouse?.name}</td><td>{row.quantity}</td></tr>)}
              </Table>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={Boolean(orderFor)} onClose={() => setOrderFor(null)} title="Create order" wide>
        <OrderForm products={data.products} warehouses={data.warehouses} stock={data.stock} presetProduct={orderFor}
          onClose={() => setOrderFor(null)} onDone={() => { setOrderFor(null); reload(); }} />
      </Modal>
    </>
  );
}

export function SalesOrders() {
  const toast = useToast();
  const { data, error, reload } = useLoad(loadCatalog, []);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const rows = data.orders.filter((order) => !status || order.status === status);

  const cancel = async () => {
    setBusy(true);
    try {
      await api.put(`/orders/${cancelTarget._id}/cancel`);
      toast.success('Order cancelled');
      setCancelTarget(null);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My orders" subtitle="Create orders and track their status"
        action={<button className="btn primary" onClick={() => setCreating(true)}>+ New order</button>} />
      <Toolbar>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'Processing', 'Completed', 'Cancelled'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="btn" onClick={reload}>Refresh</button>
      </Toolbar>
      <section className="panel">
        <Table head={['Order', 'Customer', 'Warehouse', 'Items', 'Total', 'Status', 'Created', '']} empty={!rows.length}>
          {rows.map((order) => (
            <tr key={order._id}>
              <td><strong>{order.orderNumber}</strong></td>
              <td>{order.customerName}</td>
              <td>{order.warehouse?.name || '-'}</td>
              <td>{order.products.length}</td>
              <td><Amount value={order.totalAmount} /></td>
              <td><Badge status={order.status} /></td>
              <td>{formatDate(order.createdAt)}</td>
              <td className="row-actions">
                <button className="btn small" onClick={() => setSelected(order)}>Details</button>
                {order.status === 'Pending' && <button className="btn small danger-ghost" onClick={() => setCancelTarget(order)}>Cancel</button>}
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <Modal open={creating} onClose={() => setCreating(false)} title="Create order" wide>
        <OrderForm products={data.products} warehouses={data.warehouses} stock={data.stock}
          onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />
      </Modal>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.orderNumber || 'Order details'}>
        {selected && (
          <>
            <div className="detail-grid">
              <div><small>Customer</small><strong>{selected.customerName}</strong><span>{selected.customerPhone}</span></div>
              <div><small>Warehouse</small><strong>{selected.warehouse?.name || '-'}</strong><span>{selected.warehouse?.location || ''}</span></div>
              <div><small>Status</small><Badge status={selected.status} /></div>
              <div><small>Created</small><strong>{formatDate(selected.createdAt)}</strong></div>
            </div>
            <Table head={['Product', 'Qty', 'Price']} empty={!selected.products.length}>
              {selected.products.map((line, index) => (
                <tr key={line.product?._id || index}>
                  <td>{line.product?.name || 'Deleted product'}</td><td>{line.quantity}</td><td>{money(line.price)}</td>
                </tr>
              ))}
            </Table>
            <div className="total-row"><span>Total</span><strong>{money(selected.totalAmount)}</strong></div>
          </>
        )}
      </Modal>
      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel order">
        <p className="muted">Cancel order {cancelTarget?.orderNumber}? This cannot be undone.</p>
        <div className="form-actions">
          <button className="btn ghost" onClick={() => setCancelTarget(null)}>Keep order</button>
          <button className="btn danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling...' : 'Cancel order'}</button>
        </div>
      </Modal>
    </>
  );
}
