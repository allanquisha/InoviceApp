import api from './client';
import axios from 'axios';

export interface StripeAccountStatus {
  connected: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  accountId?: string;
}

export const startConnect = () =>
  api.post<{ url: string }>('/stripe/connect').then((r) => r.data.url);

export const getAccountStatus = () =>
  api.get<StripeAccountStatus>('/stripe/account').then((r) => r.data);

export const createPaymentIntent = (invoiceId: string) =>
  // Public endpoint — no auth header needed, use plain axios
  axios.post<{ clientSecret: string }>('/api/stripe/payment-intent', { invoiceId })
    .then((r) => r.data.clientSecret);
