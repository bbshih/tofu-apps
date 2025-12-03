import { apiClient } from './client';
import { AuthResponse } from '../types';

export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },
};
