import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createInvoice, getInvoice, updateInvoice, InvoiceInput } from '../api/invoices';
import LineItemsBuilder, { LineItem } from '../components/LineItemsBuilder';

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
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
        setItems(inv.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })));
      }).catch(() => navigate('/invoices'));
    }
  }, [id]);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || items.some((it) => !it.description)) {
      setError('All items need a description');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: InvoiceInput = { ...form, items };
      const inv = isEdit
        ? await updateInvoice(id!, payload)
        : await createInvoice(payload);
      navigate(`/invoices/${inv.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
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
