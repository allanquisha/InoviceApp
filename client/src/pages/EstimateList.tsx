import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEstimates, Estimate } from '../api/estimates';
import StatusBadge from '../components/StatusBadge';
import { ClipboardList } from 'lucide-react';

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function EstimateList() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEstimates()
      .then(setEstimates)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Estimates</h1>
          <p className="page-sub">{estimates.length} total</p>
        </div>
        <Link to="/estimates/new" className="btn btn-primary">+ New Estimate</Link>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : estimates.length === 0 ? (
          <div className="empty-state">
            <ClipboardList />
            <h3>No estimates yet</h3>
            <p>Create an estimate to send to prospective clients</p>
            <Link to="/estimates/new" className="btn btn-primary">Create estimate</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estimate #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Valid until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {estimates.map((est) => (
                  <tr key={est.id}>
                    <td>
                      <Link to={`/estimates/${est.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {est.estimateNo}
                      </Link>
                    </td>
                    <td>
                      <div>{est.clientName}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{est.clientEmail}</div>
                    </td>
                    <td className="text-bold">{fmt(est.amount, est.currency)}</td>
                    <td><StatusBadge status={est.status} /></td>
                    <td className="text-muted">{new Date(est.issueDate).toLocaleDateString()}</td>
                    <td className="text-muted">{est.validUntil ? new Date(est.validUntil).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="actions">
                        <Link to={`/estimates/${est.id}`} className="btn btn-ghost btn-sm">View</Link>
                        {est.status !== 'converted' && (
                          <Link to={`/estimates/${est.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                        )}
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
