import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(authenticate);

function generateEstimateNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `EST-${timestamp}-${random}`;
}

function generateInvoiceNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `INV-${timestamp}-${random}`;
}

// GET /api/estimates
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const estimates = await prisma.estimate.findMany({
    where: { userId: req.userId! },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ estimates });
});

// GET /api/estimates/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const estimate = await prisma.estimate.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { items: true },
  });

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  res.json({ estimate });
});

// POST /api/estimates
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { clientName, clientEmail, description, items, validUntil, notes, currency } = req.body;

  if (!clientName || !clientEmail || !items?.length) {
    res.status(400).json({ error: 'clientName, clientEmail, and items are required' });
    return;
  }

  const amount = (items as { quantity: number; unitPrice: number }[]).reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const estimate = await prisma.estimate.create({
    data: {
      estimateNo: generateEstimateNo(),
      userId: req.userId!,
      clientName,
      clientEmail,
      amount,
      currency: currency || 'USD',
      description,
      notes,
      validUntil: validUntil ? new Date(validUntil) : null,
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

  res.status(201).json({ estimate });
});

// PATCH /api/estimates/:id
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.estimate.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });

  if (!existing) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (existing.status === 'converted') {
    res.status(400).json({ error: 'Cannot edit a converted estimate' });
    return;
  }

  const { clientName, clientEmail, description, notes, validUntil, status, currency, items } = req.body;

  let amount = existing.amount;
  if (items?.length) {
    amount = (items as { quantity: number; unitPrice: number }[]).reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    await prisma.estimateItem.deleteMany({ where: { estimateId: existing.id } });
  }

  const estimate = await prisma.estimate.update({
    where: { id: existing.id },
    data: {
      ...(clientName && { clientName }),
      ...(clientEmail && { clientEmail }),
      ...(description !== undefined && { description }),
      ...(notes !== undefined && { notes }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
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

  res.json({ estimate });
});

// POST /api/estimates/:id/convert — convert estimate to invoice
router.post('/:id/convert', async (req: AuthRequest, res: Response): Promise<void> => {
  const estimate = await prisma.estimate.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { items: true },
  });

  if (!estimate) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  if (estimate.status === 'converted') {
    res.status(400).json({ error: 'Estimate already converted' });
    return;
  }

  const { dueDate } = req.body;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo: generateInvoiceNo(),
      userId: req.userId!,
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      amount: estimate.amount,
      currency: estimate.currency,
      description: estimate.description,
      notes: estimate.notes,
      dueDate: dueDate ? new Date(dueDate) : null,
      items: {
        create: estimate.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
      },
    },
    include: { items: true },
  });

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { status: 'converted', invoiceId: invoice.id },
  });

  res.status(201).json({ invoice });
});

// DELETE /api/estimates/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.estimate.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });

  if (!existing) {
    res.status(404).json({ error: 'Estimate not found' });
    return;
  }

  await prisma.estimate.delete({ where: { id: existing.id } });
  res.json({ message: 'Estimate deleted' });
});

export default router;
