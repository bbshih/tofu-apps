import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { storesApi } from '../api/stores';
import { communityPoliciesApi } from '../api/communityPolicies';
import { bookmarkletApi, generatePolicyBookmarkletCode } from '../api/bookmarklet';
import { Store, CreateStoreRequest, CommunityPolicy, PolicyScrapeResult } from '../types';
import Navbar from '../components/Navbar';

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

  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeStore, setContributeStore] = useState<Store | null>(null);
  const [contributeStatus, setContributeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [contributeError, setContributeError] = useState<string | null>(null);

  const handleContribute = async (store: Store) => {
    setContributeStore(store);
    setShowContributeModal(true);
    setContributeStatus('idle');
    setContributeError(null);
  };

  const submitContribution = async () => {
    if (!contributeStore || !contributeStore.domain) return;

    setContributeStatus('loading');
    try {
      await communityPoliciesApi.create({
        domain: contributeStore.domain,
        name: contributeStore.name,
        return_window_days: contributeStore.return_window_days || undefined,
        free_returns: contributeStore.free_returns || false,
        free_return_shipping: contributeStore.free_return_shipping || false,
        paid_return_cost: contributeStore.paid_return_cost || undefined,
        restocking_fee_percent: contributeStore.restocking_fee_percent || undefined,
        exchange_only: contributeStore.exchange_only || false,
        store_credit_only: contributeStore.store_credit_only || false,
        receipt_required: contributeStore.receipt_required || false,
        original_packaging_required: contributeStore.original_packaging_required || false,
        final_sale_items: contributeStore.final_sale_items || false,
        return_policy_url: contributeStore.return_policy_url || undefined,
        return_policy_notes: contributeStore.return_policy || undefined,
        price_match_window_days: contributeStore.price_match_window_days || undefined,
        price_match_competitors: contributeStore.price_match_competitors || false,
        price_match_own_sales: contributeStore.price_match_own_sales || false,
        price_match_policy_url: contributeStore.price_match_policy_url || undefined,
        price_match_policy_notes: contributeStore.price_match_policy || undefined,
      });
      setContributeStatus('success');
    } catch (err: unknown) {
      setContributeStatus('error');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setContributeError(axiosErr.response?.data?.error || 'Failed to contribute policy');
      } else {
        setContributeError('Failed to contribute policy');
      }
    }
  };

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
      <Navbar />

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
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
                      {store.domain && (
                        <button
                          onClick={() => handleContribute(store)}
                          className="text-green-600 hover:text-green-800"
                          title="Share with community"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                      )}
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
                  {(store.return_policy || store.return_policy_url || store.return_window_days || store.free_returns || store.free_return_shipping ||
                    store.paid_return_cost || store.restocking_fee_percent || store.exchange_only || store.store_credit_only ||
                    store.receipt_required || store.original_packaging_required || store.final_sale_items) ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Return Policy
                        {store.return_policy_url && (
                          <a
                            href={store.return_policy_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-blue-500 hover:text-blue-700"
                            title="View return policy"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
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
                  {(store.price_match_policy || store.price_match_policy_url || store.price_match_window_days || store.price_match_competitors || store.price_match_own_sales) ? (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Price Match Policy
                        {store.price_match_policy_url && (
                          <a
                            href={store.price_match_policy_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-blue-500 hover:text-blue-700"
                            title="View price match policy"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
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
                  {!store.return_policy && !store.return_policy_url && !store.return_window_days && !store.price_match_policy && !store.price_match_policy_url && !store.price_match_window_days && !store.notes &&
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

      {/* Contribute to Community Modal */}
      {showContributeModal && contributeStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Share with Community</h2>

            {contributeStatus === 'idle' && (
              <>
                <p className="text-gray-600 mb-4">
                  Share your policy information for <strong>{contributeStore.name}</strong> with other users?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <p className="font-medium text-gray-900 mb-2">Policy Summary:</p>
                  <ul className="space-y-1 text-gray-600">
                    {contributeStore.return_window_days && (
                      <li>{contributeStore.return_window_days} day return window</li>
                    )}
                    {contributeStore.free_returns && <li>Free returns</li>}
                    {contributeStore.price_match_window_days && (
                      <li>{contributeStore.price_match_window_days} day price match window</li>
                    )}
                    {contributeStore.price_match_competitors && <li>Matches competitor prices</li>}
                  </ul>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowContributeModal(false);
                      setContributeStore(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitContribution}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Share Policy
                  </button>
                </div>
              </>
            )}

            {contributeStatus === 'loading' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Sharing policy...</p>
              </div>
            )}

            {contributeStatus === 'success' && (
              <div className="text-center py-4">
                <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-900 font-medium mb-2">Thank you!</p>
                <p className="text-gray-600 mb-4">Your policy has been shared with the community.</p>
                <button
                  onClick={() => {
                    setShowContributeModal(false);
                    setContributeStore(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            )}

            {contributeStatus === 'error' && (
              <div className="text-center py-4">
                <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-900 font-medium mb-2">Oops!</p>
                <p className="text-gray-600 mb-4">{contributeError}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setShowContributeModal(false);
                      setContributeStore(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setContributeStatus('idle')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
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

// Helper to extract domain from URL
const extractDomain = (input: string): string => {
  if (!input) return '';
  try {
    // If it looks like a URL, parse it
    if (input.includes('://') || input.includes('www.')) {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      return url.hostname.replace(/^www\./, '');
    }
    // Otherwise just clean up the input
    return input.replace(/^www\./, '').split('/')[0];
  } catch {
    return input.replace(/^www\./, '').split('/')[0];
  }
};

function StoreFormModal({ title, store, onClose, onSubmit, isLoading }: StoreFormModalProps) {
  const [name, setName] = useState(store?.name || '');
  const [domain, setDomain] = useState(store?.domain || '');
  const [originalDomainInput, setOriginalDomainInput] = useState<string | null>(null);
  const [returnPolicy, setReturnPolicy] = useState(store?.return_policy || '');
  const [returnPolicyUrl, setReturnPolicyUrl] = useState(store?.return_policy_url || '');
  const [returnWindowDays, setReturnWindowDays] = useState<string>(
    store?.return_window_days?.toString() || ''
  );
  const [priceMatchPolicy, setPriceMatchPolicy] = useState(store?.price_match_policy || '');
  const [priceMatchPolicyUrl, setPriceMatchPolicyUrl] = useState(store?.price_match_policy_url || '');
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

  // Community policy search state
  const [communitySearchResults, setCommunitySearchResults] = useState<CommunityPolicy[]>([]);
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);
  const [importedFrom, setImportedFrom] = useState<string | null>(null);

  // Policy fetching state
  const [scrapeResult, setScrapeResult] = useState<PolicyScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Bookmarklet state
  const [showBookmarkletHelper, setShowBookmarkletHelper] = useState(false);
  const [bookmarkletToken, setBookmarkletToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [pollingSessionId, setPollingSessionId] = useState<string | null>(null);

  // Search community policies when name or domain changes
  useEffect(() => {
    const searchTerm = name || domain;
    if (!searchTerm || searchTerm.length < 2) {
      setCommunitySearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearchingCommunity(true);
      try {
        const result = await communityPoliciesApi.search({ search: searchTerm, limit: 5 });
        setCommunitySearchResults(result.policies);
      } catch (error) {
        console.error('Error searching community policies:', error);
        setCommunitySearchResults([]);
      } finally {
        setIsSearchingCommunity(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [name, domain]);

  const handleImportCommunityPolicy = (policy: CommunityPolicy) => {
    // Import policy data into form fields - always set name and domain
    setName(policy.name);
    setDomain(policy.domain);
    if (policy.return_window_days) setReturnWindowDays(policy.return_window_days.toString());
    if (policy.return_policy_url) setReturnPolicyUrl(policy.return_policy_url);
    if (policy.return_policy_notes) setReturnPolicy(policy.return_policy_notes);
    if (policy.price_match_window_days) setPriceMatchWindowDays(policy.price_match_window_days.toString());
    if (policy.price_match_policy_url) setPriceMatchPolicyUrl(policy.price_match_policy_url);
    if (policy.price_match_policy_notes) setPriceMatchPolicy(policy.price_match_policy_notes);
    if (policy.paid_return_cost) setPaidReturnCost(policy.paid_return_cost.toString());
    if (policy.restocking_fee_percent) setRestockingFeePercent(policy.restocking_fee_percent.toString());

    // Boolean fields
    setFreeReturns(policy.free_returns);
    setFreeReturnShipping(policy.free_return_shipping);
    setExchangeOnly(policy.exchange_only);
    setStoreCreditOnly(policy.store_credit_only);
    setReceiptRequired(policy.receipt_required);
    setOriginalPackagingRequired(policy.original_packaging_required);
    setFinalSaleItems(policy.final_sale_items);
    setPriceMatchCompetitors(policy.price_match_competitors);
    setPriceMatchOwnSales(policy.price_match_own_sales);

    setImportedFrom(policy.name);
    setCommunitySearchResults([]); // Clear results after import
  };

  // Helper to apply scraped data to form fields
  const applyScrapedData = (result: PolicyScrapeResult) => {
    if (result.success && result.data) {
      const data = result.data;
      if (data.return_window_days) setReturnWindowDays(data.return_window_days.toString());
      if (data.free_returns !== undefined) setFreeReturns(data.free_returns);
      if (data.free_return_shipping !== undefined) setFreeReturnShipping(data.free_return_shipping);
      if (data.restocking_fee_percent) setRestockingFeePercent(data.restocking_fee_percent.toString());
      if (data.exchange_only !== undefined) setExchangeOnly(data.exchange_only);
      if (data.store_credit_only !== undefined) setStoreCreditOnly(data.store_credit_only);
      if (data.receipt_required !== undefined) setReceiptRequired(data.receipt_required);
      if (data.original_packaging_required !== undefined) setOriginalPackagingRequired(data.original_packaging_required);
      if (data.final_sale_items !== undefined) setFinalSaleItems(data.final_sale_items);
      if (data.price_match_window_days) setPriceMatchWindowDays(data.price_match_window_days.toString());
      if (data.price_match_competitors !== undefined) setPriceMatchCompetitors(data.price_match_competitors);
      if (data.price_match_own_sales !== undefined) setPriceMatchOwnSales(data.price_match_own_sales);
    }
    if (result.return_policy_url) setReturnPolicyUrl(result.return_policy_url);
    if (result.price_match_policy_url) setPriceMatchPolicyUrl(result.price_match_policy_url);
  };

  const handleScrapeFromWeb = async () => {
    if (!domain || domain.length < 3) {
      setScrapeError('Please enter a valid domain first');
      return;
    }

    // Go straight to bookmarklet helper - automated fetching rarely works due to bot protection
    setShowBookmarkletHelper(true);
    handleGetBookmarklet();
  };

  // Generate bookmarklet token
  const handleGetBookmarklet = async () => {
    setIsGeneratingToken(true);
    try {
      const result = await bookmarkletApi.generateToken();
      setBookmarkletToken(result.token);
    } catch (error) {
      console.error('Failed to generate bookmarklet token:', error);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Poll for bookmarklet capture result
  const pollForResult = useCallback(async (sessionId: string, token: string) => {
    try {
      const response = await bookmarkletApi.getPolicyCaptureResult(sessionId, token);
      if (response.success && response.result) {
        setScrapeResult(response.result);
        applyScrapedData(response.result);
        setPollingSessionId(null);
        setShowBookmarkletHelper(false);
      }
    } catch {
      // Session not found yet, keep polling
    }
  }, []);

  // Apply bookmarklet capture by session ID
  const handleApplyBookmarkletCapture = async (sessionId: string) => {
    if (!bookmarkletToken) return;
    setPollingSessionId(sessionId);
    await pollForResult(sessionId, bookmarkletToken);
  };

  const handleDomainChange = (value: string) => {
    const extracted = extractDomain(value);
    // If the input was different from the extracted domain, save the original
    if (value !== extracted && value.length > extracted.length) {
      setOriginalDomainInput(value);
    } else {
      setOriginalDomainInput(null);
    }
    setDomain(extracted);
  };

  const handleUndoDomainParse = () => {
    if (originalDomainInput) {
      setDomain(originalDomainInput);
      setOriginalDomainInput(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      domain: domain || undefined,
      return_policy: returnPolicy || undefined,
      return_policy_url: returnPolicyUrl || undefined,
      return_window_days: returnWindowDays ? parseInt(returnWindowDays, 10) : undefined,
      price_match_policy: priceMatchPolicy || undefined,
      price_match_policy_url: priceMatchPolicyUrl || undefined,
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
          {/* Store Search - Primary input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search for a store <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setImportedFrom(null); // Clear imported status when typing
                }}
                placeholder="Type store name (e.g., Amazon, Target, Best Buy)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {isSearchingCommunity && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Search results dropdown */}
            {!importedFrom && communitySearchResults.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                {communitySearchResults.map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() => handleImportCommunityPolicy(policy)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">{policy.name}</span>
                        <span className="text-sm text-gray-500 ml-2">{policy.domain}</span>
                      </div>
                      {policy.verified_count > 0 && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          {policy.verified_count} verified
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {policy.return_window_days && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {policy.return_window_days}d returns
                        </span>
                      )}
                      {policy.free_returns && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Free returns
                        </span>
                      )}
                      {policy.price_match_window_days && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          {policy.price_match_window_days}d price match
                        </span>
                      )}
                      {policy.price_match_competitors && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          Price match
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Status messages */}
            {importedFrom && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Loaded policies for <strong>{importedFrom}</strong></span>
                <button
                  type="button"
                  onClick={() => setImportedFrom(null)}
                  className="ml-auto text-green-600 hover:text-green-800 text-xs underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Website Domain - shown but can be auto-filled */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website Domain
            </label>
            <div className="flex gap-2">
              <div className="flex flex-1">
                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                  https://
                </span>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  placeholder="amazon.com (paste any URL)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleScrapeFromWeb}
                disabled={!domain || domain.length < 3}
                className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                title="Fetch policies from website"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Fetch Policies
              </button>
            </div>
            {originalDomainInput && (
              <button
                type="button"
                onClick={handleUndoDomainParse}
                className="text-xs text-blue-500 hover:text-blue-700 mt-1"
              >
                Undo - use original: {originalDomainInput.length > 40 ? originalDomainInput.substring(0, 40) + '...' : originalDomainInput}
              </button>
            )}

            {/* Scrape error message */}
            {scrapeError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{scrapeError}</span>
              </div>
            )}

            {/* Scrape success message */}
            {scrapeResult && scrapeResult.success && (
              <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-purple-700 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Policies fetched from website</span>
                  {scrapeResult.confidence && (
                    <span className="ml-auto text-xs bg-purple-200 px-2 py-0.5 rounded-full">
                      {Math.round(scrapeResult.confidence.overall * 100)}% confidence
                    </span>
                  )}
                </div>
                {scrapeResult.warnings && scrapeResult.warnings.length > 0 && (
                  <div className="text-xs text-purple-600 mt-1">
                    {scrapeResult.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setScrapeResult(null)}
                  className="text-xs text-purple-600 hover:text-purple-800 mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Scrape failure message with bookmarklet helper */}
            {(scrapeResult && !scrapeResult.success) || showBookmarkletHelper ? (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2 text-sm text-amber-800 mb-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">Couldn't fetch automatically (site blocked our request)</span>
                </div>

                {!bookmarkletToken ? (
                  <div className="ml-6">
                    <p className="text-sm text-amber-700 mb-2">
                      Use the Policy Grabber bookmarklet to capture policies from any page:
                    </p>
                    <button
                      type="button"
                      onClick={handleGetBookmarklet}
                      disabled={isGeneratingToken}
                      className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {isGeneratingToken ? 'Generating...' : 'Get Policy Grabber Bookmarklet'}
                    </button>
                  </div>
                ) : (
                  <div className="ml-6 space-y-3">
                    <div className="bg-white border border-amber-300 rounded-lg p-3">
                      <p className="text-sm text-amber-800 font-medium mb-2">Step 1: Drag this button to your bookmarks bar:</p>
                      <div className="flex items-center gap-2 mb-2">
                        <a
                          href={generatePolicyBookmarkletCode(bookmarkletToken, import.meta.env.VITE_API_URL || '/api')}
                          className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 cursor-move select-none text-sm font-medium"
                          onClick={(e) => {
                            e.preventDefault();
                            alert('Please drag this button to your bookmarks bar instead of clicking it.');
                          }}
                          onDragStart={(e) => {
                            const bookmarkletUrl = generatePolicyBookmarkletCode(bookmarkletToken, import.meta.env.VITE_API_URL || '/api');
                            e.dataTransfer.setData('text/uri-list', bookmarkletUrl);
                            e.dataTransfer.setData('text/plain', 'Policy');
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          title="Policy Grabber"
                        >
                          Policy
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatePolicyBookmarkletCode(bookmarkletToken, import.meta.env.VITE_API_URL || '/api'));
                            alert('Bookmarklet code copied! Create a new bookmark and paste this as the URL.');
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Copy Code
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Can't drag? Use "Copy Code" and manually create a bookmark.</p>
                    </div>

                    <div className="bg-white border border-amber-300 rounded-lg p-3">
                      <p className="text-sm text-amber-800 font-medium mb-2">Step 2: Visit the store's return policy page:</p>
                      {domain && (
                        <a
                          href={`https://${domain}/returns`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Try {domain}/returns
                        </a>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Or search "{name || domain} return policy" on Google</p>
                    </div>

                    <div className="bg-white border border-amber-300 rounded-lg p-3">
                      <p className="text-sm text-amber-800 font-medium mb-2">Step 3: Click the bookmarklet, then paste the Session ID:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste session ID here"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          onPaste={(e) => {
                            const sessionId = e.clipboardData.getData('text').trim();
                            if (sessionId) {
                              handleApplyBookmarkletCapture(sessionId);
                            }
                          }}
                          onChange={(e) => {
                            const sessionId = e.target.value.trim();
                            if (sessionId.length === 32) {
                              handleApplyBookmarkletCapture(sessionId);
                            }
                          }}
                        />
                        {pollingSessionId && (
                          <span className="text-sm text-gray-500 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-1"></div>
                            Loading...
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBookmarkletHelper(false)}
                      className="text-xs text-amber-600 hover:text-amber-800"
                    >
                      Dismiss and enter manually
                    </button>
                  </div>
                )}
              </div>
            ) : null}
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
                  <label className="block text-sm text-gray-600 mb-1">Paid return cost</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                      $
                    </span>
                    <input
                      type="number"
                      value={paidReturnCost}
                      onChange={(e) => setPaidReturnCost(e.target.value)}
                      placeholder="7.99"
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Restocking fee</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={restockingFeePercent}
                      onChange={(e) => setRestockingFeePercent(e.target.value)}
                      placeholder="15"
                      min="0"
                      max="100"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                      %
                    </span>
                  </div>
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

              <div>
                <label className="block text-sm text-gray-600 mb-1">Return policy URL</label>
                <input
                  type="url"
                  value={returnPolicyUrl}
                  onChange={(e) => setReturnPolicyUrl(e.target.value)}
                  placeholder="https://store.com/return-policy"
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

              <div>
                <label className="block text-sm text-gray-600 mb-1">Price match policy URL</label>
                <input
                  type="url"
                  value={priceMatchPolicyUrl}
                  onChange={(e) => setPriceMatchPolicyUrl(e.target.value)}
                  placeholder="https://store.com/price-match"
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
