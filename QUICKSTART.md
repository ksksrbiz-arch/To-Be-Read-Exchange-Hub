# 🚀 Quick Start Guide

## Absolute Beginner - Start Here

### Option 1: One Command Setup (Recommended)

```bash
npm run go
```

That's it! The script will:

- ✅ Detect your operating system
- ✅ Offer Docker or local installation
- ✅ Install all dependencies automatically
- ✅ Configure the database
- ✅ Start the application
- ✅ Open your browser

Time: 60 seconds

---

### Option 2: Using VS Code Dev Container (Zero Install)

1. Install VS Code and Docker Desktop
2. Open this project in VS Code
3. Click "Reopen in Container" when prompted
4. Run: `npm run dev`

Everything is pre-configured!

---

### Option 3: Manual Docker

```bash
docker-compose up -d
```

Then visit: http://localhost:3000

---

## What You Get

- 📖 **Web Interface**: http://localhost:3000
- 📚 **API Documentation**: http://localhost:3000/api-docs
- 💚 **Health Check**: http://localhost:3000/api/health

---

## Common Commands

```bash
# Start with health checks
npm start

# Development mode (auto-reload)
npm run dev

# Run tests
npm test

# Debug mode
npm run debug

# Stop everything
npm run stop

# View status
npm run status
```

---

## Troubleshooting

### "Port already in use"

```bash
npm run stop
# or
lsof -i :3000
kill -9 <PID>
```

### "Database connection failed"

```bash
npm run db:init
```

### "Something's broken"

```bash
npm run verify
```

---

## Next Steps

1. **Import Books**: Use the web interface or bulk import via API
2. **Read Full Docs**: See [README.md](README.md) for complete documentation
3. **Contribute**: Check [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow

---

## Need Help?

- **Full Documentation**: [README.md](README.md)
- **API Reference**: http://localhost:3000/api-docs (after starting)
- **Issues**: Open an issue on GitHub

---

**Made with ❤️ for book lovers**
