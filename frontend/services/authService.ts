import api from '@/lib/api';
import type { LoginResponse, PendingUser, SignupResponse } from '@/types/api';

export const authService = {
  async signup(email: string, password: string, fullName: string): Promise<SignupResponse> {
    const { data } = await api.post<SignupResponse>('/auth/signup', {
      email,
      password,
      full_name: fullName,
    });
    return data;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  async getPendingUsers(): Promise<PendingUser[]> {
    const { data } = await api.get<PendingUser[]>('/auth/pending-users');
    return data;
  },

  async approveUser(userId: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(`/auth/approve/${userId}`);
    return data;
  },

  async rejectUser(userId: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(`/auth/reject/${userId}`);
    return data;
  },
};
