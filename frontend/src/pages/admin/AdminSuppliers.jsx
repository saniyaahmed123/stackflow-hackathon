import { useEffect, useState } from 'react';
import api, { apiError, formatDate } from '../../api';
import { Amount, Badge, Empty, Loading, Modal, PageHeader, Table, Toolbar } from '../../components/ui';
import { UserModal } from './AdminPages';

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

export default function AdminSuppliers() {
  const { data, error, reload } = useLoad(async () => {
    const [suppliers, warehouses] = await Promise.all([
      api.get('/users/suppliers/summary'),
      api.get('/warehouses'),
    ]);
    return { suppliers: suppliers.data.data, warehouses: warehouses.data.data };
  }, []);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const rows = data.suppliers.filter((supplier) =>
    !search || `${supplier.name} ${supplier.email}`.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (supplier) => {
    setEditing(supplier);
    setEditOpen(true);
  };

  const onSaved = () => {
    setEditOpen(false);
    setSelected(null);
    reload();
  };

  return (
    <>
      <PageHeader title="Suppliers" subtitle={`${data.suppliers.length} registered suppliers`} />
      <Toolbar>
        <input className="search" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </Toolbar>
      <section className="panel">
        <Table head={['Supplier', 'Email', 'Phone', 'Products', 'Total requests', 'Pending', 'Actions']} empty={!rows.length}>
          {rows.map((supplier) => (
            <tr key={supplier._id} className="clickable-row" onClick={() => setSelected(supplier)}>
              <td>
                <div className="person">
                  {supplier.image
                    ? <img className="thumb" src={supplier.image} alt="" />
                    : <span className="avatar">{(supplier.name || '?')[0]}</span>}
                  <strong>{supplier.name}</strong>
                </div>
              </td>
              <td>{supplier.email}</td>
              <td>{supplier.phone || '-'}</td>
              <td>{supplier.productCount}</td>
              <td>{supplier.totalRequests}</td>
              <td><span className={`badge ${supplier.pendingRequests ? 'warn' : 'success'}`}>{supplier.pendingRequests}</span></td>
              <td className="row-actions">
                <button type="button" className="btn small" onClick={(event) => { event.stopPropagation(); setSelected(supplier); }}>Details</button>
                <button type="button" className="btn small" onClick={(event) => { event.stopPropagation(); openEdit(supplier); }}>Edit</button>
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'Supplier'} wide>
        {selected && (
          <>
            <div className="detail-grid">
              <div><small>Email</small><strong>{selected.email}</strong></div>
              <div><small>Phone</small><strong>{selected.phone || '-'}</strong></div>
              <div><small>Products</small><strong>{selected.productCount}</strong></div>
              <div><small>Requests</small><strong>{selected.totalRequests} total · {selected.pendingRequests} pending</strong></div>
            </div>
            <div className="panel-head"><h2>Products</h2></div>
            <Table head={['Product', 'SKU', 'Category', 'Price']} empty={!selected.products?.length}>
              {(selected.products || []).map((product) => (
                <tr key={product._id}>
                  <td><div className="person"><img className="thumb" src={product.imageUrl} alt="" /><strong>{product.name}</strong></div></td>
                  <td><span className="mono">{product.sku}</span></td>
                  <td>{product.category}</td>
                  <td><Amount value={product.price} /></td>
                </tr>
              ))}
            </Table>
            <div className="panel-head"><h2>Recent requests</h2></div>
            <Table head={['Product', 'Warehouse', 'Qty', 'Status', 'Reviewed', 'Note']} empty={!selected.recentRequests?.length}>
              {(selected.recentRequests || []).map((request) => (
                <tr key={request._id}>
                  <td>{request.productName || '-'}</td>
                  <td>{request.warehouseName || '-'}</td>
                  <td>{request.quantity}</td>
                  <td><Badge status={request.status} /></td>
                  <td>{request.reviewedAt ? formatDate(request.reviewedAt) : '-'}</td>
                  <td>{request.reviewNote || '-'}</td>
                </tr>
              ))}
            </Table>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="btn primary" onClick={() => openEdit(selected)}>Edit supplier</button>
            </div>
          </>
        )}
      </Modal>
      <UserModal open={editOpen} onClose={() => setEditOpen(false)} user={editing} warehouses={data.warehouses} onSaved={onSaved} />
    </>
  );
}
