import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../src/pages/Dashboard';

// Mock the auth hook
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

// Mock the wishlistsApi
vi.mock('../../src/api/wishlists', () => ({
  wishlistsApi: {
    getAll: vi.fn().mockResolvedValue([
      { id: 1, user_id: 1, name: 'Holiday Gifts', created_at: '2024-01-01', updated_at: '2024-01-01' },
      { id: 2, user_id: 1, name: 'Electronics', created_at: '2024-01-02', updated_at: '2024-01-02' },
    ]),
    create: vi.fn().mockResolvedValue({ id: 3, name: 'New List', user_id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1, name: 'Updated Name', user_id: 1 }),
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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wishlist Display', () => {
    it('renders wishlists from API', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });
    });

    it('shows View All Items button', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /View All Items/i })).toBeInTheDocument();
      });
    });

    it('has correct link to all items page', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const allItemsLink = screen.getByRole('link', { name: /View All Items/i });
        expect(allItemsLink).toHaveAttribute('href', '/all-items');
      });
    });
  });

  describe('Edit Wishlist Name', () => {
    it('shows edit button for each wishlist', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /Edit/i });
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens edit modal when clicking edit button', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Wishlist')).toBeInTheDocument();
      });
    });

    it('pre-fills edit modal with current wishlist name', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Wishlist name.../i);
        expect(input).toHaveValue('Holiday Gifts');
      });
    });

    it('closes edit modal when clicking cancel', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Wishlist')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Edit Wishlist')).not.toBeInTheDocument();
      });
    });

    it('calls update API when saving edited name', async () => {
      const { wishlistsApi } = await import('../../src/api/wishlists');

      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Wishlist')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Wishlist name.../i);
      await userEvent.clear(input);
      await userEvent.type(input, 'Updated Wishlist Name');

      const saveButton = screen.getByRole('button', { name: /Save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(wishlistsApi.update).toHaveBeenCalledWith(1, 'Updated Wishlist Name');
      });
    });

    it('disables save button when name is empty', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Wishlist')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Wishlist name.../i);
      await userEvent.clear(input);

      const saveButton = screen.getByRole('button', { name: /Save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Delete Wishlist Modal', () => {
    it('shows delete button for each wishlist', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens confirmation modal when clicking delete', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete "Holiday Gifts"\?/)).toBeInTheDocument();
      });
    });

    it('closes delete modal when clicking cancel', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });

      // Find cancel button in modal (there are multiple Cancel buttons)
      const modalCancelButton = screen.getAllByRole('button', { name: /Cancel/i })[0];
      fireEvent.click(modalCancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
      });
    });

    it('calls delete API when confirming deletion', async () => {
      const { wishlistsApi } = await import('../../src/api/wishlists');

      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Holiday Gifts')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });

      // Find the delete confirmation button in modal
      const confirmDeleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      const confirmButton = confirmDeleteButtons[confirmDeleteButtons.length - 1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(wishlistsApi.delete).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Create Wishlist', () => {
    it('shows create button', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create New Wishlist/i })).toBeInTheDocument();
      });
    });

    it('shows create form when clicking create button', async () => {
      render(<Dashboard />, { wrapper: createWrapper() });

      const createButton = screen.getByRole('button', { name: /Create New Wishlist/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Wishlist name.../i)).toBeInTheDocument();
      });
    });
  });
});
