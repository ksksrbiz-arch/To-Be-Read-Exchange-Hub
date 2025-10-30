# 📦 Single-Download Deployment Guide

## Overview

The To-Be-Read Exchange Hub now features a **zero-configuration, single-download deployment system** that automates the entire setup process.

## Quick Start (3 Steps)

### 1. Download Release Package

```bash
# Download latest release
wget https://github.com/PNW-E/To-Be-Read-Exchange-Hub/releases/latest/download/to-be-read-exchange-hub-v1.0.0.tar.gz

# Or use curl
curl -LO https://github.com/PNW-E/To-Be-Read-Exchange-Hub/releases/latest/download/to-be-read-exchange-hub-v1.0.0.tar.gz
```

### 2. Extract & Deploy

```bash
# Extract archive
tar -xzf to-be-read-exchange-hub-v1.0.0.tar.gz

# Navigate to directory
cd to-be-read-exchange-hub-v1.0.0

# Run one-click deployment
./deploy.sh
```

### 3. Access Application

```bash
# Application will be available at:
http://localhost:3000
```

That's it! The deployment script handles:
- ✅ System requirements validation
- ✅ Dependency installation
- ✅ Environment configuration
- ✅ Database setup
- ✅ Directory creation
- ✅ Service configuration

## What's Included

### Complete Application Bundle
- **Source Code**: All application files ready to run
- **Dependencies**: Full package.json with production dependencies
- **Database Schema**: PostgreSQL schema and migrations
- **Documentation**: Comprehensive guides and API docs
- **Sample Data**: Test fixtures and example CSV files
- **Configuration**: Pre-configured .env templates
- **Deployment Scripts**: Automated setup and startup scripts

### Pre-Configured Services
- **Systemd Service**: Production-ready service definition
- **PM2 Configuration**: Process manager setup
- **Docker Support**: docker-compose.yml included
- **Nginx Config**: Reverse proxy templates

## Deployment Options

### Option 1: Automated Deployment (Recommended)

```bash
./deploy.sh
```

The script will interactively guide you through:
1. System requirements check
2. Dependency installation
3. Environment configuration
4. Database creation and schema setup
5. Directory structure creation
6. Service installation

### Option 2: Docker Deployment

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Option 3: Manual Installation

See `INSTALL.md` for step-by-step manual installation instructions.

## Environment Configuration

### Minimal Configuration (Required)

Edit `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=bookexchange

# Server
PORT=3000
NODE_ENV=production

# Security (Generate with: openssl rand -base64 32)
JWT_SECRET=your_generated_secret_here
SESSION_SECRET=your_generated_secret_here
```

### Optional Features

Enable AI enrichment:

```env
ENABLE_AI_ENRICHMENT=true
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
```

## Production Deployment

### Using Systemd (Linux)

```bash
# Edit service file with your paths
nano bookexchange.service

# Install service
sudo cp bookexchange.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bookexchange
sudo systemctl start bookexchange

# Check status
sudo systemctl status bookexchange

# View logs
sudo journalctl -u bookexchange -f
```

### Using PM2 (All Platforms)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name bookexchange

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup

# Monitor
pm2 monit
```

### SSL/TLS Setup (HTTPS)

Using Let's Encrypt with Nginx:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

## Verification

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 12345,
  "version": "1.0.0"
}
```

### API Check

```bash
# Test API endpoint
curl http://localhost:3000/api/books
```

### Database Check

```bash
# Connect to database
psql -d bookexchange

# Check tables
\dt

# Exit
\q
```

## Post-Deployment

### Create Admin User

```bash
npm run create-admin
```

Or manually:
```bash
node scripts/create-admin.js
```

### Import Sample Data

```bash
# Via web interface
# Navigate to http://localhost:3000/batch-upload.html
# Upload sample-books.csv

# Or via API
curl -X POST http://localhost:3000/api/batch/upload \
  -F "manifest=@sample-books.csv" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Configure Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * pg_dump bookexchange > /backups/bookexchange-$(date +\%Y\%m\%d).sql
```

## Monitoring

### Application Logs

```bash
# Real-time logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Access logs (if using Nginx)
tail -f /var/log/nginx/access.log
```

### Metrics

Prometheus metrics available at:
```
http://localhost:3000/metrics
```

### Performance

```bash
# Check process
ps aux | grep node

# Check memory usage
free -h

# Check disk space
df -h
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or change PORT in .env
```

### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check credentials in .env
nano .env
```

### Permission Errors

```bash
# Fix log directory permissions
sudo chown -R $USER:$USER logs/

# Fix upload directory permissions
sudo chown -R $USER:$USER uploads/
```

## Updating

### Pull New Version

```bash
# Download new release
wget https://github.com/PNW-E/To-Be-Read-Exchange-Hub/releases/latest/download/to-be-read-exchange-hub-v1.1.0.tar.gz

# Extract
tar -xzf to-be-read-exchange-hub-v1.1.0.tar.gz

# Stop current service
sudo systemctl stop bookexchange

# Backup database
pg_dump bookexchange > backup-$(date +%Y%m%d).sql

# Copy .env to new version
cp to-be-read-exchange-hub-v1.0.0/.env to-be-read-exchange-hub-v1.1.0/

# Navigate to new version
cd to-be-read-exchange-hub-v1.1.0

# Run migrations (if any)
psql -d bookexchange -f migrations/v1.1.0.sql

# Start service
sudo systemctl start bookexchange
```

## Security Checklist

- [ ] Change default admin password
- [ ] Generate unique JWT_SECRET
- [ ] Configure firewall (ufw/iptables)
- [ ] Enable HTTPS with SSL/TLS
- [ ] Set up regular backups
- [ ] Configure rate limiting
- [ ] Review CORS settings
- [ ] Enable security headers
- [ ] Update dependencies regularly
- [ ] Monitor logs for suspicious activity

## Performance Optimization

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_isbn ON books(isbn);

-- Vacuum database
VACUUM ANALYZE;
```

### Application Optimization

```env
# Increase connection pool
DB_POOL_MAX=20

# Enable caching
ENABLE_REDIS_CACHE=true
REDIS_URL=redis://localhost:6379
```

### Nginx Optimization

```nginx
# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## Support

### Resources
- **Installation Guide**: `INSTALL.md`
- **Quick Start**: `QUICKSTART.md`
- **Batch Upload**: `BATCH_UPLOAD_GUIDE.md`
- **Production Guide**: `PRODUCTION-READINESS.md`
- **API Documentation**: http://localhost:3000/api-docs

### Getting Help
- **GitHub Issues**: https://github.com/PNW-E/To-Be-Read-Exchange-Hub/issues
- **Documentation**: See `docs/` folder
- **Examples**: See `tests/` for code examples

## License

See LICENSE file for details.

---

**Made with ❤️ for book lovers and inventory managers**

📚 Happy book managing!
