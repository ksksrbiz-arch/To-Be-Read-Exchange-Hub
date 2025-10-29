#!/bin/bash

# Docker Deployment Script
# Builds and deploys application using Docker

set -e

echo "🐳 Docker Deployment Script"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${DOCKER_IMAGE_NAME:-to-be-read-exchange-hub}"
IMAGE_TAG="${DOCKER_IMAGE_TAG:-latest}"
CONTAINER_NAME="${DOCKER_CONTAINER_NAME:-books-exchange}"
PORT="${PORT:-3000}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Install it from: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker detected${NC}"
docker --version
echo ""

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
echo ""

# Check 1: Run tests
echo "1/2 Running tests..."
if npm test; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    read -p "Continue deployment anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check 2: Verify .env file
echo ""
echo "2/2 Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    read -p "Create from .env.example? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env with your configuration${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo "=================================="

# Build Docker image
echo ""
echo "🔨 Building Docker image..."
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""

if docker build -t $IMAGE_NAME:$IMAGE_TAG .; then
    echo ""
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Stop and remove existing container
echo ""
echo "🛑 Stopping existing container (if any)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✅ Cleaned up existing containers${NC}"

# Run new container
echo ""
echo "🚀 Starting new container..."
echo "Container: $CONTAINER_NAME"
echo "Port: $PORT"
echo ""

if docker run -d \
    --name $CONTAINER_NAME \
    --env-file .env \
    -p $PORT:3000 \
    --restart unless-stopped \
    $IMAGE_NAME:$IMAGE_TAG; then
    echo ""
    echo -e "${GREEN}✅ Container started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
fi

# Wait for app to start
echo ""
echo "⏳ Waiting for app to start..."
sleep 5

# Health check
echo ""
echo "🏥 Running health check..."

MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "http://localhost:$PORT/api/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "Retrying ($RETRY_COUNT/$MAX_RETRIES)..."
            sleep 2
        fi
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Health check failed${NC}"
    echo ""
    echo "📋 Container logs:"
    docker logs $CONTAINER_NAME
    echo ""
    read -p "Stop container? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
    exit 1
fi

echo ""
echo "=================================="
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo "=================================="
echo ""
echo "🐳 Container: $CONTAINER_NAME"
echo "🌐 URL: http://localhost:$PORT"
echo "📊 Logs: docker logs -f $CONTAINER_NAME"
echo "🛑 Stop: docker stop $CONTAINER_NAME"
echo ""
echo "Useful commands:"
echo "  docker ps                     # List running containers"
echo "  docker logs -f $CONTAINER_NAME  # View logs"
echo "  docker exec -it $CONTAINER_NAME sh  # Access container shell"
echo ""

