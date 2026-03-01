import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listInvoices, Invoice } from '../api/invoices';
import StatusBadge from '../components/StatusBadge';
import { FileText } from 'lucide-react';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(() => {
    listInvoices().then(setInvoices).catch(() => {});
  }, []);

  useEffect(() => {
    listInvoices()
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, []);

  useRefreshOnFocus(fetchInvoices);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-sub">{invoices.length} total</p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <FileText />
            <h3>No invoices yet</h3>
            <p>Create your first invoice to get paid faster</p>
            <Link to="/invoices/new" className="btn btn-primary">Create invoice</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td>
                      <div>{inv.clientName}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{inv.clientEmail}</div>
                    </td>
                    <td className="text-bold">{fmt(inv.amount, inv.currency)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td className="text-muted">{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td className="text-muted">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="actions">
                        <Link to={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">View</Link>
                        <Link to={`/invoices/${inv.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
