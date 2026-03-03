import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClientHistory, updateClient, deleteClient, ClientHistory } from '../api/clients';
import StatusBadge from '../components/StatusBadge';
import { Edit, Trash2, Plus } from 'lucide-react';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClientHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getClientHistory(id)
      .then((d) => {
        setData(d);
        setEditForm({
          name: d.client.name,
          email: d.client.email,
          phone: d.client.phone || '',
          address: d.client.address || '',
          notes: d.client.notes || '',
        });
      })
      .catch(() => navigate('/clients'))
      .finally(() => setLoading(false));
  }, [id]);

  function setF(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const updated = await updateClient(data.client.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        notes: editForm.notes || undefined,
      });
      setData((prev) => prev ? { ...prev, client: { ...prev.client, ...updated } } : prev);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!data || !confirm(`Delete ${data.client.name}? This cannot be undone.`)) return;
    await deleteClient(data.client.id);
    navigate('/clients');
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!data) return null;

  const { client, stats, invoices, estimates } = data;
  const invList = invoices as any[];
  const estList = estimates as any[];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-sub">{client.email}{client.phone ? ` · ${client.phone}` : ''}</p>
        </div>
        <div className="actions">
          <Link
            to={`/invoices/new`}
            state={{ clientId: client.id, clientName: client.name, clientEmail: client.email, clientPhone: client.phone }}
            className="btn btn-primary"
          >
            <Plus size={14} /> New Invoice
          </Link>
          <button className="btn btn-ghost" onClick={() => setEditing(true)}><Edit size={14} /> Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-20" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value">{fmt(stats.totalBilled)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{fmt(stats.totalPaid)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{fmt(stats.outstanding)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Invoices */}
        <div className="card">
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="section-title">Invoices</div>
          </div>
          {invList.length === 0 ? (
            <div className="empty-state"><p className="text-muted">No invoices yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Invoice #</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {invList.map((inv: any) => (
                    <tr key={inv.id}>
                      <td>
                        <Link to={`/invoices/${inv.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td>{fmt(inv.amount, inv.currency)}</td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estimates */}
        <div className="card">
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="section-title">Estimates</div>
          </div>
          {estList.length === 0 ? (
            <div className="empty-state"><p className="text-muted">No estimates yet</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Estimate #</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {estList.map((est: any) => (
                    <tr key={est.id}>
                      <td>
                        <Link to={`/estimates/${est.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                          {est.estimateNo}
                        </Link>
                      </td>
                      <td>{fmt(est.amount, est.currency)}</td>
                      <td><StatusBadge status={est.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="card card-body mt-20">
          <div className="section-title">Notes</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{client.notes}</p>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setEditing(false)}
        >
          <div className="card card-body" style={{ width: 480, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16 }}>Edit Client</h2>
            <form className="form" onSubmit={handleSave}>
              <div className="form-row">
                <div className="field">
                  <label>Name</label>
                  <input value={editForm.name} onChange={setF('name')} required />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={editForm.email} onChange={setF('email')} required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Phone</label>
                  <input type="tel" value={editForm.phone} onChange={setF('phone')} />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input value={editForm.address} onChange={setF('address')} />
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={editForm.notes} onChange={setF('notes')} />
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
