import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddItemModal from '../../src/components/AddItemModal';

// Mock the API modules
vi.mock('../../src/api/items', () => ({
  itemsApi: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/api/tags', () => ({
  tagsApi: {
    getAll: vi.fn().mockResolvedValue([
      { id: 1, name: 'electronics' },
      { id: 2, name: 'gifts' },
      { id: 3, name: 'clothing' },
    ]),
  },
}));

vi.mock('../../src/api/wishlists', () => ({
  wishlistsApi: {
    getItems: vi.fn().mockResolvedValue([
      { brand: 'Apple' },
      { brand: 'Samsung' },
    ]),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AddItemModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('renders without URL being required', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const urlInput = screen.getByPlaceholderText(/https:\/\/\.\.\. \(optional\)/i);
      expect(urlInput).not.toHaveAttribute('required');
    });

    it('shows product name as required when URL is empty', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Product name should show required indicator when URL is empty
      expect(screen.getByText('Product Name')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('shows product name field with helpful text', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Required when no URL is provided/i)).toBeInTheDocument();
    });

    it('allows adding item with only product name (no URL)', async () => {
      const { itemsApi } = await import('../../src/api/items');
      (itemsApi.create as any).mockResolvedValueOnce({
        id: 1,
        product_name: 'Test Product',
        wishlist_id: 1,
      });

      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const productNameInput = screen.getByPlaceholderText(/Enter product name.../i);
      await userEvent.type(productNameInput, 'My Wish Item');

      const submitButton = screen.getByRole('button', { name: /Add Item/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(itemsApi.create).toHaveBeenCalled();
        const callArg = (itemsApi.create as any).mock.calls[0][0];
        expect(callArg.wishlist_id).toBe(1);
        expect(callArg.product_name).toBe('My Wish Item');
      });
    });
  });

  describe('Tag Search/Select Dropdown', () => {
    it('renders tag input with search placeholder', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText(/Search or add a tag.../i)).toBeInTheDocument();
    });

    it('shows tag suggestions when typing', async () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const tagInput = screen.getByPlaceholderText(/Search or add a tag.../i);
      await userEvent.type(tagInput, 'elec');

      await waitFor(() => {
        expect(screen.getByText('electronics')).toBeInTheDocument();
      });
    });

    it('filters tag suggestions based on input', async () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const tagInput = screen.getByPlaceholderText(/Search or add a tag.../i);
      await userEvent.type(tagInput, 'gift');

      await waitFor(() => {
        expect(screen.getByText('gifts')).toBeInTheDocument();
      });

      // Electronics should not appear when filtering for "gift"
      expect(screen.queryByText('electronics')).not.toBeInTheDocument();
    });

    it('adds tag when clicking on suggestion', async () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const tagInput = screen.getByPlaceholderText(/Search or add a tag.../i);
      await userEvent.click(tagInput);

      await waitFor(() => {
        expect(screen.getByText('electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('electronics'));

      // Tag should appear as selected
      await waitFor(() => {
        const selectedTags = screen.getAllByText('electronics');
        expect(selectedTags.length).toBeGreaterThan(0);
      });
    });

    it('creates new tag when pressing Enter with new text', async () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const tagInput = screen.getByPlaceholderText(/Search or add a tag.../i);
      await userEvent.type(tagInput, 'newtag{enter}');

      await waitFor(() => {
        expect(screen.getByText('newtag')).toBeInTheDocument();
      });
    });

    it('removes tag when clicking x button', async () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Add a tag first
      const tagInput = screen.getByPlaceholderText(/Search or add a tag.../i);
      await userEvent.type(tagInput, 'testtag{enter}');

      await waitFor(() => {
        expect(screen.getByText('testtag')).toBeInTheDocument();
      });

      // Find and click the remove button
      const removeButton = screen.getByText('×');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('testtag')).not.toBeInTheDocument();
      });
    });

    it('shows help text for tag input', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/Type to search existing tags or press Enter to create a new one/i)).toBeInTheDocument();
    });
  });

  describe('Brand Dropdown', () => {
    it('renders brand input', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByPlaceholderText(/Brand name.../i)).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      render(
        <AddItemModal wishlistId={1} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Find the close button by its SVG
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});
