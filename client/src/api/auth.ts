import api from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  stripeId?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const register = (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) => api.post<AuthResponse>('/auth/register', data).then((r) => r.data);

export const login = (data: { email: string; password: string }) =>
  api.post<AuthResponse>('/auth/login', data).then((r) => r.data);

export const getMe = () =>
  api.get<{ user: User }>('/auth/me').then((r) => r.data.user);
