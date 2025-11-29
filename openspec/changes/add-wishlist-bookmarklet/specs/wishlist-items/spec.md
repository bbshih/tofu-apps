# Wishlist Items Capability - Bookmarklet Feature

## ADDED Requirements

### Requirement: Bookmarklet Token Management
The system SHALL provide each user with a unique, regenerable bookmarklet authentication token.

#### Scenario: User generates initial bookmarklet token
- **WHEN** user visits the Bookmarklet page for the first time
- **THEN** the system generates a unique bookmarklet token, stores it in the database with creation timestamp, and displays the token-embedded bookmarklet link

#### Scenario: User regenerates bookmarklet token
- **WHEN** user clicks "Regenerate Token" button
- **THEN** the system invalidates the previous token, generates a new unique token, updates the database, and displays the new bookmarklet link

#### Scenario: Expired token used
- **WHEN** user attempts to use a bookmarklet with a token older than 90 days
- **THEN** the system returns a 401 Unauthorized error with message "Bookmarklet token expired. Please regenerate from your dashboard."

### Requirement: Bookmarklet UI Generation
The system SHALL provide a user interface for generating and installing the bookmarklet.

#### Scenario: User views bookmarklet page
- **WHEN** authenticated user navigates to `/bookmarklet` route
- **THEN** the system displays a page with bookmarklet generation button, installation instructions, and security warnings

#### Scenario: User installs bookmarklet
- **WHEN** user drags the bookmarklet link to their browser bookmarks bar
- **THEN** the bookmarklet is saved as a bookmark with JavaScript code containing their unique token

#### Scenario: User copies bookmarklet code
- **WHEN** user clicks "Copy Code" button
- **THEN** the bookmarklet JavaScript code is copied to clipboard with success feedback

### Requirement: Public Bookmarklet API Endpoint
The system SHALL provide a public API endpoint for adding items via bookmarklet with token-based authentication.

#### Scenario: Valid bookmarklet request
- **WHEN** bookmarklet sends POST request to `/api/wishlist/bookmarklet/add-item` with valid token, URL, and wishlist_id
- **THEN** the system creates the item (with URL scraping), associates it with the specified wishlist, and returns 201 with item details

#### Scenario: Invalid token provided
- **WHEN** bookmarklet sends request with invalid or non-existent token
- **THEN** the system returns 401 Unauthorized with error message "Invalid bookmarklet token"

#### Scenario: Missing required parameters
- **WHEN** bookmarklet sends request without `url` or `wishlist_id` parameters
- **THEN** the system returns 400 Bad Request with error message listing missing parameters

#### Scenario: Rate limit exceeded
- **WHEN** user makes more than 10 bookmarklet requests per minute
- **THEN** the system returns 429 Too Many Requests with error message "Rate limit exceeded. Please wait before adding more items."

### Requirement: Bookmarklet JavaScript Functionality
The system SHALL provide a self-contained JavaScript bookmarklet that injects UI and communicates with the API.

#### Scenario: User activates bookmarklet on product page
- **WHEN** user clicks the bookmarklet while browsing any website
- **THEN** the system injects an overlay modal showing a loading state, fetches the user's wishlists, and displays them in a dropdown selector

#### Scenario: User selects wishlist and submits
- **WHEN** user selects a wishlist from dropdown and clicks "Add Item"
- **THEN** the bookmarklet sends the current page URL to the API with the selected wishlist_id and shows a success message upon completion

#### Scenario: User cancels bookmarklet
- **WHEN** user clicks "Cancel" or clicks outside the overlay
- **THEN** the bookmarklet removes the overlay from the page and cleans up all injected elements

#### Scenario: Bookmarklet encounters API error
- **WHEN** the API returns an error response (4xx or 5xx)
- **THEN** the bookmarklet displays the error message in the overlay and provides a "Close" button

### Requirement: Bookmarklet Wishlist Retrieval
The system SHALL provide an endpoint for the bookmarklet to fetch available wishlists using token authentication.

#### Scenario: Bookmarklet fetches wishlists
- **WHEN** bookmarklet sends GET request to `/api/wishlist/bookmarklet/wishlists` with valid token
- **THEN** the system returns 200 with JSON array of user's wishlists (id and name only)

#### Scenario: Token invalid during wishlist fetch
- **WHEN** bookmarklet sends wishlist fetch request with invalid token
- **THEN** the system returns 401 Unauthorized and bookmarklet displays error: "Authentication failed. Please regenerate your bookmarklet."

### Requirement: Cross-Origin Resource Sharing (CORS)
The system SHALL allow cross-origin requests to bookmarklet endpoints from any origin.

#### Scenario: Bookmarklet request from external site
- **WHEN** bookmarklet makes API request from a third-party website (e.g., amazon.com)
- **THEN** the server responds with `Access-Control-Allow-Origin: *` header and processes the request normally

#### Scenario: Preflight OPTIONS request
- **WHEN** browser sends OPTIONS preflight request to bookmarklet endpoint
- **THEN** the server responds with appropriate CORS headers including allowed methods and headers

### Requirement: Security Warnings and User Education
The system SHALL display clear security warnings and usage instructions on the bookmarklet generation page.

#### Scenario: User views security warnings
- **WHEN** user views the Bookmarklet page
- **THEN** the system displays prominent warnings including "Do not share this bookmarklet with others" and "This bookmarklet contains your personal authentication token"

#### Scenario: User views installation instructions
- **WHEN** user views the Bookmarklet page
- **THEN** the system displays step-by-step instructions with screenshots for installing the bookmarklet in major browsers (Chrome, Firefox, Safari, Edge)
