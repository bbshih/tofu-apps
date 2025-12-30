import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ScrapedData {
  product_name?: string;
  brand?: string;
  price?: number;
  sale_price?: number;
  image_url?: string;
  currency?: string;
}

interface ExistingItem {
  id: number;
  product_name: string;
  brand: string | null;
  price: number | null;
  sale_price: number | null;
  currency: string;
  image_path: string | null;
  wishlist_id: number;
  wishlist_name: string;
  original_url: string;
  created_at: string;
  updated_at: string;
}

export default function BookmarkletAdd() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const token = searchParams.get('token');
  const url = searchParams.get('url');
  const dataParam = searchParams.get('data');

  const [selectedWishlistId, setSelectedWishlistId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  // Parse scraped data from URL
  const scrapedData: ScrapedData = dataParam ? JSON.parse(decodeURIComponent(dataParam)) : {};

  // Check if item already exists
  const { data: existingData, isLoading: checkingExisting } = useQuery({
    queryKey: ['bookmarklet-check-existing', token, url],
    queryFn: async () => {
      const response = await fetch(`/api/wishlist/bookmarklet/check-existing?token=${encodeURIComponent(token || '')}&url=${encodeURIComponent(url || '')}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data as { exists: boolean; item?: ExistingItem };
    },
    enabled: !!token && !!url,
  });

  // Fetch wishlists using the token
  const { data: wishlists, isLoading: loadingWishlists, error } = useQuery({
    queryKey: ['bookmarklet-wishlists', token],
    queryFn: async () => {
      const response = await fetch(`/api/wishlist/bookmarklet/wishlists?token=${encodeURIComponent(token || '')}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.wishlists;
    },
    enabled: !!token,
  });

  const isLoading = checkingExisting || loadingWishlists;

  // Set default wishlist when loaded
  useEffect(() => {
    if (wishlists?.length > 0 && !selectedWishlistId) {
      // If existing item, default to its wishlist
      if (existingData?.exists && existingData.item) {
        setSelectedWishlistId(existingData.item.wishlist_id);
      } else {
        setSelectedWishlistId(wishlists[0].id);
      }
    }
  }, [wishlists, selectedWishlistId, existingData]);

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/wishlist/bookmarklet/create-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.wishlist;
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['bookmarklet-wishlists', token] });
      setSelectedWishlistId(newList.id);
      setShowCreateForm(false);
      setNewListName('');
      setStatus({ type: 'success', message: 'List created!' });
    },
    onError: (err: Error) => {
      setStatus({ type: 'error', message: err.message });
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/wishlist/bookmarklet/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          url,
          wishlist_id: selectedWishlistId,
          scraped_data: scrapedData,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setStatus({ type: 'success', message: 'Item added!' });
      setTimeout(() => window.close(), 1500);
    },
    onError: (err: Error) => {
      setStatus({ type: 'error', message: err.message });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async () => {
      if (!existingData?.item) throw new Error('No existing item');
      const response = await fetch('/api/wishlist/bookmarklet/update-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          item_id: existingData.item.id,
          scraped_data: scrapedData,
          move_to_wishlist_id: selectedWishlistId !== existingData.item.wishlist_id ? selectedWishlistId : undefined,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setStatus({ type: 'success', message: 'Item updated!' });
      setTimeout(() => window.close(), 1500);
    },
    onError: (err: Error) => {
      setStatus({ type: 'error', message: err.message });
    },
  });

  const handleCreateList = () => {
    if (newListName.trim()) {
      createListMutation.mutate(newListName.trim());
    }
  };

  const handleAddItem = () => {
    if (selectedWishlistId) {
      addItemMutation.mutate();
    }
  };

  const handleUpdateItem = () => {
    updateItemMutation.mutate();
  };

  // Helper to check if a value changed
  const hasChange = (oldVal: any, newVal: any) => {
    if (oldVal == null && newVal == null) return false;
    if (oldVal == null || newVal == null) return true;
    return oldVal !== newVal;
  };

  // Helper to format price
  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return '-';
    return `$${price.toFixed(2)}`;
  };

  // Error states
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-4">X</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid Request</h2>
          <p className="text-gray-600 mb-4">Missing authentication token.</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-4xl mb-4">X</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{(error as Error).message}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Existing item found - show comparison
  if (existingData?.exists && existingData.item) {
    const existing = existingData.item;
    const nameChanged = hasChange(existing.product_name, scrapedData.product_name);
    const brandChanged = hasChange(existing.brand, scrapedData.brand);
    const priceChanged = hasChange(existing.price, scrapedData.price);
    const salePriceChanged = hasChange(existing.sale_price, scrapedData.sale_price);
    const hasAnyChange = nameChanged || brandChanged || priceChanged || salePriceChanged || scrapedData.image_url;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Item Already Exists</h2>
          <p className="text-sm text-gray-600 mb-4">
            This item is already in <span className="font-medium">{existing.wishlist_name}</span>
          </p>

          {/* Comparison table */}
          <div className="mb-4 border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Field</th>
                  <th className="px-3 py-2 text-left text-gray-600">Current</th>
                  <th className="px-3 py-2 text-left text-gray-600">New</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className={nameChanged ? 'bg-yellow-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-700">Name</td>
                  <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">{existing.product_name || '-'}</td>
                  <td className={`px-3 py-2 truncate max-w-[120px] ${nameChanged ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {scrapedData.product_name || '-'}
                  </td>
                </tr>
                <tr className={brandChanged ? 'bg-yellow-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-700">Brand</td>
                  <td className="px-3 py-2 text-gray-600">{existing.brand || '-'}</td>
                  <td className={`px-3 py-2 ${brandChanged ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {scrapedData.brand || '-'}
                  </td>
                </tr>
                <tr className={priceChanged ? 'bg-yellow-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-700">Price</td>
                  <td className="px-3 py-2 text-gray-600">{formatPrice(existing.price)}</td>
                  <td className={`px-3 py-2 ${priceChanged ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {formatPrice(scrapedData.price)}
                  </td>
                </tr>
                <tr className={salePriceChanged ? 'bg-yellow-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-700">Sale Price</td>
                  <td className="px-3 py-2 text-gray-600">{formatPrice(existing.sale_price)}</td>
                  <td className={`px-3 py-2 ${salePriceChanged ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                    {formatPrice(scrapedData.sale_price)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Wishlist selector for moving */}
          {wishlists?.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Move to list:
              </label>
              <select
                value={selectedWishlistId || existing.wishlist_id}
                onChange={(e) => setSelectedWishlistId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {wishlists?.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.id === existing.wishlist_id ? '(current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {hasAnyChange && (
              <button
                onClick={handleUpdateItem}
                disabled={updateItemMutation.isPending}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateItemMutation.isPending ? 'Updating...' : 'Update with New Data'}
              </button>
            )}
            <button
              onClick={handleAddItem}
              disabled={addItemMutation.isPending}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {addItemMutation.isPending ? 'Adding...' : 'Add as Duplicate'}
            </button>
            <button
              onClick={() => window.close()}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>

          {/* Status message */}
          {status.message && (
            <p className={`mt-3 text-sm text-center ${
              status.type === 'success' ? 'text-green-600' :
              status.type === 'error' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {status.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Normal add flow
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add to Wishlist</h2>

        {/* Product preview */}
        {(scrapedData.product_name || url) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            {scrapedData.image_url && (
              <img
                src={scrapedData.image_url}
                alt=""
                className="w-16 h-16 object-contain mb-2 mx-auto"
              />
            )}
            <p className="text-sm font-medium text-gray-900 text-center truncate">
              {scrapedData.product_name || 'Product'}
            </p>
            {scrapedData.sale_price && (
              <p className="text-sm text-green-600 text-center">
                ${scrapedData.sale_price.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : wishlists?.length === 0 ? (
          <div>
            <p className="text-gray-600 mb-4">You don't have any wishlists yet. Create one:</p>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateList}
                disabled={createListMutation.isPending || !newListName.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {createListMutation.isPending ? 'Creating...' : 'Create List'}
              </button>
              <button
                onClick={() => window.close()}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Wishlist:
            </label>
            <select
              value={selectedWishlistId || ''}
              onChange={(e) => setSelectedWishlistId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
            >
              {wishlists?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Create new list toggle */}
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-sm text-indigo-600 hover:text-indigo-800 mb-3"
            >
              + Create new list
            </button>

            {showCreateForm && (
              <div className="mb-3 p-3 bg-gray-50 rounded-md">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                />
                <button
                  onClick={handleCreateList}
                  disabled={createListMutation.isPending || !newListName.trim()}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
                >
                  {createListMutation.isPending ? 'Creating...' : 'Create List'}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                disabled={addItemMutation.isPending || !selectedWishlistId}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
              </button>
              <button
                onClick={() => window.close()}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Status message */}
        {status.message && (
          <p className={`mt-3 text-sm text-center ${
            status.type === 'success' ? 'text-green-600' :
            status.type === 'error' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
