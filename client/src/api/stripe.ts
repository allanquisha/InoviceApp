import api from './client';
import axios from 'axios';

export interface StripeAccountStatus {
  connected: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  accountId?: string;
}

export interface SubscriptionStatus {
  planType: string;
  subscriptionId: string | null;
  subscriptionEnd: string | null;
  invoicesThisMonth: number;
  invoiceLimit: number | null;
}

export const startConnect = () =>
  api.post<{ url: string }>('/stripe/connect').then((r) => r.data.url);

export const getAccountStatus = () =>
  api.get<StripeAccountStatus>('/stripe/account').then((r) => r.data);

export const createPaymentIntent = (invoiceId: string) =>
  // Public endpoint — no auth header needed, use plain axios
  axios.post<{ clientSecret: string }>('/api/stripe/payment-intent', { invoiceId })
    .then((r) => r.data.clientSecret);

export const subscribe = () =>
  api.post<{ url: string }>('/stripe/subscribe').then((r) => r.data.url);

export const getSubscription = () =>
  api.get<SubscriptionStatus>('/stripe/subscription').then((r) => r.data);

export const getBillingPortal = () =>
  api.post<{ url: string }>('/stripe/billing-portal').then((r) => r.data.url);

export const updateSmsEnabled = (smsEnabled: boolean) =>
  api.post('/stripe/settings/sms', { smsEnabled }).then((r) => r.data);
