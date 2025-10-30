#!/bin/bash

###############################################################################
# QUICK START SCRIPT
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Starting To-Be-Read Exchange Hub...${NC}"

# Load environment
if [ -f .env ]; then
    source .env
fi

PORT=${PORT:-3000}

# Start database if using Docker
if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
    if ! docker ps | grep -q postgres; then
        echo -e "${BLUE}Starting database...${NC}"
        docker-compose up -d db
        sleep 3
    fi
fi

# Start application
echo -e "${GREEN}🚀 Starting server on port $PORT...${NC}"

npm start &

# Wait for server
sleep 3

echo -e "\n${GREEN}✓ Application started${NC}"
echo -e "${CYAN}Access at: http://localhost:$PORT${NC}"
echo -e "${CYAN}Stop with: ./stop.sh${NC}"
