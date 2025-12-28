import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistsApi } from '../api/wishlists';
import { itemsApi } from '../api/items';
import ItemCard from '../components/ItemCard';
import AddItemModal from '../components/AddItemModal';
import Navbar from '../components/Navbar';
import { setWishlistDetailPageTitle } from '../utils/metaTags';

export default function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const wishlistId = parseInt(id || '0');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist', wishlistId],
    queryFn: () => wishlistsApi.getById(wishlistId),
  });

  useEffect(() => {
    if (wishlist?.name) {
      setWishlistDetailPageTitle(wishlist.name);
    }
  }, [wishlist?.name]);

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', wishlistId],
    queryFn: () => wishlistsApi.getItems(wishlistId),
  });

  const deleteMutation = useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', wishlistId] });
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

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              {wishlist?.name || 'Wishlist'}
            </h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Item
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading items...</div>
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDeleteClick(item.id, item.product_name)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                This wishlist is empty.
              </p>
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

      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-700 mb-6">
              Remove "{itemToDelete.name}" from wishlist?
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
                {deleteMutation.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
