import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEstimate, getEstimate, updateEstimate, EstimateInput } from '../api/estimates';
import LineItemsBuilder, { LineItem } from '../components/LineItemsBuilder';

export default function EstimateForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Omit<EstimateInput, 'items'>>({
    clientName: '',
    clientEmail: '',
    description: '',
    notes: '',
    validUntil: '',
    currency: 'USD',
  });
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      getEstimate(id).then((est) => {
        setForm({
          clientName: est.clientName,
          clientEmail: est.clientEmail,
          description: est.description || '',
          notes: est.notes || '',
          validUntil: est.validUntil ? est.validUntil.slice(0, 10) : '',
          currency: est.currency,
        });
        setItems(est.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })));
      }).catch(() => navigate('/estimates'));
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
      const payload: EstimateInput = { ...form, items };
      const est = isEdit
        ? await updateEstimate(id!, payload)
        : await createEstimate(payload);
      navigate(`/estimates/${est.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to save estimate');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Estimate' : 'New Estimate'}</h1>
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
                <label>Valid until</label>
                <input type="date" value={form.validUntil} onChange={set('validUntil')} />
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
              <input value={form.description} onChange={set('description')} placeholder="Brief description of scope" />
            </div>
          </div>

          <div>
            <div className="section-title">Line Items</div>
            <LineItemsBuilder items={items} onChange={setItems} />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} placeholder="Terms, conditions, etc." />
          </div>

          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create estimate'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
