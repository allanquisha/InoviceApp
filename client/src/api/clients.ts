import api from './client';

export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  invoices?: { amount: number; status: string }[];
  estimates?: { amount: number; status: string }[];
}

export interface ClientHistory {
  client: Client;
  stats: { totalBilled: number; totalPaid: number; outstanding: number };
  invoices: unknown[];
  estimates: unknown[];
}

export const listClients = () =>
  api.get<{ clients: Client[] }>('/clients').then((r) => r.data.clients);

export const createClient = (data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
}) => api.post<{ client: Client }>('/clients', data).then((r) => r.data.client);

export const getClient = (id: string) =>
  api.get<{ client: Client }>(`/clients/${id}`).then((r) => r.data.client);

export const updateClient = (id: string, data: Partial<{ name: string; email: string; phone: string; address: string; notes: string }>) =>
  api.patch<{ client: Client }>(`/clients/${id}`, data).then((r) => r.data.client);

export const deleteClient = (id: string) =>
  api.delete(`/clients/${id}`).then((r) => r.data);

export const getClientHistory = (id: string) =>
  api.get<ClientHistory>(`/clients/${id}/history`).then((r) => r.data);
