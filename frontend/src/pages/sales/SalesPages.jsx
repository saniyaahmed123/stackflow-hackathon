import { useEffect, useRef, useState } from 'react';
import api, { apiError, formatDate, money, readList } from '../../api';
import { Amount, Badge, Empty, Field, Loading, Modal, PageHeader, Pagination, StatCard, Table, Toolbar, useToast } from '../../components/ui';

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
  const [products, warehouses, orders] = await Promise.all([
    api.get('/products'), api.get('/warehouses'), api.get('/orders'),
  ]);
  return {
    products: products.data.data,
    warehouses: warehouses.data.data,
    orders: orders.data.data,
  };
};

export function SalesOverview() {
  const { data, error } = useLoad(() => api.get('/dashboard/sales').then((response) => response.data.data), []);
  if (!data) return error ? <Empty message={error} /> : <Loading />;
  return (
    <>
      <PageHeader title="Sales overview" subtitle="Your order pipeline and sales value" />
      <div className="stat-grid">
        <StatCard to="/sales/orders" label="My orders" value={data.totalOrders || 0} />
        <StatCard label="Sales value" value={money(data.totalSalesValue || 0)} tone="success" />
        <StatCard label="Pending" value={data.ordersByStatus?.Pending || 0} tone="warn" />
        <StatCard label="Processing" value={data.ordersByStatus?.Processing || 0} tone="info" />
      </div>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>Orders by status</h2></div>
          <Table head={['Status', 'Count']} empty={!Object.keys(data.ordersByStatus || {}).length}>
            {Object.entries(data.ordersByStatus || {}).map(([status, count]) => (
              <tr key={status}>
                <td><Badge status={status} /></td>
                <td><strong>{count}</strong></td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Recent orders</h2></div>
          <Table head={['Order', 'Customer', 'Warehouse', 'Total', 'Status']} empty={!data.recentOrders?.length}>
            {(data.recentOrders || []).map((order) => (
              <tr key={order.id}>
                <td><strong>{order.orderNumber}</strong><small>{formatDate(order.at)}</small></td>
                <td>{order.customerName}</td>
                <td>{order.warehouseName || '-'}</td>
                <td><Amount value={order.totalAmount} /></td>
                <td><Badge status={order.status} /></td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}

function OrderForm({ products, warehouses, presetProduct, onClose, onDone }) {
  const toast = useToast();
  const firstAvailableProduct = products.find((product) => product._id === presetProduct && !product.archived)?._id
    || products.find((product) => !product.archived)?._id
    || '';
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?._id || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [lines, setLines] = useState([{ productId: firstAvailableProduct, quantity: 1 }]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [precheck, setPrecheck] = useState(null);
  const [precheckError, setPrecheckError] = useState('');
  const [checking, setChecking] = useState(false);
  const requestRef = useRef(0);

  const items = lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));
  const linesSignature = JSON.stringify(lines);
  const runPrecheck = async () => {
    const requestId = ++requestRef.current;
    if (!warehouseId || !items.length || items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      setPrecheck(null);
      setPrecheckError('');
      setChecking(false);
      return null;
    }

    setChecking(true);
    try {
      const response = await api.post('/orders/precheck', { warehouseId, items });
      const result = response.data.data;
      if (requestId === requestRef.current) {
        setPrecheck(result);
        setPrecheckError('');
      }
      return result;
    } catch (err) {
      const message = apiError(err);
      if (requestId === requestRef.current) {
        setPrecheck(null);
        setPrecheckError(message);
      }
      toast.error(message);
      return null;
    } finally {
      if (requestId === requestRef.current) setChecking(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { runPrecheck(); }, 300);
    return () => clearTimeout(timer);
  }, [warehouseId, linesSignature]);

  const lineError = (line) => {
    if (!line.productId) return 'Product is required.';
    const product = products.find((item) => item._id === line.productId);
    if (product?.archived) return 'This product is archived and unavailable.';
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return 'Quantity must be a whole number greater than 0.';
    return '';
  };

  const errors = lines.map(lineError);
  const hasLineErrors = errors.some(Boolean);
  const customerError = customerName.trim() ? '' : 'Customer name is required.';
  const precheckItemFor = (productId) => precheck?.items?.find((item) => String(item.productId) === String(productId));
  const hasShortfall = Boolean(precheck && !precheck.allFulfillable);
  const canSubmit = Boolean(
    warehouseId && !customerError && lines.length > 0 && !hasLineErrors &&
    !precheckError && !checking && precheck?.allFulfillable && !busy
  );

  const localTotal = lines.reduce((sum, line) => {
    const product = products.find((item) => item._id === line.productId);
    return sum + (product?.price || 0) * (Number(line.quantity) || 0);
  }, 0);
  const grandTotal = Number.isFinite(Number(precheck?.totalAmount)) ? Number(precheck.totalAmount) : localTotal;

  const updateLine = (index, patch) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const fresh = await runPrecheck();
      if (!fresh?.allFulfillable) {
        const messages = (fresh?.items || [])
          .filter((item) => !item.canFulfill)
          .map((item) => item.reason === 'Insufficient stock'
            ? `${item.productName || 'Product'}: short by ${item.shortfall}`
            : item.reason || `${item.productName || 'Product'} cannot be fulfilled`);
        toast.error(messages.join(' ') || precheckError || 'Resolve stock issues before creating the order.');
        return;
      }
      const response = await api.post('/orders', {
        customerName: customerName.trim(),
        customerPhone,
        warehouseId,
        items,
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
      <Field label="Warehouse" required hint={checking ? 'Checking stock...' : 'Stock and alternatives are checked by the server'}>
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
      {precheckError && <small className="field-error">{precheckError}</small>}
      <div className="line-items">
        <div className="line-head"><span>Product</span><span>Qty</span><span>Available</span><span /></div>
        {lines.map((line, index) => {
          const product = products.find((item) => item._id === line.productId);
          const check = precheckItemFor(line.productId);
          const available = check ? check.available : null;
          const shortfall = check ? check.shortfall : 0;
          const canFulfill = Boolean(check?.canFulfill);
          const shortfallMessage = check && !check.canFulfill
            ? check.reason === 'Insufficient stock'
              ? `Only ${check.available} available in ${precheck?.warehouse?.name || 'this warehouse'}; short by ${check.shortfall}.`
              : check.reason === 'Product is archived'
                ? 'Archived products cannot be ordered.'
                : check.reason
            : '';

          return (
            <div className="line-block" key={index}>
              <div className="line-row">
                <select required value={line.productId} onChange={(e) => updateLine(index, { productId: e.target.value })}>
                  <option value="">Select product</option>
                  {products.map((item) => (
                    <option key={item._id} value={item._id} disabled={item.archived}>
                      {item.name} — {money(item.price)}{item.archived ? ' (Archived - unavailable)' : ''}
                    </option>
                  ))}
                </select>
                <input required type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                <span>{available ?? '—'}</span>
                <button type="button" className="icon-btn" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))}>×</button>
              </div>
              <div className={`line-check ${canFulfill ? 'good' : (check ? 'bad' : '')}`}>
                {check ? (
                  <span className={`badge ${canFulfill ? 'success' : 'danger'}`}>
                    {canFulfill ? 'Can fulfill' : (shortfall ? `Short by ${shortfall}` : 'Unavailable')}
                  </span>
                ) : <span className="badge muted">Checking stock</span>}
                <span>Available: <strong>{available ?? '—'}</strong></span>
                <span>Shortfall: <strong className={shortfall ? 'danger-text' : ''}>{check ? shortfall : '—'}</strong></span>
                {product?.archived && <span className="danger-text">Archived</span>}
                {checking && <span className="muted">Updating...</span>}
              </div>
              {check?.alternatives?.length > 0 && (
                <div className="line-alt">
                  {check.alternatives.map((alternative, altIndex) => {
                    if (alternative.type === 'warehouse') {
                      return (
                        <button
                          type="button"
                          className="btn small"
                          key={`${alternative.type}-${altIndex}`}
                          onClick={() => setWarehouseId(alternative.warehouseId)}
                        >
                          Switch to {alternative.warehouseName} ({alternative.available} available)
                        </button>
                      );
                    }
                    if (alternative.type === 'maxQuantity') {
                      return (
                        <button
                          type="button"
                          className="btn small"
                          key={`${alternative.type}-${altIndex}`}
                          disabled={!alternative.maxQuantity}
                          onClick={() => updateLine(index, { quantity: String(alternative.maxQuantity) })}
                        >
                          {alternative.maxQuantity ? `Reduce to ${alternative.maxQuantity}` : 'No stock in this warehouse'}
                        </button>
                      );
                    }
                    return <span className="muted" key={`${alternative.type}-${altIndex}`}>{alternative.message}</span>;
                  })}
                </div>
              )}
              {(errors[index] || shortfallMessage) && <small className="line-error">{errors[index] || shortfallMessage}</small>}
            </div>
          );
        })}
        <button type="button" className="btn small" onClick={() => setLines([...lines, { productId: products.find((item) => !item.archived)?._id || '', quantity: 1 }])}>+ Add product</button>
      </div>
      <div className="total-row"><span>Grand total</span><strong>{money(grandTotal)}</strong></div>
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn primary" disabled={!canSubmit || !products.length || !warehouses.length}>
          {busy ? 'Creating...' : 'Create order'}
        </button>
      </div>
      {hasShortfall && <small className="field-error">Resolve the shortfalls above before creating this order.</small>}
    </form>
  );
}

export function SalesProducts() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const [products, orderProducts, warehouses] = await Promise.all([
      readList(api.get('/products', { params: { q: search, category, archived: 'false', available: availableOnly ? 'true' : '', page, limit: 20 } })),
      readList(api.get('/products', { params: { archived: 'false', limit: 100 } })),
      readList(api.get('/warehouses', { params: { limit: 100 } })),
    ]);
    return { products: products.items, pagination: products.pagination, orderProducts: orderProducts.items, warehouses: warehouses.items };
  }, [search, category, availableOnly, page]);
  const [detail, setDetail] = useState(null);
  const [orderFor, setOrderFor] = useState(null);
  const [availabilityWarehouseId, setAvailabilityWarehouseId] = useState('');
  const [availability, setAvailability] = useState([]);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    if (!detail?._id || !data) return undefined;
    let active = true;
    const loadDetail = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError('');
      try {
        const [productResponse, availabilityResponse] = await Promise.all([
          api.get(`/products/${detail._id}`),
          api.get(`/products/${detail._id}/availability`, {
            params: availabilityWarehouseId ? { warehouseId: availabilityWarehouseId } : {},
          }),
        ]);
        if (active) {
          setDetail(productResponse.data.data);
          setAvailability(availabilityResponse.data.data || []);
        }
      } catch (err) {
        if (active) {
          const message = apiError(err);
          setAvailabilityError(message);
          toast.error(message);
        }
      } finally {
        if (active) setAvailabilityLoading(false);
      }
    };
    loadDetail();
    return () => { active = false; };
  }, [detail?._id, availabilityWarehouseId, data]);

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const categories = [...new Set(data.products.map((product) => product.category))];
  const openDetail = (product) => {
    setDetail(product);
    setAvailability([]);
    setAvailabilityError('');
    setAvailabilityWarehouseId('');
  };

  return (
    <>
      <PageHeader title="Browse products" subtitle={`${data.pagination.total} products · search the catalog and check available stock`} />
      <Toolbar>
        <input className="search" placeholder="Search name, SKU or category..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={availableOnly} onChange={(e) => { setAvailableOnly(e.target.checked); setPage(1); }} /> In stock only</label>
      </Toolbar>
      <section className="panel">
        <Table head={['Product', 'SKU', 'Category', 'Price', 'Available', '']} empty={!data.products.length}>
          {data.products.map((product) => (
            <tr key={product._id}>
              <td>
                <div className="person"><img className="thumb" src={product.imageUrl} alt="" /><div><strong>{product.name}</strong><small>{product.description || '-'}</small></div></div>
                {product.archived && <Badge status="rejected">Archived</Badge>}
              </td>
              <td><span className="mono">{product.sku}</span></td>
              <td>{product.category}</td>
              <td><Amount value={product.price} /></td>
              <td><Badge status={product.availableStock > 0 && !product.archived ? 'ok' : 'low'}>{product.archived ? 'Unavailable' : product.availableStock}</Badge></td>
              <td className="row-actions">
                <button className="btn small" onClick={() => openDetail(product)}>Details</button>
                <button className="btn small primary" disabled={product.archived || !product.availableStock} onClick={() => setOrderFor(product._id)}>Order</button>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.name || 'Product details'}>
        {detail && (
          <>
            <div className="detail-grid">
              <div><small>SKU</small><strong>{detail.sku}</strong></div>
              <div><small>Category</small><strong>{detail.category}</strong></div>
              <div><small>Price</small><strong>{money(detail.price)}</strong></div>
              <div><small>Total available</small><strong>{detail.availableStock ?? 0}</strong></div>
              {detail.archived && <div className="grid-full"><strong className="danger-text">Archived — unavailable for orders</strong></div>}
              <div className="grid-full"><small>Description</small><p>{detail.description || 'No description provided.'}</p></div>
            </div>
            <div className="panel-head">
              <h2>Availability by warehouse</h2>
              <select value={availabilityWarehouseId} onChange={(e) => setAvailabilityWarehouseId(e.target.value)}>
                <option value="">All warehouses</option>
                {data.warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
              </select>
            </div>
            {availabilityError && <small className="field-error">{availabilityError}</small>}
            {availabilityLoading ? <Loading label="Loading availability..." /> : (
              <Table head={['Warehouse', 'Available', 'Space left']} empty={!availability.length}>
                {availability.map((row) => (
                  <tr key={row.warehouseId}>
                    <td>{row.warehouseName}</td>
                    <td><Badge status={row.availableQuantity > 0 ? 'ok' : 'low'}>{row.availableQuantity}</Badge></td>
                    <td>{row.remainingCapacity}</td>
                  </tr>
                ))}
              </Table>
            )}
          </>
        )}
      </Modal>
      <Modal open={Boolean(orderFor)} onClose={() => setOrderFor(null)} title="Create order" wide>
        <OrderForm products={data.orderProducts} warehouses={data.warehouses} presetProduct={orderFor}
          onClose={() => setOrderFor(null)} onDone={() => { setOrderFor(null); reload(); }} />
      </Modal>
    </>
  );
}

export function SalesOrders() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const [orders, catalog] = await Promise.all([
      readList(api.get('/orders', { params: { status, q, page, limit: 20 } })),
      loadCatalog(),
    ]);
    return { orders: orders.items, pagination: orders.pagination, products: catalog.products, warehouses: catalog.warehouses };
  }, [status, q, page]);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!data) return error ? <Empty message={error} /> : <Loading />;

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
      <PageHeader title="My orders" subtitle={`${data.pagination.total} orders · create orders and track their status`}
        action={<button className="btn primary" onClick={() => setCreating(true)}>+ New order</button>} />
      <Toolbar>
        <input className="search" placeholder="Search order, customer or phone..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['Pending', 'Processing', 'Completed', 'Cancelled'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="btn" onClick={reload}>Refresh</button>
      </Toolbar>
      <section className="panel">
        <Table head={['Order', 'Customer', 'Warehouse', 'Items', 'Total', 'Status', 'Created', '']} empty={!data.orders.length}>
          {data.orders.map((order) => (
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
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <Modal open={creating} onClose={() => setCreating(false)} title="Create order" wide>
        <OrderForm products={data.products} warehouses={data.warehouses}
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
          <button type="button" className="btn ghost" onClick={() => setCancelTarget(null)}>Keep order</button>
          <button type="button" className="btn danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling...' : 'Cancel order'}</button>
        </div>
      </Modal>
    </>
  );
}
