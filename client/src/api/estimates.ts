import api from './client';

export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Estimate {
  id: string;
  estimateNo: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  description?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'converted';
  validUntil?: string;
  issueDate: string;
  invoiceId?: string;
  items: EstimateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EstimateInput {
  clientName: string;
  clientEmail: string;
  description?: string;
  notes?: string;
  validUntil?: string;
  currency?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

export const listEstimates = () =>
  api.get<{ estimates: Estimate[] }>('/estimates').then((r) => r.data.estimates);

export const getEstimate = (id: string) =>
  api.get<{ estimate: Estimate }>(`/estimates/${id}`).then((r) => r.data.estimate);

export const createEstimate = (data: EstimateInput) =>
  api.post<{ estimate: Estimate }>('/estimates', data).then((r) => r.data.estimate);

export const updateEstimate = (id: string, data: Partial<EstimateInput> & { status?: string }) =>
  api.patch<{ estimate: Estimate }>(`/estimates/${id}`, data).then((r) => r.data.estimate);

export const deleteEstimate = (id: string) =>
  api.delete(`/estimates/${id}`);

export const convertEstimate = (id: string, dueDate?: string) =>
  api.post<{ invoice: import('./invoices').Invoice }>(`/estimates/${id}/convert`, { dueDate })
    .then((r) => r.data.invoice);
