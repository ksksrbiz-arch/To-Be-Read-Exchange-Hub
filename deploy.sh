#!/bin/bash

###############################################################################
# TO-BE-READ EXCHANGE HUB - ONE-CLICK DEPLOYMENT SCRIPT
# Complete installation and setup with zero manual configuration
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="To-Be-Read Exchange Hub"
APP_DIR="$(pwd)"
NODE_MIN_VERSION="18"
PORT="${PORT:-3000}"

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     📚 TO-BE-READ EXCHANGE HUB - DEPLOYMENT WIZARD 📚        ║
║                                                              ║
║     Smart Book Inventory Management System                  ║
║     One-Click Setup & Installation                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Helper Functions
print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
}

check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# Step 1: System Requirements Check
print_step "Step 1/7: Checking System Requirements"

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge "$NODE_MIN_VERSION" ]; then
        print_success "Node.js version $(node -v) (required: v${NODE_MIN_VERSION}+)"
    else
        print_error "Node.js version too old. Please upgrade to v${NODE_MIN_VERSION} or higher"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js v${NODE_MIN_VERSION}+ from https://nodejs.org"
    exit 1
fi

# Check npm
check_command npm || {
    print_error "npm not found. Please install npm"
    exit 1
}

# Check PostgreSQL
if check_command psql; then
    print_success "PostgreSQL is installed"
    PG_INSTALLED=true
else
    print_warning "PostgreSQL not found. Will need manual database setup"
    PG_INSTALLED=false
fi

# Check for optional dependencies
check_command git && GIT_INSTALLED=true || GIT_INSTALLED=false

# Step 2: Install Dependencies
print_step "Step 2/7: Installing Node.js Dependencies"

if [ -f "package.json" ]; then
    npm install --production
    print_success "Dependencies installed successfully"
else
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

# Step 3: Environment Configuration
print_step "Step 3/7: Configuring Environment Variables"

if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=bookexchange

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Secret (IMPORTANT: Change this in production!)
JWT_SECRET=$(openssl rand -base64 32)

# AI Provider Keys (Optional - for enrichment features)
# GEMINI_API_KEY=your_gemini_key
# ANTHROPIC_API_KEY=your_claude_key
# OPENAI_API_KEY=your_openai_key

# Security
SESSION_SECRET=$(openssl rand -base64 32)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Features
ENABLE_BATCH_UPLOAD=true
ENABLE_AI_ENRICHMENT=false
MAX_BATCH_SIZE=1000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
ENVEOF

    print_success "Created .env file with defaults"
    print_warning "Please edit .env and configure your database credentials and API keys"
else
    print_warning ".env file already exists. Skipping creation."
fi

# Step 4: Database Setup
print_step "Step 4/7: Setting Up Database"

if [ "$PG_INSTALLED" = true ]; then
    echo -e "${YELLOW}Do you want to automatically create the database? (y/n)${NC}"
    read -r CREATE_DB
    
    if [ "$CREATE_DB" = "y" ] || [ "$CREATE_DB" = "Y" ]; then
        source .env
        
        # Create database
        createdb -h $DB_HOST -U $DB_USER $DB_NAME 2>/dev/null && \
            print_success "Database '$DB_NAME' created" || \
            print_warning "Database '$DB_NAME' may already exist"
        
        # Run migrations
        if [ -f "src/config/schema.sql" ]; then
            psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f src/config/schema.sql && \
                print_success "Database schema initialized"
        fi
    else
        print_warning "Skipping automatic database setup. Please run manually:"
        echo "  1. Create database: createdb bookexchange"
        echo "  2. Run schema: psql -d bookexchange -f src/config/schema.sql"
    fi
else
    print_warning "PostgreSQL not detected. Manual database setup required:"
    echo "  1. Install PostgreSQL"
    echo "  2. Create database: createdb bookexchange"
    echo "  3. Run schema: psql -d bookexchange -f src/config/schema.sql"
fi

# Step 5: Create Required Directories
print_step "Step 5/7: Creating Required Directories"

mkdir -p logs uploads public/uploads
chmod 755 logs uploads public/uploads

print_success "Directories created"

# Step 6: Build Assets (if build script exists)
print_step "Step 6/7: Building Application"

if grep -q '"build"' package.json 2>/dev/null; then
    npm run build && print_success "Build completed" || print_warning "Build step optional"
else
    print_warning "No build script found. Skipping build step."
fi

# Step 7: Final Setup
print_step "Step 7/7: Final Configuration"

# Create startup script
cat > start.sh << 'STARTEOF'
#!/bin/bash
echo "🚀 Starting To-Be-Read Exchange Hub..."

# Load environment
if [ -f .env ]; then
    source .env
fi

# Start server
NODE_ENV=production node src/server.js
STARTEOF

chmod +x start.sh
print_success "Created start.sh script"

# Create systemd service (optional)
cat > bookexchange.service << 'SERVICEEOF'
[Unit]
Description=To-Be-Read Exchange Hub
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/To-Be-Read-Exchange-Hub
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/bookexchange/app.log
StandardError=append:/var/log/bookexchange/error.log

Environment=NODE_ENV=production
EnvironmentFile=/path/to/To-Be-Read-Exchange-Hub/.env

[Install]
WantedBy=multi-user.target
SERVICEEOF

print_success "Created systemd service file (bookexchange.service)"

# Summary
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✓ INSTALLATION COMPLETE!                 ║"
echo "╚══════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Quick Start:${NC}"
echo "  1. Configure database in .env file"
echo "  2. (Optional) Add AI API keys for enrichment features"
echo "  3. Run: ${GREEN}./start.sh${NC}"
echo "  4. Open: ${GREEN}http://localhost:${PORT}${NC}"

echo -e "\n${BLUE}Advanced Setup (Systemd Service):${NC}"
echo "  1. Edit paths in bookexchange.service"
echo "  2. sudo cp bookexchange.service /etc/systemd/system/"
echo "  3. sudo systemctl enable bookexchange"
echo "  4. sudo systemctl start bookexchange"

echo -e "\n${BLUE}Development Mode:${NC}"
echo "  npm run dev"

echo -e "\n${BLUE}Testing:${NC}"
echo "  npm test"

echo -e "\n${BLUE}Logs:${NC}"
echo "  tail -f logs/app.log"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  ✓ Review and edit .env for your environment"
echo "  ✓ Configure database credentials"
echo "  ✓ (Optional) Add AI provider API keys"
echo "  ✓ Create admin user: npm run create-admin"
echo "  ✓ Start the server: ./start.sh"

echo -e "\n${GREEN}Documentation:${NC}"
echo "  • README.md - General overview"
echo "  • QUICKSTART.md - Quick start guide"
echo "  • BATCH_UPLOAD_GUIDE.md - Batch upload features"
echo "  • PRODUCTION-READINESS.md - Production deployment"

echo -e "\n${BLUE}Support:${NC}"
echo "  • GitHub Issues: https://github.com/PNW-E/To-Be-Read-Exchange-Hub/issues"
echo "  • Documentation: See docs/ folder"

echo -e "\n${GREEN}Happy book managing! 📚${NC}\n"
