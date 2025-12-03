import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistsApi } from "../api/wishlists";
import { itemsApi } from "../api/items";
import ItemCard from "../components/ItemCard";
import AddItemModal from "../components/AddItemModal";
import { setWishlistDetailPageTitle } from "../utils/metaTags";

export default function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const wishlistId = parseInt(id || "0");
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleDeleteItem = (itemId: number, productName: string) => {
    if (confirm(`Remove "${productName}" from wishlist?`)) {
      deleteMutation.mutate(itemId);
    }
  };

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
                  onDelete={() => handleDeleteItem(item.id, item.product_name)}
                />
              ))}
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
