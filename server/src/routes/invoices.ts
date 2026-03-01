import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

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
    include: { items: true, payment: true },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  res.json({ invoice });
});

// POST /api/invoices — create a new invoice
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { clientName, clientEmail, description, items, dueDate, notes, currency } = req.body;

  if (!clientName || !clientEmail || !items?.length) {
    res.status(400).json({ error: 'clientName, clientEmail, and items are required' });
    return;
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
      amount,
      currency: currency || 'USD',
      description,
      notes,
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
  });

  if (!existing) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const { clientName, clientEmail, description, notes, dueDate, status, currency, items } = req.body;

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
      ...(description !== undefined && { description }),
      ...(notes !== undefined && { notes }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status && { status }),
      ...(currency && { currency }),
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

export default router;
