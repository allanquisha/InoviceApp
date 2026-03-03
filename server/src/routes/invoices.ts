import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { sendSms } from '../lib/sms';

const router = Router();

// All routes require auth
router.use(authenticate);

function generateInvoiceNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `INV-${timestamp}-${random}`;
}

// GET /api/invoices — list all invoices for the authenticated user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.userId! },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ invoices });
});

// GET /api/invoices/:id — get a single invoice
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { items: true, payment: true, client: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  res.json({ invoice });
});

// POST /api/invoices — create a new invoice
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { clientName, clientEmail, clientPhone, description, items, dueDate, notes, currency, clientId, smsReminders } = req.body;

  if (!clientName || !clientEmail || !items?.length) {
    res.status(400).json({ error: 'clientName, clientEmail, and items are required' });
    return;
  }

  // Free-tier limit: max 3 invoices per calendar month
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  if (user.planType === 'free') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const countThisMonth = await prisma.invoice.count({
      where: {
        userId: req.userId!,
        createdAt: { gte: startOfMonth },
        invoiceType: 'standard', // only count standard invoices against free limit
      },
    });
    if (countThisMonth >= 3) {
      res.status(402).json({
        error: 'Free plan limit reached',
        code: 'FREE_TIER_LIMIT',
        message: 'You have reached the 3 invoice/month limit on the free plan. Upgrade to Pro for unlimited invoices.',
      });
      return;
    }
  }

  const amount = (items as { quantity: number; unitPrice: number }[]).reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo: generateInvoiceNo(),
      userId: req.userId!,
      clientName,
      clientEmail,
      clientPhone: clientPhone || null,
      clientId: clientId || null,
      amount,
      currency: currency || 'USD',
      description,
      notes,
      smsReminders: Boolean(smsReminders),
      dueDate: dueDate ? new Date(dueDate) : null,
      items: {
        create: (items as { description: string; quantity: number; unitPrice: number }[]).map(
          (item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })
        ),
      },
    },
    include: { items: true },
  });

  res.status(201).json({ invoice });
});

// PATCH /api/invoices/:id — update invoice (status, notes, etc.)
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { user: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const { clientName, clientEmail, clientPhone, description, notes, dueDate, status, currency, items, clientId, smsReminders } = req.body;

  let amount = existing.amount;
  if (items?.length) {
    amount = (items as { quantity: number; unitPrice: number }[]).reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    // Delete old items and replace
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } });
  }

  const invoice = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      ...(clientName && { clientName }),
      ...(clientEmail && { clientEmail }),
      ...(clientPhone !== undefined && { clientPhone: clientPhone || null }),
      ...(description !== undefined && { description }),
      ...(notes !== undefined && { notes }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status && { status }),
      ...(currency && { currency }),
      ...(clientId !== undefined && { clientId: clientId || null }),
      ...(smsReminders !== undefined && { smsReminders: Boolean(smsReminders) }),
      ...(items?.length && { amount }),
      ...(items?.length && {
        items: {
          create: (items as { description: string; quantity: number; unitPrice: number }[]).map(
            (item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
            })
          ),
        },
      }),
    },
    include: { items: true },
  });

  // SMS: send "invoice sent" notification when status changes to sent
  if (status === 'sent' && existing.status !== 'sent' && invoice.smsReminders && invoice.clientPhone && existing.user.smsEnabled) {
    const payLink = `${process.env.FRONTEND_URL}/pay/${invoice.id}`;
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'soon';
    sendSms(
      invoice.clientPhone,
      `Hi ${invoice.clientName}, you have an invoice for $${invoice.amount.toFixed(2)} due ${dueDateStr}. Pay here: ${payLink}`
    ).catch((err) => console.error('SMS send error:', err));
  }

  res.json({ invoice });
});

// DELETE /api/invoices/:id — delete invoice
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });

  if (!existing) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  await prisma.invoice.delete({ where: { id: existing.id } });
  res.json({ message: 'Invoice deleted' });
});

// POST /api/invoices/:id/deposit — create a deposit invoice from a standard invoice
router.post('/:id/deposit', async (req: AuthRequest, res: Response): Promise<void> => {
  const parent = await prisma.invoice.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { items: true },
  });

  if (!parent) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (parent.invoiceType !== 'standard') {
    res.status(400).json({ error: 'Can only create a deposit from a standard invoice' });
    return;
  }

  const { depositPercent } = req.body;
  if (!depositPercent || depositPercent <= 0 || depositPercent >= 100) {
    res.status(400).json({ error: 'depositPercent must be between 1 and 99' });
    return;
  }

  const depositAmount = Math.round(parent.amount * (depositPercent / 100) * 100) / 100;

  // Create deposit invoice
  const depositInvoice = await prisma.invoice.create({
    data: {
      invoiceNo: generateInvoiceNo(),
      userId: req.userId!,
      clientName: parent.clientName,
      clientEmail: parent.clientEmail,
      clientPhone: parent.clientPhone,
      clientId: parent.clientId,
      amount: depositAmount,
      currency: parent.currency,
      description: `Deposit (${depositPercent}%) — ${parent.invoiceNo}`,
      notes: parent.notes,
      dueDate: parent.dueDate,
      invoiceType: 'deposit',
      depositPercent,
      smsReminders: parent.smsReminders,
      items: {
        create: [{
          description: `Deposit (${depositPercent}%) — ${parent.description || parent.invoiceNo}`,
          quantity: 1,
          unitPrice: depositAmount,
          amount: depositAmount,
        }],
      },
    },
    include: { items: true },
  });

  // Update parent to balance invoice
  await prisma.invoice.update({
    where: { id: parent.id },
    data: {
      invoiceType: 'balance',
      depositInvoiceId: depositInvoice.id,
    },
  });

  res.status(201).json({ depositInvoice });
});

export default router;
