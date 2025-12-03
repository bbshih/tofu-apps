import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/items';
import { tagsApi } from '../api/tags';

interface AddItemModalProps {
  wishlistId: number;
  onClose: () => void;
}

export default function AddItemModal({ wishlistId, onClose }: AddItemModalProps) {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [duplicateType, setDuplicateType] = useState<string>('');
  const [newItemData, setNewItemData] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: existingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const createItemMutation = useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', wishlistId] });
      onClose();
    },
    onError: (error: any) => {
      // Check if it's a duplicate error
      if (error?.response?.status === 409) {
        const data = error.response.data;
        if (data.duplicates && Array.isArray(data.duplicates)) {
          setDuplicates(data.duplicates);
          setDuplicateType(data.duplicate_type);
          setNewItemData(data.new_item);
        }
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    createItemMutation.mutate({
      wishlist_id: wishlistId,
      url: url.trim(),
      notes: notes.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    });
  };

  const handleForceAdd = () => {
    createItemMutation.mutate({
      wishlist_id: wishlistId,
      url: url.trim(),
      notes: notes.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      force_add: true,
    });
  };

  const handleCancelDuplicate = () => {
    setDuplicates([]);
    setDuplicateType('');
    setNewItemData(null);
    createItemMutation.reset();
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const handleSelectExistingTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  // Show duplicate comparison if duplicates found
  if (duplicates.length > 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {duplicateType === 'exact' ? 'Duplicate Item Found' : 'Similar Items Found'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {duplicateType === 'exact'
              ? 'This item is already in your wishlist.'
              : 'We found similar items in your wishlist. Compare them below:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* New item (from URL being added) */}
            <div className="border-2 border-blue-500 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-600 mb-2">New Item</h3>
              {newItemData?.image_url && (
                <img
                  src={newItemData.image_url}
                  alt={newItemData.product_name}
                  className="w-full h-32 object-cover rounded mb-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {newItemData?.product_name && (
                <p className="font-semibold text-gray-900 mb-1">{newItemData.product_name}</p>
              )}
              {newItemData?.brand && <p className="text-sm text-gray-600 mb-1">{newItemData.brand}</p>}
              {newItemData?.price && (
                <p className="text-sm text-gray-900 font-medium mb-2">
                  {newItemData.currency} {Number(newItemData.price).toFixed(2)}
                </p>
              )}
              <p className="text-xs text-gray-500 mb-2 break-all">{url}</p>
              {notes && <p className="text-xs text-gray-600 italic">Notes: "{notes}"</p>}
            </div>

            {/* Existing items */}
            {duplicates.map((item) => (
              <div key={item.id} className="border-2 border-orange-500 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-orange-600 mb-2">Already in Wishlist</h3>
                {item.image_path && (
                  <img
                    src={`/api/wishlist/uploads/${item.image_path}`}
                    alt={item.product_name}
                    className="w-full h-32 object-cover rounded mb-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <p className="font-semibold text-gray-900 mb-1">{item.product_name}</p>
                {item.brand && <p className="text-sm text-gray-600 mb-1">{item.brand}</p>}
                {item.price && (
                  <p className="text-sm text-gray-900 font-medium mb-2">
                    {item.currency} {Number(item.price).toFixed(2)}
                  </p>
                )}
                <p className="text-xs text-gray-500 break-all">{item.original_url}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleForceAdd}
              disabled={createItemMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createItemMutation.isPending ? 'Adding...' : 'Add Anyway'}
            </button>
            <button
              onClick={handleCancelDuplicate}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal add item form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Item to Wishlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Product URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              We'll automatically extract product details from the URL
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any personal notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Add
              </button>
            </div>

            {existingTags && Array.isArray(existingTags) && existingTags.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-gray-500 mb-1">Existing tags:</p>
                <div className="flex flex-wrap gap-1">
                  {existingTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleSelectExistingTag(tag.name)}
                      disabled={selectedTags.includes(tag.name)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {createItemMutation.isError && duplicates.length === 0 && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">
                {(createItemMutation.error as any)?.response?.data?.error ||
                  'Failed to add item. Please check the URL and try again.'}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={createItemMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
