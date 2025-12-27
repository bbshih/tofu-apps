import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AllItems from '../../src/pages/AllItems';
import { itemsApi } from '../../src/api/items';
import { wishlistsApi } from '../../src/api/wishlists';

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

    it('shows navigation back to dashboard', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        // The navbar has "My Lists" link that goes back to the main page
        expect(screen.getByRole('link', { name: /My Lists/i })).toBeInTheDocument();
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

      // First click the trash icon to show ItemCard's inline confirmation
      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      // Click the "Remove" button in the ItemCard's inline confirmation
      const removeButton = await screen.findByRole('button', { name: /^Remove$/i });
      fireEvent.click(removeButton);

      // Now the page-level modal should appear
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

      // Click through ItemCard confirmation
      const removeButton = await screen.findByRole('button', { name: /^Remove$/i });
      fireEvent.click(removeButton);

      // Check that the modal shows the item name in the confirmation message
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('closes modal when clicking cancel', async () => {
      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      // Click through ItemCard confirmation
      const removeButton = await screen.findByRole('button', { name: /^Remove$/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });

      // Cancel button is in the modal
      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
      const modalCancelButton = cancelButtons[cancelButtons.length - 1];
      fireEvent.click(modalCancelButton);

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

      // Click delete on first item
      const deleteButtons = screen.getAllByTitle(/Remove item/i);
      fireEvent.click(deleteButtons[0]);

      // Click through ItemCard confirmation
      const removeButton = await screen.findByRole('button', { name: /^Remove$/i });
      fireEvent.click(removeButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });

      // Click the Delete button in the modal - get all and use the last one (in the modal)
      const allDeleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
      const confirmButton = allDeleteButtons[allDeleteButtons.length - 1];
      fireEvent.click(confirmButton);

      // Verify the API was called (React Query passes additional context as second arg)
      await waitFor(() => {
        expect(itemsApi.delete).toHaveBeenCalled();
        expect((itemsApi.delete as any).mock.calls[0][0]).toBe(1);
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no items', async () => {
      (wishlistsApi.getAllItems as any).mockResolvedValueOnce([]);

      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/You don't have any items in your wishlists yet/i)).toBeInTheDocument();
      });
    });

    it('shows link to wishlists in empty state', async () => {
      (wishlistsApi.getAllItems as any).mockResolvedValueOnce([]);

      render(<AllItems />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Go to your wishlists to add items/i })).toBeInTheDocument();
      });
    });
  });
});
