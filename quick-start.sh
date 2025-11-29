#!/bin/bash
# Quick start script for local development

set -e

echo "=========================================="
echo "Unified Apps - Local Dev Setup"
echo "=========================================="
echo ""

# Add PostgreSQL to PATH for this session
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Run this first:"
    echo "   export PATH=\"/opt/homebrew/opt/postgresql@16/bin:\$PATH\""
    echo "   echo 'export PATH=\"/opt/homebrew/opt/postgresql@16/bin:\$PATH\"' >> ~/.zshrc"
    exit 1
fi

echo "✅ PostgreSQL found: $(psql --version)"
echo ""

# Create .env if it doesn't exist
if [ ! -f apps/backend/.env ]; then
    echo "📝 Creating .env file..."
    cp .env.example apps/backend/.env

    # Update for local dev
    sed -i '' 's/NODE_ENV=production/NODE_ENV=development/' apps/backend/.env
    sed -i '' 's/PORT=3000/PORT=3001/' apps/backend/.env
    sed -i '' 's/wishlist_user/postgres/' apps/backend/.env
    sed -i '' 's/seacalendar:/postgres:/' apps/backend/.env
    sed -i '' 's/your_password_here/postgres/' apps/backend/.env
    sed -i '' 's/your_password@/postgres@/' apps/backend/.env
    sed -i '' 's/wishlist/wishlist_dev/' apps/backend/.env
    sed -i '' 's/seacalendar/seacalendar_dev/' apps/backend/.env
    sed -i '' 's/your_jwt_secret_here/local-dev-jwt-secret-change-in-production/' apps/backend/.env
    sed -i '' 's/your_session_secret_here/local-dev-session-secret-change-in-production/' apps/backend/.env
    sed -i '' 's/WISHLIST_CORS_ORIGIN=http:\/\/localhost:3000/WISHLIST_CORS_ORIGIN=http:\/\/localhost:5173/' apps/backend/.env

    echo "✅ Created apps/backend/.env"
else
    echo "✅ apps/backend/.env already exists"
fi
echo ""

# Create databases
echo "📊 Creating databases..."
psql postgres -c "DROP DATABASE IF EXISTS wishlist_dev;" 2>/dev/null || true
psql postgres -c "DROP DATABASE IF EXISTS seacalendar_dev;" 2>/dev/null || true
psql postgres -c "CREATE DATABASE wishlist_dev;"
psql postgres -c "CREATE DATABASE seacalendar_dev;"
echo "✅ Databases created"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# Build shared package
echo "🔨 Building shared package..."
cd apps/backend/src/seacalendar/shared
npm run build
cd ../../../../..
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run generate
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
npm run migrate:wishlist
npm run migrate:seacalendar
echo ""

echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Start development with these commands:"
echo ""
echo "Terminal 1 - Backend:"
echo "  npm run dev:backend"
echo ""
echo "Terminal 2 - SeaCalendar Frontend:"
echo "  npm run dev:seacalendar"
echo ""
echo "Terminal 3 - Wishlist Frontend (optional):"
echo "  npm run dev:wishlist"
echo ""
echo "Then open:"
echo "  - SeaCalendar: http://localhost:3000"
echo "  - Wishlist: http://localhost:5173"
echo "  - API: http://localhost:3001"
echo ""
