#!/bin/bash

# Auto-setup script for dev containers
# Runs automatically when container starts

set -e

echo "🔧 Auto-configuring development environment..."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOL'
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

API_RATE_WINDOW_MIN=15
API_RATE_MAX=100
SYNC_RATE_WINDOW_MIN=15
SYNC_RATE_MAX=10

DB_USER=postgres
DB_HOST=localhost
DB_NAME=books_exchange
DB_PASSWORD=devcontainer
DB_PORT=5432
EOL
fi

# Start PostgreSQL if not running
if ! pg_isready -q 2>/dev/null; then
    echo "🗄️  Starting PostgreSQL..."
    sudo service postgresql start 2>/dev/null || true
    sleep 2
fi

# Setup database
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw books_exchange 2>/dev/null; then
    echo "📚 Creating database..."
    sudo -u postgres createdb books_exchange 2>/dev/null || createdb -U postgres books_exchange 2>/dev/null || true
    sudo -u postgres psql -d books_exchange -f src/config/schema.sql 2>/dev/null || psql -U postgres -d books_exchange -f src/config/schema.sql 2>/dev/null || true
fi

echo "✅ Development environment ready!"
echo ""
echo "🚀 Start the server with: npm run dev"
echo "🐞 Debug with: npm run debug (then attach debugger)"
echo "🧪 Run tests: npm test"
echo ""
