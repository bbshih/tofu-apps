import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { getAllItems, updateWishlist } from '../../src/wishlist/controllers/wishlistController.js';

// Mock the database query function
vi.mock('../../src/wishlist/db.js', () => ({
  query: vi.fn(),
}));

describe('wishlistController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: any;
  let responseStatus: number;

  beforeEach(() => {
    vi.clearAllMocks();
    responseJson = null;
    responseStatus = 200;

    mockResponse = {
      json: vi.fn((data) => {
        responseJson = data;
        return mockResponse as Response;
      }),
      status: vi.fn((code) => {
        responseStatus = code;
        return mockResponse as Response;
      }),
    };
  });

  describe('getAllItems', () => {
    it('returns all items across all wishlists for the user', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      const mockItems = [
        {
          id: 1,
          wishlist_id: 1,
          product_name: 'Item 1',
          wishlist_name: 'Wishlist A',
          tags: [],
        },
        {
          id: 2,
          wishlist_id: 2,
          product_name: 'Item 2',
          wishlist_name: 'Wishlist B',
          tags: [],
        },
      ];

      (query as any).mockResolvedValueOnce({ rows: mockItems });

      mockRequest = {
        user: { id: 1 },
      } as any;

      await getAllItems(mockRequest as any, mockResponse as Response);

      expect(responseJson).toEqual(mockItems);
    });

    it('includes wishlist_name in the response', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      const mockItems = [
        {
          id: 1,
          wishlist_id: 1,
          product_name: 'Test Item',
          wishlist_name: 'My Wishlist',
          tags: [],
        },
      ];

      (query as any).mockResolvedValueOnce({ rows: mockItems });

      mockRequest = {
        user: { id: 1 },
      } as any;

      await getAllItems(mockRequest as any, mockResponse as Response);

      expect(responseJson[0].wishlist_name).toBe('My Wishlist');
    });

    it('returns empty array when user has no items', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      (query as any).mockResolvedValueOnce({ rows: [] });

      mockRequest = {
        user: { id: 1 },
      } as any;

      await getAllItems(mockRequest as any, mockResponse as Response);

      expect(responseJson).toEqual([]);
    });

    it('filters items by user ID', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      (query as any).mockResolvedValueOnce({ rows: [] });

      mockRequest = {
        user: { id: 42 },
      } as any;

      await getAllItems(mockRequest as any, mockResponse as Response);

      // Verify the query was called with the user ID
      expect(query).toHaveBeenCalledWith(expect.stringContaining('w.user_id = $1'), [42]);
    });

    it('handles database errors gracefully', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      (query as any).mockRejectedValueOnce(new Error('Database connection failed'));

      mockRequest = {
        user: { id: 1 },
      } as any;

      await getAllItems(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseJson).toEqual({ _error: 'Failed to fetch all items' });
    });
  });

  describe('updateWishlist', () => {
    it('updates wishlist name successfully', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      const updatedWishlist = {
        id: 1,
        user_id: 1,
        name: 'Updated Name',
        updated_at: new Date().toISOString(),
      };

      (query as any).mockResolvedValueOnce({ rows: [updatedWishlist] });

      mockRequest = {
        params: { id: '1' },
        body: { name: 'Updated Name' },
        user: { id: 1 },
      } as any;

      await updateWishlist(mockRequest as any, mockResponse as Response);

      expect(responseJson).toEqual(updatedWishlist);
    });

    it('returns 400 if name is not provided', async () => {
      mockRequest = {
        params: { id: '1' },
        body: {},
        user: { id: 1 },
      } as any;

      await updateWishlist(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if wishlist not found', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      (query as any).mockResolvedValueOnce({ rows: [] });

      mockRequest = {
        params: { id: '999' },
        body: { name: 'New Name' },
        user: { id: 1 },
      } as any;

      await updateWishlist(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('only updates wishlists belonging to the user', async () => {
      const { query } = await import('../../src/wishlist/db.js');

      (query as any).mockResolvedValueOnce({ rows: [] });

      mockRequest = {
        params: { id: '1' },
        body: { name: 'New Name' },
        user: { id: 42 },
      } as any;

      await updateWishlist(mockRequest as any, mockResponse as Response);

      // Should include user_id in the WHERE clause
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $3'),
        expect.arrayContaining([42])
      );
    });
  });
});
