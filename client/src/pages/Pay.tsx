import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getPublicInvoice, Invoice } from '../api/invoices';
import { createPaymentIntent } from '../api/stripe';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function CheckoutForm({ invoice, onSuccess }: { invoice: Invoice; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${invoice.id}?success=1`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form mt-16">
      <PaymentElement />
      {message && <div className="alert alert-error">{message}</div>}
      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={!stripe || processing}
      >
        {processing ? 'Processing…' : `Pay ${fmt(invoice.amount, invoice.currency)}`}
      </button>
    </form>
  );
}

export default function Pay() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  // Check for success redirect
  const isSuccess = new URLSearchParams(window.location.search).get('success') === '1';

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const inv = await getPublicInvoice(id);
        setInvoice(inv);

        if (inv.status === 'paid' || isSuccess) return;

        try {
          const secret = await createPaymentIntent(inv.id);
          setClientSecret(secret);
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg || 'Could not initialize payment. Please contact the sender.');
        }
      } catch {
        setError('Invoice not found. Please check the link and try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="pay-page">
      <div className="pay-logo">FieldPay</div>

      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : invoice ? (
        <>
          <div className="card card-body mb-16">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{invoice.invoiceNo}</div>
                <div className="text-muted mt-4" style={{ fontSize: 13 }}>from {invoice.clientName}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 22 }}>
                {fmt(invoice.amount, invoice.currency)}
              </div>
            </div>
            {invoice.description && (
              <p className="text-muted mt-8" style={{ fontSize: 13 }}>{invoice.description}</p>
            )}
          </div>

          {invoice.status === 'paid' || isSuccess || paid ? (
            <div className="alert alert-success" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {paid ? 'Payment successful!' : 'This invoice has been paid'}
              </div>
              <div className="text-muted mt-4">Thank you — your payment has been received.</div>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm invoice={invoice} onSuccess={() => setPaid(true)} />
            </Elements>
          ) : (
            <div className="alert alert-error">Unable to initialize payment. Please try again.</div>
          )}
        </>
      ) : null}
    </div>
  );
}
