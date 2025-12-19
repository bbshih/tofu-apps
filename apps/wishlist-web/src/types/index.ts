export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Wishlist {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Item {
  id: number;
  wishlist_id: number;
  product_name: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  currency: string;
  original_url: string;
  site_name?: string;
  image_path?: string;
  notes?: string;
  ranking: number;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  wishlist_name?: string;
}

export interface CreateItemRequest {
  wishlist_id: number;
  url: string;
  product_name?: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  currency?: string;
  notes?: string;
  tags?: string[];
  force_add?: boolean;
}

export interface UpdateItemRequest {
  product_name?: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  notes?: string;
  ranking?: number;
  tags?: string[];
}

export interface Store {
  id: number;
  user_id: number;
  name: string;
  domain?: string;
  return_policy?: string;
  return_policy_url?: string;
  return_window_days?: number;
  price_match_policy?: string;
  price_match_policy_url?: string;
  price_match_window_days?: number;
  notes?: string;
  // Structured return policy fields
  free_returns?: boolean;
  free_return_shipping?: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only?: boolean;
  store_credit_only?: boolean;
  receipt_required?: boolean;
  original_packaging_required?: boolean;
  final_sale_items?: boolean;
  // Structured price match fields
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStoreRequest {
  name: string;
  domain?: string;
  return_policy?: string;
  return_policy_url?: string;
  return_window_days?: number;
  price_match_policy?: string;
  price_match_policy_url?: string;
  price_match_window_days?: number;
  notes?: string;
  // Structured return policy fields
  free_returns?: boolean;
  free_return_shipping?: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only?: boolean;
  store_credit_only?: boolean;
  receipt_required?: boolean;
  original_packaging_required?: boolean;
  final_sale_items?: boolean;
  // Structured price match fields
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
}

export interface UpdateStoreRequest {
  name?: string;
  domain?: string;
  return_policy?: string;
  return_policy_url?: string;
  return_window_days?: number;
  price_match_policy?: string;
  price_match_policy_url?: string;
  price_match_window_days?: number;
  notes?: string;
  // Structured return policy fields
  free_returns?: boolean;
  free_return_shipping?: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only?: boolean;
  store_credit_only?: boolean;
  receipt_required?: boolean;
  original_packaging_required?: boolean;
  final_sale_items?: boolean;
  // Structured price match fields
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
}

// Community Policy types
export interface CommunityPolicy {
  id: number;
  domain: string;
  name: string;
  return_window_days?: number;
  free_returns: boolean;
  free_return_shipping: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only: boolean;
  store_credit_only: boolean;
  receipt_required: boolean;
  original_packaging_required: boolean;
  final_sale_items: boolean;
  return_policy_url?: string;
  return_policy_notes?: string;
  price_match_window_days?: number;
  price_match_competitors: boolean;
  price_match_own_sales: boolean;
  price_match_policy_url?: string;
  price_match_policy_notes?: string;
  contributed_by?: number;
  verified_count: number;
  report_count: number;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityPolicySearchResponse {
  policies: CommunityPolicy[];
  total: number;
}

export interface CreateCommunityPolicyRequest {
  domain: string;
  name: string;
  return_window_days?: number;
  free_returns?: boolean;
  free_return_shipping?: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only?: boolean;
  store_credit_only?: boolean;
  receipt_required?: boolean;
  original_packaging_required?: boolean;
  final_sale_items?: boolean;
  return_policy_url?: string;
  return_policy_notes?: string;
  price_match_window_days?: number;
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
  price_match_policy_url?: string;
  price_match_policy_notes?: string;
}

export interface VerifyCommunityPolicyRequest {
  is_accurate: boolean;
  notes?: string;
}

export interface ReportCommunityPolicyRequest {
  reason: 'outdated' | 'incorrect' | 'spam' | 'other';
  details?: string;
}

export interface ImportCommunityPolicyRequest {
  community_policy_id: number;
  overwrite_existing?: boolean;
}

// Scraper types
export interface ScrapedPolicyData {
  return_window_days?: number;
  free_returns?: boolean;
  free_return_shipping?: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only?: boolean;
  store_credit_only?: boolean;
  receipt_required?: boolean;
  original_packaging_required?: boolean;
  final_sale_items?: boolean;
  return_policy_url?: string;
  return_policy_notes?: string;
  price_match_window_days?: number;
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
  price_match_policy_url?: string;
  price_match_policy_notes?: string;
}

export interface PolicyScrapeResult {
  success: boolean;
  data?: ScrapedPolicyData;
  return_policy_url?: string;
  price_match_policy_url?: string;
  extracted_text?: {
    return_policy?: string;
    price_match_policy?: string;
  };
  confidence?: {
    overall: number;
    fields: Record<string, number>;
  };
  warnings?: string[];
  error?: string;
}
