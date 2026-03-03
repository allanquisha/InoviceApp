import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  startConnect, getAccountStatus, StripeAccountStatus,
  subscribe, getSubscription, getBillingPortal, SubscriptionStatus,
  updateSmsEnabled,
} from '../api/stripe';
import { ExternalLink, CheckCircle, AlertCircle, Zap, CreditCard, MessageSquare } from 'lucide-react';

export default function Settings() {
  const { user, login, token } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [planMsg, setPlanMsg] = useState('');
  const [smsToggling, setSmsToggling] = useState(false);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam === 'success') setPlanMsg('You are now on the Pro plan!');
    else if (planParam === 'cancel') setPlanMsg('Subscription cancelled.');

    Promise.all([getAccountStatus(), getSubscription()])
      .then(([acc, s]) => { setStatus(acc); setSub(s); })
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

  async function handleUpgrade() {
    setConnecting(true);
    try {
      const url = await subscribe();
      window.location.href = url;
    } catch {
      alert('Could not start checkout. Try again.');
      setConnecting(false);
    }
  }

  async function handleManageBilling() {
    setConnecting(true);
    try {
      const url = await getBillingPortal();
      window.location.href = url;
    } catch {
      alert('Could not open billing portal.');
      setConnecting(false);
    }
  }

  async function handleSmsToggle() {
    if (!user) return;
    setSmsToggling(true);
    try {
      await updateSmsEnabled(!user.smsEnabled);
      // Refresh user context — re-fetch /me via getMe
      const { getMe } = await import('../api/auth');
      const fresh = await getMe();
      login(fresh, token!);
    } catch {
      alert('Failed to update SMS settings.');
    } finally {
      setSmsToggling(false);
    }
  }

  const isPro = sub?.planType === 'pro';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your account and payment setup</p>
        </div>
      </div>

      {planMsg && (
        <div className={`alert ${planMsg.includes('Pro') ? 'alert-success' : 'alert-info'} mb-16`}>
          {planMsg}
        </div>
      )}

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

        {/* Plan */}
        <div className="card card-body">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} /> Plan
          </div>

          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span
                  style={{
                    background: isPro ? '#7c3aed' : 'var(--border)',
                    color: isPro ? '#fff' : 'var(--text-muted)',
                    borderRadius: 20,
                    padding: '3px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  {isPro ? 'Pro' : 'Free'}
                </span>
                {isPro ? (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unlimited invoices</span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {sub?.invoicesThisMonth ?? 0} / 3 invoices this month
                  </span>
                )}
              </div>

              {!isPro && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, ((sub?.invoicesThisMonth ?? 0) / 3) * 100)}%`,
                        background: (sub?.invoicesThisMonth ?? 0) >= 3 ? 'var(--danger)' : 'var(--primary)',
                        borderRadius: 4,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <p className="text-muted" style={{ fontSize: 12 }}>
                    Free plan: 3 invoices/month. Upgrade to Pro for unlimited.
                  </p>
                </div>
              )}

              {isPro ? (
                <button className="btn btn-ghost" onClick={handleManageBilling} disabled={connecting}>
                  <CreditCard size={14} />
                  {connecting ? 'Redirecting…' : 'Manage billing'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleUpgrade}
                  disabled={connecting}
                  style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                >
                  <Zap size={14} />
                  {connecting ? 'Redirecting…' : 'Upgrade to Pro — $25/month'}
                </button>
              )}
            </>
          )}
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

        {/* SMS Notifications */}
        <div className="card card-body">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} /> SMS Notifications
          </div>
          <p className="text-muted mt-4" style={{ fontSize: 13, marginBottom: 16 }}>
            Send SMS reminders to clients when invoices are sent or become overdue.
            Requires Twilio configuration and a phone number on each invoice.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className={`btn ${user?.smsEnabled ? 'btn-primary' : 'btn-ghost'}`}
              onClick={handleSmsToggle}
              disabled={smsToggling}
              style={{ minWidth: 100 }}
            >
              {smsToggling ? 'Saving…' : user?.smsEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <span className="text-muted" style={{ fontSize: 13 }}>
              {user?.smsEnabled ? 'SMS reminders are on' : 'Click to enable SMS reminders'}
            </span>
          </div>
        </div>

        {/* Payment links info */}
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
