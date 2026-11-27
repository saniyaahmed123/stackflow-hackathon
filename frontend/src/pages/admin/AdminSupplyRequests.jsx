import { useEffect, useState } from 'react';
import api, { apiError, formatDate, readList } from '../../api';
import { Badge, ConfirmDialog, Empty, Field, Loading, Modal, PageHeader, Pagination, Table, Toolbar, useToast } from '../../components/ui';

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

const TABS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function AdminSupplyRequests() {
  const toast = useToast();
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(async () => {
    const params = { status: tab === 'All' ? '' : tab, q, warehouseId, supplierId, page, limit: 20 };
    const [requests, pending, approved, rejected, warehouses, suppliers] = await Promise.all([
      readList(api.get('/supply-requests', { params })),
      readList(api.get('/supply-requests', { params: { status: 'Pending', limit: 1 } })),
      readList(api.get('/supply-requests', { params: { status: 'Approved', limit: 1 } })),
      readList(api.get('/supply-requests', { params: { status: 'Rejected', limit: 1 } })),
      readList(api.get('/warehouses', { params: { limit: 100 } })),
      readList(api.get('/users/suppliers', { params: { limit: 100 } })),
    ]);
    return {
      requests: requests.items,
      pagination: requests.pagination,
      counts: { All: requests.pagination.total, Pending: pending.pagination.total, Approved: approved.pagination.total, Rejected: rejected.pagination.total },
      warehouses: warehouses.items,
      suppliers: suppliers.items,
    };
  }, [tab, q, warehouseId, supplierId, page]);
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const reasonError = reason.trim().length >= 5 ? '' : 'Rejection reason must be at least 5 characters.';

  if (!data) return error ? <Empty message={error} /> : <Loading />;
  const rows = data.requests;

  const review = async (status) => {
    const target = status === 'Approved' ? approving : rejecting;
    if (!target) return;
    if (status === 'Rejected') {
      setTouched(true);
      if (reasonError) return;
    }
    setBusy(true);
    try {
      await api.put(`/supply-requests/${target._id}/status`, {
        status,
        ...(status === 'Rejected' ? { note: reason.trim() } : {}),
      });
      toast.success(`Request ${status.toLowerCase()}`);
      setApproving(null);
      setRejecting(null);
      setReason('');
      setTouched(false);
      reload();
    } catch (err) {
      toast.error(apiError(err));
      setApproving(null);
      setRejecting(null);
    } finally {
      setBusy(false);
    }
  };

  const openReject = (request) => {
    setRejecting(request);
    setReason('');
    setTouched(false);
  };

  return (
    <>
      <PageHeader title="Supply requests" subtitle={`${data.counts.All} requests · review supplier deliveries before stock is added`} />
      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item} type="button" className={`tab ${tab === item ? 'active' : ''}`} onClick={() => { setTab(item); setPage(1); }}>
            {item} <span className="tab-count">{data.counts[item]}</span>
          </button>
        ))}
      </div>
      <Toolbar>
        <input className="search" placeholder="Search product or notes..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}>
          <option value="">All warehouses</option>
          {data.warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
        </select>
        <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}>
          <option value="">All suppliers</option>
          {data.suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
        </select>
      </Toolbar>
      <section className="panel">
        <Table head={['Supplier', 'Product', 'Warehouse', 'Qty', 'Status', 'Requested', 'Reviewed by', 'Rejection reason', 'Actions']} empty={!rows.length}>
          {rows.map((request) => (
            <tr key={request._id}>
              <td>
                <div className="person">
                  {request.supplier?.image
                    ? <img className="thumb" src={request.supplier.image} alt="" />
                    : <span className="avatar">{(request.supplier?.name || '?')[0]}</span>}
                  <div><strong>{request.supplier?.name || '-'}</strong><small>{request.supplier?.email}</small></div>
                </div>
              </td>
              <td>
                <div className="person">
                  <img className="thumb" src={request.product?.imageUrl} alt="" />
                  <strong>{request.product?.name || '-'}</strong>
                </div>
              </td>
              <td>{request.warehouse?.name || '-'}</td>
              <td>{request.quantity}</td>
              <td><Badge status={request.status} /></td>
              <td>{formatDate(request.createdAt)}</td>
              <td>{request.reviewedBy?.name || '-'}</td>
              <td>{request.status === 'Rejected' ? (request.reviewNote || 'No reason provided') : (request.reviewNote || '-')}</td>
              <td className="row-actions">
                {request.status === 'Pending' ? (
                  <>
                    <button type="button" className="btn small primary" onClick={() => setApproving(request)}>Approve</button>
                    <button type="button" className="btn small danger-ghost" onClick={() => openReject(request)}>Reject</button>
                  </>
                ) : <span className="muted">Reviewed</span>}
              </td>
            </tr>
          ))}
        </Table>
        <Pagination pagination={data.pagination} onPage={setPage} />
      </section>
      <ConfirmDialog
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        onConfirm={() => review('Approved')}
        busy={busy}
        title="Approve supply request"
        message={`Add ${approving?.quantity} units of ${approving?.product?.name || 'this product'} to ${approving?.warehouse?.name || 'the warehouse'}? A stock-in transaction will be recorded.`}
      />
      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={`Reject request${rejecting?.product?.name ? ` · ${rejecting.product.name}` : ''}`}>
        <Field label="Rejection reason" required hint="At least 5 characters; shown to the supplier">
          <textarea rows={3} value={reason} onBlur={() => setTouched(true)} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request is being rejected" />
          {touched && reasonError && <small className="field-error">{reasonError}</small>}
        </Field>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => setRejecting(null)}>Cancel</button>
          <button type="button" className="btn danger" disabled={busy || Boolean(reasonError)} onClick={() => review('Rejected')}>
            {busy ? 'Rejecting...' : 'Reject request'}
          </button>
        </div>
      </Modal>
    </>
  );
}
