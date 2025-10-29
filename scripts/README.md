# Development Automation Scripts

This directory contains automation scripts to streamline development workflows.

## Available Scripts

### 🔄 Development Refresh (`dev-refresh.sh`)

**Purpose:** Automates the complete refresh of the development environment.

**What it does:**
1. Stops the running server
2. Checks for code changes
3. Clears module cache if dependencies changed
4. Starts server with fresh cache
5. Waits for server to be ready
6. Verifies functionality (health check, API, features)

**Usage:**
```bash
# Direct execution
./scripts/dev-refresh.sh

# Or via npm
npm run refresh
```

**When to use:**
- After pulling code changes from git
- When frontend files aren't updating
- After modifying package.json dependencies
- When you suspect caching issues

---

### 🛑 Stop Server (`stop-server.sh`)

**Purpose:** Gracefully stops the development server.

**What it does:**
1. Finds all node processes running the server
2. Stops each process
3. Verifies they stopped successfully

**Usage:**
```bash
# Direct execution
./scripts/stop-server.sh

# Or via npm
npm run stop
```

**When to use:**
- Before manually starting the server
- When cleaning up processes
- Before system shutdown

---

### 📊 Server Status (`server-status.sh`)

**Purpose:** Comprehensive status check of all services.

**What it does:**
1. Checks if server process is running
2. Verifies port 3000 is in use
3. Tests HTTP endpoints (/health, /, /api/books)
4. Checks database status
5. Shows resource usage (memory, CPU)

**Usage:**
```bash
# Direct execution
./scripts/server-status.sh

# Or via npm
npm run status
```

**When to use:**
- Debugging server issues
- Checking if server is running
- Monitoring resource usage
- Verifying all endpoints are working

---

### 🚀 Setup (`setup.sh`)

**Purpose:** Complete first-time setup of the development environment.

**What it does:**
1. Checks prerequisites (Node.js, PostgreSQL)
2. Installs npm dependencies
3. Creates .env from template
4. Initializes database
5. Runs tests

**Usage:**
```bash
# Direct execution
./scripts/setup.sh

# Or via npm
npm run setup
```

**When to use:**
- First time cloning the repository
- Setting up on a new machine
- Resetting the development environment

---

### 🗄️ Database Init (`init-db.sh`)

**Purpose:** Initialize or reset the PostgreSQL database.

**What it does:**
1. Creates the database if it doesn't exist
2. Runs the schema.sql to create tables
3. Sets up proper permissions

**Usage:**
```bash
# Direct execution
./scripts/init-db.sh

# Or via npm
npm run db:init
```

**When to use:**
- First time setup
- After schema changes
- Resetting database to clean state

---

## Quick Reference

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run refresh` | `dev-refresh.sh` | Restart with fresh cache |
| `npm run stop` | `stop-server.sh` | Stop the server |
| `npm run status` | `server-status.sh` | Check server status |
| `npm run setup` | `setup.sh` | First-time setup |
| `npm run db:init` | `init-db.sh` | Initialize database |
| `npm start` | - | Start server normally |
| `npm run dev` | - | Start with auto-reload |
| `npm test` | - | Run tests |
| `npm run verify` | - | Lint + Format + Test |

---

## Common Workflows

### After Pulling Code Changes
```bash
git pull origin main
npm run refresh  # Restarts with fresh files
```

### Browser Not Showing New Features
```bash
npm run refresh  # Restart server
# Then in browser: Ctrl+Shift+R (hard refresh)
```

### Checking if Everything is Working
```bash
npm run status  # See complete system status
```

### Debugging Server Issues
```bash
npm run stop    # Stop current server
npm run status  # Verify it stopped
npm start       # Start fresh
```

### Complete Environment Reset
```bash
npm run stop
npm run db:init
npm run refresh
```

---

## Troubleshooting

### "Port 3000 already in use"
```bash
npm run stop
# If that doesn't work:
pkill -9 -f "node src/server.js"
```

### "Server not responding"
```bash
npm run status  # Check what's wrong
npm run refresh # Restart everything
```

### "Old files still loading in browser"
```bash
npm run refresh  # Server-side refresh
# Then browser-side: Ctrl+Shift+R or Cmd+Shift+R
```

### "Database connection failed"
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # Mac

# Reinitialize database
npm run db:init
```

---

## Script Exit Codes

- `0` - Success
- `1` - General error (check script output)
- `130` - Script interrupted (Ctrl+C)

---

## Adding Your Own Scripts

1. Create script in `scripts/` directory
2. Make it executable: `chmod +x scripts/your-script.sh`
3. Add to `package.json`:
   ```json
   "scripts": {
     "your-command": "bash scripts/your-script.sh"
   }
   ```
4. Test it: `npm run your-command`

---

## Notes

- All scripts use `#!/bin/bash` shebang
- Color codes are used for better readability
- Scripts are designed to be idempotent (safe to run multiple times)
- Exit codes follow standard conventions
- All scripts include error handling

---

**Need help?** Check the individual script comments or run with `--help` flag (if implemented).
