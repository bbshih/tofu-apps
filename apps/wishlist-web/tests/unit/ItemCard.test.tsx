import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemCard from "../../src/components/ItemCard";
import { Item } from "../../src/types";

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
    render(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("Wireless Headphones")).toBeInTheDocument();
    expect(screen.getByText("TechBrand")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText(/USD 79.99/)).toBeInTheDocument();
  });

  it("displays discount percentage when on sale", () => {
    const mockDelete = vi.fn();
    render(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText(/USD 99.99/)).toBeInTheDocument();
  });

  it("renders tags", () => {
    const mockDelete = vi.fn();
    render(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("electronics")).toBeInTheDocument();
    expect(screen.getByText("audio")).toBeInTheDocument();
  });

  it("renders notes when present", () => {
    const mockDelete = vi.fn();
    render(<ItemCard item={mockItem} onDelete={mockDelete} />);

    expect(screen.getByText("Great sound quality")).toBeInTheDocument();
  });

  it("calls onDelete when remove button is clicked", async () => {
    const user = userEvent.setup();
    const mockDelete = vi.fn();
    render(<ItemCard item={mockItem} onDelete={mockDelete} />);

    const removeButton = screen.getByRole("button", { name: /remove/i });
    await user.click(removeButton);

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("renders without sale price", () => {
    const itemWithoutSale: Item = {
      ...mockItem,
      price: undefined,
      sale_price: 79.99,
    };
    const mockDelete = vi.fn();
    render(<ItemCard item={itemWithoutSale} onDelete={mockDelete} />);

    expect(screen.getByText(/USD 79.99/)).toBeInTheDocument();
    expect(screen.queryByText(/off/)).not.toBeInTheDocument();
  });

  it("renders without tags", () => {
    const itemWithoutTags: Item = {
      ...mockItem,
      tags: [],
    };
    const mockDelete = vi.fn();
    render(<ItemCard item={itemWithoutTags} onDelete={mockDelete} />);

    expect(screen.queryByText("electronics")).not.toBeInTheDocument();
  });

  it("renders without notes", () => {
    const itemWithoutNotes: Item = {
      ...mockItem,
      notes: undefined,
    };
    const mockDelete = vi.fn();
    render(<ItemCard item={itemWithoutNotes} onDelete={mockDelete} />);

    expect(screen.queryByText("Great sound quality")).not.toBeInTheDocument();
  });

  it("has correct product link", () => {
    const mockDelete = vi.fn();
    render(<ItemCard item={mockItem} onDelete={mockDelete} />);

    const viewProductLink = screen.getByRole("link", { name: /view product/i });

    expect(viewProductLink).toHaveAttribute("href", mockItem.original_url);
    expect(viewProductLink).toHaveAttribute("target", "_blank");
    expect(viewProductLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
