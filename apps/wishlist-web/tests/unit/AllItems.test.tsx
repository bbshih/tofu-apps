import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AllItems from '../../src/pages/AllItems';

// Mock the auth hook
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

// Mock the APIs
vi.mock('../../src/api/wishlists', () => ({
  wishlistsApi: {
    getAllItems: vi.fn().mockResolvedValue([
      {
        id: 1,
        wishlist_id: 1,
        product_name: 'Wireless Headphones',
        brand: 'TechBrand',
        price: 99.99,
        sale_price: 79.99,
        currency: 'USD',
        original_url: 'https://example.com/product',
        image_path: 'test-image.jpg',
        notes: 'Great sound',
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
        image_path: 'mouse.jpg',
        notes: '',
        tags: [],
        wishlist_name: 'Electronics',
      },
      {
        id: 3,
        wishlist_id: 1,
        product_name: 'Item Without URL',
        brand: null,
        price: null,
        sale_price: null,
        currency: 'USD',
        original_url: null,
        image_path: null,
        notes: 'Just an idea',
        tags: [],
        wishlist_name: 'Holiday Gifts',
      },
    ]),
  },
}));

vi.mock('../../src/api/items', () => ({
  itemsApi: {
    delete: vi.fn().mockResolvedValue({}),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AllItems Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Layout', () => {
    it('renders the page title', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('All Items')).toBeInTheDocument();
      });
    });

    it('shows back to wishlists link', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Back to Wishlists/i)).toBeInTheDocument();
      });
    });

    it('displays subtitle', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/All Items Across Your Wishlists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Items Display', () => {
    it('displays all items from API', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
        expect(screen.getByText('Gaming Mouse')).toBeInTheDocument();
        expect(screen.getByText('Item Without URL')).toBeInTheDocument();
      });
    });

    it('shows item count', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 items/i)).toBeInTheDocument();
      });
    });

    it('displays wishlist name badges for items', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        const holidayGiftsBadges = screen.getAllByText('Holiday Gifts');
        expect(holidayGiftsBadges.length).toBeGreaterThan(0);
      });
    });

    it('wishlist badges link to their wishlist', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        const holidayGiftsLinks = screen.getAllByRole('link', { name: 'Holiday Gifts' });
        expect(holidayGiftsLinks[0]).toHaveAttribute('href', '/wishlist/1');
      });
    });
  });

  describe('Items Without URL', () => {
    it('displays items without URL correctly', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Item Without URL')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Confirmation Modal', () => {
    it('shows delete confirmation when clicking delete', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      });

      // Find delete buttons (there are multiple, one per item)
      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });
    });

    it('shows item name in delete confirmation', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Wireless Headphones/)).toBeInTheDocument();
      });
    });

    it('closes modal when clicking cancel', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
      });
    });

    it('calls delete API when confirming', async () => {
      const { itemsApi } = await import('../../src/api/items');

      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(itemsApi.delete).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no items', async () => {
      const { wishlistsApi } = await import('../../src/api/wishlists');
      (wishlistsApi.getAllItems as any).mockResolvedValueOnce([]);

      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/You don't have any items in your wishlists yet/i)).toBeInTheDocument();
      });
    });

    it('shows link to wishlists in empty state', async () => {
      const { wishlistsApi } = await import('../../src/api/wishlists');
      (wishlistsApi.getAllItems as any).mockResolvedValueOnce([]);

      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Go to your wishlists to add items/i })).toBeInTheDocument();
      });
    });
  });
});
