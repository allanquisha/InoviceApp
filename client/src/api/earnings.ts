import api from './client';

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface TopClient {
  name: string;
  paid: number;
}

export interface EarningsData {
  monthly: MonthlyRevenue[];
  totals: { paid: number; outstanding: number; overdue: number };
  topClients: TopClient[];
}

export const getEarnings = () =>
  api.get<EarningsData>('/earnings').then((r) => r.data);
