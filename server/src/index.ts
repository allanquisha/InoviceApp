import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import estimateRoutes from './routes/estimates';
import stripeRoutes from './routes/stripe';
import publicRoutes from './routes/public';

const app: Express = express();
const port = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

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
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/public', publicRoutes);

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

app.listen(port, () => {
  console.log(`FieldPay server running on port ${port} [${isProd ? 'production' : 'development'}]`);
});

export default app;
