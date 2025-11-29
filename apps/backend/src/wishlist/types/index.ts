import { Request } from 'express';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Wishlist {
  id: number;
  user_id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
}

export interface ItemWithTags extends Item {
  tags: Tag[];
}

export interface ScrapedProduct {
  product_name: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  currency?: string;
  image_url?: string;
  site_name: string;
}

// WishlistAuthRequest - using generic Request with user typed inline
// to avoid conflicts with seacalendar auth types
export interface WishlistAuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}
