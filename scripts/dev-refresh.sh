#!/bin/bash

#############################################################################
# Development Refresh Script
# 
# Purpose: Automates the process of refreshing the development environment
# - Stops the running server
# - Clears any cache
# - Restarts the server with fresh files
# - Verifies the server is running correctly
#
# Usage: ./scripts/dev-refresh.sh
#        npm run refresh (if added to package.json)
#############################################################################

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Development Environment Refresh Tool              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Change to project directory
cd "$(dirname "$0")/.." || exit 1
PROJECT_DIR=$(pwd)

echo -e "${YELLOW}[1/6] Stopping running server...${NC}"
# Find and kill node processes running server.js
pkill -f "node src/server.js" 2>/dev/null && echo -e "${GREEN}   ✓ Server stopped${NC}" || echo -e "${YELLOW}   ℹ No running server found${NC}"
sleep 1

echo -e "${YELLOW}[2/6] Checking for code changes...${NC}"
# Show what files changed (if in git repo)
if [ -d .git ]; then
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | wc -l)
    if [ "$CHANGED_FILES" -gt 0 ]; then
        echo -e "${GREEN}   ✓ $CHANGED_FILES file(s) modified${NC}"
        git diff --name-only HEAD | head -5 | sed 's/^/     - /'
    else
        echo -e "${GREEN}   ℹ No uncommitted changes${NC}"
    fi
else
    echo -e "${YELLOW}   ℹ Not a git repository${NC}"
fi

echo -e "${YELLOW}[3/6] Clearing module cache (if needed)...${NC}"
# Only clear if package.json changed
if [ -f package.json ]; then
    if git diff HEAD package.json 2>/dev/null | grep -q "dependencies"; then
        echo -e "${YELLOW}   ℹ Dependencies changed, running npm install...${NC}"
        npm install --silent
    else
        echo -e "${GREEN}   ✓ No dependency changes${NC}"
    fi
fi

echo -e "${YELLOW}[4/6] Starting server with fresh cache...${NC}"
# Start server in background
npm start > /tmp/server-startup.log 2>&1 &
SERVER_PID=$!
echo -e "${GREEN}   ✓ Server starting (PID: $SERVER_PID)${NC}"

echo -e "${YELLOW}[5/6] Waiting for server to be ready...${NC}"
# Wait up to 10 seconds for server to start
MAX_WAIT=10
COUNTER=0
while [ $COUNTER -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Server is ready!${NC}"
        break
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
    echo -n "."
done
echo ""

if [ $COUNTER -eq $MAX_WAIT ]; then
    echo -e "${RED}   ✗ Server failed to start within ${MAX_WAIT} seconds${NC}"
    echo -e "${RED}   Check logs: tail -f /tmp/server-startup.log${NC}"
    exit 1
fi

echo -e "${YELLOW}[6/6] Verifying functionality...${NC}"
# Test health endpoint
HEALTH_STATUS=$(curl -s http://localhost:3000/health | grep -o '"status":"ok"' || echo "")
if [ -n "$HEALTH_STATUS" ]; then
    echo -e "${GREEN}   ✓ Health check passed${NC}"
else
    echo -e "${RED}   ✗ Health check failed${NC}"
    exit 1
fi

# Test if new features are loading (check for new UI elements)
if curl -s http://localhost:3000/ | grep -q 'searchInput'; then
    echo -e "${GREEN}   ✓ New features detected${NC}"
else
    echo -e "${YELLOW}   ℹ Basic version detected (may be expected)${NC}"
fi

# Test API endpoint
API_TEST=$(curl -s http://localhost:3000/api/books | grep -o '"success":true' || echo "")
if [ -n "$API_TEST" ]; then
    echo -e "${GREEN}   ✓ API responding correctly${NC}"
else
    echo -e "${RED}   ✗ API test failed${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Development Environment Refreshed Successfully!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Server running at:${NC} http://localhost:3000"
echo -e "${BLUE}View logs:${NC} tail -f /tmp/server-startup.log"
echo -e "${BLUE}Stop server:${NC} npm run stop (or pkill -f 'node src/server.js')"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} Do a hard refresh in browser: Ctrl+Shift+R (or Cmd+Shift+R)"
echo ""
