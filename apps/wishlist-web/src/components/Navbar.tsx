import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/client';
import { generateBookmarkletScript, getApiUrl } from '../utils/bookmarklet';
import { generatePolicyBookmarkletCode } from '../api/bookmarklet';

interface BookmarkletToken {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showBookmarkletDropdown, setShowBookmarkletDropdown] = useState(false);
  const [tokenData, setTokenData] = useState<BookmarkletToken | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBookmarkletDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generateToken = async () => {
    if (tokenData) return; // Already have a token
    setLoading(true);
    try {
      const response = await apiClient.post('/bookmarklet/generate-token');
      setTokenData(response.data);
    } catch (err) {
      console.error('Failed to generate token:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownToggle = () => {
    const newState = !showBookmarkletDropdown;
    setShowBookmarkletDropdown(newState);
    if (newState && !tokenData) {
      generateToken();
    }
  };

  const wishlistBookmarkletUrl = tokenData
    ? generateBookmarkletScript(getApiUrl(), tokenData.token)
    : '';

  const policyBookmarkletUrl = tokenData
    ? generatePolicyBookmarkletCode(tokenData.token, import.meta.env.VITE_API_URL || '/api')
    : '';

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Wishlist
            </Link>
            <div className="hidden sm:flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                My Lists
              </Link>
              <Link
                to="/all-items"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/all-items') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Items
              </Link>
              <Link
                to="/stores"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/stores') ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stores
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Bookmarklet Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleDropdownToggle}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Bookmarklets
                <svg className={`w-4 h-4 transition-transform ${showBookmarkletDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showBookmarkletDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {loading ? (
                    <div className="px-4 py-3 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Generating bookmarklets...</p>
                    </div>
                  ) : tokenData ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Drag these to your bookmarks bar:</p>
                      </div>

                      {/* Add to Wishlist Bookmarklet */}
                      <div className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Add to Wishlist</p>
                            <p className="text-xs text-gray-500">Save items from any website</p>
                          </div>
                          <a
                            href={wishlistBookmarkletUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 cursor-move select-none"
                            onClick={(e) => {
                              e.preventDefault();
                              alert('Drag this button to your bookmarks bar!');
                            }}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/uri-list', wishlistBookmarkletUrl);
                              e.dataTransfer.setData('text/plain', 'Add to Wishlist');
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            title="Add to Wishlist"
                          >
                            + Add
                          </a>
                        </div>
                      </div>

                      {/* Policy Grabber Bookmarklet */}
                      <div className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Policy Grabber</p>
                            <p className="text-xs text-gray-500">Capture store return policies</p>
                          </div>
                          <a
                            href={policyBookmarkletUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 cursor-move select-none"
                            onClick={(e) => {
                              e.preventDefault();
                              alert('Drag this button to your bookmarks bar!');
                            }}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/uri-list', policyBookmarkletUrl);
                              e.dataTransfer.setData('text/plain', 'Policy Grabber');
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            title="Policy Grabber"
                          >
                            Grab
                          </a>
                        </div>
                      </div>

                      <div className="px-4 py-2 border-t border-gray-100">
                        <Link
                          to="/bookmarklet"
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                          onClick={() => setShowBookmarkletDropdown(false)}
                        >
                          View full instructions
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-3 text-center">
                      <p className="text-sm text-gray-500">Failed to load bookmarklets</p>
                      <button
                        onClick={generateToken}
                        className="text-sm text-indigo-600 hover:text-indigo-800 mt-1"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
