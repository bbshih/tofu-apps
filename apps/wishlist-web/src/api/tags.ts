import { apiClient } from './client';
import { Tag } from '../types';

interface TagWithCount extends Tag {
  item_count: number;
}

export const tagsApi = {
  getAll: async (): Promise<TagWithCount[]> => {
    const response = await apiClient.get<TagWithCount[]>('/tags');
    return response.data;
  },

  create: async (name: string): Promise<Tag> => {
    const response = await apiClient.post<Tag>('/tags', { name });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tags/${id}`);
  },
};
