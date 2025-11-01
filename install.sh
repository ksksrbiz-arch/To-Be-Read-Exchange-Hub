#!/bin/bash

###############################################################################
# TO-BE-READ EXCHANGE HUB - FULLY AUTOMATED INSTALLER
# Zero-interaction deployment with intelligent auto-configuration
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
NODE_MIN_VERSION="18"
INSTALL_DIR="${INSTALL_DIR:-$(pwd)}"
AUTO_MODE="${AUTO_MODE:-true}"
SKIP_DB_SETUP="${SKIP_DB_SETUP:-false}"

# Logging
LOG_FILE="installation-$(date +%Y%m%d-%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

# Banner
clear
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        📚 TO-BE-READ EXCHANGE HUB 📚                         ║
║                                                              ║
║        FULLY AUTOMATED INSTALLER                            ║
║        Zero Configuration • Auto-Everything                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}⚡ Automated installation starting...${NC}\n"
sleep 1

# Helper functions
log_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

log_info() {
    echo -e "${BLUE}  ℹ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

check_command() {
    command -v $1 &> /dev/null
}

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            echo "debian"
        elif [ -f /etc/redhat-release ]; then
            echo "redhat"
        elif [ -f /etc/alpine-release ]; then
            echo "alpine"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

install_nodejs_debian() {
    log_info "Installing Node.js via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
}

install_nodejs_redhat() {
    log_info "Installing Node.js via NodeSource..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
}

install_nodejs_macos() {
    log_info "Installing Node.js via Homebrew..."
    if ! check_command brew; then
        log_error "Homebrew not found. Please install from https://brew.sh"
        exit 1
    fi
    brew install node
}

install_postgresql_debian() {
    log_info "Installing PostgreSQL..."
    sudo apt-get update -qq
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
}

install_postgresql_redhat() {
    log_info "Installing PostgreSQL..."
    sudo yum install -y postgresql-server postgresql-contrib
    sudo postgresql-setup --initdb
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
}

install_postgresql_macos() {
    log_info "Installing PostgreSQL via Homebrew..."
    brew install postgresql@14
    brew services start postgresql@14
}

# Step 1: System Detection
log_step "Step 1/10: Detecting System Configuration"

OS_TYPE=$(detect_os)
log_info "Operating System: $OS_TYPE"

# Detect available memory
TOTAL_MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024)}' || echo "2048")
log_info "Available Memory: ${TOTAL_MEM}MB"

# Detect CPU cores
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "2")
log_info "CPU Cores: $CPU_CORES"

# Auto-detect best port
for port in 3000 3001 3002 8080 8081; do
    if ! netstat -tuln 2>/dev/null | grep -q ":$port " && ! lsof -i :$port &>/dev/null; then
        BEST_PORT=$port
        break
    fi
done
BEST_PORT=${BEST_PORT:-3000}
log_info "Selected Port: $BEST_PORT"

log_success "System detection complete"

# Step 2: Auto-install Dependencies
log_step "Step 2/10: Installing Required Dependencies"

# Check and install Node.js
if check_command node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge "$NODE_MIN_VERSION" ]; then
        log_success "Node.js $(node -v) already installed"
    else
        log_warning "Node.js version too old, upgrading..."
        case $OS_TYPE in
            debian) install_nodejs_debian ;;
            redhat) install_nodejs_redhat ;;
            macos) install_nodejs_macos ;;
            *) log_error "Cannot auto-install Node.js on $OS_TYPE"; exit 1 ;;
        esac
    fi
else
    log_info "Node.js not found, installing..."
    case $OS_TYPE in
        debian) install_nodejs_debian ;;
        redhat) install_nodejs_redhat ;;
        macos) install_nodejs_macos ;;
        *) log_error "Cannot auto-install Node.js on $OS_TYPE"; exit 1 ;;
    esac
fi

# Check and install PostgreSQL
if [ "$SKIP_DB_SETUP" != "true" ]; then
    if check_command psql; then
        log_success "PostgreSQL already installed"
    else
        log_info "PostgreSQL not found, installing..."
        case $OS_TYPE in
            debian) install_postgresql_debian ;;
            redhat) install_postgresql_redhat ;;
            macos) install_postgresql_macos ;;
            *) log_warning "Cannot auto-install PostgreSQL on $OS_TYPE" ;;
        esac
    fi
fi

log_success "Dependencies installation complete"

# Step 3: Install Node Packages
log_step "Step 3/10: Installing Node.js Packages"

if [ -f "package.json" ]; then
    npm install --production --silent
    log_success "Node packages installed ($(ls node_modules 2>/dev/null | wc -l) packages)"
else
    log_error "package.json not found!"
    exit 1
fi

# Step 4: Generate Secure Configuration
log_step "Step 4/10: Generating Secure Configuration"

# Generate random secrets
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)

# Auto-detect database user
DB_USER="${DB_USER:-postgres}"
if id "postgres" &>/dev/null; then
    DB_USER="postgres"
elif [ "$USER" != "root" ]; then
    DB_USER="$USER"
fi

# Generate database password
DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null | tr -d '/+=' || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)

cat > .env << EOF
# Auto-generated configuration - $(date)
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=bookexchange

# Server Configuration
PORT=$BEST_PORT
NODE_ENV=production
HOST=0.0.0.0

# Security (Auto-generated)
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Performance (Auto-tuned for ${TOTAL_MEM}MB RAM, ${CPU_CORES} CPUs)
DB_POOL_MAX=$((CPU_CORES * 2))
DB_POOL_MIN=2
WORKER_THREADS=$CPU_CORES

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Features
ENABLE_BATCH_UPLOAD=true
ENABLE_AI_ENRICHMENT=false
MAX_BATCH_SIZE=1000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# AI Providers (Optional - Add your keys)
# GEMINI_API_KEY=
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# AI_PROVIDER_ORDER=gemini,claude,openai
EOF

chmod 600 .env
log_success "Secure configuration generated"
log_info "Database user: $DB_USER"
log_info "Server port: $BEST_PORT"

# Step 5: Database Setup
log_step "Step 5/10: Setting Up Database"

if [ "$SKIP_DB_SETUP" != "true" ] && check_command psql; then
    # Create PostgreSQL user if needed
    if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null | grep -q 1; then
        log_info "Creating database user..."
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
    fi
    
    # Create database
    if ! sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw bookexchange; then
        log_info "Creating database..."
        sudo -u postgres createdb -O $DB_USER bookexchange 2>/dev/null || true
        log_success "Database 'bookexchange' created"
    else
        log_info "Database 'bookexchange' already exists"
    fi
    
    # Grant privileges
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bookexchange TO $DB_USER;" 2>/dev/null || true
    
    # Run schema
    if [ -f "src/config/schema.sql" ]; then
        log_info "Initializing database schema..."
        PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d bookexchange -f src/config/schema.sql 2>/dev/null
        log_success "Database schema initialized"
    fi
    
    log_success "Database setup complete"
else
    log_warning "Skipping database setup (will need manual configuration)"
fi

# Step 6: Create Directories
log_step "Step 6/10: Creating Directory Structure"

mkdir -p logs uploads public/uploads backups
chmod 755 logs uploads public/uploads backups
touch logs/app.log logs/error.log
chmod 644 logs/*.log

log_success "Directory structure created"

# Step 7: Build Application
log_step "Step 7/10: Building Application"

if grep -q '"build"' package.json 2>/dev/null; then
    npm run build --silent 2>/dev/null && log_success "Application built" || log_info "Build step skipped"
else
    log_info "No build step required"
fi

# Step 8: Create Service Files
log_step "Step 8/10: Creating Service Management Files"

# Startup script
cat > start.sh << 'STARTEOF'
#!/bin/bash
echo "🚀 Starting To-Be-Read Exchange Hub..."
source .env
NODE_ENV=production node src/server.js
STARTEOF
chmod +x start.sh

# PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'bookexchange',
    script: 'src/server.js',
    instances: $CPU_CORES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $BEST_PORT
    },
    error_file: 'logs/error.log',
    out_file: 'logs/app.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_memory_restart: '${TOTAL_MEM}M',
    watch: false
  }]
};
EOF

# Systemd service
cat > bookexchange.service << EOF
[Unit]
Description=To-Be-Read Exchange Hub
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/app.log
StandardError=append:$INSTALL_DIR/logs/error.log

Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

log_success "Service files created"
log_info "Startup script: ./start.sh"
log_info "PM2 config: ecosystem.config.js"
log_info "Systemd service: bookexchange.service"

# Step 9: Create Admin User Script
log_step "Step 9/10: Creating Admin User Setup"

cat > create-admin.sh << 'EOF'
#!/bin/bash
source .env
echo "Creating admin user..."
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@bookexchange.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 12)}"

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME << SQL
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES (
    '$ADMIN_EMAIL',
    crypt('$ADMIN_PASSWORD', gen_salt('bf')),
    'admin',
    'System',
    'Administrator'
) ON CONFLICT (email) DO NOTHING;
SQL

echo "Admin user created:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Save these credentials and change the password after first login!"
EOF
chmod +x create-admin.sh

log_success "Admin user script created"

# Step 10: Final Setup
log_step "Step 10/10: Final Configuration"

# Create convenience scripts
cat > status.sh << 'EOF'
#!/bin/bash
source .env
echo "📊 System Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Port: $PORT"
curl -s http://localhost:$PORT/health 2>/dev/null | jq . || echo "Server not running"
echo ""
ps aux | grep "node src/server.js" | grep -v grep || echo "No Node process found"
EOF
chmod +x status.sh

cat > stop.sh << 'EOF'
#!/bin/bash
pkill -f "node src/server.js"
echo "🛑 Server stopped"
EOF
chmod +x stop.sh

cat > backup.sh << 'EOF'
#!/bin/bash
source .env
BACKUP_FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE
gzip $BACKUP_FILE
echo "✓ Backup created: ${BACKUP_FILE}.gz"
EOF
chmod +x backup.sh

log_success "Utility scripts created"

# Installation complete!
clear
echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║             ✓ INSTALLATION COMPLETE! ✓                      ║
║                                                              ║
║        🎉 To-Be-Read Exchange Hub is Ready! 🎉              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Quick Start${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "${BLUE}1. Create Admin User:${NC}"
echo -e "   ${YELLOW}./create-admin.sh${NC}"
echo -e ""
echo -e "${BLUE}2. Start Application:${NC}"
echo -e "   ${YELLOW}./start.sh${NC}"
echo -e ""
echo -e "${BLUE}3. Access Application:${NC}"
echo -e "   ${YELLOW}http://localhost:$BEST_PORT${NC}"
echo -e ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Alternative Start Methods${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "${BLUE}Using PM2 (Recommended):${NC}"
echo -e "   npm install -g pm2"
echo -e "   pm2 start ecosystem.config.js"
echo -e "   pm2 save && pm2 startup"
echo -e ""
echo -e "${BLUE}Using Systemd:${NC}"
echo -e "   sudo cp bookexchange.service /etc/systemd/system/"
echo -e "   sudo systemctl enable bookexchange"
echo -e "   sudo systemctl start bookexchange"
echo -e ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Utility Commands${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "  ${BLUE}./status.sh${NC}       - Check application status"
echo -e "  ${BLUE}./stop.sh${NC}         - Stop application"
echo -e "  ${BLUE}./backup.sh${NC}       - Create database backup"
echo -e "  ${BLUE}./create-admin.sh${NC} - Create admin user"
echo -e ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Configuration Details${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "  ${BLUE}Port:${NC}             $BEST_PORT"
echo -e "  ${BLUE}Database:${NC}         bookexchange"
echo -e "  ${BLUE}Database User:${NC}    $DB_USER"
echo -e "  ${BLUE}Config File:${NC}      .env"
echo -e "  ${BLUE}Log File:${NC}         logs/app.log"
echo -e "  ${BLUE}Installation Log:${NC} $LOG_FILE"
echo -e ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Optional: Enable AI Features${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "  Edit .env and add your API keys:"
echo -e "    ${BLUE}ENABLE_AI_ENRICHMENT=true${NC}"
echo -e "    ${BLUE}GEMINI_API_KEY=your_key_here${NC}"
echo -e "    ${BLUE}ANTHROPIC_API_KEY=your_key_here${NC}"
echo -e "    ${BLUE}OPENAI_API_KEY=your_key_here${NC}"
echo -e ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Next Steps${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e ""
echo -e "  1. ✓ Installation complete"
echo -e "  2. → Run ./create-admin.sh to create admin user"
echo -e "  3. → Run ./start.sh to start the server"
echo -e "  4. → Open http://localhost:$BEST_PORT in your browser"
echo -e "  5. → Login with admin credentials"
echo -e "  6. → Start managing your books! 📚"
echo -e ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Happy Book Managing! 📚${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
