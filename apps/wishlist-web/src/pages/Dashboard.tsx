import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistsApi } from '../api/wishlists';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const [newListName, setNewListName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wishlistToDelete, setWishlistToDelete] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: wishlists, isLoading } = useQuery({
    queryKey: ['wishlists'],
    queryFn: wishlistsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: wishlistsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setNewListName('');
      setShowCreateForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: wishlistsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setShowDeleteModal(false);
      setWishlistToDelete(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      createMutation.mutate(newListName);
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setWishlistToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (wishlistToDelete) {
      deleteMutation.mutate(wishlistToDelete.id);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setWishlistToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">My Wishlists</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Your Wishlists
            </h2>
            <div className="flex gap-3">
              <Link
                to="/all-items"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                View All Items
              </Link>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create New Wishlist
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <form onSubmit={handleCreate} className="flex gap-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Wishlist name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading wishlists...</div>
            </div>
          ) : wishlists && wishlists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlists.map((wishlist) => (
                <div
                  key={wishlist.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <Link to={`/wishlist/${wishlist.id}`} className="block p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {wishlist.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Updated {new Date(wishlist.updated_at).toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="px-6 pb-4">
                    <button
                      onClick={() => handleDeleteClick(wishlist.id, wishlist.name)}
                      disabled={deleteMutation.isPending}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                You don't have any wishlists yet.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first wishlist
              </button>
            </div>
          )}
        </div>
      </main>

      {showDeleteModal && wishlistToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{wishlistToDelete.name}"?
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
