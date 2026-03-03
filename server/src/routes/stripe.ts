import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { sendPaymentReceiptToClient, sendPaymentAlertToContractor } from '../lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

const router = Router();

// ─── Stripe Connect onboarding ────────────────────────────────────────────────

// POST /api/stripe/connect — create a Stripe Connect Express account and return onboarding link
router.post('/connect', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  let accountId = user.stripeId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      metadata: { userId: user.id },
    });
    accountId = account.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeId: accountId } });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.FRONTEND_URL}/settings/stripe/refresh`,
    return_url: `${process.env.FRONTEND_URL}/settings/stripe/complete`,
    type: 'account_onboarding',
  });

  res.json({ url: accountLink.url });
});

// GET /api/stripe/account — retrieve connected account status
router.get('/account', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.stripeId) {
    res.json({ connected: false });
    return;
  }

  const account = await stripe.accounts.retrieve(user.stripeId);
  res.json({
    connected: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    accountId: account.id,
  });
});

// ─── Subscription billing ─────────────────────────────────────────────────────

// POST /api/stripe/subscribe — create a Stripe Checkout session for $25/month subscription
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // Ensure the user has a Stripe Customer record
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'FieldPay Pro', description: 'Unlimited invoices, deposits, SMS reminders' },
          unit_amount: 2500, // $25.00
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/settings?plan=success`,
    cancel_url: `${process.env.FRONTEND_URL}/settings?plan=cancel`,
    metadata: { userId: user.id },
  });

  res.json({ url: session.url });
});

// GET /api/stripe/subscription — return current subscription status
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // Count invoices this month for free-tier users
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const invoicesThisMonth = await prisma.invoice.count({
    where: { userId: user.id, createdAt: { gte: startOfMonth }, invoiceType: 'standard' },
  });

  res.json({
    planType: user.planType,
    subscriptionId: user.subscriptionId,
    subscriptionEnd: user.subscriptionEnd,
    invoicesThisMonth,
    invoiceLimit: user.planType === 'free' ? 3 : null,
  });
});

// POST /api/stripe/billing-portal — return Stripe Customer Portal link
router.post('/billing-portal', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: 'No billing account found' });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/settings`,
  });

  res.json({ url: session.url });
});

// POST /api/stripe/settings/sms — toggle SMS notifications
router.post('/settings/sms', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { smsEnabled } = req.body;
  await prisma.user.update({ where: { id: req.userId! }, data: { smsEnabled: Boolean(smsEnabled) } });
  res.json({ smsEnabled: Boolean(smsEnabled) });
});

// ─── Payment intents ──────────────────────────────────────────────────────────

// POST /api/stripe/payment-intent — create a payment intent for an invoice
router.post('/payment-intent', async (req: Request, res: Response): Promise<void> => {
  const { invoiceId } = req.body;

  if (!invoiceId) {
    res.status(400).json({ error: 'invoiceId is required' });
    return;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { user: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (invoice.status === 'paid') {
    res.status(400).json({ error: 'Invoice is already paid' });
    return;
  }

  if (!invoice.user.stripeId) {
    res.status(400).json({ error: 'Contractor has not connected Stripe yet' });
    return;
  }

  // Reuse an existing pending payment intent so the client can never
  // accidentally pay the same invoice twice by opening the link in two tabs.
  if (invoice.paymentId) {
    const existingPayment = await prisma.payment.findUnique({
      where: { id: invoice.paymentId },
    });

    if (existingPayment?.stripePaymentIntentId && existingPayment.status === 'pending') {
      const existing = await stripe.paymentIntents.retrieve(
        existingPayment.stripePaymentIntentId
      );
      if (existing.status !== 'canceled') {
        res.json({ clientSecret: existing.client_secret });
        return;
      }
    }
  }

  // Amount in smallest currency unit (cents for USD)
  const amountInCents = Math.round(invoice.amount * 100);

  // Application fee (e.g., 2.5% platform fee) — adjust as needed
  const applicationFeeAmount = Math.round(amountInCents * 0.025);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: invoice.currency.toLowerCase(),
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: invoice.user.stripeId,
    },
    metadata: {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      userId: invoice.userId,
    },
  });

  // Store payment record
  const payment = await prisma.payment.create({
    data: {
      userId: invoice.userId,
      amount: invoice.amount,
      currency: invoice.currency,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    },
  });

  // Link payment to invoice
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paymentId: payment.id },
  });

  res.json({ clientSecret: paymentIntent.client_secret });
});

// ─── Webhook ──────────────────────────────────────────────────────────────────

// POST /api/stripe/webhook — Stripe webhook (raw body required)
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${(err as Error).message}` });
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const invoiceId = pi.metadata?.invoiceId;

      if (invoiceId) {
        const invoice = await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'paid' },
          include: { user: true },
        });
        await prisma.payment.update({
          where: { stripePaymentIntentId: pi.id },
          data: { status: 'succeeded', paymentMethod: pi.payment_method_types[0] },
        });

        // Send emails — fire and forget (don't block the webhook response)
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_api_key') {
          Promise.all([
            sendPaymentReceiptToClient({
              clientEmail: invoice.clientEmail,
              clientName: invoice.clientName,
              invoiceNo: invoice.invoiceNo,
              amount: invoice.amount,
              currency: invoice.currency,
              contractorName: `${invoice.user.firstName} ${invoice.user.lastName}`,
            }),
            sendPaymentAlertToContractor({
              contractorEmail: invoice.user.email,
              contractorName: `${invoice.user.firstName} ${invoice.user.lastName}`,
              clientName: invoice.clientName,
              invoiceNo: invoice.invoiceNo,
              amount: invoice.amount,
              currency: invoice.currency,
            }),
          ]).catch((err) => console.error('Email send error:', err));
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'failed' },
      });
      break;
    }

    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'canceled' },
      });
      break;
    }

    case 'account.updated': {
      // A connected account completed onboarding
      const account = event.data.object as Stripe.Account;
      if (account.metadata?.userId) {
        await prisma.user.updateMany({
          where: { stripeId: account.id },
          data: { stripeId: account.id },
        });
      }
      break;
    }

    // ─── Subscription events ───────────────────────────────────────────────────

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const periodEnd = new Date((sub as any).current_period_end * 1000);
      const active = sub.status === 'active' || sub.status === 'trialing';
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          planType: active ? 'pro' : 'free',
          subscriptionId: sub.id,
          subscriptionEnd: periodEnd,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { planType: 'free', subscriptionId: null, subscriptionEnd: null },
      });
      break;
    }

    default:
      // Unhandled event types are fine — Stripe expects a 200
      break;
  }

  res.json({ received: true });
});

export default router;
