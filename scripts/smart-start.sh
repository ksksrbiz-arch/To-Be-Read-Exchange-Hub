#!/bin/bash

# Smart start script with automatic health checks and troubleshooting

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting To-Be-Read Exchange Hub...${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Running quickstart...${NC}"
    exec bash scripts/quickstart.sh
    exit 0
fi

# Load environment
export $(grep -v '^#' .env | xargs)

# Check database connection
echo -e "${BLUE}🔍 Checking database connection...${NC}"

if command -v psql &> /dev/null; then
    if psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        echo -e "${GREEN}✅ Database connected${NC}"
    else
        echo -e "${YELLOW}⚠️  Cannot connect to database${NC}"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Is PostgreSQL running?"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "     brew services start postgresql"
        else
            echo "     sudo systemctl start postgresql"
        fi
        echo "  2. Check credentials in .env"
        echo "  3. Run: npm run db:init"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Start the application
echo -e "${BLUE}🚀 Starting application server...${NC}"
echo ""

node src/server.js &
SERVER_PID=$!

# Wait for server to start
echo -e "${BLUE}⏳ Waiting for server...${NC}"
sleep 3

# Health check
MAX_ATTEMPTS=10
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:${PORT:-3000}/api/health &> /dev/null; then
        echo ""
        echo -e "${GREEN}✅ Server is healthy!${NC}"
        echo ""
        echo -e "${BLUE}📖 Web Interface:  http://localhost:${PORT:-3000}${NC}"
        echo -e "${BLUE}📚 API Docs:       http://localhost:${PORT:-3000}/api-docs${NC}"
        echo -e "${BLUE}💚 Health Check:   http://localhost:${PORT:-3000}/api/health${NC}"
        echo ""
        echo -e "Server PID: ${SERVER_PID}"
        echo ""
        
        # Keep server running in foreground
        wait $SERVER_PID
        exit 0
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    sleep 2
done

# Failed to start
echo ""
echo -e "${RED}❌ Server failed to start${NC}"
echo ""
echo "Troubleshooting:"
echo "  1. Check port ${PORT:-3000} is not in use: lsof -i :${PORT:-3000}"
echo "  2. Check logs above for errors"
echo "  3. Verify database connection"
echo "  4. Run: npm run verify"
echo ""

kill $SERVER_PID 2>/dev/null || true
exit 1
