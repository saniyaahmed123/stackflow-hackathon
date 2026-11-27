import { useEffect, useState } from 'react';
import api, { apiError, formatDate } from '../../api';
import { Badge, Empty, Field, Loading, PageHeader, Table, Toolbar, useToast } from '../../components/ui';
import { AdminOverview, LowStockPage, AdminTransactions, ManagerProducts } from '../admin/AdminPages';

export const ManagerLowStock = () => <LowStockPage scope="manager" />;
export { AdminTransactions as ManagerTransactions, ManagerProducts };

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

const emptyMovement = { warehouseId: '', sourceWarehouseId: '', destinationWarehouseId: '', productId: '', quantity: 1, note: '' };

const noteWarehouse = (note) => String(note || '').replace(/^Transfer (?:to|from)\s+/i, '') || '-';

const groupMovements = (transactions = []) => {
  const groups = new Map();
  transactions.forEach((tx) => {
    if (tx.transferId) {
      const group = groups.get(tx.transferId) || {
        key: tx.transferId,
        transfer: true,
        date: tx.date,
        product: tx.product,
        quantity: Number(tx.quantity) || 0,
        source: '-',
        destination: '-',
      };
      if (tx.transferDirection === 'out') {
        group.source = tx.warehouse?.name || noteWarehouse(tx.note);
        group.date = tx.date;
      } else {
        group.destination = tx.warehouse?.name || noteWarehouse(tx.note);
      }
      groups.set(tx.transferId, group);
    } else {
      groups.set(tx._id, {
        key: tx._id,
        transfer: false,
        date: tx.date,
        product: tx.product,
        quantity: tx.quantity,
        warehouse: tx.warehouse?.name || '-',
        status: tx.transactionType,
      });
    }
  });
  return [...groups.values()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);
};

export function ManagerOverview() {
  return <AdminOverview manager />;
}

export function ManagerInventory() {
  const { data, error, reload } = useLoad(() => api.get('/stock').then((r) => r.data.data), []);
  const [warehouse, setWarehouse] = useState('');
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const warehouses = [
    ...new Map(
      data
        .filter((row) => row.warehouse?._id)
        .map((row) => [row.warehouse._id, row.warehouse]),
    ).values(),
  ];
  const rows = data.filter((row) =>
    (!warehouse || row.warehouse?._id === warehouse) &&
    (!outOfStockOnly || row.quantity === 0)
  );
  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock levels across your warehouses" action={<button className="btn" onClick={reload}>Refresh</button>} />
      <Toolbar>
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={outOfStockOnly} onChange={(e) => setOutOfStockOnly(e.target.checked)} /> Out of stock only</label>
      </Toolbar>
      <section className="panel">
        <Table head={['Product', 'Barcode / SKU', 'Warehouse', 'Quantity', 'Status']} empty={!rows.length}>
          {rows.map((row) => (
            <tr key={row._id}>
              <td><div className="person"><img className="thumb" src={row.product?.imageUrl} alt="" /><strong>{row.product?.name}</strong></div></td>
              <td><span className="mono">{row.product?.sku}</span></td>
              <td>{row.warehouse?.name}</td>
              <td><strong>{row.quantity}</strong></td>
              <td>
                {row.quantity === 0
                  ? <span className="badge danger">Out of stock</span>
                  : <Badge status={row.isLow ? 'low' : 'ok'}>{row.isLow ? 'Low stock' : 'Healthy'}</Badge>}
              </td>
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
    const [warehouses, products, transactions, stock] = await Promise.all([
      api.get('/warehouses'), api.get('/products'), api.get('/transactions?limit=20'), api.get('/stock'),
    ]);
    return {
      warehouses: warehouses.data.data,
      products: products.data.data,
      transactions: transactions.data.data,
      stock: stock.data.data,
    };
  }, []);
  const [type, setType] = useState('stock-in');
  const [form, setForm] = useState(emptyMovement);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [touched, setTouched] = useState(false);

  const quantityError = Number.isInteger(Number(form.quantity)) && Number(form.quantity) > 0
    ? '' : 'Quantity must be a whole number greater than 0.';
  const sourceId = type === 'transfer' ? form.sourceWarehouseId : form.warehouseId;
  const destinationError = type === 'transfer' && form.destinationWarehouseId
    && form.sourceWarehouseId === form.destinationWarehouseId.trim()
    ? 'Source and destination warehouses must be different.'
    : '';
  const transferStockRows = type === 'transfer' && sourceId
    ? [...new Map(data?.stock
      .filter((row) => row.warehouse?._id === sourceId && row.quantity > 0)
      .map((row) => [row.product?._id, row])).values()].map((row) => row.product).filter(Boolean)
    : [];
  const productOptions = type === 'transfer' ? transferStockRows : (data?.products || []);
  const assignedIds = new Set((data?.warehouses || []).map((warehouse) => String(warehouse._id)));
  const externalWarehouses = [...new Set((data?.transactions || [])
    .map((tx) => String(tx.counterpartyWarehouse || ''))
    .filter((id) => id && !assignedIds.has(id)))]
    .map((id) => ({ _id: id, name: `Warehouse ${id.slice(-6)}` }));
  const destinationOptions = [...(data?.warehouses || []), ...externalWarehouses];
  const canSubmit = Boolean(sourceId) && Boolean(form.productId)
    && (type !== 'transfer' || Boolean(form.destinationWarehouseId.trim()))
    && !quantityError && !destinationError && !busy;

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  const changeType = (value) => {
    setType(value);
    setForm(emptyMovement);
    setTouched(false);
    setResult(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const payload = type === 'transfer'
        ? {
          productId: form.productId,
          sourceWarehouseId: form.sourceWarehouseId,
          destinationWarehouseId: form.destinationWarehouseId.trim(),
          quantity: Number(form.quantity),
          note: form.note,
        }
        : { ...form, quantity: Number(form.quantity) };
      const url = type === 'transfer' ? '/stock/transfer' : `/stock/${type === 'stock-in' ? 'in' : 'out'}`;
      const response = await api.post(url, payload);
      setResult(response.data.data);
      toast.success(response.data.message);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const movements = groupMovements(data.transactions);

  return (
    <div className="manager-stock-page">
      <PageHeader title="Stock in / out" subtitle="Adjust inventory and transfer stock between warehouses" />
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>New movement</h2></div>
          <form onSubmit={submit} className="stack-form">
            <div className="segmented">
              <button type="button" className={type === 'stock-in' ? 'active' : ''} onClick={() => changeType('stock-in')}>Stock in</button>
              <button type="button" className={type === 'stock-out' ? 'active' : ''} onClick={() => changeType('stock-out')}>Stock out</button>
              <button type="button" className={type === 'transfer' ? 'active' : ''} onClick={() => changeType('transfer')}>Transfer</button>
            </div>
            <Field label={type === 'transfer' ? 'Source warehouse' : 'Warehouse'} required>
              <select required value={sourceId} onChange={(e) => setForm({ ...form, [type === 'transfer' ? 'sourceWarehouseId' : 'warehouseId']: e.target.value, productId: '' })}>
                <option value="">Select warehouse</option>
                {data.warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
              </select>
              {touched && !sourceId && <small className="field-error">Warehouse is required.</small>}
            </Field>
            {type === 'transfer' && (
              <Field label="Destination warehouse ID" required hint="Any existing warehouse ID; known warehouses are suggested">
                <input required list="destination-warehouses" value={form.destinationWarehouseId} onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })} placeholder="Paste warehouse ID" />
                <datalist id="destination-warehouses">
                  {destinationOptions.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
                </datalist>
                {touched && !form.destinationWarehouseId.trim() && <small className="field-error">Destination warehouse ID is required.</small>}
                {touched && destinationError && <small className="field-error">{destinationError}</small>}
              </Field>
            )}
            <Field label="Product" required>
              <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Select product</option>
                {productOptions.map((product) => <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>)}
              </select>
              {type === 'transfer' && sourceId && !productOptions.length && <small className="field-error">No transferable stock in the source warehouse.</small>}
              {touched && !form.productId && <small className="field-error">Product is required.</small>}
            </Field>
            <Field label="Quantity" required>
              <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              {touched && quantityError && <small className="field-error">{quantityError}</small>}
            </Field>
            <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={type === 'transfer' ? 'e.g. Warehouse rebalancing' : 'e.g. New shipment'} /></Field>
            <button type="submit" className="btn primary" disabled={!canSubmit}>
              {busy ? 'Saving...' : type === 'transfer' ? 'Transfer stock' : `Record ${type === 'stock-in' ? 'stock in' : 'stock out'}`}
            </button>
            {result && type !== 'transfer' && <div className="result-box">Updated stock quantity: <strong>{result.quantity}</strong></div>}
            {result && type === 'transfer' && (
              <div className="result-box">
                Transferred <strong>{result.quantity}</strong> from {result.sourceWarehouse.name} to {result.destinationWarehouse.name}. Source stock now {result.sourceStock.quantity}.
              </div>
            )}
          </form>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Latest transactions</h2></div>
          <Table head={['Date', 'Product', 'Movement', 'Route', 'Qty']} empty={!movements.length}>
            {movements.map((movement) => (
              <tr key={movement.key}>
                <td>{formatDate(movement.date)}</td>
                <td>{movement.product?.name || '-'}<small>{movement.product?.sku}</small></td>
                <td>{movement.transfer ? <Badge status="transfer">Transfer</Badge> : <Badge status={movement.status} />}</td>
                <td>{movement.transfer ? `${movement.source} → ${movement.destination}` : movement.warehouse}</td>
                <td>{movement.quantity}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </div>
  );
}
