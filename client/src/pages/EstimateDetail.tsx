import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getEstimate, updateEstimate, deleteEstimate, convertEstimate, Estimate } from '../api/estimates';
import StatusBadge from '../components/StatusBadge';
import { Edit, Trash2, ArrowRight } from 'lucide-react';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function EstimateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (id) {
      getEstimate(id)
        .then(setEstimate)
        .catch(() => navigate('/estimates'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  async function handleStatusChange(status: string) {
    if (!estimate) return;
    const updated = await updateEstimate(estimate.id, { status });
    setEstimate(updated);
  }

  async function handleConvert() {
    if (!estimate || !confirm('Convert this estimate to an invoice?')) return;
    setConverting(true);
    try {
      const invoice = await convertEstimate(estimate.id, dueDate || undefined);
      navigate(`/invoices/${invoice.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Conversion failed');
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete() {
    if (!estimate || !confirm(`Delete ${estimate.estimateNo}? This cannot be undone.`)) return;
    await deleteEstimate(estimate.id);
    navigate('/estimates');
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!estimate) return null;

  const canConvert = !['converted'].includes(estimate.status);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-8">
            <h1 className="page-title">{estimate.estimateNo}</h1>
            <StatusBadge status={estimate.status} />
          </div>
          <p className="page-sub">Issued {new Date(estimate.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="actions">
          {estimate.status === 'draft' && (
            <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange('sent')}>Mark sent</button>
          )}
          {estimate.status === 'sent' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange('accepted')}>Mark accepted</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange('rejected')}>Mark rejected</button>
            </>
          )}
          {estimate.status !== 'converted' && (
            <Link to={`/estimates/${estimate.id}/edit`} className="btn btn-ghost"><Edit size={14} /> Edit</Link>
          )}
          <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div className="card card-body">
          <div className="section-title">Line Items</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {estimate.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{fmt(item.unitPrice, estimate.currency)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.amount, estimate.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', marginTop: 16, fontSize: 18, fontWeight: 700 }}>
            Total: {fmt(estimate.amount, estimate.currency)}
          </div>

          {estimate.notes && (
            <div className="mt-24">
              <div className="section-title">Notes</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{estimate.notes}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-body">
            <div className="section-title">Client</div>
            <div className="detail-value">{estimate.clientName}</div>
            <div className="text-muted mt-4" style={{ fontSize: 13 }}>{estimate.clientEmail}</div>
          </div>

          <div className="card card-body">
            <div className="section-title">Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="detail-label">Amount</div>
                <div className="detail-value text-bold">{fmt(estimate.amount, estimate.currency)}</div>
              </div>
              {estimate.validUntil && (
                <div>
                  <div className="detail-label">Valid until</div>
                  <div className="detail-value">{new Date(estimate.validUntil).toLocaleDateString()}</div>
                </div>
              )}
              {estimate.invoiceId && (
                <div>
                  <div className="detail-label">Converted invoice</div>
                  <Link to={`/invoices/${estimate.invoiceId}`} style={{ color: 'var(--primary)', fontSize: 13 }}>
                    View invoice →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {canConvert && (
            <div className="card card-body" style={{ background: 'var(--success-light)', borderColor: '#bbf7d0' }}>
              <div className="section-title" style={{ color: '#15803d' }}>Convert to Invoice</div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12 }}>Invoice due date (optional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center', background: '#16a34a' }}
                onClick={handleConvert}
                disabled={converting}
              >
                <ArrowRight size={14} />
                {converting ? 'Converting…' : 'Convert to invoice'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
