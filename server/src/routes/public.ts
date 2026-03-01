import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/public/invoices/:id — fetch invoice for payment page (no auth)
// Only returns fields the paying client needs — no user/account data
router.get('/invoices/:id', async (req: Request, res: Response): Promise<void> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      invoiceNo: true,
      clientName: true,
      clientEmail: true,
      amount: true,
      currency: true,
      description: true,
      status: true,
      dueDate: true,
      issueDate: true,
      notes: true,
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          amount: true,
        },
      },
    },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  res.json({ invoice });
});

export default router;
