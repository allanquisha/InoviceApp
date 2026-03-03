import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getEarnings, EarningsData } from '../api/earnings';
import { TrendingUp } from 'lucide-react';

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function formatMonth(key: string) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function Earnings() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEarnings().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!data) return null;

  const chartData = data.monthly.map((m) => ({
    name: formatMonth(m.month),
    revenue: m.revenue,
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Earnings</h1>
          <p className="page-sub">Revenue breakdown and business insights</p>
        </div>
      </div>

      {/* Totals */}
      <div className="stats-grid mb-20" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card stat-card">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{fmt(data.totals.paid)}</div>
          <div className="stat-sub">collected revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{fmt(data.totals.outstanding)}</div>
          <div className="stat-sub">awaiting payment</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{fmt(data.totals.overdue)}</div>
          <div className="stat-sub">past due date</div>
        </div>
      </div>

      {/* Monthly revenue chart */}
      <div className="card card-body mb-20">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} /> Monthly Revenue
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">No paid invoices yet — revenue will appear here once you start collecting payments.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(value: number | undefined) => [value != null ? fmt(value) : '$0', 'Revenue']}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top clients */}
      {data.topClients.length > 0 && (
        <div className="card card-body">
          <div className="section-title">Top Clients by Revenue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.topClients.map((c, i) => {
              const pct = data.totals.paid > 0 ? (c.paid / data.totals.paid) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between mb-4" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(c.paid)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--primary)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
