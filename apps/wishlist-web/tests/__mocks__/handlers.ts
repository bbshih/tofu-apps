import { http, HttpResponse } from 'msw';
import type { CreateItemRequest } from '../../src/types';

const API_URL = 'http://localhost:3000/api/wishlist';

interface RegisterBody {
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface CreateWishlistBody {
  name: string;
}

interface UpdateWishlistBody {
  name: string;
}

// Mock data store for tests
let mockWishlists = [
  { id: 1, user_id: 1, name: 'Holiday Gifts', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 2, user_id: 1, name: 'Electronics', created_at: '2024-01-02', updated_at: '2024-01-02' },
];

let mockItems = [
  {
    id: 1,
    wishlist_id: 1,
    product_name: 'Wireless Headphones',
    brand: 'TechBrand',
    price: 99.99,
    sale_price: 79.99,
    currency: 'USD',
    original_url: 'https://example.com/product',
    site_name: 'Amazon',
    image_path: 'test-image.jpg',
    notes: 'Great sound quality',
    ranking: 0,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    tags: [{ id: 1, name: 'electronics' }],
    wishlist_name: 'Holiday Gifts',
  },
  {
    id: 2,
    wishlist_id: 2,
    product_name: 'Gaming Mouse',
    brand: 'LogiTech',
    price: 79.99,
    sale_price: null,
    currency: 'USD',
    original_url: 'https://example.com/mouse',
    site_name: 'BestBuy',
    image_path: 'mouse-image.jpg',
    notes: '',
    ranking: 1,
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
    tags: [{ id: 1, name: 'electronics' }, { id: 2, name: 'gifts' }],
    wishlist_name: 'Electronics',
  },
  {
    id: 3,
    wishlist_id: 1,
    product_name: 'Wish Item (No URL)',
    brand: null,
    price: null,
    sale_price: null,
    currency: 'USD',
    original_url: null,
    site_name: null,
    image_path: null,
    notes: 'Just an idea for now',
    ranking: 0,
    created_at: '2024-01-03',
    updated_at: '2024-01-03',
    tags: [],
    wishlist_name: 'Holiday Gifts',
  },
];

const mockTags = [
  { id: 1, name: 'electronics', user_id: 1, item_count: 3 },
  { id: 2, name: 'gifts', user_id: 1, item_count: 2 },
  { id: 3, name: 'clothing', user_id: 1, item_count: 1 },
  { id: 4, name: 'home', user_id: 1, item_count: 0 },
];

// Helper to reset mock data
export const resetMockData = () => {
  mockWishlists = [
    { id: 1, user_id: 1, name: 'Holiday Gifts', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 2, user_id: 1, name: 'Electronics', created_at: '2024-01-02', updated_at: '2024-01-02' },
  ];
};

export const handlers = [
  // Auth handlers
  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as RegisterBody;
    return HttpResponse.json({
      user: { id: 1, email: body.email },
      token: 'mock-jwt-token',
    }, { status: 201 });
  }),

  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as LoginBody;
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: { id: 1, email: body.email },
        token: 'mock-jwt-token',
      });
    }
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Wishlists handlers
  http.get(`${API_URL}/wishlists`, () => {
    return HttpResponse.json(mockWishlists);
  }),

  http.post(`${API_URL}/wishlists`, async ({ request }) => {
    const body = await request.json() as CreateWishlistBody;
    const newWishlist = {
      id: mockWishlists.length + 1,
      user_id: 1,
      name: body.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockWishlists.push(newWishlist);
    return HttpResponse.json(newWishlist, { status: 201 });
  }),

  http.get(`${API_URL}/wishlists/:id`, ({ params }) => {
    const wishlist = mockWishlists.find(w => w.id === Number(params.id));
    if (!wishlist) {
      return HttpResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }
    return HttpResponse.json(wishlist);
  }),

  http.put(`${API_URL}/wishlists/:id`, async ({ params, request }) => {
    const body = await request.json() as UpdateWishlistBody;
    const wishlistIndex = mockWishlists.findIndex(w => w.id === Number(params.id));
    if (wishlistIndex === -1) {
      return HttpResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }
    mockWishlists[wishlistIndex] = {
      ...mockWishlists[wishlistIndex],
      name: body.name,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(mockWishlists[wishlistIndex]);
  }),

  http.delete(`${API_URL}/wishlists/:id`, ({ params }) => {
    const wishlistIndex = mockWishlists.findIndex(w => w.id === Number(params.id));
    if (wishlistIndex !== -1) {
      mockWishlists.splice(wishlistIndex, 1);
    }
    return HttpResponse.json({ message: 'Wishlist deleted successfully' });
  }),

  // All items endpoint (new)
  http.get(`${API_URL}/wishlists/items/all`, () => {
    return HttpResponse.json(mockItems);
  }),

  // Items handlers
  http.get(`${API_URL}/wishlists/:id/items`, ({ params }) => {
    const wishlistItems = mockItems.filter(item => item.wishlist_id === Number(params.id));
    return HttpResponse.json(wishlistItems);
  }),

  http.post(`${API_URL}/items`, async ({ request }) => {
    const body = await request.json() as CreateItemRequest;

    // Validate: either URL or product_name is required
    if (!body.url && !body.product_name) {
      return HttpResponse.json(
        { error: 'Either URL or product name is required' },
        { status: 400 }
      );
    }

    const newItem = {
      id: mockItems.length + 1,
      wishlist_id: body.wishlist_id,
      product_name: body.product_name || 'Scraped Product Name',
      brand: body.brand || null,
      price: body.price || null,
      sale_price: body.sale_price || null,
      currency: body.currency || 'USD',
      original_url: body.url || null,
      site_name: body.url ? 'Generic' : null,
      image_path: body.url ? 'new-image.jpg' : null,
      notes: body.notes || '',
      ranking: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: body.tags?.map((name: string, idx: number) => ({ id: idx + 10, name })) || [],
    };
    mockItems.push(newItem as any);
    return HttpResponse.json(newItem, { status: 201 });
  }),

  http.delete(`${API_URL}/items/:id`, ({ params }) => {
    const itemIndex = mockItems.findIndex(item => item.id === Number(params.id));
    if (itemIndex !== -1) {
      mockItems.splice(itemIndex, 1);
    }
    return HttpResponse.json({ message: 'Item deleted successfully' });
  }),

  http.put(`${API_URL}/items/:id`, async ({ params, request }) => {
    const body = await request.json() as Partial<CreateItemRequest>;
    const itemIndex = mockItems.findIndex(item => item.id === Number(params.id));
    if (itemIndex === -1) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    mockItems[itemIndex] = {
      ...mockItems[itemIndex],
      ...body,
      updated_at: new Date().toISOString(),
    } as any;
    return HttpResponse.json(mockItems[itemIndex]);
  }),

  // Tags handlers
  http.get(`${API_URL}/tags`, () => {
    return HttpResponse.json(mockTags);
  }),
];
