import { apiClient } from './client';
import { Wishlist, Item } from '../types';

export const wishlistsApi = {
  getAll: async (): Promise<Wishlist[]> => {
    const response = await apiClient.get<Wishlist[]>('/wishlist/wishlists');
    return response.data;
  },

  getById: async (id: number): Promise<Wishlist> => {
    const response = await apiClient.get<Wishlist>(`/wishlist/wishlists/${id}`);
    return response.data;
  },

  create: async (name: string): Promise<Wishlist> => {
    const response = await apiClient.post<Wishlist>('/wishlist/wishlists', { name });
    return response.data;
  },

  update: async (id: number, name: string): Promise<Wishlist> => {
    const response = await apiClient.put<Wishlist>(`/wishlist/wishlists/${id}`, { name });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/wishlist/wishlists/${id}`);
  },

  getItems: async (id: number): Promise<Item[]> => {
    const response = await apiClient.get<Item[]>(`/wishlist/wishlists/${id}/items`);
    return response.data;
  },
};
