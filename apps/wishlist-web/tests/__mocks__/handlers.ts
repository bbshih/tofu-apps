import { http, HttpResponse } from 'msw';
import type { CreateItemRequest } from '../../src/types';

const API_URL = 'http://localhost:3000/api';

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
    return HttpResponse.json([
      { id: 1, user_id: 1, name: 'Holiday Gifts', created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2, user_id: 1, name: 'Electronics', created_at: '2024-01-02', updated_at: '2024-01-02' },
    ]);
  }),

  http.post(`${API_URL}/wishlists`, async ({ request }) => {
    const body = await request.json() as CreateWishlistBody;
    return HttpResponse.json({
      id: 3,
      user_id: 1,
      name: body.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.get(`${API_URL}/wishlists/:id`, ({ params }) => {
    return HttpResponse.json({
      id: Number(params.id),
      user_id: 1,
      name: 'Test Wishlist',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    });
  }),

  http.delete(`${API_URL}/wishlists/:id`, () => {
    return HttpResponse.json({ message: 'Wishlist deleted successfully' });
  }),

  // Items handlers
  http.get(`${API_URL}/wishlists/:id/items`, () => {
    return HttpResponse.json([
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
      },
    ]);
  }),

  http.post(`${API_URL}/items`, async ({ request }) => {
    const body = await request.json() as CreateItemRequest;
    return HttpResponse.json({
      id: 2,
      wishlist_id: body.wishlist_id,
      product_name: 'New Product',
      brand: 'TestBrand',
      price: undefined,
      sale_price: 50.00,
      currency: 'USD',
      original_url: body.url,
      site_name: 'Generic',
      image_path: 'new-image.jpg',
      notes: body.notes || '',
      ranking: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: body.tags?.map((name: string, idx: number) => ({ id: idx + 10, name })) || [],
    }, { status: 201 });
  }),

  http.delete(`${API_URL}/items/:id`, () => {
    return HttpResponse.json({ message: 'Item deleted successfully' });
  }),

  // Tags handlers
  http.get(`${API_URL}/tags`, () => {
    return HttpResponse.json([
      { id: 1, name: 'electronics', user_id: 1, item_count: 3 },
      { id: 2, name: 'gifts', user_id: 1, item_count: 2 },
    ]);
  }),
];
