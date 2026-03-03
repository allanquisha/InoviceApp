import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createInvoice, getInvoice, updateInvoice, InvoiceInput } from '../api/invoices';
import { listClients, Client } from '../api/clients';
import { getSubscription } from '../api/stripe';
import LineItemsBuilder, { LineItem } from '../components/LineItemsBuilder';
import { Zap } from 'lucide-react';

export default function InvoiceForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Omit<InvoiceInput, 'items'>>({
    clientName: '',
    clientEmail: '',
    description: '',
    notes: '',
    dueDate: '',
    currency: 'USD',
  });
  const [clientPhone, setClientPhone] = useState('');
  const [smsReminders, setSmsReminders] = useState(false);
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [freeLimitHit, setFreeLimitHit] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    // Load clients for autocomplete
    listClients().then(setClients).catch(() => {});

    // Check free-tier limit (only on new invoice)
    if (!isEdit) {
      getSubscription().then((sub) => {
        if (sub.planType === 'free' && sub.invoicesThisMonth >= 3) {
          setFreeLimitHit(true);
        }
      }).catch(() => {});
    }

    if (id) {
      getInvoice(id).then((inv) => {
        setForm({
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          description: inv.description || '',
          notes: inv.notes || '',
          dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
          currency: inv.currency,
        });
        setClientPhone((inv as any).clientPhone || '');
        setSmsReminders((inv as any).smsReminders || false);
        setClientId((inv as any).clientId || '');
        setItems(inv.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })));
      }).catch(() => navigate('/invoices'));
    }
  }, [id]);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function selectClient(c: Client) {
    setForm((f) => ({ ...f, clientName: c.name, clientEmail: c.email }));
    setClientPhone(c.phone || '');
    setClientId(c.id);
    setClientSearch(c.name);
    setShowClientDropdown(false);
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || items.some((it) => !it.description)) {
      setError('All items need a description');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: InvoiceInput & { clientPhone?: string; smsReminders?: boolean; clientId?: string } = {
        ...form,
        items,
        clientPhone: clientPhone || undefined,
        smsReminders,
        clientId: clientId || undefined,
      };
      const inv = isEdit
        ? await updateInvoice(id!, payload)
        : await createInvoice(payload);
      navigate(`/invoices/${inv.id}`);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string; code?: string } } })?.response?.data;
      if (errData?.code === 'FREE_TIER_LIMIT') {
        setFreeLimitHit(true);
      } else {
        setError(errData?.error || 'Failed to save invoice');
      }
    } finally {
      setSaving(false);
    }
  }

  if (freeLimitHit) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">New Invoice</h1>
          </div>
        </div>
        <div className="card card-body" style={{ maxWidth: 500, textAlign: 'center' }}>
          <Zap size={40} style={{ color: '#7c3aed', margin: '0 auto 16px' }} />
          <h2 style={{ marginBottom: 8 }}>Free plan limit reached</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: 14 }}>
            You've created 3 invoices this month, the maximum on the free plan.
            Upgrade to Pro for unlimited invoices, deposits, and SMS reminders.
          </p>
          <div className="actions" style={{ justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <Link
              to="/settings"
              className="btn btn-primary"
              style={{ background: '#7c3aed', borderColor: '#7c3aed', justifyContent: 'center' }}
            >
              <Zap size={14} /> Upgrade to Pro — $25/month
            </Link>
            <button className="btn btn-ghost" onClick={() => navigate('/invoices')}>
              Back to invoices
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
        </div>
      </div>

      <div className="card card-body">
        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <div>
            <div className="section-title">Client</div>

            {/* Client autocomplete */}
            {clients.length > 0 && (
              <div className="field mb-8" style={{ position: 'relative' }}>
                <label>Select saved client (optional)</label>
                <input
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                  placeholder="Search clients…"
                />
                {showClientDropdown && filteredClients.length > 0 && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      maxHeight: 200, overflowY: 'auto',
                    }}
                  >
                    {filteredClients.slice(0, 8).map((c) => (
                      <div
                        key={c.id}
                        onMouseDown={() => selectClient(c)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          fontSize: 14,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-row">
              <div className="field">
                <label>Client name</label>
                <input value={form.clientName} onChange={set('clientName')} placeholder="Acme Corp" required />
              </div>
              <div className="field">
                <label>Client email</label>
                <input type="email" value={form.clientEmail} onChange={set('clientEmail')} placeholder="billing@acme.com" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Client phone (optional)</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div className="field" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={smsReminders}
                    onChange={(e) => setSmsReminders(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  Send SMS reminders
                </label>
              </div>
            </div>
          </div>

          <div>
            <div className="section-title">Details</div>
            <div className="form-row">
              <div className="field">
                <label>Due date</label>
                <input type="date" value={form.dueDate} onChange={set('dueDate')} />
              </div>
              <div className="field">
                <label>Currency</label>
                <select value={form.currency} onChange={set('currency')}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
            <div className="field mt-8">
              <label>Description (optional)</label>
              <input value={form.description} onChange={set('description')} placeholder="Brief description of work" />
            </div>
          </div>

          <div>
            <div className="section-title">Line Items</div>
            <LineItemsBuilder items={items} onChange={setItems} />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} placeholder="Payment terms, bank details, etc." />
          </div>

          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create invoice'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
