#!/bin/bash

###############################################################################
# ONE-LINE WEB INSTALLER
# Usage: curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh | bash
###############################################################################

set -e

REPO_URL="https://github.com/PNW-E/To-Be-Read-Exchange-Hub"
RELEASE_URL="$REPO_URL/releases/latest/download"
INSTALL_DIR="${INSTALL_DIR:-$HOME/bookexchange}"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║     📚 To-Be-Read Exchange Hub - Web Installer 📚            ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}🌐 Downloading latest release...${NC}"

# Detect latest version
LATEST_VERSION=$(curl -s https://api.github.com/repos/PNW-E/To-Be-Read-Exchange-Hub/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
    echo -e "${CYAN}📦 Cloning from repository...${NC}"
    git clone $REPO_URL "$INSTALL_DIR"
    cd "$INSTALL_DIR"
else
    echo -e "${GREEN}✓ Latest version: $LATEST_VERSION${NC}"
    
    # Download release package
    PACKAGE_NAME="to-be-read-exchange-hub-$LATEST_VERSION.tar.gz"
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    curl -L "$RELEASE_URL/$PACKAGE_NAME" -o "$PACKAGE_NAME"
    
    echo -e "${BLUE}📦 Extracting package...${NC}"
    tar -xzf "$PACKAGE_NAME" --strip-components=1
    rm "$PACKAGE_NAME"
fi

echo -e "${GREEN}✓ Download complete${NC}"

# Make scripts executable
chmod +x install.sh deploy.sh 2>/dev/null || true

echo -e "\n${BLUE}🚀 Starting automated installation...${NC}\n"

# Run installer
if [ -f "install.sh" ]; then
    ./install.sh
elif [ -f "deploy.sh" ]; then
    ./deploy.sh
else
    echo -e "${CYAN}Manual installation required${NC}"
    echo -e "Run: npm install && npm start"
fi

echo -e "\n${GREEN}✓ Installation directory: $INSTALL_DIR${NC}"
echo -e "${CYAN}To start the application:${NC}"
echo -e "  cd $INSTALL_DIR"
echo -e "  ./start.sh"
