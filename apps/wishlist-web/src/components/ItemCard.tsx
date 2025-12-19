import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Item } from '../types';
import EditItemModal from './EditItemModal';

interface ItemCardProps {
  item: Item;
  onDelete: () => void;
}

export default function ItemCard({ item, onDelete }: ItemCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const imageUrl = item.image_path
    ? `/api/wishlist/uploads/${item.image_path}`
    : null;

  // Convert prices to numbers (they come from DB as strings)
  const price = item.price ? Number(item.price) : null;
  const salePrice = item.sale_price ? Number(item.sale_price) : null;

  const hasDiscount = price && salePrice && salePrice < price;
  const discountPercent = hasDiscount
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  const handleConfirmDelete = () => {
    onDelete();
  };

  // Format currency symbol
  const currencySymbol = item.currency === 'USD' ? '$' : item.currency;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {item.original_url ? (
        <a
          href={item.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.product_name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-gray-400 text-center p-4">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">No Image</span>
              </div>
            )}
          </div>
        </a>
      ) : (
        <div className="aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.product_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-gray-400 text-center p-4">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">No Image</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {item.brand && (
          <p className="text-xs text-gray-500 mb-1">{item.brand}</p>
        )}

        {item.original_url ? (
          <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600"
          >
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
              {item.product_name}
            </h3>
          </a>
        ) : (
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {item.product_name}
          </h3>
        )}

        <div className="flex items-baseline gap-2 mb-3">
          {salePrice && (
            <span className="text-lg font-bold text-gray-900">
              {currencySymbol}{salePrice.toFixed(2)}
            </span>
          )}
          {hasDiscount && (
            <>
              <span className="text-sm text-gray-500 line-through">
                {currencySymbol}{price!.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-green-600">
                {discountPercent}% off
              </span>
            </>
          )}
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {item.notes && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.notes}
          </p>
        )}

        {showConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={handleConfirmDelete}
              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            >
              Remove
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {item.site_name ? (
              <Link
                to={`/stores?highlight=${encodeURIComponent(item.site_name)}`}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title={`View ${item.site_name} policies`}
              >
                {item.site_name}
              </Link>
            ) : (
              <span></span>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                title="Edit item"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100"
                title="Remove item"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditItemModal
          item={item}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
