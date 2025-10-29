#!/bin/bash

#############################################################################
# Server Status Script
# 
# Purpose: Check the status of the development server and running services
# Usage: ./scripts/server-status.sh or npm run status
#############################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Server Status Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if server process is running
echo -e "${YELLOW}Process Status:${NC}"
PIDS=$(pgrep -f "node src/server.js")
if [ -n "$PIDS" ]; then
    echo -e "${GREEN}  ✓ Server is running${NC}"
    for PID in $PIDS; do
        echo "    PID: $PID"
        # Show uptime
        ps -p $PID -o etime= | xargs echo "    Uptime:"
    done
else
    echo -e "${RED}  ✗ Server is not running${NC}"
fi
echo ""

# Check if port 3000 is in use
echo -e "${YELLOW}Port Status:${NC}"
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Port 3000 is in use${NC}"
    lsof -i :3000 | tail -n +2 | awk '{print "    " $1 " (PID: " $2 ")"}'
else
    echo -e "${RED}  ✗ Port 3000 is not in use${NC}"
fi
echo ""

# Test HTTP endpoints
echo -e "${YELLOW}HTTP Endpoints:${NC}"

# Health check
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:3000/health)
    echo -e "${GREEN}  ✓ /health${NC}"
    echo "    $HEALTH"
else
    echo -e "${RED}  ✗ /health - Not responding${NC}"
fi

# Root endpoint
if curl -s http://localhost:3000/ > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ / (root)${NC}"
else
    echo -e "${RED}  ✗ / (root) - Not responding${NC}"
fi

# API endpoint
if curl -s http://localhost:3000/api/books > /dev/null 2>&1; then
    BOOKS=$(curl -s http://localhost:3000/api/books | grep -o '"books":\[' || echo "error")
    if [ "$BOOKS" != "error" ]; then
        BOOK_COUNT=$(curl -s http://localhost:3000/api/books | grep -o '"id":[0-9]*' | wc -l)
        echo -e "${GREEN}  ✓ /api/books${NC}"
        echo "    Books in inventory: $BOOK_COUNT"
    else
        echo -e "${YELLOW}  ⚠ /api/books - Responding but unexpected format${NC}"
    fi
else
    echo -e "${RED}  ✗ /api/books - Not responding${NC}"
fi
echo ""

# Database status
echo -e "${YELLOW}Database:${NC}"
if command -v psql > /dev/null 2>&1; then
    if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw books_exchange; then
        echo -e "${GREEN}  ✓ Database 'books_exchange' exists${NC}"
    else
        echo -e "${RED}  ✗ Database 'books_exchange' not found${NC}"
    fi
else
    echo -e "${YELLOW}  ℹ PostgreSQL client not found in PATH${NC}"
fi
echo ""

# Memory usage
echo -e "${YELLOW}Resource Usage:${NC}"
if [ -n "$PIDS" ]; then
    for PID in $PIDS; do
        MEM=$(ps -p $PID -o rss= | awk '{printf "%.1f MB", $1/1024}')
        CPU=$(ps -p $PID -o %cpu=)
        echo "  PID $PID: Memory: $MEM, CPU: ${CPU}%"
    done
else
    echo "  N/A (server not running)"
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
