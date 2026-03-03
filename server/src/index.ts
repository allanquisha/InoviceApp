import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import cron from 'node-cron';
import rateLimit from 'express-rate-limit';

dotenv.config();

import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import estimateRoutes from './routes/estimates';
import stripeRoutes from './routes/stripe';
import publicRoutes from './routes/public';
import clientRoutes from './routes/clients';
import earningsRoutes from './routes/earnings';
import { sendSms } from './lib/sms';

const app: Express = express();
const port = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ─── Rate limiters ────────────────────────────────────────────────────────────

// Auth: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public pay page: 30 payment intents per 10 minutes per IP
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Too many payment requests, please try again shortly' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stripe webhook requires the raw body — mount before express.json()
app.use(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' })
);

// CORS — only needed in dev (in prod the client is served from the same origin)
if (!isProd) {
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/invoices', apiLimiter, invoiceRoutes);
app.use('/api/estimates', apiLimiter, estimateRoutes);
app.use('/api/stripe/payment-intent', paymentLimiter);
app.use('/api/stripe', apiLimiter, stripeRoutes);
app.use('/api/public', paymentLimiter, publicRoutes);
app.use('/api/clients', apiLimiter, clientRoutes);
app.use('/api/earnings', apiLimiter, earningsRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'FieldPay API is running' });
});

// Serve React app in production
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // All non-API routes hand off to React Router
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Overdue cron — runs daily at midnight UTC ────────────────────────────────
cron.schedule('0 0 * * *', async () => {
  console.log('[cron] Running overdue invoice check...');
  try {
    const now = new Date();

    // Find invoices that are about to be marked overdue so we can send SMS
    const toMarkOverdue = await prisma.invoice.findMany({
      where: { status: 'sent', dueDate: { lt: now } },
      include: { user: true },
    });

    // Bulk update to overdue
    await prisma.invoice.updateMany({
      where: { status: 'sent', dueDate: { lt: now } },
      data: { status: 'overdue' },
    });

    console.log(`[cron] Marked ${toMarkOverdue.length} invoices as overdue`);

    // Send SMS overdue reminders
    for (const invoice of toMarkOverdue) {
      if (invoice.smsReminders && invoice.clientPhone && invoice.user.smsEnabled) {
        const payLink = `${process.env.FRONTEND_URL}/pay/${invoice.id}`;
        sendSms(
          invoice.clientPhone,
          `Reminder: Your invoice for $${invoice.amount.toFixed(2)} from ${invoice.user.firstName} ${invoice.user.lastName} is overdue. Pay here: ${payLink}`
        ).catch((err) => console.error('[cron] SMS error:', err));
      }
    }
  } catch (err) {
    console.error('[cron] Overdue check failed:', err);
  }
});

app.listen(port, () => {
  console.log(`FieldPay server running on port ${port} [${isProd ? 'production' : 'development'}]`);
});

export default app;
