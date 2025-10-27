#!/bin/bash

# Database initialization script for To-Be-Read Exchange Hub

set -e

echo "🚀 Initializing To-Be-Read Exchange Hub Database..."

# Configuration (can be overridden with environment variables)
DB_NAME="${DB_NAME:-books_exchange}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🖥️  Host: $DB_HOST:$DB_PORT"
echo ""

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
    echo "❌ Error: PostgreSQL is not running or not accessible"
    echo "Please make sure PostgreSQL is installed and running"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

echo "✅ Database '$DB_NAME' is ready"

# Apply schema
echo "Applying database schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/../src/config/schema.sql"

echo "✅ Schema applied successfully"
echo ""
echo "🎉 Database initialization complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Copy .env.example to .env and update with your database credentials"
echo "  2. Run 'npm start' to start the server"
echo ""
