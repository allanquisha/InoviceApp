import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getInvoice, updateInvoice, deleteInvoice, Invoice } from '../api/invoices';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { Edit, Trash2, Send, Copy, Layers } from 'lucide-react';

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
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositPercent, setDepositPercent] = useState(50);
  const [creatingDeposit, setCreatingDeposit] = useState(false);
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
    alert('Payment link copied!');
  }

  async function handleCreateDeposit() {
    if (!invoice) return;
    setCreatingDeposit(true);
    try {
      const res = await api.post(`/invoices/${invoice.id}/deposit`, { depositPercent });
      setShowDepositModal(false);
      // Refresh invoice to show updated invoiceType
      const fresh = await getInvoice(invoice.id);
      setInvoice(fresh);
      alert(`Deposit invoice created: ${res.data.depositInvoice.invoiceNo}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to create deposit invoice');
    } finally {
      setCreatingDeposit(false);
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!invoice) return null;

  const inv = invoice as Invoice & { invoiceType?: string; depositInvoiceId?: string; depositPercent?: number };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-8">
            <h1 className="page-title">{invoice.invoiceNo}</h1>
            <StatusBadge status={invoice.status} />
            {inv.invoiceType && inv.invoiceType !== 'standard' && (
              <span
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.5, padding: '2px 8px',
                  borderRadius: 20, background: inv.invoiceType === 'deposit' ? '#fef3c7' : '#e0e7ff',
                  color: inv.invoiceType === 'deposit' ? '#92400e' : '#3730a3', textTransform: 'uppercase',
                }}
              >
                {inv.invoiceType}
              </span>
            )}
          </div>
          <p className="page-sub">Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
        </div>
        <div className="actions">
          {invoice.status === 'draft' && (
            <button className="btn btn-ghost" onClick={markSent}><Send size={14} /> Mark sent</button>
          )}
          {inv.invoiceType === 'standard' && invoice.status !== 'paid' && (
            <button className="btn btn-ghost" onClick={() => setShowDepositModal(true)}>
              <Layers size={14} /> Request deposit
            </button>
          )}
          <button className="btn btn-ghost" onClick={copyPayLink}><Copy size={14} /> Copy pay link</button>
          <Link to={`/invoices/${invoice.id}/edit`} className="btn btn-ghost"><Edit size={14} /> Edit</Link>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      {/* Deposit relationship notice */}
      {inv.invoiceType === 'balance' && inv.depositInvoiceId && (
        <div className="alert alert-info mb-16">
          This is a balance invoice. A {inv.depositPercent}% deposit invoice has been issued.{' '}
          <Link to={`/invoices/${inv.depositInvoiceId}`} style={{ color: 'var(--primary)' }}>View deposit →</Link>
        </div>
      )}
      {inv.invoiceType === 'deposit' && (
        <div className="alert alert-info mb-16">
          This is a deposit invoice ({inv.depositPercent}% of the project total).
        </div>
      )}

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
            {(inv as any).clientPhone && (
              <div className="text-muted mt-4" style={{ fontSize: 13 }}>{(inv as any).clientPhone}</div>
            )}
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

      {/* Deposit modal */}
      {showDepositModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="card card-body"
            style={{ width: 400, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 8 }}>Request Deposit</h2>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
              Creates a separate deposit invoice. The original invoice becomes the balance due.
            </p>
            <div className="field mb-16">
              <label>Deposit percentage</label>
              <div className="flex gap-8 mb-8">
                {[25, 50, 75].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`btn btn-sm ${depositPercent === pct ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setDepositPercent(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={99}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
              />
              <div className="text-muted mt-4" style={{ fontSize: 12 }}>
                Deposit amount: {fmt((invoice.amount * depositPercent) / 100, invoice.currency)}
              </div>
            </div>
            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowDepositModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateDeposit} disabled={creatingDeposit}>
                {creatingDeposit ? 'Creating…' : 'Create deposit invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
