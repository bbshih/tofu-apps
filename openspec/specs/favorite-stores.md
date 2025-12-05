# Favorite Stores Feature Specification

## Overview

Add a "Favorite Stores" feature to the Wishlist application that allows users to save and organize their preferred shopping websites. This feature enhances the wishlist experience by providing quick access to favorite retailers and enabling store-based filtering of wishlist items.

## Goals

1. **Store Management**: Allow users to create, edit, and delete favorite stores
2. **Categorization**: Organize stores by category (e.g., Electronics, Clothing, Home)
3. **Quick Access**: Provide easy navigation to favorite stores from the dashboard
4. **Integration**: Link wishlist items to their source stores for filtering
5. **Discovery**: Help users track which stores they shop at most frequently

## User Stories

### Core Stories
- As a user, I want to add a website as a favorite store so I can quickly access it later
- As a user, I want to categorize my stores so I can organize them by shopping type
- As a user, I want to see which store each wishlist item comes from
- As a user, I want to filter my wishlist items by store
- As a user, I want to edit store details (name, category, URL) after adding them
- As a user, I want to delete stores I no longer use

### Enhanced Stories
- As a user, I want to see how many items I have from each store
- As a user, I want stores to be auto-detected when I add items with URLs
- As a user, I want to add a store logo/icon for visual recognition
- As a user, I want to add notes about a store (e.g., "Free shipping over $50")

## Data Model

### New Tables

#### `stores` Table
```sql
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES store_categories(id) ON DELETE SET NULL,
  logo_path VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, domain)
);
```

#### `store_categories` Table
```sql
CREATE TABLE store_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
```

### Modified Tables

#### `items` Table (add column)
```sql
ALTER TABLE items ADD COLUMN store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL;
```

### Default Categories
Pre-populate for new users:
- Electronics
- Clothing & Fashion
- Home & Garden
- Sports & Outdoors
- Books & Media
- Beauty & Health
- Food & Grocery
- Other

## API Endpoints

### Store Management

#### `GET /api/wishlist/stores`
Get all stores for the authenticated user.

**Response:**
```json
{
  "stores": [
    {
      "id": 1,
      "name": "Amazon",
      "domain": "amazon.com",
      "category": { "id": 1, "name": "Electronics", "color": "#3B82F6" },
      "logo_path": "stores/amazon.png",
      "notes": "Prime member - free 2-day shipping",
      "item_count": 15,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `POST /api/wishlist/stores`
Create a new favorite store.

**Request:**
```json
{
  "name": "Amazon",
  "domain": "amazon.com",
  "category_id": 1,
  "notes": "Prime member"
}
```

#### `PUT /api/wishlist/stores/:id`
Update a store.

#### `DELETE /api/wishlist/stores/:id`
Delete a store (items will have store_id set to NULL).

### Category Management

#### `GET /api/wishlist/store-categories`
Get all store categories for the user.

#### `POST /api/wishlist/store-categories`
Create a new category.

#### `PUT /api/wishlist/store-categories/:id`
Update a category.

#### `DELETE /api/wishlist/store-categories/:id`
Delete a category (stores will have category_id set to NULL).

### Item-Store Integration

#### `GET /api/wishlist/stores/:id/items`
Get all items from a specific store.

#### `PATCH /api/wishlist/items/:id/store`
Manually assign/change a store for an item.

## Frontend Components

### New Pages

#### `FavoriteStores.tsx`
Main page showing all favorite stores in a grid layout.
- Search/filter by name or category
- Sort by name, item count, or date added
- Quick add store button
- Category filter chips

#### `StoreDetail.tsx`
Detail view for a single store showing:
- Store info and logo
- All items from this store
- Edit/delete actions
- Quick link to store website

### New Components

#### `AddStoreModal.tsx`
Modal for adding a new store:
- URL input (auto-extracts domain and name)
- Name field (editable)
- Category dropdown
- Notes textarea
- Logo upload (optional)

#### `EditStoreModal.tsx`
Modal for editing store details.

#### `StoreCategoryFilter.tsx`
Horizontal scrollable category filter component.

#### `StoreCard.tsx`
Card component displaying:
- Store logo/icon
- Store name
- Category badge
- Item count
- Quick actions (edit, delete, visit)

### Modified Components

#### `Dashboard.tsx`
Add navigation link to Favorite Stores page.

#### `ItemCard.tsx`
Show store badge/link on items that have an associated store.

#### `AddItemModal.tsx`
- Auto-detect store from URL
- Option to save as favorite store
- Store selector for manual assignment

#### `AllItems.tsx`
Add store filter dropdown.

## UI/UX Design

### Store Card Layout
```
┌────────────────────────────────┐
│  [Logo]   Store Name           │
│           Electronics          │
│                                │
│  15 items                      │
│                                │
│  [Edit] [Delete] [Visit →]     │
└────────────────────────────────┘
```

### Category Filter
```
[All] [Electronics] [Clothing] [Home] [Sports] [+]
```

### Store Badge on Items
Small pill showing store name, clickable to filter by store.

## Auto-Detection Logic

When adding an item with a URL:
1. Extract domain from URL (e.g., `amazon.com` from `https://www.amazon.com/dp/...`)
2. Check if domain exists in user's stores
3. If exists: auto-link item to store
4. If not exists: prompt user to add as favorite store

Domain extraction rules:
- Remove `www.` prefix
- Handle subdomains (e.g., `smile.amazon.com` → `amazon.com`)
- Store canonical domain for matching

## Implementation Phases

### Phase 1: Core Store Management
- Database migrations
- Store CRUD API endpoints
- FavoriteStores page
- AddStoreModal component
- Basic store listing

### Phase 2: Categories
- Category CRUD endpoints
- Category management UI
- Category filter on stores page
- Default categories for new users

### Phase 3: Item Integration
- Add store_id to items table
- Auto-detection on item creation
- Store filter on AllItems page
- Store badge on ItemCard

### Phase 4: Enhanced Features
- Store logo upload
- Item count aggregation
- Store notes
- Quick visit links

## Testing Requirements

### Backend Tests
- Store CRUD operations
- Category CRUD operations
- Store-item linking
- Auto-detection logic
- Permission checks (user can only access own stores)

### Frontend Tests
- AddStoreModal form validation
- Store list rendering
- Category filtering
- Store card interactions
- Auto-detection prompt flow

### E2E Tests
- Full store creation flow
- Adding item with auto-store detection
- Filtering items by store
- Category management flow

## Migration Strategy

1. Create new tables (`stores`, `store_categories`)
2. Add `store_id` column to `items` (nullable)
3. Backfill: Extract domains from existing items and create stores
4. Link existing items to detected stores
5. Create default categories for all users

## Performance Considerations

- Index on `stores.domain` for fast lookup during auto-detection
- Index on `items.store_id` for store-based filtering
- Eager load store data with items to avoid N+1 queries
- Cache category list (rarely changes)

## Security Considerations

- Validate store URLs (prevent XSS via malicious URLs)
- Sanitize store names and notes
- Ensure users can only access their own stores
- Rate limit store creation to prevent abuse
- Validate file uploads for logos (type, size)

## Success Metrics

- Number of stores added per user
- Percentage of items with associated stores
- Usage of store-based filtering
- Time saved in navigation (qualitative)
