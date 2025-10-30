#!/bin/bash

###############################################################################
# STOP SCRIPT
###############################################################################

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}Stopping To-Be-Read Exchange Hub...${NC}"

# Kill Node.js processes
pkill -f "node.*server.js" || true
pkill -f "npm.*start" || true

# Stop Docker containers if running
if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
    docker-compose down 2>/dev/null || true
fi

# Remove PID file
rm -f server.pid

echo -e "${GREEN}✓ Application stopped${NC}"
