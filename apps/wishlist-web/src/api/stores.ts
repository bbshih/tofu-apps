import { apiClient } from './client';
import { Store, CreateStoreRequest, UpdateStoreRequest } from '../types';

export const storesApi = {
  getAll: async (): Promise<Store[]> => {
    const response = await apiClient.get('/stores');
    return response.data;
  },

  get: async (id: number): Promise<Store> => {
    const response = await apiClient.get(`/stores/${id}`);
    return response.data;
  },

  getByName: async (name: string): Promise<Store | null> => {
    try {
      const response = await apiClient.get(`/stores/by-name/${encodeURIComponent(name)}`);
      return response.data;
    } catch {
      return null;
    }
  },

  create: async (data: CreateStoreRequest): Promise<Store> => {
    const response = await apiClient.post('/stores', data);
    return response.data;
  },

  update: async (id: number, data: UpdateStoreRequest): Promise<Store> => {
    const response = await apiClient.put(`/stores/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/stores/${id}`);
  },
};
