import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/clients
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const clients = await prisma.client.findMany({
    where: { userId: req.userId! },
    include: {
      invoices: { select: { amount: true, status: true } },
      estimates: { select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ clients });
});

// POST /api/clients
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, phone, address, notes } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'name and email are required' });
    return;
  }
  const client = await prisma.client.create({
    data: { userId: req.userId!, name, email, phone: phone || null, address: address || null, notes: notes || null },
  });
  res.status(201).json({ client });
});

// GET /api/clients/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      invoices: { include: { items: true }, orderBy: { createdAt: 'desc' } },
      estimates: { include: { items: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
  res.json({ client });
});

// PATCH /api/clients/:id
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }

  const { name, email, phone, address, notes } = req.body;
  const client = await prisma.client.update({
    where: { id: existing.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(address !== undefined && { address: address || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });
  res.json({ client });
});

// DELETE /api/clients/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) { res.status(404).json({ error: 'Client not found' }); return; }
  await prisma.client.delete({ where: { id: existing.id } });
  res.json({ message: 'Client deleted' });
});

// GET /api/clients/:id/history
router.get('/:id/history', async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      invoices: { include: { items: true }, orderBy: { createdAt: 'desc' } },
      estimates: { include: { items: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

  const totalBilled = client.invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = client.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = client.invoices
    .filter((i) => ['sent', 'viewed', 'overdue'].includes(i.status))
    .reduce((s, i) => s + i.amount, 0);

  res.json({
    client,
    stats: { totalBilled, totalPaid, outstanding },
    invoices: client.invoices,
    estimates: client.estimates,
  });
});

export default router;
