#!/bin/bash

###############################################################################
# CREATE SINGLE-DOWNLOAD RELEASE PACKAGE
# Bundles entire application into a portable, ready-to-deploy archive
###############################################################################

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VERSION=${1:-"1.0.0"}
PACKAGE_NAME="to-be-read-exchange-hub-v${VERSION}"
BUILD_DIR="dist/${PACKAGE_NAME}"

echo -e "${BLUE}════════════════════════════════════════════════════════"
echo "  📦 Creating Release Package v${VERSION}"
echo "═══════════════════════════════════════════════════════=${NC}"

# Clean previous builds
rm -rf dist
mkdir -p "$BUILD_DIR"

echo -e "\n${BLUE}▶ Step 1: Copying Application Files${NC}"

# Copy essential files
cp -r src "$BUILD_DIR/"
cp -r public "$BUILD_DIR/"
cp -r tests "$BUILD_DIR/" 2>/dev/null || echo "No tests directory"
cp -r docs "$BUILD_DIR/" 2>/dev/null || echo "No docs directory"
cp -r scripts "$BUILD_DIR/"

# Copy configuration files
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/" 2>/dev/null || true
cp jest.config.js "$BUILD_DIR/" 2>/dev/null || true
cp eslint.config.mjs "$BUILD_DIR/" 2>/dev/null || true

# Copy documentation
cp README.md "$BUILD_DIR/" 2>/dev/null || true
cp LICENSE "$BUILD_DIR/" 2>/dev/null || true
cp QUICKSTART.md "$BUILD_DIR/" 2>/dev/null || true
cp BATCH_UPLOAD_GUIDE.md "$BUILD_DIR/" 2>/dev/null || true
cp PRODUCTION-READINESS.md "$BUILD_DIR/" 2>/dev/null || true

# Copy deployment scripts
cp deploy.sh "$BUILD_DIR/"
chmod +x "$BUILD_DIR/deploy.sh"

echo -e "${GREEN}✓ Application files copied${NC}"

# Create .env.example
echo -e "\n${BLUE}▶ Step 2: Creating Environment Template${NC}"

cat > "$BUILD_DIR/.env.example" << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=bookexchange

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=CHANGE_ME_GENERATE_RANDOM_SECRET

# AI Provider Keys (Optional - Uncomment to enable)
# GEMINI_API_KEY=your_gemini_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key
# OPENAI_API_KEY=your_openai_api_key

# AI Provider Order (cheapest first)
# AI_PROVIDER_ORDER=gemini,claude,openai

# Security
SESSION_SECRET=CHANGE_ME_GENERATE_RANDOM_SECRET
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Features
ENABLE_BATCH_UPLOAD=true
ENABLE_AI_ENRICHMENT=false
ENABLE_AI_IMAGE_GEN=false
MAX_BATCH_SIZE=1000

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS (Optional - for API access from other domains)
# CORS_ORIGIN=https://yourdomain.com
EOF

echo -e "${GREEN}✓ Environment template created${NC}"

# Create installation README
echo -e "\n${BLUE}▶ Step 3: Creating Installation Guide${NC}"

cat > "$BUILD_DIR/INSTALL.md" << 'EOF'
# 📚 To-Be-Read Exchange Hub - Installation Guide

## System Requirements

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v13.0 or higher
- **Operating System**: Linux, macOS, or Windows
- **RAM**: Minimum 1GB (2GB recommended)
- **Disk Space**: 500MB

## One-Command Installation

```bash
chmod +x deploy.sh && ./deploy.sh
```

The deployment script will:
1. ✓ Check system requirements
2. ✓ Install Node.js dependencies
3. ✓ Configure environment variables
4. ✓ Set up PostgreSQL database
5. ✓ Create required directories
6. ✓ Build application assets
7. ✓ Generate startup scripts

## Manual Installation

### 1. Install Dependencies

```bash
npm install --production
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env  # Edit database credentials and secrets
```

**Important**: Generate secure secrets:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32
```

### 3. Set Up Database

```bash
# Create database
createdb bookexchange

# Run schema
psql -d bookexchange -f src/config/schema.sql

# (Optional) Seed sample data
psql -d bookexchange -f scripts/lib/seed-vintage.sql
```

### 4. Start Application

```bash
# Production mode
npm start

# Development mode
npm run dev

# With auto-restart
npm run dev:watch
```

## Production Deployment

### Using Systemd (Linux)

1. Edit `bookexchange.service` with your paths
2. Install service:
```bash
sudo cp bookexchange.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bookexchange
sudo systemctl start bookexchange
```

### Using PM2 (Cross-platform)

```bash
npm install -g pm2
pm2 start src/server.js --name bookexchange
pm2 save
pm2 startup
```

### Using Docker

```bash
docker-compose up -d
```

## Post-Installation

### Create Admin User

```bash
npm run create-admin
```

### Access Application

Open your browser to: `http://localhost:3000`

Default credentials (if using sample data):
- Email: `admin@example.com`
- Password: `password123`

**Change immediately after first login!**

### Enable AI Features (Optional)

1. Get API keys from:
   - Google Gemini: https://makersuite.google.com/
   - Anthropic Claude: https://console.anthropic.com/
   - OpenAI: https://platform.openai.com/

2. Add to `.env`:
```
ENABLE_AI_ENRICHMENT=true
GEMINI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

3. Restart application

## Verification

Run health check:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 123
}
```

## Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env`
- Check database exists: `psql -l | grep bookexchange`

### Port Already in Use
- Change `PORT` in `.env`
- Or stop conflicting service

### AI Enrichment Not Working
- Verify API keys in `.env`
- Check `ENABLE_AI_ENRICHMENT=true`
- Review logs: `tail -f logs/app.log`

## Support

- Documentation: See `docs/` folder
- Issues: https://github.com/PNW-E/To-Be-Read-Exchange-Hub/issues
- Guides: `BATCH_UPLOAD_GUIDE.md`, `PRODUCTION-READINESS.md`

## Next Steps

1. ✓ Change default admin password
2. ✓ Configure backups (see `PRODUCTION-READINESS.md`)
3. ✓ Set up SSL/TLS for HTTPS
4. ✓ Configure firewall rules
5. ✓ Review security settings

Happy book managing! 📚
EOF

echo -e "${GREEN}✓ Installation guide created${NC}"

# Create directory structure placeholders
echo -e "\n${BLUE}▶ Step 4: Creating Directory Structure${NC}"

mkdir -p "$BUILD_DIR/logs"
mkdir -p "$BUILD_DIR/uploads"
echo "# Upload directory for batch processing" > "$BUILD_DIR/uploads/README.md"
echo "# Application logs" > "$BUILD_DIR/logs/README.md"

echo -e "${GREEN}✓ Directory structure created${NC}"

# Create package info
echo -e "\n${BLUE}▶ Step 5: Generating Package Metadata${NC}"

cat > "$BUILD_DIR/PACKAGE_INFO.txt" << EOF
═══════════════════════════════════════════════════════════
  TO-BE-READ EXCHANGE HUB - RELEASE PACKAGE
═══════════════════════════════════════════════════════════

Version: ${VERSION}
Build Date: $(date)
Package: ${PACKAGE_NAME}.tar.gz

CONTENTS:
  • Complete application source code
  • Pre-configured deployment scripts
  • Comprehensive documentation
  • Database schema and migrations
  • Sample data and test fixtures

INSTALLATION:
  1. Extract archive: tar -xzf ${PACKAGE_NAME}.tar.gz
  2. Navigate to directory: cd ${PACKAGE_NAME}
  3. Run deployment: ./deploy.sh
  4. Follow on-screen instructions

REQUIREMENTS:
  • Node.js v18+ (https://nodejs.org)
  • PostgreSQL v13+ (https://postgresql.org)
  • 1GB+ RAM
  • 500MB+ disk space

DOCUMENTATION:
  • INSTALL.md - Detailed installation instructions
  • README.md - Application overview
  • QUICKSTART.md - Quick start guide
  • BATCH_UPLOAD_GUIDE.md - Batch upload features
  • PRODUCTION-READINESS.md - Production deployment

SUPPORT:
  • GitHub: https://github.com/PNW-E/To-Be-Read-Exchange-Hub
  • Issues: https://github.com/PNW-E/To-Be-Read-Exchange-Hub/issues

═══════════════════════════════════════════════════════════
© 2025 To-Be-Read Exchange Hub. All rights reserved.
License: See LICENSE file
═══════════════════════════════════════════════════════════
EOF

echo -e "${GREEN}✓ Package metadata generated${NC}"

# Create checksum
echo -e "\n${BLUE}▶ Step 6: Creating Archive${NC}"

cd dist
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
TAR_SIZE=$(du -h "${PACKAGE_NAME}.tar.gz" | cut -f1)

# Generate checksums
sha256sum "${PACKAGE_NAME}.tar.gz" > "${PACKAGE_NAME}.tar.gz.sha256"
md5sum "${PACKAGE_NAME}.tar.gz" > "${PACKAGE_NAME}.tar.gz.md5"

echo -e "${GREEN}✓ Archive created: ${PACKAGE_NAME}.tar.gz (${TAR_SIZE})${NC}"

# Create release notes
cat > "${PACKAGE_NAME}-RELEASE_NOTES.md" << EOF
# Release Notes - v${VERSION}

**Build Date**: $(date)  
**Package Size**: ${TAR_SIZE}

## What's Included

### Core Features
- ✅ Smart book inventory management
- ✅ AI-powered metadata enrichment (Gemini, Claude, OpenAI)
- ✅ Batch upload system (CSV/JSON + images)
- ✅ Intelligent shelf allocation
- ✅ Real-time search and filtering
- ✅ Site content management with markdown
- ✅ User authentication and authorization
- ✅ Prometheus metrics integration

### New in This Release
- Modern responsive UI with improved spacing
- Enhanced CSS with CSS variables for easy theming
- One-click deployment script
- Comprehensive installation documentation
- Production-ready systemd service configuration
- Docker support
- Automated testing suite

### Security
- JWT-based authentication
- SQL injection prevention
- XSS protection with sanitization
- Rate limiting
- File upload validation
- CORS configuration

### Performance
- Concurrency limiting
- Connection pooling
- Response caching
- Batch processing optimization
- Efficient database queries

## Installation

\`\`\`bash
# Extract
tar -xzf ${PACKAGE_NAME}.tar.gz

# Navigate
cd ${PACKAGE_NAME}

# Deploy
./deploy.sh
\`\`\`

See `INSTALL.md` for detailed instructions.

## Verification

**SHA256**: \`$(cat "${PACKAGE_NAME}.tar.gz.sha256" | cut -d' ' -f1)\`  
**MD5**: \`$(cat "${PACKAGE_NAME}.tar.gz.md5" | cut -d' ' -f1)\`

## Documentation

- \`INSTALL.md\` - Installation guide
- \`README.md\` - Application overview
- \`QUICKSTART.md\` - Quick start guide
- \`BATCH_UPLOAD_GUIDE.md\` - Batch features
- \`PRODUCTION-READINESS.md\` - Production deployment

## Support

For issues or questions:
- GitHub Issues: https://github.com/PNW-E/To-Be-Read-Exchange-Hub/issues
- Documentation: See \`docs/\` folder

## License

See LICENSE file for details.

---

Happy book managing! 📚
EOF

echo -e "${GREEN}✓ Release notes created${NC}"

# Final summary
echo -e "\n${GREEN}════════════════════════════════════════════════════════"
echo "  ✓ PACKAGE CREATED SUCCESSFULLY!"
echo "═══════════════════════════════════════════════════════=${NC}"

echo -e "\n${BLUE}Package Details:${NC}"
echo "  📦 Name: ${PACKAGE_NAME}.tar.gz"
echo "  📏 Size: ${TAR_SIZE}"
echo "  📍 Location: dist/${PACKAGE_NAME}.tar.gz"

echo -e "\n${BLUE}Checksums:${NC}"
echo "  🔐 SHA256: $(cat "${PACKAGE_NAME}.tar.gz.sha256" | cut -d' ' -f1)"
echo "  🔐 MD5: $(cat "${PACKAGE_NAME}.tar.gz.md5" | cut -d' ' -f1)"

echo -e "\n${BLUE}Distribution:${NC}"
echo "  1. Upload ${PACKAGE_NAME}.tar.gz to releases"
echo "  2. Include ${PACKAGE_NAME}-RELEASE_NOTES.md"
echo "  3. Publish checksums for verification"

echo -e "\n${BLUE}User Instructions:${NC}"
echo "  1. Download ${PACKAGE_NAME}.tar.gz"
echo "  2. Verify checksum"
echo "  3. Extract: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "  4. Deploy: cd ${PACKAGE_NAME} && ./deploy.sh"

echo -e "\n${GREEN}Ready for distribution! 🚀${NC}\n"
