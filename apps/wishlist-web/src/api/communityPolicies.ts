import { apiClient } from './client';
import {
  CommunityPolicy,
  CommunityPolicySearchResponse,
  CreateCommunityPolicyRequest,
  VerifyCommunityPolicyRequest,
  ReportCommunityPolicyRequest,
  ImportCommunityPolicyRequest,
  Store,
  PolicyScrapeResult,
} from '../types';

export const communityPoliciesApi = {
  search: async (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<CommunityPolicySearchResponse> => {
    const response = await apiClient.get('/community-policies', { params });
    return response.data;
  },

  getByDomain: async (domain: string): Promise<CommunityPolicy | null> => {
    try {
      const response = await apiClient.get(
        `/community-policies/domain/${encodeURIComponent(domain)}`
      );
      return response.data;
    } catch {
      return null;
    }
  },

  create: async (data: CreateCommunityPolicyRequest): Promise<CommunityPolicy> => {
    const response = await apiClient.post('/community-policies', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<CreateCommunityPolicyRequest>
  ): Promise<CommunityPolicy> => {
    const response = await apiClient.put(`/community-policies/${id}`, data);
    return response.data;
  },

  verify: async (
    id: number,
    data: VerifyCommunityPolicyRequest
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/community-policies/${id}/verify`, data);
    return response.data;
  },

  report: async (
    id: number,
    data: ReportCommunityPolicyRequest
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/community-policies/${id}/report`, data);
    return response.data;
  },

  importToStore: async (
    storeId: number,
    data: ImportCommunityPolicyRequest
  ): Promise<{ success: boolean; message: string; store: Store }> => {
    const response = await apiClient.post(
      `/community-policies/import/${storeId}`,
      data
    );
    return response.data;
  },

  scrape: async (domain: string): Promise<PolicyScrapeResult> => {
    const response = await apiClient.post('/community-policies/scrape', { domain });
    return response.data;
  },

  getPolicyPaths: async (): Promise<{
    return_policy_paths: string[];
    price_match_paths: string[];
  }> => {
    const response = await apiClient.get('/community-policies/policy-paths');
    return response.data;
  },

  parseHtml: async (data: {
    return_policy_html?: string;
    return_policy_url?: string;
    price_match_policy_html?: string;
    price_match_policy_url?: string;
  }): Promise<PolicyScrapeResult> => {
    const response = await apiClient.post('/community-policies/parse-html', data);
    return response.data;
  },
};
