import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { wishlistsApi } from '../api/wishlists';
import { itemsApi } from '../api/items';
import ItemCard from '../components/ItemCard';
import Navbar from '../components/Navbar';

export default function AllItems() {
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['all-items'],
    queryFn: wishlistsApi.getAllItems,
  });

  const deleteMutation = useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-items'] });
      setShowDeleteModal(false);
      setItemToDelete(null);
    },
  });

  const handleDeleteClick = (itemId: number, productName: string) => {
    setItemToDelete({ id: itemId, name: productName });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              All Items Across Your Wishlists
            </h2>
            <p className="text-gray-600">
              View all items from every wishlist in one place
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading items...</div>
            </div>
          ) : items && items.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {items.length} item{items.length !== 1 ? 's' : ''}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item) => (
                  <div key={item.id} className="relative">
                    {item.wishlist_name && (
                      <div className="mb-2">
                        <Link
                          to={`/wishlist/${item.wishlist_id}`}
                          className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                        >
                          {item.wishlist_name}
                        </Link>
                      </div>
                    )}
                    <ItemCard
                      item={item}
                      onDelete={() => handleDeleteClick(item.id, item.product_name)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                You don't have any items in your wishlists yet.
              </p>
              <Link
                to="/"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to your wishlists to add items
              </Link>
            </div>
          )}
        </div>
      </main>

      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{itemToDelete.name}"?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
