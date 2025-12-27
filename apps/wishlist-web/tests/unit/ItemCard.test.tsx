import React from 'react';
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import ItemCard from "../../src/components/ItemCard";
import { Item } from "../../src/types";

// Wrapper to provide Router context for components using react-router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe("ItemCard", () => {
  const mockItem: Item = {
    id: 1,
    wishlist_id: 1,
    product_name: "Wireless Headphones",
    brand: "TechBrand",
    price: 99.99,
    sale_price: 79.99,
    currency: "USD",
    original_url: "https://example.com/product",
    site_name: "Amazon",
    image_path: "test-image.jpg",
    notes: "Great sound quality",
    ranking: 0,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    tags: [
      { id: 1, name: "electronics" },
      { id: 2, name: "audio" },
    ],
  };

  it("renders product information correctly", () => {
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    expect(screen.getByText("TechBrand")).toBeInTheDocument();
    // USD is converted to $ symbol
    expect(screen.getByText(/\$79\.99/)).toBeInTheDocument();
  });

  it("displays discount percentage when on sale", () => {
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
  });

  it("renders tags", () => {
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("electronics")).toBeInTheDocument();
    expect(screen.getByText("audio")).toBeInTheDocument();
  });

  it("renders notes when present", () => {
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("Great sound quality")).toBeInTheDocument();
  });

  it("calls onDelete when remove button is clicked", async () => {
    const user = userEvent.setup();
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={mockItem} onDelete={mockDelete} />);

    // First click shows the confirmation
    const removeButton = screen.getByTitle("Remove item");
    await user.click(removeButton);

    // Then click the "Remove" confirmation button
    const confirmButton = screen.getByRole("button", { name: /^remove$/i });
    await user.click(confirmButton);

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("renders without sale price", () => {
    const itemWithoutSale: Item = {
      ...mockItem,
      price: undefined,
      sale_price: 79.99,
    };
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={itemWithoutSale} onDelete={mockDelete} />);

    // USD is converted to $ symbol
    expect(screen.getByText(/\$79\.99/)).toBeInTheDocument();
    expect(screen.queryByText(/off/)).not.toBeInTheDocument();
  });

  it("renders without tags", () => {
    const itemWithoutTags: Item = {
      ...mockItem,
      tags: [],
    };
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={itemWithoutTags} onDelete={mockDelete} />);

    expect(screen.queryByText("electronics")).not.toBeInTheDocument();
  });

  it("renders without notes", () => {
    const itemWithoutNotes: Item = {
      ...mockItem,
      notes: undefined,
    };
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={itemWithoutNotes} onDelete={mockDelete} />);

    expect(screen.queryByText("Great sound quality")).not.toBeInTheDocument();
  });

  it("has correct product link", () => {
    const mockDelete = vi.fn();
    renderWithRouter(<ItemCard item={mockItem} onDelete={mockDelete} />);

    const productLinks = screen.getAllByRole("link");
    const productLink = productLinks.find(link => link.getAttribute("href") === mockItem.original_url);

    expect(productLink).toBeDefined();
    expect(productLink).toHaveAttribute("target", "_blank");
    expect(productLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  describe("Items Without URL", () => {
    const itemWithoutUrl: Item = {
      id: 2,
      wishlist_id: 1,
      product_name: "Wish Item Without URL",
      brand: undefined,
      price: undefined,
      sale_price: undefined,
      currency: "USD",
      original_url: null as any, // Simulate null URL
      site_name: undefined,
      image_path: undefined,
      notes: "Just an idea for now",
      ranking: 0,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      tags: [],
    };

    it("renders item without URL correctly", () => {
      const mockDelete = vi.fn();
      renderWithRouter(<ItemCard item={itemWithoutUrl} onDelete={mockDelete} />);

      expect(screen.getByText("Wish Item Without URL")).toBeInTheDocument();
    });

    it("does not render clickable link for product name when no URL", () => {
      const mockDelete = vi.fn();
      renderWithRouter(<ItemCard item={itemWithoutUrl} onDelete={mockDelete} />);

      // The product name should be a heading, not a link
      const productName = screen.getByText("Wish Item Without URL");
      expect(productName.tagName).toBe("H3");

      // Should not have a link wrapping the product name
      const parentElement = productName.closest("a");
      expect(parentElement).toBeNull();
    });

    it("does not render clickable image when no URL", () => {
      const mockDelete = vi.fn();
      renderWithRouter(<ItemCard item={itemWithoutUrl} onDelete={mockDelete} />);

      // The image area should not be wrapped in a link
      const noImageText = screen.getByText("No Image");
      const parentLink = noImageText.closest("a");
      expect(parentLink).toBeNull();
    });

    it("renders notes for item without URL", () => {
      const mockDelete = vi.fn();
      renderWithRouter(<ItemCard item={itemWithoutUrl} onDelete={mockDelete} />);

      expect(screen.getByText("Just an idea for now")).toBeInTheDocument();
    });

    it("still shows delete button for items without URL", () => {
      const mockDelete = vi.fn();
      renderWithRouter(<ItemCard item={itemWithoutUrl} onDelete={mockDelete} />);

      const removeButton = screen.getByTitle(/Remove item/i);
      expect(removeButton).toBeInTheDocument();
    });
  });
});
