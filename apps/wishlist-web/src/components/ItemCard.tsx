import { Item } from '../types';

interface ItemCardProps {
  item: Item;
  onDelete: () => void;
}

export default function ItemCard({ item, onDelete }: ItemCardProps) {
  const imageUrl = item.image_path
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/wishlist'}/uploads/${item.image_path}`
    : null;

  // Convert prices to numbers (they come from DB as strings)
  const price = item.price ? Number(item.price) : null;
  const salePrice = item.sale_price ? Number(item.sale_price) : null;

  const hasDiscount = price && salePrice && salePrice < price;
  const discountPercent = hasDiscount
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
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

      <div className="p-4">
        {item.site_name && (
          <p className="text-xs text-gray-500 mb-1">{item.site_name}</p>
        )}

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

        {item.brand && (
          <p className="text-sm text-gray-600 mb-2">{item.brand}</p>
        )}

        <div className="flex items-baseline gap-2 mb-3">
          {salePrice && (
            <span className="text-lg font-bold text-gray-900">
              {item.currency} {salePrice.toFixed(2)}
            </span>
          )}
          {hasDiscount && (
            <>
              <span className="text-sm text-gray-500 line-through">
                {item.currency} {price!.toFixed(2)}
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

        <div className="flex gap-2">
          <a
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            View Product
          </a>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md hover:bg-red-100"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
