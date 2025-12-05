import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { storesApi } from '../api/stores';
import { Store, CreateStoreRequest } from '../types';

export default function Stores() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedStore = searchParams.get('highlight');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const storeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { data: stores, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  // Scroll to highlighted store and clear the param
  useEffect(() => {
    if (highlightedStore && stores && Array.isArray(stores)) {
      const matchingStore = stores.find(
        (s) => s.name.toLowerCase() === highlightedStore.toLowerCase()
      );
      if (matchingStore && storeRefs.current[matchingStore.id]) {
        storeRefs.current[matchingStore.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        // Clear the highlight param after scrolling
        setTimeout(() => {
          setSearchParams({});
        }, 2000);
      }
    }
  }, [highlightedStore, stores, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: storesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setShowAddModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateStoreRequest }) =>
      storesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setShowEditModal(false);
      setSelectedStore(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: storesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setShowDeleteModal(false);
      setSelectedStore(null);
    },
  });

  const handleEdit = (store: Store) => {
    setSelectedStore(store);
    setShowEditModal(true);
  };

  const handleDelete = (store: Store) => {
    setSelectedStore(store);
    setShowDeleteModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
                &larr; Back to Wishlists
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Store Policies</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage return and price matching policies for your favorite stores
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Store
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {!stores || !Array.isArray(stores) || stores.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stores yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first store to track their return and price matching policies.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Store
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => {
              const isHighlighted = highlightedStore?.toLowerCase() === store.name.toLowerCase();
              return (
              <div
                key={store.id}
                ref={(el) => { storeRefs.current[store.id] = el; }}
                className={`bg-white rounded-lg shadow overflow-hidden transition-all duration-300 ${
                  isHighlighted ? 'ring-2 ring-green-500 ring-offset-2' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                      {store.domain && (
                        <p className="text-sm text-gray-500">{store.domain}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(store)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit store"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(store)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete store"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Return Policy Section */}
                  {(store.return_policy || store.return_window_days || store.free_returns || store.free_return_shipping ||
                    store.paid_return_cost || store.restocking_fee_percent || store.exchange_only || store.store_credit_only ||
                    store.receipt_required || store.original_packaging_required || store.final_sale_items) ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Return Policy
                      </h4>
                      {store.return_window_days && (
                        <p className="text-sm text-blue-600 font-medium mb-1">
                          {store.return_window_days} day return window
                        </p>
                      )}
                      {/* Structured return policy badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {store.free_returns && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Free returns</span>
                        )}
                        {store.free_return_shipping && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Free return shipping</span>
                        )}
                        {store.paid_return_cost && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">${store.paid_return_cost} return fee</span>
                        )}
                        {store.restocking_fee_percent && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">{store.restocking_fee_percent}% restocking fee</span>
                        )}
                        {store.exchange_only && (
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">Exchange only</span>
                        )}
                        {store.store_credit_only && (
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">Store credit only</span>
                        )}
                        {store.receipt_required && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Receipt required</span>
                        )}
                        {store.original_packaging_required && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">Original packaging required</span>
                        )}
                        {store.final_sale_items && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Has final sale items</span>
                        )}
                      </div>
                      {store.return_policy && (
                        <p className="text-sm text-gray-600">{store.return_policy}</p>
                      )}
                    </div>
                  ) : null}

                  {/* Price Match Policy Section */}
                  {(store.price_match_policy || store.price_match_window_days || store.price_match_competitors || store.price_match_own_sales) ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Price Match Policy
                      </h4>
                      {store.price_match_window_days && (
                        <p className="text-sm text-green-600 font-medium mb-1">
                          {store.price_match_window_days} day price match window
                        </p>
                      )}
                      {/* Structured price match badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {store.price_match_competitors && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Matches competitors</span>
                        )}
                        {store.price_match_own_sales && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Matches own sales</span>
                        )}
                      </div>
                      {store.price_match_policy && (
                        <p className="text-sm text-gray-600">{store.price_match_policy}</p>
                      )}
                    </div>
                  ) : null}

                  {store.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                      <p className="text-sm text-gray-600">{store.notes}</p>
                    </div>
                  )}

                  {/* Check if any policy data exists */}
                  {!store.return_policy && !store.return_window_days && !store.price_match_policy && !store.price_match_window_days && !store.notes &&
                   !store.free_returns && !store.free_return_shipping && !store.paid_return_cost && !store.restocking_fee_percent &&
                   !store.exchange_only && !store.store_credit_only && !store.receipt_required && !store.original_packaging_required &&
                   !store.final_sale_items && !store.price_match_competitors && !store.price_match_own_sales && (
                    <p className="text-sm text-gray-400 italic">No policies added yet</p>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </main>

      {/* Add Store Modal */}
      {showAddModal && (
        <StoreFormModal
          title="Add Store"
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Store Modal */}
      {showEditModal && selectedStore && (
        <StoreFormModal
          title="Edit Store"
          store={selectedStore}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStore(null);
          }}
          onSubmit={(data) => updateMutation.mutate({ id: selectedStore.id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Store</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedStore.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedStore(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(selectedStore.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleteMutation.isPending}
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

interface StoreFormModalProps {
  title: string;
  store?: Store;
  onClose: () => void;
  onSubmit: (data: CreateStoreRequest) => void;
  isLoading: boolean;
}

function StoreFormModal({ title, store, onClose, onSubmit, isLoading }: StoreFormModalProps) {
  const [name, setName] = useState(store?.name || '');
  const [domain, setDomain] = useState(store?.domain || '');
  const [returnPolicy, setReturnPolicy] = useState(store?.return_policy || '');
  const [returnWindowDays, setReturnWindowDays] = useState<string>(
    store?.return_window_days?.toString() || ''
  );
  const [priceMatchPolicy, setPriceMatchPolicy] = useState(store?.price_match_policy || '');
  const [priceMatchWindowDays, setPriceMatchWindowDays] = useState<string>(
    store?.price_match_window_days?.toString() || ''
  );
  const [notes, setNotes] = useState(store?.notes || '');

  // Structured return policy fields
  const [freeReturns, setFreeReturns] = useState(store?.free_returns || false);
  const [freeReturnShipping, setFreeReturnShipping] = useState(store?.free_return_shipping || false);
  const [paidReturnCost, setPaidReturnCost] = useState<string>(
    store?.paid_return_cost?.toString() || ''
  );
  const [restockingFeePercent, setRestockingFeePercent] = useState<string>(
    store?.restocking_fee_percent?.toString() || ''
  );
  const [exchangeOnly, setExchangeOnly] = useState(store?.exchange_only || false);
  const [storeCreditOnly, setStoreCreditOnly] = useState(store?.store_credit_only || false);
  const [receiptRequired, setReceiptRequired] = useState(store?.receipt_required || false);
  const [originalPackagingRequired, setOriginalPackagingRequired] = useState(store?.original_packaging_required || false);
  const [finalSaleItems, setFinalSaleItems] = useState(store?.final_sale_items || false);

  // Structured price match fields
  const [priceMatchCompetitors, setPriceMatchCompetitors] = useState(store?.price_match_competitors || false);
  const [priceMatchOwnSales, setPriceMatchOwnSales] = useState(store?.price_match_own_sales || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      domain: domain || undefined,
      return_policy: returnPolicy || undefined,
      return_window_days: returnWindowDays ? parseInt(returnWindowDays, 10) : undefined,
      price_match_policy: priceMatchPolicy || undefined,
      price_match_window_days: priceMatchWindowDays ? parseInt(priceMatchWindowDays, 10) : undefined,
      notes: notes || undefined,
      // Structured return policy fields
      free_returns: freeReturns,
      free_return_shipping: freeReturnShipping,
      paid_return_cost: paidReturnCost ? parseFloat(paidReturnCost) : undefined,
      restocking_fee_percent: restockingFeePercent ? parseInt(restockingFeePercent, 10) : undefined,
      exchange_only: exchangeOnly,
      store_credit_only: storeCreditOnly,
      receipt_required: receiptRequired,
      original_packaging_required: originalPackagingRequired,
      final_sale_items: finalSaleItems,
      // Structured price match fields
      price_match_competitors: priceMatchCompetitors,
      price_match_own_sales: priceMatchOwnSales,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Amazon, Target, Best Buy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., amazon.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Return Policy
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Return Window (days)</label>
                <input
                  type="number"
                  value={returnWindowDays}
                  onChange={(e) => setReturnWindowDays(e.target.value)}
                  placeholder="e.g., 30"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Structured return policy checkboxes */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeReturns}
                    onChange={(e) => setFreeReturns(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Free returns
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeReturnShipping}
                    onChange={(e) => setFreeReturnShipping(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Free return shipping
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exchangeOnly}
                    onChange={(e) => setExchangeOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Exchange only
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeCreditOnly}
                    onChange={(e) => setStoreCreditOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Store credit only
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptRequired}
                    onChange={(e) => setReceiptRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Receipt required
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={originalPackagingRequired}
                    onChange={(e) => setOriginalPackagingRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Original packaging required
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={finalSaleItems}
                    onChange={(e) => setFinalSaleItems(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Has final sale items
                </label>
              </div>

              {/* Paid return cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Paid return cost ($)</label>
                  <input
                    type="number"
                    value={paidReturnCost}
                    onChange={(e) => setPaidReturnCost(e.target.value)}
                    placeholder="e.g., 7.99"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Restocking fee (%)</label>
                  <input
                    type="number"
                    value={restockingFeePercent}
                    onChange={(e) => setRestockingFeePercent(e.target.value)}
                    placeholder="e.g., 15"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Additional return details</label>
                <textarea
                  value={returnPolicy}
                  onChange={(e) => setReturnPolicy(e.target.value)}
                  placeholder="Any other return policy details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Price Match Policy
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Price Match Window (days after purchase)</label>
                <input
                  type="number"
                  value={priceMatchWindowDays}
                  onChange={(e) => setPriceMatchWindowDays(e.target.value)}
                  placeholder="e.g., 14"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Structured price match checkboxes */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priceMatchCompetitors}
                    onChange={(e) => setPriceMatchCompetitors(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Matches competitor prices
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priceMatchOwnSales}
                    onChange={(e) => setPriceMatchOwnSales(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Matches own sale prices
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Additional price match details</label>
                <textarea
                  value={priceMatchPolicy}
                  onChange={(e) => setPriceMatchPolicy(e.target.value)}
                  placeholder="Any other price match policy details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other helpful information..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Saving...' : 'Save Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
