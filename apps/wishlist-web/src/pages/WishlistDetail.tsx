import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistsApi } from "../api/wishlists";
import { itemsApi } from "../api/items";
import ItemCard from "../components/ItemCard";
import AddItemModal from "../components/AddItemModal";
import { setWishlistDetailPageTitle } from "../utils/metaTags";

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name';

export default function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const wishlistId = parseInt(id || "0");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const queryClient = useQueryClient();

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", wishlistId],
    queryFn: () => wishlistsApi.getById(wishlistId),
  });

  useEffect(() => {
    if (wishlist?.name) {
      setWishlistDetailPageTitle(wishlist.name);
    }
  }, [wishlist?.name]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["items", wishlistId],
    queryFn: () => wishlistsApi.getItems(wishlistId),
  });

  const deleteMutation = useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", wishlistId] });
    },
  });

  const handleDeleteItem = (itemId: number) => {
    deleteMutation.mutate(itemId);
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    if (!items) return [];
    const tagSet = new Set<string>();
    items.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  // Get all unique brands
  const allBrands = useMemo(() => {
    if (!items) return [];
    const brandSet = new Set<string>();
    items.forEach(item => {
      if (item.brand) brandSet.add(item.brand);
    });
    return Array.from(brandSet).sort();
  }, [items]);

  // Get filtered suggestions for search
  const searchSuggestions = useMemo(() => {
    if (!items || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    const suggestions = new Set<string>();

    items.forEach(item => {
      if (item.product_name.toLowerCase().includes(query)) {
        suggestions.add(item.product_name);
      }
      if (item.brand?.toLowerCase().includes(query)) {
        suggestions.add(item.brand);
      }
    });

    return Array.from(suggestions).slice(0, 10);
  }, [items, searchQuery]);

  // Get filtered brand suggestions
  const brandSuggestions = useMemo(() => {
    if (!allBrands.length || !filterBrand) return allBrands;
    const query = filterBrand.toLowerCase();
    return allBrands.filter(brand => brand.toLowerCase().includes(query));
  }, [allBrands, filterBrand]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    let filtered = [...items];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      );
    }

    // Apply brand filter
    if (filterBrand) {
      filtered = filtered.filter(item =>
        item.brand?.toLowerCase() === filterBrand.toLowerCase()
      );
    }

    // Apply tag filter
    if (filterTag) {
      filtered = filtered.filter(item =>
        item.tags?.some(tag => tag.name === filterTag)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-low':
          const priceA = a.sale_price || a.price || Infinity;
          const priceB = b.sale_price || b.price || Infinity;
          return Number(priceA) - Number(priceB);
        case 'price-high':
          const priceA2 = a.sale_price || a.price || 0;
          const priceB2 = b.sale_price || b.price || 0;
          return Number(priceB2) - Number(priceA2);
        case 'name':
          return a.product_name.localeCompare(b.product_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, sortBy, filterTag, filterBrand, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                ← Back
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                {wishlist?.name || "Wishlist"}
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters and Search */}
          {items && items.length > 0 && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search with autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                      placeholder="Search items..."
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6m0-6l6 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {showSearchDropdown && searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setShowSearchDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brand filter with autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Brand
                  </label>
                  <input
                    type="text"
                    value={filterBrand}
                    onChange={(e) => {
                      setFilterBrand(e.target.value);
                      setShowBrandDropdown(true);
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
                    placeholder="All brands..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showBrandDropdown && brandSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <button
                        onClick={() => {
                          setFilterBrand('');
                          setShowBrandDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-500 italic border-b"
                      >
                        All brands
                      </button>
                      {brandSuggestions.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => {
                            setFilterBrand(brand);
                            setShowBrandDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort by
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>

                {/* Filter by Tag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Tag
                  </label>
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Items</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active filters display */}
              {(searchQuery || filterBrand || filterTag) && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery('')}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filterBrand && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Brand: {filterBrand}
                      <button
                        onClick={() => setFilterBrand('')}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filterTag && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Tag: {filterTag}
                      <button
                        onClick={() => setFilterTag('')}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterBrand('');
                      setFilterTag('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Results count */}
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredAndSortedItems.length} of {items.length} items
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading items...</div>
            </div>
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No items match your filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterBrand('');
                  setFilterTag('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">This wishlist is empty.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first item
              </button>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddItemModal
          wishlistId={wishlistId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
