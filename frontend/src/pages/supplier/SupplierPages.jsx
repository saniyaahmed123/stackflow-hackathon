import { useEffect, useState } from 'react';
import api, { apiError, formatDate } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import ImageUpload from '../../components/ImageUpload';
import { Amount, Badge, Empty, Field, Loading, PageHeader, Table, useToast } from '../../components/ui';

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

export function SupplierProfile() {
  const { user, setProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, phone: user.phone || '', image: user.image || '', imageFileId: user.imageFileId || '' });
  }, [user]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put('/users/me', form);
      setProfile(data.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <Loading />;
  return (
    <>
      <PageHeader title="Supplier profile" subtitle="Update your contact details and logo" />
      <section className="panel narrow-panel">
        <form onSubmit={save} className="stack-form">
          <ImageUpload label="Company logo" value={form.image} fileId={form.imageFileId}
            onChange={({ url, fileId }) => setForm({ ...form, image: url, imageFileId: fileId })} />
          <Field label="Company name" required><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" required><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
        </form>
      </section>
    </>
  );
}

export function SupplierProducts() {
  const { data, error } = useLoad(() => api.get('/products').then((r) => r.data.data), []);
  return (
    <>
      <PageHeader title="My products" subtitle="Items you supply to the warehouses" />
      {!data ? (error ? <Empty message={error} /> : <Loading />) : (
        <section className="panel">
          <Table head={['Product', 'SKU', 'Category', 'Price', 'Total stock']} empty={!data.length}>
            {data.map((product) => (
              <tr key={product._id}>
                <td><div className="person"><img className="thumb" src={product.imageUrl} alt="" /><div><strong>{product.name}</strong><small>{product.description || '-'}</small></div></div></td>
                <td><span className="mono">{product.sku}</span></td>
                <td>{product.category}</td>
                <td><Amount value={product.price} /></td>
                <td>{product.availableStock}</td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}

const emptyRequest = { productId: '', warehouseId: '', quantity: 1, note: '' };

export function SupplierRequests() {
  const toast = useToast();
  const { data, error, reload } = useLoad(async () => {
    const [products, warehouses, requests] = await Promise.all([
      api.get('/products'), api.get('/warehouses'), api.get('/supply-requests'),
    ]);
    return { products: products.data.data, warehouses: warehouses.data.data, requests: requests.data.data };
  }, []);
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
      <PageHeader title="Supply requests" subtitle="Send stock to a warehouse and track approval" />
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
          <Table head={['Product', 'Warehouse', 'Qty', 'Status', 'Requested', 'Reviewed', 'Review note']} empty={!data.requests.length}>
            {data.requests.map((request) => (
              <tr key={request._id}>
                <td>{request.product?.name || '-'}</td>
                <td>{request.warehouse?.name || '-'}</td>
                <td>{request.quantity}</td>
                <td><Badge status={request.status} /></td>
                <td>{formatDate(request.createdAt)}</td>
                <td>{request.reviewedAt ? formatDate(request.reviewedAt) : '-'}</td>
                <td>{request.reviewNote || '-'}</td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}
