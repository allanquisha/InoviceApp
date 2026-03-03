import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClients, createClient, Client } from '../api/clients';
import { Plus, Users } from 'lucide-react';

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listClients().then(setClients).finally(() => setLoading(false));
  }, []);

  function setF(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const c = await createClient({ name: form.name, email: form.email, phone: form.phone || undefined, address: form.address || undefined, notes: form.notes || undefined });
      setClients((prev) => [c, ...prev]);
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', address: '', notes: '' });
    } catch {
      setError('Failed to create client');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-sub">Manage your client relationships</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={14} /> New Client
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card card-body mb-20" style={{ maxWidth: 600 }}>
          <div className="section-title">New Client</div>
          {error && <div className="alert alert-error mb-16">{error}</div>}
          <form className="form" onSubmit={handleCreate}>
            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={setF('name')} placeholder="Jane Smith" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={setF('email')} placeholder="jane@example.com" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Phone (optional)</label>
                <input type="tel" value={form.phone} onChange={setF('phone')} placeholder="+1 555 000 0000" />
              </div>
              <div className="field">
                <label>Address (optional)</label>
                <input value={form.address} onChange={setF('address')} placeholder="123 Main St" />
              </div>
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <textarea value={form.notes} onChange={setF('notes')} placeholder="Anything to remember about this client" />
            </div>
            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Add client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : clients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>No clients yet.</p>
            <button className="btn btn-primary mt-8" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add your first client
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Total billed</th>
                  <th>Outstanding</th>
                  <th>Invoices</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const totalBilled = (c.invoices || []).reduce((s, i) => s + i.amount, 0);
                  const outstanding = (c.invoices || [])
                    .filter((i) => ['sent', 'viewed', 'overdue'].includes(i.status))
                    .reduce((s, i) => s + i.amount, 0);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="text-muted">{c.email}</td>
                      <td>{totalBilled > 0 ? fmt(totalBilled) : '—'}</td>
                      <td style={{ color: outstanding > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {outstanding > 0 ? fmt(outstanding) : '—'}
                      </td>
                      <td>{(c.invoices || []).length}</td>
                      <td>
                        <Link to={`/clients/${c.id}`} className="btn btn-ghost btn-sm">View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
