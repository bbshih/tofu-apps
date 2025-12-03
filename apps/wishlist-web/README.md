# Wishlist Web

A modern wishlist application built with React, TypeScript, and Vite.

## Features

### Item Management
- **Add Items via URL**: Paste any product URL and automatically extract product details (name, price, brand, images)
- **Bookmarklet**: Add items while browsing with a convenient bookmarklet
- **Edit Items**: Modify product name, brand, price, sale price, notes, and tags
- **Delete Items**: Remove items with confirmation
- **Duplicate Detection**: Automatically detects and prevents duplicate items

### Organization
- **Multiple Wishlists**: Create and manage separate wishlists
- **Tags**: Organize items with custom tags
- **Search**: Search items by product name, brand, or notes with autocomplete
- **Filtering**: Filter by brand or tags
- **Sorting**: Sort by newest, oldest, price (low to high, high to low), or name

### Brand Intelligence
- **Automatic Brand Detection**: Extracts brand from:
  - Product meta tags
  - Product names (e.g., "Nike Air Max" → "Nike")
  - Page titles (e.g., "Product – 18 East" → "18 East")
- **Brand Autocomplete**: Suggests existing brands when adding or editing items
- **Common Brands Database**: Pre-configured with popular brands for better detection

### Web Scraping
Supports automatic product data extraction from:
- Amazon
- Target
- Walmart
- Best Buy
- Generic websites (Open Graph tags)

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router
- **HTTP Client**: Axios
- **Testing**: Vitest

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Environment Variables

**Development** (`.env.development`):
```env
VITE_API_URL=http://localhost:3000/api/wishlist
```

**Production** (`.env.production`):
```env
VITE_API_URL=/api/wishlist
```

## Project Structure

```
src/
├── api/                # API client modules
│   ├── client.ts       # Axios instance with auth
│   ├── items.ts        # Items API
│   ├── wishlists.ts    # Wishlists API
│   └── tags.ts         # Tags API
├── components/         # React components
│   ├── AddItemModal.tsx
│   ├── EditItemModal.tsx
│   └── ItemCard.tsx
├── pages/              # Route pages
│   ├── Dashboard.tsx
│   ├── WishlistDetail.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── types/              # TypeScript types
├── utils/              # Utility functions
│   └── bookmarklet.ts  # Bookmarklet code generator
└── App.tsx            # Main app component
```

## Features in Detail

### Smart Item Cards
- Click product image or name to open original URL
- Shows brand name, price (with $ symbol), discount percentage
- Displays tags and notes
- Edit and delete actions

### Search & Filters
- Search with autocomplete suggestions
- Brand filter with autocomplete
- Tag filter dropdown
- Clear individual filters or all at once
- Results count display
- Clear button on search input

### Bookmarklet
The bookmarklet allows adding items while browsing:
1. Go to Dashboard → Bookmarklet tab
2. Drag the "Add to Wishlist" button to your bookmarks bar
3. While browsing a product page, click the bookmark
4. Select wishlist and confirm

### Edit Feature
Edit any item field:
- Product name
- Brand (with autocomplete)
- Price and sale price
- Notes
- Tags (add/remove, select from existing)

## Deployment

This app is deployed as part of the unified-apps monorepo. See the root [DEPLOYMENT.md](../../DEPLOYMENT.md) for deployment instructions.

### Build Process

```bash
# Build for production
npm run build

# Output goes to dist/ folder
# Vite automatically:
# - Bundles and minifies code
# - Generates content-hashed filenames
# - Creates source maps
# - Optimizes assets
```

### Cache Strategy
- HTML files: Always check for updates (`max-age=0`)
- JS/CSS files: Cached for 1 year with content hash in filename
- Images: Cached for 1 week

## API Integration

The frontend communicates with the backend via REST API:

### Authentication
- JWT token stored in localStorage
- Automatic token injection via Axios interceptor
- Auto-redirect to login on 401

### Endpoints Used
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /wishlists` - Get all wishlists
- `POST /wishlists` - Create wishlist
- `GET /wishlists/:id/items` - Get items in wishlist
- `POST /items` - Create item (with URL scraping)
- `PUT /items/:id` - Update item
- `DELETE /items/:id` - Delete item
- `GET /tags` - Get all tags
- `POST /bookmarklet/add` - Add item via bookmarklet

## Version System

The app uses a fun versioning scheme with `{adjective}-{animal}` format:
- Current version displayed in console on load
- Example: `lime-moose`, `jade-kangaroo`, `kelp-lemur`

## Contributing

This is part of a personal monorepo. For local development:

1. Make changes in `src/`
2. Test locally with `npm run dev`
3. Build with `npm run build`
4. Deploy via monorepo deployment process

## License

MIT
