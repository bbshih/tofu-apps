/**
 * Utility functions for managing dynamic page titles
 */

/**
 * Set page title with consistent formatting
 */
export function setPageTitle(title: string) {
  document.title = title;
}

/**
 * Title for login page
 */
export function setLoginPageTitle() {
  setPageTitle("Sign In - Wishlist");
}

/**
 * Title for register page
 */
export function setRegisterPageTitle() {
  setPageTitle("Create Account - Wishlist");
}

/**
 * Title for dashboard page
 */
export function setDashboardPageTitle() {
  setPageTitle("My Wishlists");
}

/**
 * Title for wishlist detail page
 */
export function setWishlistDetailPageTitle(wishlistName: string) {
  setPageTitle(`${wishlistName} - Items`);
}

/**
 * Title for bookmarklet page
 */
export function setBookmarkletPageTitle() {
  setPageTitle("Bookmarklet - Wishlist");
}

/**
 * Title for all items page
 */
export function setAllItemsPageTitle() {
  setPageTitle("All Items - Wishlist");
}

/**
 * Title for stores page
 */
export function setStoresPageTitle() {
  setPageTitle("Stores - Wishlist");
}

/**
 * Reset to default title
 */
export function resetPageTitle() {
  setPageTitle("Wishlist Manager");
}
