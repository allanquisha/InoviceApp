import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/earnings
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.userId! },
    select: {
      amount: true,
      status: true,
      issueDate: true,
      clientName: true,
      clientId: true,
    },
    orderBy: { issueDate: 'asc' },
  });

  // Monthly revenue (paid invoices grouped by month)
  const monthlyMap: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.status === 'paid') {
      const d = new Date(inv.issueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + inv.amount;
    }
  }
  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));

  // Totals breakdown
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices
    .filter((i) => ['sent', 'viewed'].includes(i.status))
    .reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  // Top clients by total paid
  const clientMap: Record<string, { name: string; paid: number }> = {};
  for (const inv of invoices) {
    if (inv.status === 'paid') {
      const key = inv.clientId || inv.clientName;
      if (!clientMap[key]) clientMap[key] = { name: inv.clientName, paid: 0 };
      clientMap[key].paid += inv.amount;
    }
  }
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.paid - a.paid)
    .slice(0, 5);

  res.json({ monthly, totals: { paid: totalPaid, outstanding: totalOutstanding, overdue: totalOverdue }, topClients });
});

export default router;
