import { useEffect, useState } from 'react';
import api, { apiError, formatDate } from '../../api';
import { Badge, Empty, Field, Loading, PageHeader, StatCard, Table, Toolbar, useToast } from '../../components/ui';
import { AdminLowStock, AdminTransactions } from '../admin/AdminPages';

export { AdminLowStock as ManagerLowStock, AdminTransactions as ManagerTransactions };

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

const loadOverview = async () => {
  const [warehouses, stock, low, transactions] = await Promise.all([
    api.get('/warehouses'), api.get('/stock'), api.get('/stock/low'), api.get('/transactions?limit=8'),
  ]);
  return {
    warehouses: warehouses.data.data,
    stock: stock.data.data,
    low: low.data.data,
    transactions: transactions.data.data,
  };
};

export function ManagerOverview() {
  const { data, error } = useLoad(loadOverview, []);
  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const units = data.stock.reduce((sum, row) => sum + row.quantity, 0);
  return (
    <>
      <PageHeader title="Warehouse overview" subtitle="Your assigned locations and inventory health" />
      <div className="stat-grid">
        <StatCard label="Assigned warehouses" value={data.warehouses.length} />
        <StatCard label="Stock records" value={data.stock.length} tone="info" />
        <StatCard label="Total units" value={units.toLocaleString()} tone="success" />
        <StatCard label="Low stock alerts" value={data.low.length} tone="danger" />
      </div>
      <div className="warehouse-cards">
        {data.warehouses.map((warehouse) => (
          <div className="warehouse-card" key={warehouse._id}>
            <span className="warehouse-icon">W</span>
            <div><strong>{warehouse.name}</strong><small>{warehouse.location}</small></div>
            <span className="muted">Capacity: {warehouse.capacity.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>Low stock</h2></div>
          <Table head={['Product', 'Warehouse', 'Qty / Limit']} empty={!data.low.length}>
            {data.low.slice(0, 6).map((row) => (
              <tr key={row._id}>
                <td>{row.product?.name}</td><td>{row.warehouse?.name}</td>
                <td><Badge status="low">{row.quantity}</Badge> / {row.product?.lowStockLimit}</td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Recent movements</h2></div>
          <Table head={['Product', 'Type', 'Qty']} empty={!data.transactions.length}>
            {data.transactions.slice(0, 6).map((tx) => (
              <tr key={tx._id}>
                <td>{tx.product?.name}<small>{formatDate(tx.date)}</small></td>
                <td><Badge status={tx.transactionType} /></td>
                <td>{tx.quantity}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}

export function ManagerInventory() {
  const { data, error, reload } = useLoad(() => api.get('/stock').then((r) => r.data.data), []);
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('');
  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const warehouses = [...new Map(data.map((row) => [row.warehouse?._id, row.warehouse])).filter(([id]) => id).values()];
  const rows = data.filter((row) =>
    (!search || `${row.product?.name} ${row.product?.sku}`.toLowerCase().includes(search.toLowerCase())) &&
    (!warehouse || row.warehouse?._id === warehouse)
  );
  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock levels across your warehouses" action={<button className="btn" onClick={reload}>Refresh</button>} />
      <Toolbar>
        <input className="search" placeholder="Search product or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
      </Toolbar>
      <section className="panel">
        <Table head={['Product', 'SKU', 'Warehouse', 'Quantity', 'Status']} empty={!rows.length}>
          {rows.map((row) => (
            <tr key={row._id}>
              <td><div className="person"><img className="thumb" src={row.product?.imageUrl} alt="" /><strong>{row.product?.name}</strong></div></td>
              <td><span className="mono">{row.product?.sku}</span></td>
              <td>{row.warehouse?.name}</td>
              <td><strong>{row.quantity}</strong></td>
              <td><Badge status={row.isLow ? 'low' : 'ok'}>{row.isLow ? 'Low stock' : 'Healthy'}</Badge></td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

export function ManagerStockMovement() {
  const toast = useToast();
  const { data, error, reload } = useLoad(async () => {
    const [warehouses, products, transactions] = await Promise.all([
      api.get('/warehouses'), api.get('/products'), api.get('/transactions?limit=8'),
    ]);
    return { warehouses: warehouses.data.data, products: products.data.data, transactions: transactions.data.data };
  }, []);
  const [type, setType] = useState('stock-in');
  const [form, setForm] = useState({ warehouseId: '', productId: '', quantity: 1, note: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const response = await api.post(`/stock/${type === 'stock-in' ? 'in' : 'out'}`, form);
      setResult(response.data.data.stock);
      toast.success(response.data.message);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Stock in / out" subtitle="Adjust inventory in your assigned warehouses" />
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>New movement</h2></div>
          <form onSubmit={submit} className="stack-form">
            <div className="segmented">
              <button type="button" className={type === 'stock-in' ? 'active' : ''} onClick={() => setType('stock-in')}>Stock in</button>
              <button type="button" className={type === 'stock-out' ? 'active' : ''} onClick={() => setType('stock-out')}>Stock out</button>
            </div>
            <Field label="Warehouse" required>
              <select required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">Select warehouse</option>
                {data.warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
              </select>
            </Field>
            <Field label="Product" required>
              <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Select product</option>
                {data.products.map((product) => <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>)}
              </select>
            </Field>
            <Field label="Quantity" required><input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. New shipment" /></Field>
            <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving...' : `Record ${type === 'stock-in' ? 'stock in' : 'stock out'}`}</button>
            {result && <div className="result-box">Updated stock quantity: <strong>{result.quantity}</strong></div>}
          </form>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Latest transactions</h2></div>
          <Table head={['Date', 'Product', 'Type', 'Qty']} empty={!data.transactions.length}>
            {data.transactions.slice(0, 8).map((tx) => (
              <tr key={tx._id}>
                <td>{formatDate(tx.date)}</td>
                <td>{tx.product?.name}<small>{tx.warehouse?.name}</small></td>
                <td><Badge status={tx.transactionType} /></td>
                <td>{tx.quantity}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}
