import axios from 'axios';
import api from './client';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  clientId?: string | null;
  amount: number;
  currency: string;
  description?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue';
  invoiceType?: string;
  depositPercent?: number | null;
  depositInvoiceId?: string | null;
  smsReminders?: boolean;
  dueDate?: string;
  issueDate: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientId?: string;
  smsReminders?: boolean;
  description?: string;
  notes?: string;
  dueDate?: string;
  currency?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

export const listInvoices = () =>
  api.get<{ invoices: Invoice[] }>('/invoices').then((r) => r.data.invoices);

export const getInvoice = (id: string) =>
  api.get<{ invoice: Invoice }>(`/invoices/${id}`).then((r) => r.data.invoice);

export const createInvoice = (data: InvoiceInput) =>
  api.post<{ invoice: Invoice }>('/invoices', data).then((r) => r.data.invoice);

export const updateInvoice = (id: string, data: Partial<InvoiceInput> & { status?: string }) =>
  api.patch<{ invoice: Invoice }>(`/invoices/${id}`, data).then((r) => r.data.invoice);

export const deleteInvoice = (id: string) =>
  api.delete(`/invoices/${id}`);

// Public — no auth required (used on the /pay/:id page)
export const getPublicInvoice = (id: string) =>
  axios.get<{ invoice: Invoice }>(`/api/public/invoices/${id}`).then((r) => r.data.invoice);
