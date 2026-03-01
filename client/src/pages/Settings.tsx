import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { startConnect, getAccountStatus, StripeAccountStatus } from '../api/stripe';
import { ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getAccountStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await startConnect();
      window.location.href = url;
    } catch {
      alert('Could not start Stripe onboarding. Make sure your Stripe key is configured.');
      setConnecting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your account and payment setup</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
        {/* Profile */}
        <div className="card card-body">
          <div className="section-title">Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="detail-label">Name</div>
              <div className="detail-value">{user?.firstName} {user?.lastName}</div>
            </div>
            <div>
              <div className="detail-label">Email</div>
              <div className="detail-value">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Stripe Connect */}
        <div className="card card-body">
          <div className="section-title">Stripe Connect</div>
          <p className="text-muted mt-4" style={{ fontSize: 13, marginBottom: 16 }}>
            Connect your Stripe account to receive payments directly to your bank account.
            FieldPay uses Stripe Connect Express to handle payouts securely.
          </p>

          {loading ? (
            <div className="spinner" />
          ) : status?.connected ? (
            <div>
              <div className="flex items-center gap-8 mb-16" style={{ color: '#16a34a', fontWeight: 600 }}>
                <CheckCircle size={18} /> Stripe account connected
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div className="flex justify-between" style={{ fontSize: 13 }}>
                  <span className="text-muted">Charges enabled</span>
                  <span style={{ color: status.connected ? '#16a34a' : 'var(--danger)' }}>
                    {status.connected ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between" style={{ fontSize: 13 }}>
                  <span className="text-muted">Payouts enabled</span>
                  <span style={{ color: status.payoutsEnabled ? '#16a34a' : 'var(--warning)' }}>
                    {status.payoutsEnabled ? 'Yes' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between" style={{ fontSize: 13 }}>
                  <span className="text-muted">Details submitted</span>
                  <span>{status.detailsSubmitted ? 'Yes' : 'No'}</span>
                </div>
              </div>
              {!status.detailsSubmitted && (
                <div className="alert alert-info mb-16" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} />
                  Complete your Stripe profile to enable payouts
                </div>
              )}
              <button className="btn btn-ghost" onClick={handleConnect} disabled={connecting}>
                <ExternalLink size={14} />
                {connecting ? 'Redirecting…' : 'Manage Stripe account'}
              </button>
            </div>
          ) : (
            <div>
              <div className="alert alert-info mb-16">
                You haven't connected a Stripe account yet. Connect one to start accepting payments.
              </div>
              <button className="btn btn-primary" onClick={handleConnect} disabled={connecting}>
                <ExternalLink size={14} />
                {connecting ? 'Redirecting…' : 'Connect with Stripe'}
              </button>
            </div>
          )}
        </div>

        {/* Stripe Connect return pages note */}
        <div className="card card-body" style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}>
          <div className="section-title">Payment links</div>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Share a payment link from any invoice detail page. Your clients don't need an account —
            they pay directly via Stripe's secure checkout.
          </p>
          <p className="text-muted mt-8" style={{ fontSize: 13 }}>
            Link format: <code style={{ background: 'var(--border)', padding: '1px 6px', borderRadius: 4 }}>
              {window.location.origin}/pay/:invoiceId
            </code>
          </p>
        </div>
      </div>
    </>
  );
}
