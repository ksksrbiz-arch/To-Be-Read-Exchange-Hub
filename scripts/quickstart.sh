#!/bin/bash

# 🚀 Zero-Experience Quick Start for To-Be-Read Exchange Hub
# Run this ONE command: curl -fsSL https://raw.githubusercontent.com/your-repo/main/scripts/quickstart.sh | bash
# Or locally: bash scripts/quickstart.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${BLUE}${BOLD}"
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        📚 To-Be-Read Exchange Hub - Quick Start 🚀        ║
║                                                            ║
║            Zero-Experience Setup in 60 Seconds             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

echo -e "${BLUE}🔍 Detected OS: ${BOLD}$OS${NC}"
echo ""

# Ask user preference
echo -e "${BOLD}Choose your setup method:${NC}"
echo ""
echo "  1) 🐳 Docker (Recommended) - Zero configuration, works anywhere"
echo "  2) 💻 Local - Install on your system (Node.js + PostgreSQL required)"
echo ""
read -p "Enter choice (1 or 2): " SETUP_METHOD

if [ "$SETUP_METHOD" != "1" ] && [ "$SETUP_METHOD" != "2" ]; then
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi

if [ "$SETUP_METHOD" = "1" ]; then
    # ========== DOCKER SETUP ==========
    echo ""
    echo -e "${GREEN}${BOLD}🐳 Docker Setup Selected${NC}"
    echo ""
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker not found. Installing Docker...${NC}"
        
        if [ "$OS" = "linux" ]; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
            sudo usermod -aG docker $USER
            echo -e "${GREEN}✅ Docker installed. You may need to log out and back in.${NC}"
        elif [ "$OS" = "mac" ]; then
            echo -e "${YELLOW}Please install Docker Desktop from: https://www.docker.com/products/docker-desktop${NC}"
            exit 1
        else
            echo -e "${RED}Please install Docker manually for your OS${NC}"
            exit 1
        fi
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker Compose not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker ready${NC}"
    echo ""
    
    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
    
    # Create .env file automatically
    cat > .env << EOL
# Auto-generated configuration - $(date)
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

API_RATE_WINDOW_MIN=15
API_RATE_MAX=100
SYNC_RATE_WINDOW_MIN=15
SYNC_RATE_MAX=10

DB_USER=postgres
DB_HOST=db
DB_NAME=books_exchange
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=5432
EOL
    
    echo -e "${GREEN}✅ Configuration generated${NC}"
    echo ""
    
    # Start services
    echo -e "${BLUE}${BOLD}🚀 Starting services...${NC}"
    echo ""
    
    if docker compose version &> /dev/null 2>&1; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi
    
    echo ""
    echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
    
    # Poll for health with timeout
    MAX_WAIT=30
    ELAPSED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            break
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        echo -n "."
    done
    echo ""
    
    # Health check
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        echo ""
        echo -e "${GREEN}${BOLD}✅ SUCCESS! Application is running!${NC}"
        echo ""
        echo -e "${BOLD}🌐 Access your application:${NC}"
        echo ""
        echo -e "  📖 Web Interface:    ${BLUE}http://localhost:3000${NC}"
        echo -e "  📚 API Docs:         ${BLUE}http://localhost:3000/api-docs${NC}"
        echo -e "  💚 Health Check:     ${BLUE}http://localhost:3000/api/health${NC}"
        echo ""
        echo -e "${BOLD}🛠️  Useful commands:${NC}"
        echo ""
        echo "  View logs:     docker compose logs -f"
        echo "  Stop:          docker compose down"
        echo "  Restart:       docker compose restart"
        echo ""
    else
        echo -e "${YELLOW}⚠️  Services started but health check failed${NC}"
        echo "Check logs: docker compose logs"
    fi

else
    # ========== LOCAL SETUP ==========
    echo ""
    echo -e "${GREEN}${BOLD}💻 Local Setup Selected${NC}"
    echo ""
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        echo ""
        echo "Install Node.js 20 LTS:"
        if [ "$OS" = "mac" ]; then
            echo "  brew install node@20"
        elif [ "$OS" = "linux" ]; then
            echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "  sudo apt-get install -y nodejs"
        fi
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version too old (need v18+)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js $(node -v)${NC}"
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  PostgreSQL not found${NC}"
        echo ""
        echo "Install PostgreSQL:"
        if [ "$OS" = "mac" ]; then
            echo "  brew install postgresql@16"
            echo "  brew services start postgresql"
        elif [ "$OS" = "linux" ]; then
            echo "  sudo apt-get install postgresql-16"
            echo "  sudo systemctl start postgresql"
        fi
        echo ""
        read -p "Install PostgreSQL now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ "$OS" = "mac" ]; then
                brew install postgresql@16
                brew services start postgresql
            elif [ "$OS" = "linux" ]; then
                sudo apt-get update
                sudo apt-get install -y postgresql postgresql-contrib
                sudo systemctl start postgresql
            fi
        else
            echo -e "${RED}PostgreSQL required. Exiting.${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ PostgreSQL ready${NC}"
    echo ""
    
    # Install dependencies
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install --silent
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
    
    # Interactive configuration
    echo -e "${BOLD}⚙️  Configuration${NC}"
    echo ""
    
    read -p "Database name [books_exchange]: " DB_NAME
    DB_NAME=${DB_NAME:-books_exchange}
    
    read -p "Database user [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -s -p "Database password [auto-generate]: " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
        echo -e "${GREEN}Generated secure password${NC}"
    fi
    
    # Create .env
    cat > .env << EOL
# Generated by quickstart - $(date)
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

API_RATE_WINDOW_MIN=15
API_RATE_MAX=100
SYNC_RATE_WINDOW_MIN=15
SYNC_RATE_MAX=10

DB_USER=${DB_USER}
DB_HOST=localhost
DB_NAME=${DB_NAME}
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=5432
EOL
    
    echo -e "${GREEN}✅ Configuration saved${NC}"
    echo ""
    
    # Setup database
    echo -e "${BLUE}🗄️  Setting up database...${NC}"
    
    # Create database
    if psql -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "${YELLOW}Database already exists${NC}"
    else
        createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null || \
        sudo -u postgres createdb "$DB_NAME"
    fi
    
    # Run schema
    psql -U "$DB_USER" -d "$DB_NAME" -f src/config/schema.sql &> /dev/null || \
    sudo -u postgres psql -d "$DB_NAME" -f src/config/schema.sql &> /dev/null
    
    echo -e "${GREEN}✅ Database ready${NC}"
    echo ""
    
    # Start server
    echo -e "${BLUE}🚀 Starting server...${NC}"
    npm run dev &
    SERVER_PID=$!
    
    sleep 5
    
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        echo ""
        echo -e "${GREEN}${BOLD}✅ SUCCESS! Application is running!${NC}"
        echo ""
        echo -e "${BOLD}🌐 Access your application:${NC}"
        echo ""
        echo -e "  📖 Web Interface:    ${BLUE}http://localhost:3000${NC}"
        echo -e "  📚 API Docs:         ${BLUE}http://localhost:3000/api-docs${NC}"
        echo -e "  💚 Health Check:     ${BLUE}http://localhost:3000/api/health${NC}"
        echo ""
        echo -e "${BOLD}Server running in background (PID: $SERVER_PID)${NC}"
        echo ""
        echo "Stop with: kill $SERVER_PID"
        echo ""
    else
        echo -e "${RED}❌ Startup failed${NC}"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
fi

echo -e "${BLUE}${BOLD}📚 Next Steps:${NC}"
echo ""
echo "  1. Import books via CSV (see /api-docs)"
echo "  2. Enable debugging (npm run debug)"
echo "  3. Read CONTRIBUTING.md for development workflow"
echo ""
echo -e "${GREEN}Happy book exchanging! 📚✨${NC}"
