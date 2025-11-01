# 🚀 One-Line Installation

## Quick Install (Recommended)

Download and install everything with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh | bash
```

**Or using wget:**

```bash
wget -qO- https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh | bash
```

That's it! The installer will:
- ✅ Download the latest release
- ✅ Extract to `~/bookexchange`
- ✅ Install all dependencies
- ✅ Set up the database
- ✅ Configure the application
- ✅ Start the server

## Custom Installation Directory

```bash
INSTALL_DIR=/opt/bookexchange curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh | bash
```

## What Happens After Installation?

The application will be running at: **http://localhost:3000**

### Quick Commands

```bash
cd ~/bookexchange

# Start the application
./start.sh

# Stop the application
./stop.sh

# View logs
tail -f logs/app.log

# Check status
curl http://localhost:3000/health
```

## System Requirements

- **Node.js** 18+ (auto-installed if missing)
- **PostgreSQL** 14+ (can use Docker)
- **Git** (for repository cloning)
- **curl** or **wget**

## Zero-Configuration Features

The installer automatically:
- 🔍 Detects your operating system
- 🔧 Installs missing dependencies
- 🗄️ Sets up PostgreSQL (local or Docker)
- 🔑 Generates secure JWT secrets
- 🌱 Seeds the database
- 🚀 Starts the application

## Alternative: Git Clone + Auto-Install

```bash
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
./install.sh
```

## Docker One-Liner

```bash
docker run -d -p 3000:3000 --name bookexchange pnwe/to-be-read-exchange-hub:latest
```

## Production Deployment

For production environments with custom configuration:

```bash
# Download
curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh > install.sh

# Review
cat install.sh

# Run with options
INSTALL_DIR=/var/www/bookexchange \
NODE_ENV=production \
PORT=8080 \
bash install.sh
```

## Uninstall

```bash
cd ~/bookexchange
./stop.sh
cd ..
rm -rf bookexchange
```

## Troubleshooting

**Permission denied:**
```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh)"
```

**Port already in use:**
```bash
PORT=8080 ./start.sh
```

**Database connection failed:**
```bash
# Use Docker Postgres
docker-compose up -d db
./start.sh
```

## Security Notes

⚠️ **Review Before Running:** While convenient, piping to bash can be risky. For production:

1. Download the script first
2. Review the contents
3. Run it manually

```bash
curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh > install.sh
less install.sh
bash install.sh
```

## Support

- 📖 **Full Documentation:** [DEPLOYMENT.md](DEPLOYMENT.md)
- 🐛 **Issues:** https://github.com/PNW-E/To-Be-Read-Exchange-Hub/issues
- 💬 **Discussions:** https://github.com/PNW-E/To-Be-Read-Exchange-Hub/discussions

---

**Made with ❤️ for book lovers**
