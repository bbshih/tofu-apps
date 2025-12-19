import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { generateBookmarkletScript, getApiUrl } from '../utils/bookmarklet';
import { setBookmarkletPageTitle } from '../utils/metaTags';
import Navbar from '../components/Navbar';

interface BookmarkletToken {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export default function Bookmarklet() {
  useEffect(() => {
    setBookmarkletPageTitle();
  }, []);
  const [tokenData, setTokenData] = useState<BookmarkletToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/bookmarklet/generate-token');
      setTokenData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const bookmarkletUrl = tokenData
    ? generateBookmarkletScript(getApiUrl(), tokenData.token)
    : '';

  const copyToClipboard = () => {
    if (bookmarkletUrl) {
      navigator.clipboard.writeText(bookmarkletUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wishlist Bookmarklet</h1>
          <p className="text-gray-600 mb-6">
            Add items to your wishlist from any website with a single click!
          </p>

          {/* Security Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>This bookmarklet contains your personal authentication token</li>
                    <li>
                      <strong>Do not share this bookmarklet with others</strong>
                    </li>
                    <li>The token expires after 90 days for security</li>
                    <li>You can regenerate the token at any time to invalidate the old one</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Token Generation */}
          <div className="mb-6">
            {!tokenData ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Generate a bookmarklet token to get started. This will create a unique token
                  that allows you to add items from any website.
                </p>
                <button
                  onClick={generateToken}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Bookmarklet'}
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Token created: {formatDate(tokenData.createdAt)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires: {formatDate(tokenData.expiresAt)}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Bookmarklet:
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    <strong>Important:</strong> Drag this button to your bookmarks bar (do not click it here)
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href={bookmarkletUrl}
                      className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 cursor-move select-none"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Please drag this button to your bookmarks bar instead of clicking it.');
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/uri-list', bookmarkletUrl);
                        e.dataTransfer.setData('text/plain', '➕ Add to Wishlist');
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      title="Add to Wishlist"
                    >
                      ➕ Add to Wishlist
                    </a>
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      {copySuccess ? '✓ Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Can't drag? Use "Copy Code" and manually create a bookmark with the copied code.
                  </p>
                </div>

                <button
                  onClick={generateToken}
                  disabled={loading}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
                >
                  {loading ? 'Regenerating...' : 'Regenerate Token'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Regenerating will invalidate your previous bookmarklet
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How to Install & Use the Bookmarklet
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Installation</h3>
              <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                <li>
                  Make sure your browser's bookmarks bar is visible
                  <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                    <li>Chrome/Edge: Press Ctrl+Shift+B (Cmd+Shift+B on Mac)</li>
                    <li>Firefox: Press Ctrl+Shift+B (Cmd+Shift+B on Mac)</li>
                    <li>Safari: View → Show Favorites Bar</li>
                  </ul>
                </li>
                <li>
                  Drag the <strong>"➕ Add to Wishlist"</strong> button above to your bookmarks
                  bar
                </li>
                <li>The bookmarklet is now installed and ready to use!</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Usage</h3>
              <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                <li>Browse to any product page you want to add to your wishlist</li>
                <li>Click the "➕ Add to Wishlist" bookmark in your bookmarks bar</li>
                <li>A popup will appear showing your wishlists</li>
                <li>Select the wishlist you want to add the item to</li>
                <li>Click "Add Item" and wait for confirmation</li>
                <li>The item will be scraped and added to your selected wishlist!</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Troubleshooting</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>
                  <strong>Bookmarklet not working?</strong> Try regenerating your token above
                </li>
                <li>
                  <strong>Token expired?</strong> Generate a new token (they last 90 days)
                </li>
                <li>
                  <strong>Can't drag the bookmarklet?</strong> Try using the "Copy Code" button
                  and manually creating a bookmark with the code
                </li>
                <li>
                  <strong>Item not scraping properly?</strong> Some sites may not be supported.
                  You can still add the item and edit details manually in the app.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Compatible Browsers
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Google Chrome (recommended)</li>
                <li>Microsoft Edge</li>
                <li>Mozilla Firefox</li>
                <li>Safari</li>
                <li>Brave</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
