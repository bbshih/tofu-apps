import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createItem } from '../../src/wishlist/controllers/itemController.js';

// Mock the database query function
vi.mock('../../src/wishlist/db.js', () => ({
  query: vi.fn(),
}));

// Mock the scraper service
vi.mock('../../src/wishlist/services/scraperService.js', () => ({
  scrapeProduct: vi.fn(),
}));

// Mock the image downloader
vi.mock('../../src/wishlist/utils/imageDownloader.js', () => ({
  downloadAndSaveImage: vi.fn().mockResolvedValue('downloaded-image.jpg'),
}));

describe('itemController', () => {
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

  describe('createItem', () => {
    describe('Validation', () => {
      it('requires wishlist_id', async () => {
        mockRequest = {
          body: {
            url: 'https://example.com/product',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseJson).toEqual({ error: 'Wishlist ID is required' });
      });

      it('requires either URL or product_name', async () => {
        mockRequest = {
          body: {
            wishlist_id: 1,
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(responseJson).toEqual({ error: 'Either URL or product name is required' });
      });

      it('accepts item with URL only', async () => {
        const { query } = await import('../../src/wishlist/db.js');
        const { scrapeProduct } = await import('../../src/wishlist/services/scraperService.js');

        // Mock wishlist exists check
        (query as any).mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });
        // Mock scrape
        (scrapeProduct as any).mockResolvedValueOnce({
          product_name: 'Scraped Product',
          brand: 'TestBrand',
          price: 99.99,
          currency: 'USD',
        });
        // Mock no exact URL match
        (query as any).mockResolvedValueOnce({ rows: [] });
        // Mock no similar URL match
        (query as any).mockResolvedValueOnce({ rows: [] });
        // Mock insert
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'Scraped Product' }],
        });

        mockRequest = {
          body: {
            wishlist_id: 1,
            url: 'https://example.com/product',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).not.toHaveBeenCalledWith(400);
      });

      it('accepts item with product_name only (no URL)', async () => {
        const { query } = await import('../../src/wishlist/db.js');

        // Mock wishlist exists check
        (query as any).mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });
        // Mock insert (no URL means no duplicate check, no scraping)
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'My Wish Item' }],
        });

        mockRequest = {
          body: {
            wishlist_id: 1,
            product_name: 'My Wish Item',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).not.toHaveBeenCalledWith(400);
      });

      it('accepts item with both URL and product_name', async () => {
        const { query } = await import('../../src/wishlist/db.js');

        // Mock wishlist exists check
        (query as any).mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });
        // Mock no exact URL match
        (query as any).mockResolvedValueOnce({ rows: [] });
        // Mock no similar URL match
        (query as any).mockResolvedValueOnce({ rows: [] });
        // Mock insert
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'Custom Name' }],
        });

        mockRequest = {
          body: {
            wishlist_id: 1,
            url: 'https://example.com/product',
            product_name: 'Custom Name',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).not.toHaveBeenCalledWith(400);
      });
    });

    describe('Wishlist verification', () => {
      it('returns 404 if wishlist not found', async () => {
        const { query } = await import('../../src/wishlist/db.js');

        // Mock wishlist not found
        (query as any).mockResolvedValueOnce({ rows: [] });

        mockRequest = {
          body: {
            wishlist_id: 999,
            product_name: 'Test Product',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(responseJson).toEqual({ error: 'Wishlist not found' });
      });
    });

    describe('Duplicate checking', () => {
      it('skips duplicate check when no URL provided', async () => {
        const { query } = await import('../../src/wishlist/db.js');

        // Mock wishlist exists
        (query as any).mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });
        // Mock insert (should go directly here, no duplicate checks)
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'No URL Item' }],
        });
        // Mock final query to get item with tags
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'No URL Item', tags: [] }],
        });

        mockRequest = {
          body: {
            wishlist_id: 1,
            product_name: 'No URL Item',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        // Should have 3 calls: wishlist check, insert, and final query for tags
        // No duplicate check queries (exact URL match + similar URL match)
        expect(query).toHaveBeenCalledTimes(3);
      });

      it('skips duplicate check when force_add is true', async () => {
        const { query } = await import('../../src/wishlist/db.js');
        const { scrapeProduct } = await import('../../src/wishlist/services/scraperService.js');

        // Mock wishlist exists
        (query as any).mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });
        // Mock scrape
        (scrapeProduct as any).mockResolvedValueOnce({
          product_name: 'Scraped Product',
        });
        // Mock insert (should skip duplicate checks with force_add)
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'Scraped Product' }],
        });
        // Mock final query to get item with tags
        (query as any).mockResolvedValueOnce({
          rows: [{ id: 1, product_name: 'Scraped Product', tags: [] }],
        });

        mockRequest = {
          body: {
            wishlist_id: 1,
            url: 'https://example.com/product',
            force_add: true,
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        // Should have 3 calls: wishlist check, insert, and final query for tags
        // No duplicate check queries (exact URL match + similar URL match)
        expect(query).toHaveBeenCalledTimes(3);
      });
    });

    describe('Item creation with null URL', () => {
      it('inserts item with null original_url when no URL provided', async () => {
        const { query } = await import('../../src/wishlist/db.js');

        // Mock wishlist exists
        (query as any).mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] });
        // Mock insert
        (query as any).mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              wishlist_id: 1,
              product_name: 'Wish Item',
              original_url: null,
            },
          ],
        });

        mockRequest = {
          body: {
            wishlist_id: 1,
            product_name: 'Wish Item',
            notes: 'Just an idea',
          },
          user: { id: 1 },
        } as any;

        await createItem(mockRequest as any, mockResponse as Response);

        // Verify insert was called with null URL
        const insertCall = (query as any).mock.calls.find((call: any[]) =>
          call[0].includes('INSERT INTO items')
        );

        expect(insertCall).toBeDefined();
        // The 7th parameter should be the URL (null in this case)
        expect(insertCall[1][6]).toBeNull();
      });
    });
  });
});
