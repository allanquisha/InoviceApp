import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getInvoice, updateInvoice, deleteInvoice, Invoice } from '../api/invoices';
import StatusBadge from '../components/StatusBadge';
import { Edit, Trash2, Send, Copy } from 'lucide-react';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const UNPAID_STATUSES = ['sent', 'viewed', 'overdue'];

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    if (!id) return;

    getInvoice(id)
      .then((inv) => {
        setInvoice(inv);
        // Start polling if the invoice is awaiting payment
        if (UNPAID_STATUSES.includes(inv.status)) {
          pollRef.current = setInterval(async () => {
            try {
              const fresh = await getInvoice(id);
              setInvoice(fresh);
              if (!UNPAID_STATUSES.includes(fresh.status)) stopPolling();
            } catch { stopPolling(); }
          }, 5000);
        }
      })
      .catch(() => navigate('/invoices'))
      .finally(() => setLoading(false));

    return stopPolling;
  }, [id]);

  async function markSent() {
    if (!invoice) return;
    const updated = await updateInvoice(invoice.id, { status: 'sent' });
    setInvoice(updated);
  }

  async function handleDelete() {
    if (!invoice || !confirm(`Delete ${invoice.invoiceNo}? This cannot be undone.`)) return;
    await deleteInvoice(invoice.id);
    navigate('/invoices');
  }

  function copyPayLink() {
    const url = `${window.location.origin}/pay/${invoice!.id}`;
    navigator.clipboard.writeText(url);
    setError(''); // reuse state for quick flash — just log it
    alert('Payment link copied!');
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!invoice) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-8">
            <h1 className="page-title">{invoice.invoiceNo}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="page-sub">Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="actions">
          {invoice.status === 'draft' && (
            <button className="btn btn-ghost" onClick={markSent}><Send size={14} /> Mark sent</button>
          )}
          <button className="btn btn-ghost" onClick={copyPayLink}><Copy size={14} /> Copy pay link</button>
          <Link to={`/invoices/${invoice.id}/edit`} className="btn btn-ghost"><Edit size={14} /> Edit</Link>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

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
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{fmt(item.unitPrice, invoice.currency)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', marginTop: 16, fontSize: 18, fontWeight: 700 }}>
            Total: {fmt(invoice.amount, invoice.currency)}
          </div>

          {invoice.notes && (
            <div className="mt-24">
              <div className="section-title">Notes</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{invoice.notes}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-body">
            <div className="section-title">Client</div>
            <div className="detail-value">{invoice.clientName}</div>
            <div className="text-muted mt-4" style={{ fontSize: 13 }}>{invoice.clientEmail}</div>
          </div>

          <div className="card card-body">
            <div className="section-title">Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="detail-label">Status</div>
                <StatusBadge status={invoice.status} />
              </div>
              <div>
                <div className="detail-label">Amount</div>
                <div className="detail-value text-bold">{fmt(invoice.amount, invoice.currency)}</div>
              </div>
              {invoice.dueDate && (
                <div>
                  <div className="detail-label">Due date</div>
                  <div className="detail-value">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                </div>
              )}
              {invoice.description && (
                <div>
                  <div className="detail-label">Description</div>
                  <div className="detail-value">{invoice.description}</div>
                </div>
              )}
            </div>
          </div>

          {invoice.status !== 'paid' && (
            <div className="card card-body" style={{ background: 'var(--primary-light)', borderColor: '#bfdbfe' }}>
              <div className="section-title" style={{ color: 'var(--primary)' }}>Payment link</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Share this link with your client to collect payment
              </p>
              <button className="btn btn-primary btn-sm" onClick={copyPayLink} style={{ width: '100%', justifyContent: 'center' }}>
                <Copy size={13} /> Copy payment link
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
