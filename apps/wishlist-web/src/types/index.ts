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
