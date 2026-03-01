import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listInvoices, Invoice } from '../api/invoices';
import { listEstimates, Estimate } from '../api/estimates';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  const fetchAll = useCallback(() => {
    listInvoices().then(setInvoices).catch(() => {});
    listEstimates().then(setEstimates).catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRefreshOnFocus(fetchAll);

  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const recent = invoices.slice(0, 5);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {user?.firstName}</h1>
          <p className="page-sub">Here's what's happening with your business</p>
        </div>
        <div className="actions">
          <Link to="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
          <Link to="/estimates/new" className="btn btn-ghost">+ New Estimate</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{fmt(totalRevenue)}</div>
          <div className="stat-sub">from paid invoices</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{fmt(outstanding)}</div>
          <div className="stat-sub">awaiting payment</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Invoices</div>
          <div className="stat-value">{invoices.length}</div>
          <div className="stat-sub">{invoices.filter((i) => i.status === 'paid').length} paid</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Estimates</div>
          <div className="stat-value">{estimates.length}</div>
          <div className="stat-sub">{estimates.filter((e) => e.status === 'accepted').length} accepted</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="flex justify-between items-center mb-16">
            <span className="section-title" style={{ margin: 0 }}>Recent Invoices</span>
            <Link to="/invoices" style={{ fontSize: 13, color: 'var(--primary)' }}>View all →</Link>
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <p>No invoices yet. <Link to="/invoices/new" style={{ color: 'var(--primary)' }}>Create your first invoice</Link></p>
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
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td>{inv.clientName}</td>
                    <td className="text-bold">{fmt(inv.amount, inv.currency)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td className="text-muted">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
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
