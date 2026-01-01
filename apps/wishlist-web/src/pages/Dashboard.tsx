import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistsApi } from '../api/wishlists';
import Navbar from '../components/Navbar';
import { setDashboardPageTitle } from '../utils/metaTags';

export default function Dashboard() {
  useEffect(() => {
    setDashboardPageTitle();
  }, []);

  const [newListName, setNewListName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wishlistToDelete, setWishlistToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<{ id: number; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => wishlistsApi.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setShowEditModal(false);
      setWishlistToEdit(null);
      setEditName('');
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

  const handleEditClick = (id: number, name: string) => {
    setWishlistToEdit({ id, name });
    setEditName(name);
    setShowEditModal(true);
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wishlistToEdit && editName.trim()) {
      updateMutation.mutate({ id: wishlistToEdit.id, name: editName });
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setWishlistToEdit(null);
    setEditName('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Your Wishlists
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/bookmarklet"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Bookmarklet
              </Link>
              <Link
                to="/stores"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Stores
              </Link>
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
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
                >
                  <Link to={`/wishlist/${wishlist.id}`} className="block">
                    {/* Image preview grid */}
                    <div className="h-32 bg-gray-100 relative">
                      {wishlist.preview_images && wishlist.preview_images.length > 0 ? (
                        <div className={`grid h-full ${
                          wishlist.preview_images.length === 1 ? 'grid-cols-1' :
                          wishlist.preview_images.length === 2 ? 'grid-cols-2' :
                          wishlist.preview_images.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2 grid-rows-2'
                        }`}>
                          {wishlist.preview_images.slice(0, 4).map((imagePath: string, idx: number) => (
                            <div key={idx} className="relative overflow-hidden bg-white">
                              <img
                                src={`/api/wishlist/uploads/${imagePath}`}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {wishlist.name}
                        </h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                          {wishlist.item_count} {wishlist.item_count === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Updated {new Date(wishlist.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <div className="px-4 pb-3 flex gap-3 border-t border-gray-100 pt-2">
                    <button
                      onClick={() => handleEditClick(wishlist.id, wishlist.name)}
                      disabled={updateMutation.isPending}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Edit
                    </button>
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

      {showEditModal && wishlistToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Wishlist
            </h3>
            <form onSubmit={handleConfirmEdit}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Wishlist name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending || !editName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
