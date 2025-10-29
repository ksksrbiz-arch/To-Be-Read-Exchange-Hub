#!/bin/bash

# AWS EC2 Deployment Script
# Deploys application to AWS EC2 instance

set -e

echo "☁️  AWS EC2 Deployment Script"
echo "============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
EC2_HOST="${AWS_EC2_HOST:-}"
EC2_USER="${AWS_EC2_USER:-ubuntu}"
EC2_KEY="${AWS_EC2_KEY:-~/.ssh/aws-key.pem}"
APP_DIR="${AWS_APP_DIR:-/var/www/books-exchange}"
PM2_APP_NAME="${PM2_APP_NAME:-books-exchange}"

# Check configuration
if [ -z "$EC2_HOST" ]; then
    echo -e "${RED}❌ AWS_EC2_HOST not set${NC}"
    echo "Set it with: export AWS_EC2_HOST=your-ec2-ip-or-domain"
    exit 1
fi

if [ ! -f "$EC2_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $EC2_KEY${NC}"
    echo "Set the correct path with: export AWS_EC2_KEY=path/to/key.pem"
    exit 1
fi

echo "🎯 Target: $EC2_USER@$EC2_HOST"
echo "📁 Directory: $APP_DIR"
echo ""

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
echo ""

# Check 1: SSH connection
echo "1/3 Testing SSH connection..."
if ssh -i "$EC2_KEY" -o ConnectTimeout=10 "$EC2_USER@$EC2_HOST" "echo 'Connected'" &> /dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    exit 1
fi

# Check 2: Run tests locally
echo ""
echo "2/3 Running tests..."
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

# Check 3: Build application
echo ""
echo "3/3 Building application..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo "=================================="

# Confirm deployment
echo ""
echo -e "${YELLOW}Ready to deploy to $EC2_HOST${NC}"
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying to AWS EC2..."
echo ""

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='coverage' \
    --exclude='tests' \
    --exclude='.env' \
    --exclude='*.log' \
    .

echo -e "${GREEN}✅ Package created${NC}"

# Upload to EC2
echo ""
echo "📤 Uploading to EC2..."
scp -i "$EC2_KEY" deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"
echo -e "${GREEN}✅ Upload complete${NC}"

# Deploy on EC2
echo ""
echo "🔧 Installing on EC2..."

ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/var/www/books-exchange"
PM2_APP_NAME="books-exchange"

echo "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo "Extracting application..."
cd $APP_DIR
tar -xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

echo "Installing dependencies..."
npm ci --only=production

echo "Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Created .env file - please configure it${NC}"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

echo "Stopping existing application..."
pm2 stop $PM2_APP_NAME 2>/dev/null || true
pm2 delete $PM2_APP_NAME 2>/dev/null || true

echo "Starting application with PM2..."
pm2 start src/server.js --name $PM2_APP_NAME

echo "Saving PM2 configuration..."
pm2 save

echo "Setting up PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo -e "${GREEN}✅ Deployment complete${NC}"

ENDSSH

# Clean up local package
rm deploy.tar.gz

# Health check
echo ""
echo "⏳ Waiting for app to start..."
sleep 10

echo ""
echo "🏥 Running health check..."

if curl -f -s "http://$EC2_HOST:3000/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo ""
    echo "=================================="
    echo -e "${GREEN}🎉 Deployment Successful!${NC}"
    echo "=================================="
    echo ""
    echo "🌐 URL: http://$EC2_HOST:3000"
    echo "📊 Logs: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 logs $PM2_APP_NAME'"
    echo "🔄 Restart: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 restart $PM2_APP_NAME'"
    echo ""
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Check logs with: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'pm2 logs $PM2_APP_NAME'"
    exit 1
fi

