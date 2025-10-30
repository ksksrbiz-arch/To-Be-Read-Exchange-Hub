#!/bin/bash
# Enhanced bootstrap: env + deps + db + optional Docker + optional vintage seed + health poll
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

EPHEMERAL_DB=false
USE_DOCKER=false
INTERACTIVE=false
WITH_TESTS=false
SEED_VINTAGE=false
SEED_FILE="scripts/lib/seed-vintage.sql"

for arg in "$@"; do
  case $arg in
    --ephemeral-db) EPHEMERAL_DB=true ;;
    --docker) USE_DOCKER=true ;;
    --interactive) INTERACTIVE=true ;;
    --with-tests) WITH_TESTS=true ;;
    --seed-vintage) SEED_VINTAGE=true ;;
  esac
done

if $INTERACTIVE; then
  echo "🔧 Interactive mode enabled"
  read -p "Use Docker for DB? (y/N): " ans
  [[ $ans =~ ^[Yy]$ ]] && USE_DOCKER=true
  read -p "Run test suite after install? (y/N): " ans
  [[ $ans =~ ^[Yy]$ ]] && WITH_TESTS=true
  read -p "Seed vintage sample data? (y/N): " ans
  [[ $ans =~ ^[Yy]$ ]] && SEED_VINTAGE=true
fi

echo "📦 Bootstrap starting... (flags: docker=$USE_DOCKER ephemeral=$EPHEMERAL_DB tests=$WITH_TESTS vintage=$SEED_VINTAGE)"

# 1. .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -base64 12 2>/dev/null | tr -d '=+' | cut -c1-16)/" .env || true
    echo -e "${GREEN}✓ .env created${NC}" 
  else
    cat > .env <<EOL
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
API_RATE_WINDOW_MIN=15
API_RATE_MAX=100
SYNC_RATE_WINDOW_MIN=15
SYNC_RATE_MAX=10
DB_USER=postgres
DB_HOST=localhost
DB_NAME=books_exchange
DB_PASSWORD=postgres
DB_PORT=5432
EOL
    echo -e "${YELLOW}! .env example missing, wrote minimal file${NC}" 
  fi
else
  echo -e "${YELLOW}! .env exists, leaving as-is${NC}" 
fi

export $(grep -v '^#' .env | xargs)

# 2. Dependencies (prefer npm ci)
if [ -f package-lock.json ]; then
  echo "📥 Installing dependencies (npm ci)"
  npm ci --silent || npm install
else
  echo "📥 Installing dependencies (npm install)"
  npm install --silent
fi

echo -e "${GREEN}✓ Dependencies installed${NC}" 

# 3. Database
if $USE_DOCKER || $EPHEMERAL_DB; then
  echo "🐳 Starting PostgreSQL (Docker)"
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker required for --ephemeral-db${NC}"; exit 1
  fi
  (docker rm -f tbr-postgres >/dev/null 2>&1 || true)
  docker run -d --name tbr-postgres -e POSTGRES_PASSWORD=$DB_PASSWORD -e POSTGRES_DB=$DB_NAME -p 5432:5432 postgres:16-alpine >/dev/null
  echo "⏳ Waiting for DB (approx 5s)..."
  sleep 5
  DB_HOST=localhost
fi

if command -v psql &> /dev/null; then
  echo "🗄  Ensuring database exists"
  if ! psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 2>/dev/null; then
    psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -c "CREATE DATABASE $DB_NAME" || true
  fi
  psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -f src/config/schema.sql >/dev/null || true
  if $SEED_VINTAGE && [ -f "$SEED_FILE" ]; then
    echo "🌱 Seeding vintage sample inventory"
    psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -f "$SEED_FILE" >/dev/null || echo -e "${YELLOW}! Vintage seed failed${NC}"
  fi
  echo -e "${GREEN}✓ Database initialized${NC}" 
else
  echo -e "${YELLOW}! psql not found; skip DB init${NC}" 
fi

# 4. Optional quick health test (non-fatal)
node -e "require('fs').existsSync('src/server.js') && console.log('Server entry present')" >/dev/null || echo -e "${YELLOW}! server.js missing?${NC}"

echo "🚀 Starting application (background)"
node src/server.js &
APP_PID=$!

source scripts/lib/health.sh 2>/dev/null || true
if declare -f poll_health >/dev/null 2>&1; then
  poll_health "http://localhost:${PORT:-3000}/api/health" 12 1 || echo -e "${YELLOW}Health check did not pass in time${NC}"
else
  echo "(health lib missing; skipping poll)"
fi

echo -e "${GREEN}🎉 Bootstrap complete${NC}" 
echo "PID: $APP_PID"
echo "UI:   http://localhost:${PORT:-3000}"
echo "Docs: http://localhost:${PORT:-3000}/api-docs"
echo "Health: http://localhost:${PORT:-3000}/api/health"

if $WITH_TESTS; then
  echo "🧪 Running tests (background after short delay)"
  sleep 2
  npm test --silent || echo -e "${YELLOW}Test suite reported failures${NC}"
fi

echo "Use: kill $APP_PID  # to stop (or npm run stop)"
