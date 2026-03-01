import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export default function LineItemsBuilder({ items, onChange }: Props) {
  function add() {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  function update(i: number, field: keyof LineItem, value: string | number) {
    const next = items.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    );
    onChange(next);
  }

  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  return (
    <div>
      <table className="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ width: 80 }}>Qty</th>
            <th style={{ width: 110 }}>Unit Price</th>
            <th style={{ width: 90 }}>Amount</th>
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>
                <input
                  value={item.description}
                  placeholder="Item description"
                  onChange={(e) => update(i, 'description', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => update(i, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => update(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => remove(i)}
                  style={{ padding: '4px 6px' }}
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
          <Plus size={14} /> Add item
        </button>
        <div className="items-total">Total: ${total.toFixed(2)}</div>
      </div>
    </div>
  );
}
