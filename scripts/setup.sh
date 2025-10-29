#!/bin/bash

# Complete setup script for To-Be-Read Exchange Hub
# This script automates the entire installation process

set -e

echo "📚 To-Be-Read Exchange Hub - Setup Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "🔍 Step 1/5: Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js v18 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old${NC}"
    echo "Please upgrade to Node.js v18 or higher"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL command-line tools not found${NC}"
    echo "Please ensure PostgreSQL is installed"
    echo "You can continue, but database setup will need to be done manually"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    SKIP_DB=true
else
    echo -e "${GREEN}✅ PostgreSQL detected${NC}"
    SKIP_DB=false
fi

echo ""

# Step 2: Install dependencies
echo "📦 Step 2/5: Installing dependencies..."
echo ""

npm install

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Set up environment variables
echo "⚙️  Step 3/5: Configuring environment..."
echo ""

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from template${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and update DB_PASSWORD before starting the server${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping${NC}"
fi

echo ""

# Step 4: Set up database
if [ "$SKIP_DB" = false ]; then
    echo "🗄️  Step 4/5: Setting up database..."
    echo ""
    
    read -p "Would you like to set up the database now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Source .env to get database credentials
        if [ -f .env ]; then
            export $(grep -v '^#' .env | xargs)
        fi
        
        bash scripts/init-db.sh
        echo -e "${GREEN}✅ Database setup complete${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping database setup${NC}"
        echo "You can run it later with: bash scripts/init-db.sh"
    fi
else
    echo "⏭️  Step 4/5: Skipping database setup (PostgreSQL not detected)"
fi

echo ""

# Step 5: Run tests to verify installation
echo "🧪 Step 5/5: Running tests to verify installation..."
echo ""

if npm test; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed, but installation is complete${NC}"
    echo "This might be due to database connection issues"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Edit .env file and update your database password:"
echo "   nano .env"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open your browser and visit:"
echo "   http://localhost:3000"
echo ""
echo "4. Check the API health:"
echo "   curl http://localhost:3000/api/health"
echo ""
echo "📚 For more information, see README.md"
echo ""

