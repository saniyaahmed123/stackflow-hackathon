import { useEffect, useState } from 'react';
import api, { apiError, formatDate, readList } from '../../api';
import { Amount, Badge, Empty, Field, Loading, PageHeader, Pagination, StatCard, Table, Toolbar, useToast } from '../../components/ui';

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

export function SupplierOverview() {
  const { data, error } = useLoad(async () => {
    const [summary, rejected] = await Promise.all([
      api.get('/dashboard/supplier'),
      readList(api.get('/supply-requests', { params: { status: 'Rejected', limit: 5 } })),
    ]);
    return { ...summary.data.data, rejectedRequests: rejected.items };
  }, []);
  if (!data) return error ? <Empty message={error} /> : <Loading />;
  return (
    <>
      <PageHeader title="Supplier overview" subtitle="Your catalog and supply request pipeline" />
      <div className="stat-grid">
        <StatCard to="/supplier/products" label="My products" value={data.productCount || 0} />
        <StatCard label="Pending requests" value={data.supplyRequestsByStatus?.Pending || 0} tone="warn" />
        <StatCard label="Approved" value={data.supplyRequestsByStatus?.Approved || 0} tone="success" />
        <StatCard label="Rejected" value={data.supplyRequestsByStatus?.Rejected || 0} tone="danger" />
      </div>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>My products</h2></div>
          <Table head={['Product', 'SKU', 'Price', 'Total stock', 'Status']} empty={!data.products?.length}>
            {(data.products || []).slice(0, 6).map((product) => (
              <tr key={product.id}>
                <td><strong>{product.name}</strong></td>
                <td><span className="mono">{product.sku}</span></td>
                <td><Amount value={product.price} /></td>
                <td>{product.totalStock.toLocaleString()}</td>
                <td><span className={`badge ${product.archived ? 'danger' : 'success'}`}>{product.archived ? 'Archived' : 'Active'}</span></td>
              </tr>
            ))}
          </Table>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Recent requests</h2></div>
          <Table head={['Product', 'Warehouse', 'Qty', 'Status', 'When']} empty={!data.recentRequests?.length}>
            {(data.recentRequests || []).map((request) => (
              <tr key={request.id}>
                <td><strong>{request.productName}</strong><small>{request.sku}</small></td>
                <td>{request.warehouseName || '-'}</td>
                <td>{request.quantity}</td>
                <td><Badge status={request.status} /></td>
                <td>{formatDate(request.at)}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Rejection reasons</h2><span className="muted">Latest feedback from administrators</span></div>
        <Table head={['Product', 'Warehouse', 'Qty', 'Rejected', 'Reason']} empty={!data.rejectedRequests?.length}>
          {(data.rejectedRequests || []).map((request) => (
            <tr key={request._id}>
              <td><strong>{request.product?.name || '-'}</strong><small>{request.product?.sku}</small></td>
              <td>{request.warehouse?.name || '-'}</td>
              <td>{request.quantity}</td>
              <td>{formatDate(request.reviewedAt || request.updatedAt)}</td>
              <td>{request.reviewNote || 'No reason provided'}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

export function SupplierProducts() {
  const [archived, setArchived] = useState('');
  const [page, setPage] = useState(1);
  const { data, error } = useLoad(
    () => readList(api.get('/products', { params: { archived, page, limit: 20 } })),
    [archived, page]
  );
  return (
    <>
      <PageHeader title="My products" subtitle={data ? `${data.pagination.total} items you supply to the warehouses` : 'Items you supply to the warehouses'} />
      <Toolbar>
        <select value={archived} onChange={(e) => { setArchived(e.target.value); setPage(1); }}>
          <option value="">All products</option>
          <option value="false">Active only</option>
          <option value="true">Archived only</option>
        </select>
      </Toolbar>
      {!data ? (error ? <Empty message={error} /> : <Loading />) : (
        <section className="panel">
          <Table head={['Product', 'SKU', 'Category', 'Price', 'Total stock', 'Status']} empty={!data.items.length}>
            {data.items.map((product) => (
              <tr key={product._id}>
                <td><div className="person"><img className="thumb" src={product.imageUrl} alt="" /><div><strong>{product.name}</strong><small>{product.description || '-'}</small></div></div></td>
                <td><span className="mono">{product.sku}</span></td>
                <td>{product.category}</td>
                <td><Amount value={product.price} /></td>
                <td>{product.availableStock}</td>
                <td><span className={`badge ${product.archived ? 'danger' : 'success'}`}>{product.archived ? 'Archived' : 'Active'}</span></td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </section>
      )}
    </>
  );
}

const emptyRequest = { productId: '', warehouseId: '', quantity: 1, note: '' };

export function SupplierRequests() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const [products, warehouses, requests] = await Promise.all([
      readList(api.get('/products', { params: { archived: 'false', limit: 100 } })),
      readList(api.get('/warehouses', { params: { limit: 100 } })),
      readList(api.get('/supply-requests', { params: { status, q, page, limit: 20 } })),
    ]);
    return {
      products: products.items,
      warehouses: warehouses.items,
      requests: requests.items,
      pagination: requests.pagination,
    };
  }, [status, q, page]);
  const [form, setForm] = useState(emptyRequest);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const quantityError = Number.isInteger(Number(form.quantity)) && Number(form.quantity) > 0
    ? '' : 'Quantity must be a whole number greater than 0.';
  const canSubmit = Boolean(form.productId) && Boolean(form.warehouseId) && !quantityError && !busy;

  if (!data) return error ? <Empty message={error} /> : <Loading />;

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    try {
      await api.post('/supply-requests', form);
      toast.success('Supply request submitted');
      setForm(emptyRequest);
      reload();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Supply requests" subtitle={data ? `${data.pagination.total} requests · send stock to a warehouse and track approval` : 'Send stock to a warehouse and track approval'} />
      <Toolbar>
        <input className="search" placeholder="Search product or notes..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </Toolbar>
      <div className="panel-grid">
        <section className="panel">
          <div className="panel-head"><h2>New request</h2></div>
          <form onSubmit={submit} className="stack-form">
            <Field label="Product" required>
              <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">Select your product</option>
                {data.products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
              </select>
              {touched && !form.productId && <small className="field-error">Product is required.</small>}
            </Field>
            <Field label="Warehouse" required>
              <select required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <option value="">Select warehouse</option>
                {data.warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
              </select>
              {touched && !form.warehouseId && <small className="field-error">Warehouse is required.</small>}
            </Field>
            <Field label="Quantity" required>
              <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              {touched && quantityError && <small className="field-error">{quantityError}</small>}
            </Field>
            <Field label="Note"><textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <button type="submit" className="btn primary" disabled={!canSubmit}>{busy ? 'Submitting...' : 'Submit request'}</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Request history</h2></div>
          <Table head={['Product', 'Warehouse', 'Qty', 'Status', 'Requested', 'Reviewed', 'Rejection reason']} empty={!data.requests.length}>
            {data.requests.map((request) => (
              <tr key={request._id}>
                <td>{request.product?.name || '-'}</td>
                <td>{request.warehouse?.name || '-'}</td>
                <td>{request.quantity}</td>
                <td><Badge status={request.status} /></td>
                <td>{formatDate(request.createdAt)}</td>
                <td>{request.reviewedAt ? formatDate(request.reviewedAt) : '-'}</td>
                <td>{request.status === 'Rejected' ? (request.reviewNote || 'No reason provided') : '-'}</td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </section>
      </div>
    </>
  );
}
