#!/bin/bash

# Heroku Deployment Script
# Automates deployment to Heroku with pre-checks and rollback support

set -e

echo "🚀 Heroku Deployment Script"
echo "==========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="${HEROKU_APP_NAME:-}"
HEROKU_REMOTE="${HEROKU_REMOTE:-heroku}"

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo -e "${RED}❌ Heroku CLI is not installed${NC}"
    echo "Install it from: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

echo -e "${GREEN}✅ Heroku CLI detected${NC}"

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Heroku${NC}"
    echo "Run: heroku login"
    exit 1
fi

HEROKU_USER=$(heroku auth:whoami)
echo -e "${GREEN}✅ Logged in as: $HEROKU_USER${NC}"

# Determine app name
if [ -z "$APP_NAME" ]; then
    # Try to get from git remote
    if git remote get-url $HEROKU_REMOTE &> /dev/null; then
        APP_NAME=$(git remote get-url $HEROKU_REMOTE | sed 's/.*\/\(.*\)\.git/\1/')
    else
        echo -e "${YELLOW}⚠️  No Heroku app configured${NC}"
        read -p "Enter Heroku app name: " APP_NAME
    fi
fi

echo "📱 App: $APP_NAME"
echo ""

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
echo ""

# Check 1: Run tests
echo "1/4 Running tests..."
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

# Check 2: Lint code
echo ""
echo "2/4 Checking code quality..."
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed${NC}"
    read -p "Continue deployment anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check 3: Verify environment variables
echo ""
echo "3/4 Checking environment variables..."
REQUIRED_VARS=("DB_USER" "DB_HOST" "DB_NAME" "DB_PASSWORD" "DB_PORT")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! heroku config:get $var -a $APP_NAME &> /dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ All required environment variables set${NC}"
fi

# Check 4: Verify database addon
echo ""
echo "4/4 Checking database addon..."
if heroku addons:info heroku-postgresql -a $APP_NAME &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL addon found${NC}"
else
    echo -e "${YELLOW}⚠️  No PostgreSQL addon detected${NC}"
    read -p "Add Heroku PostgreSQL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        heroku addons:create heroku-postgresql:essential-0 -a $APP_NAME
        echo -e "${GREEN}✅ PostgreSQL addon added${NC}"
    fi
fi

echo ""
echo "=================================="

# Get current release for potential rollback
CURRENT_RELEASE=$(heroku releases -a $APP_NAME --json | jq -r '.[0].version')
echo "📋 Current release: v$CURRENT_RELEASE"

# Confirm deployment
echo ""
echo -e "${YELLOW}Ready to deploy to $APP_NAME${NC}"
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying to Heroku..."
echo ""

# Deploy
if git push $HEROKU_REMOTE main; then
    echo ""
    echo -e "${GREEN}✅ Code deployed successfully${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Run database migrations if schema exists
if [ -f "src/config/schema.sql" ]; then
    echo ""
    echo "🗄️  Running database migrations..."
    heroku run psql \$DATABASE_URL -f src/config/schema.sql -a $APP_NAME || true
fi

# Wait a moment for app to start
echo ""
echo "⏳ Waiting for app to start..."
sleep 10

# Health check
echo ""
echo "🏥 Running health check..."
APP_URL=$(heroku info -a $APP_NAME | grep "Web URL" | awk '{print $3}')

if curl -f -s "${APP_URL}api/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo ""
    echo "=================================="
    echo -e "${GREEN}🎉 Deployment Successful!${NC}"
    echo "=================================="
    echo ""
    echo "📱 App: $APP_NAME"
    echo "🌐 URL: $APP_URL"
    echo "📊 Logs: heroku logs --tail -a $APP_NAME"
    echo ""
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo ""
    read -p "Rollback to v$CURRENT_RELEASE? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Rolling back..."
        heroku rollback v$CURRENT_RELEASE -a $APP_NAME
        echo -e "${YELLOW}⚠️  Rolled back to v$CURRENT_RELEASE${NC}"
    fi
    exit 1
fi

