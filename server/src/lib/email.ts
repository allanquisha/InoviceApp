import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'FieldPay <noreply@fieldpay.app>';

export async function sendPaymentReceiptToClient(opts: {
  clientEmail: string;
  clientName: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  contractorName: string;
}) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: opts.currency,
  }).format(opts.amount);

  await resend.emails.send({
    from: FROM,
    to: opts.clientEmail,
    subject: `Payment confirmed — ${opts.invoiceNo}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#0f172a;margin-bottom:4px">Payment confirmed ✓</h2>
        <p style="color:#64748b;margin-bottom:24px">Hi ${opts.clientName},</p>
        <p style="color:#0f172a">Your payment of <strong>${formatted}</strong> for invoice
          <strong>${opts.invoiceNo}</strong> to <strong>${opts.contractorName}</strong>
          has been received successfully.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:24px 0">
          <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Amount paid</div>
          <div style="font-size:28px;font-weight:700;color:#16a34a">${formatted}</div>
        </div>
        <p style="color:#64748b;font-size:13px">Keep this email as your receipt.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:12px">Powered by FieldPay</p>
      </div>
    `,
  });
}

export async function sendPaymentAlertToContractor(opts: {
  contractorEmail: string;
  contractorName: string;
  clientName: string;
  invoiceNo: string;
  amount: number;
  currency: string;
}) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: opts.currency,
  }).format(opts.amount);

  await resend.emails.send({
    from: FROM,
    to: opts.contractorEmail,
    subject: `You received a payment — ${opts.invoiceNo}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#0f172a;margin-bottom:4px">Payment received 💰</h2>
        <p style="color:#64748b;margin-bottom:24px">Hi ${opts.contractorName},</p>
        <p style="color:#0f172a"><strong>${opts.clientName}</strong> just paid invoice
          <strong>${opts.invoiceNo}</strong>.</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin:24px 0">
          <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Amount received</div>
          <div style="font-size:28px;font-weight:700;color:#2563eb">${formatted}</div>
        </div>
        <p style="color:#64748b;font-size:13px">Funds will be deposited to your connected Stripe account.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#94a3b8;font-size:12px">Powered by FieldPay</p>
      </div>
    `,
  });
}
