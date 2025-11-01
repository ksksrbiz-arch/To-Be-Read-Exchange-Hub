# 📚 To-Be-Read Exchange Hub

Enterprise-grade open source book exchange & inventory system with smart enrichment, resilient architecture, and production hardening you normally only see in paid platforms.

[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)](./TEST-RESULTS.md) [![Coverage](https://img.shields.io/badge/Coverage-88%25-blue)](./coverage/lcov-report/index.html) [![Lint](https://img.shields.io/badge/Lint-Clean-success)](./eslint.config.mjs)

[![99.9% SLO](https://img.shields.io/badge/SLO-99.9%25%20Availability-success)](./ENTERPRISE.md) [![Observability](https://img.shields.io/badge/Observability-Prometheus%20%2B%20Structured%20Logs-blue)](./ENTERPRISE.md) [![Security](https://img.shields.io/badge/Security-OWASP%20Hardened-green)](./ENTERPRISE.md)

> Built for communities that need reliability without vendor lock‑in. Clinical startup discipline + hobby project heart.

## 🔑 Core Value (Why it's Different)

Production practices (graceful shutdown, circuit breakers, metrics, SLO tracking, feature flags, API key auth, input sanitization) already wired in — no "rewrite for prod" tax later.

## 🚀 One-Line Installation (Fastest Way)

Download, install, and run everything automatically:

```bash
curl -fsSL https://raw.githubusercontent.com/PNW-E/To-Be-Read-Exchange-Hub/main/web-install.sh | bash
```

🎉 **That's it!** Opens at <http://localhost:3000> in seconds.

See [ONE-LINER-INSTALL.md](ONE-LINER-INSTALL.md) for options & customization.

### Alternative: Traditional Setup

```bash
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
./install.sh   # fully automated
# OR
npm install && npm run go   # guided setup
```

**Docker:** `docker compose up -d` (auto DB + app)

Full walkthrough: [QUICKSTART.md](QUICKSTART.md)

## 🧩 Feature Highlights

- Smart inventory placement & bulk import (CSV/JSON)
- Automatic enrichment (Open Library / Google Books)
- Robust REST API + interactive Swagger docs
- Resilience: circuit breaker, rate limiting, graceful shutdown
- Observability: Prometheus metrics, correlation IDs, structured logs, SLO endpoint
- Security: hardened headers (Helmet), API key layer, deep sanitization
- Feature flags for safe progressive delivery

Full enterprise rationale & patterns: `ENTERPRISE.md` • Architecture & internals: `IMPLEMENTATION.md`.

## 🛠 Prerequisites (Local Path)

Node.js ≥ 18, PostgreSQL ≥ 12. (Dev container & Docker eliminate local installs.)

## ⚙️ First-Time Install (Manual Minimal)

```bash
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
cp .env.example .env   # set DB_PASSWORD
npm install            # prefer: npm ci (CI environments)
npm run db:init        # creates & seeds schema idempotently
npm start              # health checked smart start
```

Visit <http://localhost:3000> and confirm `{"status":"ok"}` at /api/health.

## ⚡ Recommended Fast Path Improvements

We aggressively trimmed first-run friction. Planned next tweaks:

- Combine env creation + DB init under a single `bootstrap` script.
- Use `npm ci` when lockfile present for faster deterministic installs.
- Parallelize DB schema + dependency install where shell supports (`&` background).
- Auto-detect missing PostgreSQL and fallback to ephemeral Docker postgres (`npm run bootstrap -- --ephemeral-db`).
- Cache build layers in Dockerfile (multi-stage already partially supported — see upcoming PR).

## 📜 Essential Scripts

| Action | Command | Notes |
| ------ | ------- | ----- |
| Guided setup | `npm run go` | Interactive bootstrap (Docker vs local) |
| Full setup | `npm run setup` | Unified bootstrap (env + deps + optional DB + tests) |
| DB init | `npm run db:init` | Idempotent schema + seed roles/permissions |
| Dev mode | `npm run dev` | Nodemon autoreload |
| Tests | `npm test` | Coverage ≥ 88% (functions > 90%) |
| Verify | `npm run verify` | Lint + format check + tests |
| Start (prod) | `npm start` | Smart start w/ health polling |
| Stop | `npm run stop` | Graceful shutdown |

## 🧪 Quality Snapshot (Oct 2025)

Coverage: Statements 88.6% • Branches 82.5% • Functions 91.7% • Lines 88.5%.
Resilience & security layers covered by dedicated tests (graceful shutdown, circuit breaker transitions, header & sanitization, feature flag parsing).

## 🔍 API & Docs

Swagger UI at `/api-docs` (live schemas + try-it). Prometheus metrics at `/metrics`. SLO status at `/api/slo`. Feature flags at `/api/features`.

## 🧱 Database Shape (High Level)

`books`, `users`, `roles`, `permissions`, mapping tables, sync log. See `schema.sql` for details.

## 🤝 Contribute

Read `CONTRIBUTING.md` then run:

```bash
npm run verify
```

Open issues for roadmap items (RBAC extension, sales flow, tracing exporters). We welcome focused improvements over broad rewrites.

## 📄 License

ISC — permissive use. Attribution appreciated but not required.
- **Web Interface:** `http://localhost:3000`
- **Health Check:** `http://localhost:3000/health` (returns `{"status":"ok"}`)
- **DB Health Check:** `http://localhost:3000/api/health/db` (returns
  `{"status":"ok","db":"connected"}`)

## 🔗 Deep Dive References

`ENTERPRISE.md` • `IMPLEMENTATION.md` • `QUICKSTART.md` • `SECURITY-STATUS.md` • `STABILITY-REPORT.md`

---
Lean README by design — everything else lives in specialized docs. If something feels missing here, it probably has its own file.
### Environment Variables

| Variable               | Description                                  | Default          |
| ---------------------- | -------------------------------------------- | ---------------- |
| `PORT`                 | Application server port                      | `3000`           |
| `NODE_ENV`             | Environment mode                             | `development`    |
| `LOG_LEVEL`            | Logger level (`error`, `warn`, `info`, etc.) | `info`           |
| `API_RATE_WINDOW_MIN`  | API rate limit window (minutes)              | `15`             |
| `API_RATE_MAX`         | Max API requests per IP per window           | `100`            |
| `SYNC_RATE_WINDOW_MIN` | Sync rate limit window (minutes)             | `15`             |
| `SYNC_RATE_MAX`        | Max sync requests per window                 | `10`             |
| `DB_USER`              | PostgreSQL username                          | `postgres`       |
| `DB_HOST`              | Database host address                        | `localhost`      |
| `DB_NAME`              | Database name                                | `books_exchange` |
| `DB_PASSWORD`          | PostgreSQL password                          | `postgres`       |
| `DB_PORT`              | PostgreSQL port                              | `5432`           |

## Usage

### Web Interface

1. Open your browser and navigate to `http://localhost:3000`
2. Use the web interface to:
   - Add new books (manually or via ISBN lookup)
   - View and search your inventory
   - Update book information
   - Sync with Pingo systems
   - Manage shelf locations

### API Usage

You can interact with the application programmatically using the REST API. See the
[API Documentation](#api-documentation) section below for details.

## API Documentation

The application provides a comprehensive RESTful API for managing books and syncing inventory.

### Interactive API Documentation

Visit **http://localhost:3000/api-docs** for interactive Swagger UI documentation where you can:

- 📖 Browse all API endpoints with detailed descriptions
- 🧪 Test API calls directly in your browser
- 📋 View request/response schemas and examples
- 🔍 Explore all available parameters and data models

The Swagger documentation is automatically generated from the codebase and always up-to-date.

### Quick API Reference

### Books API

#### Create a New Book

**POST** `/api/books`

Creates a new book with smart inventory logic and automatic data enrichment.

**Request Body:**

```json
{
  "isbn": "9780747532743", // Required (if title not provided)
  "title": "Harry Potter...", // Required (if ISBN not provided)
  "author": "J.K. Rowling", // Optional (auto-filled from ISBN)

**POST** `/api/sync/pingo`
}
        "title": "Harry Potter",
  # 📚 To-Be-Read Exchange Hub

  Enterprise-grade open source book exchange platform with smart inventory, automated metadata enrichment, bulk + sync operations, and built-in production concerns (security, observability, resilience).

  [![99.9% SLO](https://img.shields.io/badge/SLO-99.9%25%20Availability-success)](./ENTERPRISE.md) [![Observability](https://img.shields.io/badge/Observability-Metrics%20%2B%20Logs-blue)](./ENTERPRISE.md) [![Security](https://img.shields.io/badge/Security-OWASP-green)](./ENTERPRISE.md)

  > Built to feel like a maintained enterprise product—while staying community friendly.

  ## 🔥 Core Highlights (1‑screen)

  | Category | What You Get |
  |----------|---------------|
  | Inventory | Auto shelf allocation by author + manual overrides |
  | Enrichment | ISBN lookups (Open Library + Google Books fallback merge) |
  | Bulk & Sync | CSV / JSON import, batch update/delete, external Pingo sync |
  | Reliability | Circuit breaker, graceful shutdown, health/readiness endpoints |
  | Observability | Prometheus metrics, structured JSON logs, correlation IDs, SLO monitor |
  | Security | Helmet headers, rate limiting, input sanitization, API key option |
  | Dev UX | Feature flags, 70+ tests (>88% statements), instant quickstart script |

  Full deep-dive: see `ENTERPRISE.md`, `IMPLEMENTATION.md` & `QUICKSTART.md`.

## 🚀 60‑Second Start

  Pick ONE path:

  ```bash
# (A) Unified bootstrap (recommended)
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
bash scripts/bootstrap.sh --interactive --seed-vintage   # guided + sample vintage data

# (B) Minimal manual
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
npm run setup     # creates .env, optional DB init, runs tests
nano .env         # set DB_PASSWORD (change default!)

# (C) Docker one-liner
docker compose up -d --build
```

Visit: `http://localhost:3000` (UI) • `/api-docs` (Swagger) • `/api/health` (health JSON)
Vintage seed flag: `--seed-vintage` loads curated classic titles (see `scripts/lib/seed-vintage.sql`).

## ✅ Prerequisites (Local Path Only)

Node.js ≥18 (tested on 20 LTS) • PostgreSQL ≥12 • npm (bundled). For container/Docker users, these are already handled.

## ⚙️ Essential Configuration

Create `.env` (auto-generated by scripts) or copy from `.env.example`:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DB_HOST=localhost
DB_NAME=books_exchange
DB_USER=postgres
DB_PASSWORD=CHANGE_ME
DB_PORT=5432
```

Security tips: never commit `.env`; always replace default password; use `NODE_ENV=production` in prod.

## 🧠 Smart Inventory + Enrichment (Quick View)

- Shelf auto = first letter of author last name; section increments per shelf.
- Manual override accepts `A-12`, `A`, or `Shelf A, Section 12`.
- ISBN triggers enrichment → merges title/author/publisher/description/cover from multiple sources with graceful fallback.

## 🛠️ Common Scripts

```bash
npm run go         # guided quickstart (Docker or local)
npm run setup      # bootstrap automation + optional DB init + tests
npm start          # start server (after setup) + then run smoke if desired
npm run smoke      # basic health + books endpoint smoke probe
npm run dev        # nodemon hot reload
npm test           # jest coverage
npm run db:init    # (re)initialize schema
npm run verify     # lint + format:check + tests
```

## 🔍 API & Documentation

Interactive Swagger: `/api-docs`. Core endpoints: `/api/books`, `/api/books/bulk`, `/api/sync/pingo`, `/api/health`, `/metrics`. For full request/response examples consult Swagger or `tests/*.test.js`.

## 🏗️ Structure (Condensed)

```text
src/
  server.js          # entry
  controllers/       # book, bulk, sync logic
  services/          # enrichment, inventory algorithms
  middleware/        # auth, validation, circuit breaker, observability
routes/            # REST endpoint wiring
utils/             # logger, feature flags, shutdown, SLO monitor
scripts/             # setup + quickstart + deploy helpers
public/              # static UI
tests/               # 70+ unit/integration suites
```

## 🧪 Quality Snapshot

Statements ~88% • Functions >91% • Resilience, security & shutdown flows covered. See `TEST-RESULTS.md` & coverage/ for details.

## 🔐 Production Fast Checklist

1. Set strong `DB_PASSWORD`, change rate limits if needed.
2. Run `npm run build` then `NODE_ENV=production npm start` or use Docker.
3. Point monitoring at `/metrics` and `/api/health`.
4. Enable API key auth (see `ENTERPRISE.md`).
5. Configure backups for PostgreSQL.

## 🤝 Contributing

Fork → branch → changes + tests → `npm run verify` → PR. High‑signal improvements welcome (tests/docs/perf/security). See `CONTRIBUTING.md`.

## 📄 License (ISC)

ISC License (see `LICENSE`).

Made with ❤️ for book communities. If this helps you, share a book forward.

---

### Bulk Operations Examples

**Example:**

```bash
curl -X PUT http://localhost:3000/api/books/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"id": 1, "fields": {"quantity": 10}},
      {"id": 2, "fields": {"title": "New Title"}}
    ]
  }'
```

### Bulk Delete Books

**DELETE** `/api/books/bulk`

Delete multiple books by ID. Maximum 500 deletions per batch.

**Request Body:**

```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Deleted 5 of 5 books",
  "deleted": 5,
  "total": 5
}
```

**Partial Success Response (200):**

```json
{
  "success": true,
  "message": "Deleted 3 of 5 books",
  "deleted": 3,
  "total": 5,
  "notFound": [4, 5]
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/books/bulk \
  -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3]}'
```

---

## Smart Inventory Logic

The system uses an intelligent algorithm to organize books automatically:

### How It Works

1. **Manual Override (Highest Priority)**
   - If you specify a shelf/section location, it will be used as-is
   - Example: `"shelf_location": "A-12"` → Shelf A, Section 12

2. **Automatic Alphabetical Organization**
   - Books are organized by the author's last name
   - **Shelf**: Determined by the first letter of the last name
     - Example: "Stephen King" → Shelf K
     - Example: "J.K. Rowling" → Shelf R
   - **Section**: Auto-incremented within each shelf
     - First book in Shelf A → Section 1
     - Second book in Shelf A → Section 2

3. **Supported Location Formats**
   - `A-12` - Shelf A, Section 12
   - `Shelf A, Section 12` - Full format
   - `a-12` - Case-insensitive
   - `A` - Just shelf (section auto-assigned)

### Examples

| Author       | Auto-Assigned Location |
| ------------ | ---------------------- |
| Stephen King | Shelf K, Section 1     |
| J.K. Rowling | Shelf R, Section 1     |
| Harper Lee   | Shelf L, Section 1     |
| Isaac Asimov | Shelf A, Section 1     |

## Data Enrichment

When you provide an ISBN, the system automatically fetches additional book information:

### Enrichment Process

1. **Query External APIs**
   - Open Library API (primary source)
   - Google Books API (fallback and supplement)

2. **Retrieved Information**
   - Book title
   - Author name(s)
   - Publisher
   - Description/Synopsis
   - Cover image URL

3. **Smart Data Merging**
   - Combines data from multiple sources
   - Prioritizes information quality:
     - Title and author from first available source
     - Description primarily from Google Books (usually more detailed)
     - Cover image from best quality source
     - Publisher from either source

4. **Graceful Fallback**
   - If one API fails, uses the other
   - If both fail, uses manually provided data
   - Never blocks book creation due to enrichment errors

### Example

Input:

```json
{
  "isbn": "9780747532743",
  "quantity": 5
}
```

Output (enriched automatically):

```json
{
  "isbn": "9780747532743",
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "publisher": "Bloomsbury",
  "description": "Harry Potter has never even heard of Hogwarts...",
  "cover_url": "https://covers.openlibrary.org/b/id/...",
  "quantity": 5
}
```

## Testing

The application includes a comprehensive test suite with high code coverage.

### Run All Tests

```bash
npm test
```

This runs all tests with coverage reporting.

### Run Tests in Watch Mode

For active development, use watch mode to automatically re-run tests when files change:

```bash
npm run test:watch
```

### Test Coverage

Current test coverage:

- High overall coverage (historically >85%)
- Dozens of test cases across units and integrations
- Unit tests for services and utilities
- Integration tests for API endpoints

Note: For up-to-date numbers, run `npm test` and check the summary.

## Deployment

The application supports multiple deployment methods with automated scripts and CI/CD workflows.
Choose the deployment option that best fits your infrastructure.

### Quick Deployment Commands

```bash
# Heroku deployment
npm run deploy:heroku

# AWS EC2 deployment
npm run deploy:aws

# Docker deployment
npm run deploy:docker

# Docker Compose (full stack)
npm run docker:run
```

### Deployment Options

#### Option 1: Heroku Deployment (Recommended for beginners)

**Prerequisites:**

- Heroku CLI installed
- Heroku account created
- Git repository initialized

**Quick Start:**

```bash
# Install Heroku CLI (if not installed)
curl https://cli-assets.heroku.com/install.sh | sh

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0

# Deploy using automated script
npm run deploy:heroku
```

**What the script does:**

- ✅ Checks prerequisites (Heroku CLI, authentication)
- ✅ Runs tests and linting
- ✅ Verifies environment variables
- ✅ Deploys to Heroku
- ✅ Runs database migrations
- ✅ Performs health checks
- ✅ Auto-rollback on failure

**Manual Configuration:**

```bash
# Set environment variables
heroku config:set NODE_ENV=production -a your-app-name
heroku config:set LOG_LEVEL=info -a your-app-name

# View logs
heroku logs --tail -a your-app-name
```

---

#### Option 2: Docker Deployment

**Prerequisites:**

- Docker installed
- Docker Compose installed (optional)

**Using Docker Compose (Full Stack):**

```bash
# Start application with database
npm run docker:run

# View logs
npm run docker:logs

# Stop application
npm run docker:stop
```

**Using Standalone Docker:**

```bash
# Build and deploy
npm run deploy:docker

# Or manually:
docker build -t books-exchange .
docker run -d -p 3000:3000 --env-file .env books-exchange
```

**Production Docker Compose:**

```yaml
# docker-compose.yml includes:
# - PostgreSQL database with health checks
# - Node.js application with auto-restart
# - Optional Nginx reverse proxy
# - Volume persistence for data
# - Health monitoring
```

**Docker Features:**

- ✅ Multi-stage build for smaller images
- ✅ Non-root user for security
- ✅ Built-in health checks
- ✅ Automatic restarts
- ✅ Volume persistence
- ✅ Docker Compose for full stack

---

#### Option 3: AWS EC2 Deployment

**Prerequisites:**

- AWS account with EC2 instance
- SSH key for EC2 access
- Node.js and PostgreSQL on EC2

**Configuration:**

```bash
# Set environment variables
export AWS_EC2_HOST=your-ec2-ip-or-domain
export AWS_EC2_USER=ubuntu
export AWS_EC2_KEY=~/.ssh/your-key.pem

# Deploy
npm run deploy:aws
```

**What the script does:**

- ✅ Tests SSH connection
- ✅ Runs tests locally
- ✅ Creates deployment package
- ✅ Uploads to EC2
- ✅ Installs dependencies
- ✅ Sets up PM2 for process management
- ✅ Configures auto-restart on reboot
- ✅ Performs health checks

**PM2 Management:**

```bash
# View logs
ssh -i your-key.pem ubuntu@your-host 'pm2 logs books-exchange'

# Restart app
ssh -i your-key.pem ubuntu@your-host 'pm2 restart books-exchange'

# Monitor
ssh -i your-key.pem ubuntu@your-host 'pm2 monit'
```

---

#### Option 4: GitHub Actions CI/CD

**Automated Deployment via GitHub:**

The repository includes production-ready GitHub Actions workflows for automated deployment.

**Setup:**

1. **Configure Secrets** (Settings > Secrets and variables > Actions):

   **For Heroku:**

   ```text
   HEROKU_API_KEY=your-heroku-api-key
   HEROKU_APP_NAME=your-app-name
   HEROKU_EMAIL=your-email
   ```

   **For AWS:**

   ```text
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=us-east-1
   ```

   **For Docker Hub:**

   ```text
   DOCKER_USERNAME=your-dockerhub-username
   DOCKER_PASSWORD=your-dockerhub-password
   ```

   **For Health Checks:**

   ```text
   HEALTH_CHECK_URL=https://your-app-url.com
   ```

2. **Trigger Deployment:**
   - **Automatic**: Push to `main` branch
   - **Manual**: Actions tab > Deploy > Run workflow

**Workflow Features:**

- ✅ Multi-environment support (production/staging)
- ✅ Automated testing before deployment
- ✅ Code quality checks (linting, formatting)
- ✅ Health checks after deployment
- ✅ Automatic rollback on failure
- ✅ Deployment summaries and notifications
- ✅ Support for multiple platforms (Heroku/AWS/Docker)

---

### Environment Variables for Production

Required environment variables for deployment:

```env
# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (set by platform or configure manually)
DB_USER=your_db_user
DB_HOST=your_db_host
DB_NAME=books_exchange
DB_PASSWORD=your_secure_password
DB_PORT=5432

# Rate Limiting
API_RATE_WINDOW_MIN=15
API_RATE_MAX=100
SYNC_RATE_WINDOW_MIN=15
SYNC_RATE_MAX=10
```

**Platform-Specific Notes:**

- **Heroku**: Database URL set automatically by PostgreSQL addon
- **AWS**: Configure manually or use RDS
- **Docker**: Set in `.env` file or docker-compose.yml

---

### Security Best Practices

⚠️ **Production Security Checklist:**

- ✅ Never commit `.env` files or secrets to git
- ✅ Use strong, unique passwords for databases
- ✅ Enable HTTPS/SSL in production
- ✅ Regularly update dependencies (`npm audit`)
- ✅ Use environment-specific secrets
- ✅ Enable firewall rules on cloud instances
- ✅ Implement rate limiting (already configured)
- ✅ Monitor application logs regularly
- ✅ Set up automated backups for database
- ✅ Use non-root users in Docker containers

---

### Monitoring and Maintenance

**Health Check Endpoint:**

```bash
curl https://your-app-url.com/api/health
# Response: {"status":"ok"}
```

**Viewing Logs:**

```bash
# Heroku
heroku logs --tail -a your-app-name

# AWS with PM2
ssh user@host 'pm2 logs books-exchange'

# Docker
docker logs -f container-name
# or
npm run docker:logs
```

**Database Backups:**

```bash
# Heroku
heroku pg:backups:capture -a your-app-name
heroku pg:backups:download -a your-app-name

# Docker/Local
docker exec postgres-container pg_dump -U postgres books_exchange > backup.sql
```

---

### Troubleshooting Deployment

**Common Issues:**

| Issue                        | Solution                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| Health check fails           | Check database connection and environment variables            |
| Port already in use          | Change PORT in .env or stop conflicting process                |
| Database connection refused  | Verify DB_HOST, DB_PORT, and firewall rules                    |
| npm install fails            | Clear cache: `npm cache clean --force`                         |
| Docker build fails           | Check Dockerfile syntax and .dockerignore                      |
| Heroku deployment timeout    | Check Procfile, increase dyno resources                        |
| Permission denied on scripts | Run `chmod +x scripts/*.sh`                                    |
| SSH connection fails (AWS)   | Verify security group allows SSH (port 22) and key permissions |

**Getting Help:**

1. Check application logs for detailed errors
2. Review [Issues](https://github.com/ksksrbiz-arch/To-Be-Read-Exchange-Hub/issues)
3. Run health check: `curl http://your-url/api/health`
4. Verify all environment variables are set
5. Check platform-specific status pages

## Development

### Development Mode

Run the application in development mode:

```bash
npm run dev
```

This starts the server with the development environment settings and auto-reloads on file changes.

### Available npm Scripts

Complete reference of all available commands:

| Command                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `npm run setup`         | 🚀 Complete automated setup (first-time installation)   |
| `npm run db:init`       | 🗄️ Initialize/reset database                            |
| `npm start`             | ▶️ Start production server                              |
| `npm run dev`           | 🔧 Start development server with auto-reload            |
| `npm test`              | 🧪 Run all tests with coverage report                   |
| `npm run test:watch`    | 👀 Run tests in watch mode (auto-rerun on changes)      |
| `npm run lint`          | 🔍 Check code for errors and style issues               |
| `npm run format`        | ✨ Auto-format all code files                           |
| `npm run format:check`  | 📋 Check if code is properly formatted                  |
| `npm run verify`        | ✅ Run lint + format check + tests (pre-commit quality) |
| `npm run build`         | 📦 Build production-ready artifacts in dist/            |
| `npm run docker:build`  | 🐳 Build Docker image                                   |
| `npm run docker:run`    | 🐳 Start application with Docker Compose                |
| `npm run docker:stop`   | 🛑 Stop Docker Compose containers                       |
| `npm run docker:logs`   | 📊 View Docker container logs                           |
| `npm run deploy:heroku` | 🚀 Deploy to Heroku with automated checks               |
| `npm run deploy:aws`    | ☁️ Deploy to AWS EC2 with PM2                           |
| `npm run deploy:docker` | 🐳 Deploy using Docker standalone                       |
| `npm run debug`         | 🐞 Start server with Node inspector (port 9229)         |

**Recommended Workflow:**

```bash
# First time setup
npm run setup

# Daily development
npm run dev                 # Start dev server
npm run test:watch          # Run tests in another terminal

# Before committing
npm run verify              # Ensure code quality

# Docker development
npm run docker:run          # Full stack with database
npm run docker:logs         # Monitor logs

# Production deployment
npm run build               # Create production build
npm run deploy:heroku       # Or deploy:aws, deploy:docker
```

### Project Structure

```plaintext
To-Be-Read-Exchange-Hub/
├── scripts/
│   ├── setup.sh               # Automated setup script
│   ├── init-db.sh             # Database initialization script
│   └── build.js               # Production build script
├── src/
│   ├── server.js              # Application entry point
│   ├── config/
│   │   ├── database.js        # Database configuration
│   │   └── schema.sql         # Database schema
│   ├── controllers/
│   │   ├── bookController.js  # Book management logic
│   │   └── syncController.js  # Sync operations logic
│   ├── routes/
│   │   ├── books.js           # Book API routes
│   │   └── sync.js            # Sync API routes
│   ├── services/
│   │   ├── enrichment.js      # Data enrichment service
│   │   └── inventory.js       # Inventory logic service
│   ├── middleware/
│   │   └── validation.js      # Request validation
│   └── utils/
│       └── logger.js          # Application logger
├── public/                    # Frontend static files
├── tests/                     # Test files
├── .env.example               # Environment variables template
└── package.json               # Project dependencies
```

## Database Schema

## Debugging

You can debug the application locally or inside the Docker container.

### 1. Local Debug (Recommended for quick iteration)

1. Start the server in debug mode:

```bash
npm run debug
```

This runs Node with the inspector listening on `0.0.0.0:9229` and restarts on changes via `nodemon`.

1. In VS Code, open the Run and Debug panel and choose `Launch Server (Local)`.
2. Set breakpoints (e.g., in `src/controllers/bulkController.js` or `src/services/enrichment.js`).
3. Trigger API requests (via Swagger UI or curl) and inspect variables.

### 2. Debugging Jest Tests

Use the `Jest Tests (Debug)` configuration to step through individual tests:

1. Open the Run and Debug panel.
2. Select `Jest Tests (Debug)`.
3. Add a breakpoint in the test or source file.
4. The runner starts paused at the first line (`--inspect-brk`). Continue execution to hit
   breakpoints.

### 3. Attach to Docker Container

If the app is running in Docker (e.g., via `docker-compose up`):

1. Expose the inspector port by starting the container with:

```bash
docker compose run -p 3000:3000 -p 9229:9229 app node --inspect=0.0.0.0:9229 src/server.js
```

Or exec into the running container:

```bash
docker exec -it books-exchange-app node --inspect=0.0.0.0:9229 src/server.js
```

1. In VS Code, select `Attach to Docker App`.
2. Set breakpoints and invoke requests to hit them.

### Common Breakpoint Targets

- `src/controllers/bookController.js`: Creation/update logic
- `src/controllers/bulkController.js`: Bulk import/update failure handling
- `src/services/enrichment.js`: External API merging and fallback logic
- `src/services/inventory.js`: Storage location determination
- `src/routes/books.js`: Request validation pipeline

### Tips

- Use `console.time()` / `console.timeEnd()` for quick performance snapshots.
- Conditional breakpoints help reduce noise (right-click breakpoint → Edit).
- If breakpoints aren’t hit, ensure the process actually restarted with inspector and code paths
  executed.
- For test debugging, narrow scope using `it.only` or pass a test file path as an argument.

### Troubleshooting Debugging

| Issue                    | Solution                                                                         |
| ------------------------ | -------------------------------------------------------------------------------- |
| VS Code can’t attach     | Ensure process started with `--inspect` or `--inspect-brk` and port 9229 exposed |
| Breakpoints grey/hollow  | File mismatch – confirm path matches workspace folder                            |
| Port already in use      | Kill old process: `lsof -i :9229` then `kill <pid>`                              |
| Container attach fails   | Map port `9229:9229` and start node with inspector inside container              |
| Jest exits before attach | Use `--inspect-brk` (configured) so execution pauses at start                    |

Happy debugging! 🐞

### Books Table

Stores all book inventory information.

| Column               | Type        | Description                       |
| -------------------- | ----------- | --------------------------------- |
| `id`                 | SERIAL      | Primary key                       |
| `isbn`               | VARCHAR(13) | Unique ISBN (13 digits)           |
| `title`              | VARCHAR     | Book title                        |
| `author`             | VARCHAR     | Author name                       |
| `publisher`          | VARCHAR     | Publisher name                    |
| `description`        | TEXT        | Book description/synopsis         |
| `cover_url`          | VARCHAR     | Cover image URL                   |
| `shelf_location`     | VARCHAR(10) | Shelf identifier (e.g., "A", "B") |
| `section`            | VARCHAR(10) | Section within shelf (e.g., "12") |
| `quantity`           | INTEGER     | Total quantity in inventory       |
| `available_quantity` | INTEGER     | Available quantity for exchange   |
| `created_at`         | TIMESTAMP   | Record creation timestamp         |
| `updated_at`         | TIMESTAMP   | Last update timestamp             |

### Pingo Sync Log Table

Tracks all sync operations for audit purposes.

| Column          | Type      | Description                          |
| --------------- | --------- | ------------------------------------ |
| `id`            | SERIAL    | Primary key                          |
| `sync_date`     | TIMESTAMP | Sync operation timestamp             |
| `books_synced`  | INTEGER   | Number of books successfully synced  |
| `status`        | VARCHAR   | Sync status (success/partial/failed) |
| `error_message` | TEXT      | Error details (if any)               |

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Error

**Error:** `ECONNREFUSED` or `Connection refused`

**Solution:**

1. Ensure PostgreSQL is running:

   ```bash
   # On macOS
   brew services start postgresql

   # On Linux
   sudo systemctl start postgresql
   ```

2. Verify database credentials in `.env` file
3. Check if the database exists:

   ```bash
   psql -l | grep books_exchange
   ```

#### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**

1. Find the process using port 3000:

   ```bash
   lsof -i :3000
   ```

2. Kill the process or change the port in `.env`:

   ```env
   PORT=3001
   ```

#### Database Schema Not Found

**Error:** `relation "books" does not exist`

**Solution:** Initialize the database schema:

```bash
psql books_exchange < src/config/schema.sql
```

#### API Enrichment Timeout

**Error:** Book created but missing enrichment data

**Solution:**

- This is normal behavior - the system continues without enrichment if APIs are slow or unavailable
- You can manually update the book information later using the PUT endpoint
- Check your internet connection if this happens frequently

#### npm Install Fails

**Error:** Various npm errors during installation

**Solution:**

1. Clear npm cache:

   ```bash
   npm cache clean --force
   ```

2. Delete `node_modules` and `package-lock.json`:

   ```bash
   rm -rf node_modules package-lock.json
   ```

3. Reinstall:

   ```bash
   npm install
   ```

### Need More Help?

- Check the [Issues](https://github.com/ksksrbiz-arch/To-Be-Read-Exchange-Hub/issues) page
- Create a new issue with detailed error messages and steps to reproduce

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

---

Made with ❤️ for book lovers and exchange communities
