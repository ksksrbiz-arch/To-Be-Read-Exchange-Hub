# 📚 To-Be-Read Exchange Hub

**Enterprise-Grade Open Source Book Exchange Platform**

A production-ready inventory management system for book exchange with automated data enrichment, intelligent storage allocation, and enterprise-level observability, security, and reliability features.

> 🏢 **Why This Matters:** Freeware with true purpose means professional-grade reliability, security, and maintainability that communities can trust for production use.

[![99.9% SLO](https://img.shields.io/badge/SLO-99.9%25%20Availability-success)](./ENTERPRISE.md)
[![Full Observability](https://img.shields.io/badge/Observability-Prometheus%20%2B%20Logs-blue)](./ENTERPRISE.md)
[![Security](https://img.shields.io/badge/Security-OWASP%20Best%20Practices-green)](./ENTERPRISE.md)

## Table of Contents

- [Features](#features)
- [🏢 Enterprise Features](#-enterprise-features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Smart Inventory Logic](#smart-inventory-logic)
- [Data Enrichment](#data-enrichment)
- [Testing](#testing)
- [Deployment](#deployment)
- [Development](#development)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Smart Inventory Logic**: Automatically determines optimal storage locations based on author names
- **Data Enrichment**: Fetches book metadata (cover, description, publisher) from Open Library and Google Books APIs
- **Bulk Operations**: Import, update, and delete books in batches (CSV/JSON support, up to 1000 books)
- **Pingo Sync**: Import and sync inventory data from Pingo systems
- **Manual Override**: Option to manually specify shelf/section locations
- **RESTful API**: Comprehensive API with interactive Swagger documentation
- **Responsive UI**: Modern web interface for managing inventory

## 🏢 Enterprise Features

**What makes this freeware stand out as production-grade software:**

### Observability & Monitoring

- 📊 **Prometheus Metrics** - Complete HTTP, business, and SLO metrics at `/metrics`
- 🔍 **Request Tracing** - Correlation IDs for distributed tracing (`X-Request-ID`)
- 📝 **Structured Logging** - JSON logs with Winston for centralized analysis
- 🎯 **SLO Tracking** - 99.9% availability target with error budget monitoring

### Security & Compliance

- 🛡️ **Security Headers** - Helmet.js with OWASP best practices (CSP, HSTS, XSS protection)
- 🔐 **API Key Auth** - Optional authentication layer for production deployments
- 🧹 **Input Sanitization** - Protection against injection attacks and XSS
- ⚡ **Rate Limiting** - Configurable request throttling per endpoint

### Reliability & Resilience

- 🔌 **Circuit Breakers** - Prevent cascading failures with automatic fallback (Opossum)
- 💚 **Health Checks** - Liveness and readiness probes for Kubernetes/Docker
- 🔄 **Graceful Shutdown** - Zero-downtime deployments with connection draining
- 📉 **SLO Monitoring** - Real-time availability and latency tracking

### Performance & Scale

- ⚡ **Response Compression** - Gzip compression (60-80% bandwidth reduction)
- 🎯 **Connection Pooling** - Optimized PostgreSQL connection management
- 📦 **Smart Caching** - Cache headers for static assets
- 🚀 **Async Operations** - Non-blocking I/O throughout

### Developer Experience

- 🎚️ **Feature Flags** - Safe rollout of new features without deployments
- 📖 **API Versioning** - Future-proof with `/api/v1` namespace
- 🧪 **70 Tests** - Comprehensive test suite with 88%+ coverage
- 📚 **Full Documentation** - Enterprise-grade docs in `ENTERPRISE.md`

> 📘 See [**ENTERPRISE.md**](./ENTERPRISE.md) for complete documentation on all enterprise features, configuration options, and best practices.

## Quick Start

> **🚀 Zero-Experience Setup** - See [QUICKSTART.md](QUICKSTART.md) for the absolute easiest way to get started!

**Super Quick (60 seconds):**

```bash
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
npm install
npm run go
```

The `npm run go` command will:
- Auto-detect your OS
- Offer Docker or local setup
- Configure everything automatically
- Start the application
- Open your browser

Visit `http://localhost:3000` to access the application.

**Alternative - Traditional Setup:**

```bash
# 1. Clone and navigate to the repository
git clone https://github.com/PNW-E/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub

# 2. Run the automated setup script
npm run setup

# 3. Edit .env with your database password
nano .env

# 4. Start the application with health checks
npm start
```

**Docker Quick Start:**

```bash
docker-compose up -d
```

Then visit `http://localhost:3000`

**VS Code Dev Container:**

1. Open in VS Code
2. Click "Reopen in Container"
3. Run `npm run dev`

Everything is pre-configured!

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/) (tested on Node 20 LTS)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)

## Installation

You can set up the application using either the **automated setup script** (recommended) or follow
the **manual steps** below.

### Option A: Automated Setup (Recommended)

The automated setup script will check prerequisites, install dependencies, configure environment,
and set up the database:

```bash
# Clone the repository
git clone https://github.com/ksksrbiz-arch/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub

# Run automated setup
npm run setup

# Edit .env with your database password
nano .env

# Start the server
npm start
```

The setup script will:

- ✅ Verify Node.js and PostgreSQL are installed
- ✅ Install all npm dependencies
- ✅ Create .env file from template
- ✅ Set up and initialize the database
- ✅ Run tests to verify installation

### Option B: Manual Installation

Follow these detailed steps to set up the application manually:

### 1. Clone the Repository

```bash
git clone https://github.com/ksksrbiz-arch/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
```

### 2. Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

This will install Express.js, PostgreSQL client, API libraries, and other dependencies.

### 3. Set Up PostgreSQL Database

Create a new PostgreSQL database for the application:

```bash
# Create the database
createdb books_exchange

# Initialize the database schema
psql books_exchange < src/config/schema.sql
```

**Note**: Make sure PostgreSQL is running before executing these commands.

### 4. Configure Environment Variables

Copy the example environment file and customize it with your settings:

```bash
cp .env.example .env
```

Open the `.env` file and update the variables according to your environment. The `.env.example` file
contains all required configuration options with sensible defaults.

**Required Configuration:**

```env
# Server Configuration
PORT=3000                    # Port for the application
NODE_ENV=development         # Environment: development or production
LOG_LEVEL=info               # Logging level (error, warn, info, debug)

# Rate Limiting
API_RATE_WINDOW_MIN=15       # API rate limit window in minutes
API_RATE_MAX=100             # Maximum API requests per IP per window
SYNC_RATE_WINDOW_MIN=15      # Sync rate limit window in minutes
SYNC_RATE_MAX=10             # Maximum sync requests per window

# Database Configuration
DB_USER=postgres             # Your PostgreSQL username
DB_HOST=localhost            # Database host
DB_NAME=books_exchange       # Database name
DB_PASSWORD=your_password    # Your PostgreSQL password (⚠️ CHANGE THIS!)
DB_PORT=5432                 # PostgreSQL port (default: 5432)
```

**Important Notes:**

- ⚠️ **Security:** Always change `DB_PASSWORD` from the default value
- 📋 See `.env.example` for the complete list of configuration options
- 🔒 Never commit your `.env` file to version control (it's in `.gitignore`)
- 🚀 For production, set `NODE_ENV=production` and use stronger passwords

### 5. Start the Application

Start the server in production mode:

```bash
npm start
```

The application will be available at `http://localhost:3000`

**Expected output:**

```text
Server running on port 3000
Database connected successfully
```

**Development Mode:**

For development with auto-reload on file changes:

```bash
npm run dev
```

**Additional Commands:**

```bash
# Setup & Database
npm run setup                # Run complete automated setup (first-time setup)
npm run db:init              # Initialize database only

# Development
npm run dev                  # Start with auto-reload (development mode)
npm test                     # Run all tests with coverage
npm run test:watch           # Run tests in watch mode

# Code Quality
npm run lint                 # Check for code errors
npm run format               # Auto-format all code
npm run format:check         # Check if code is formatted
npm run verify               # Run lint + format check + tests (pre-commit)

# Production
npm run build                # Build production artifacts
npm start                    # Start production server
```

**Verify Installation:**

Open your browser and navigate to:

- **Web Interface:** `http://localhost:3000`
- **Health Check:** `http://localhost:3000/health` (returns `{"status":"ok"}`)
- **DB Health Check:** `http://localhost:3000/api/health/db` (returns
  `{"status":"ok","db":"connected"}`)

If you see the web interface, you're all set! 🎉

## Configuration

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
  "quantity": 5, // Required
  "shelf_location": "A-12" // Optional (manual override)
}
```

**Success Response (201):**

```json
{
  "success": true,
  "book": {
    "id": 1,
    "isbn": "9780747532743",
    "title": "Harry Potter and the Philosopher's Stone",
    "author": "J.K. Rowling",
    "publisher": "Bloomsbury",
    "description": "...",
    "cover_url": "http://...",
    "shelf_location": "A",
    "section": "12",
    "quantity": 5,
    "available_quantity": 5
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "9780747532743",
    "quantity": 5
  }'
```

---

#### Get All Books

**GET** `/api/books`

Retrieves all books in the inventory.

**Success Response (200):**

```json
{
  "success": true,
  "books": [
    {
      "id": 1,
      "isbn": "9780747532743",
      "title": "Harry Potter..."
      // ... other book fields
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/books
```

---

#### Get a Specific Book

**GET** `/api/books/:id`

Retrieves a single book by its ID.

**Parameters:**

- `id` - Book ID (integer)

**Success Response (200):**

```json
{
  "success": true,
  "book": {
    "id": 1
    // ... book fields
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Book not found"
}
```

---

#### Update a Book

**PUT** `/api/books/:id`

Updates an existing book's information.

**Parameters:**

- `id` - Book ID (integer)

**Request Body:**

```json
{
  "title": "Updated Title", // Optional
  "author": "Updated Author", // Optional
  "quantity": 10, // Optional
  "shelf_location": "B-5" // Optional
}
```

**Success Response (200):**

```json
{
  "success": true,
  "book": {
    // ... updated book fields
  }
}
```

---

#### Delete a Book

**DELETE** `/api/books/:id`

Removes a book from the inventory.

**Parameters:**

- `id` - Book ID (integer)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Book deleted successfully"
}
```

---

### Sync API

#### Sync Pingo Inventory

**POST** `/api/sync/pingo`

Imports and synchronizes inventory data from Pingo systems.

**Request Body:**

```json
{
  "books": [
    {
      "isbn": "9780747532743",
      "title": "Book Title",
      "author": "Author Name",
      "quantity": 5
    },
    {
      "isbn": "9780061120084",
      "title": "Another Book",
      "author": "Another Author",
      "quantity": 3
    }
  ]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "booksSynced": 2,
  "totalBooks": 2,
  "errors": []
}
```

**Partial Success Response (200):**

```json
{
  "success": true,
  "booksSynced": 1,
  "totalBooks": 2,
  "errors": [
    {
      "book": { "isbn": "...", "title": "..." },
      "error": "Error message"
    }
  ]
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/sync/pingo \
  -H "Content-Type: application/json" \
  -d '{
    "books": [
      {
        "isbn": "9780747532743",
        "title": "Harry Potter",
        "author": "J.K. Rowling",
        "quantity": 5
      }
    ]
  }'
```

---

#### Get Sync History

**GET** `/api/sync/history`

Retrieves the history of all sync operations.

**Success Response (200):**

```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "sync_date": "2024-01-15T10:30:00Z",
      "books_synced": 10,
      "status": "success",
      "error_message": null
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/api/sync/history
```

---

### Bulk Operations API

#### Bulk Import Books

**POST** `/api/books/bulk`

Import multiple books at once from CSV file or JSON array. Perfect for initial inventory setup or
large updates.

**Features:**

- Support for CSV file upload or JSON array
- Automatic ISBN enrichment for all books
- Auto-assigned storage locations
- Transaction-safe (rollback on critical failure)
- Partial success support (continues processing even if some books fail)
- Maximum 1000 books per batch

**Request Body (JSON):**

```json
{
  "books": [
    {
      "isbn": "9780451524935",
      "quantity": 5
    },
    {
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "quantity": 3,
      "shelf_location": "A-5"
    }
  ]
}
```

**Request (CSV File):**

```bash
curl -X POST http://localhost:3000/api/books/bulk \
  -F "file=@books.csv"
```

**CSV Format:**

```csv
isbn,title,author,quantity,shelf_location
9780451524935,1984,George Orwell,5,
9780061120084,To Kill a Mockingbird,Harper Lee,3,A-5
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Imported 2 of 2 books",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "errors": [],
  "books": [
    {
      "id": 1,
      "isbn": "9780451524935",
      "title": "1984"
      // ... other fields
    }
  ]
}
```

**Partial Success Response (207):**

```json
{
  "success": false,
  "message": "Imported 1 of 2 books",
  "total": 2,
  "successful": 1,
  "failed": 1,
  "errors": [
    {
      "row": 2,
      "book": { "isbn": "123", "title": "Bad Book" },
      "error": "Valid quantity (>=1) is required"
    }
  ],
  "books": [...]
}
```

---

#### Bulk Update Books

**PUT** `/api/books/bulk`

Update multiple books in a single request. Maximum 500 updates per batch.

**Request Body:**

```json
{
  "updates": [
    {
      "id": 1,
      "fields": {
        "quantity": 10,
        "shelf_location": "A-5"
      }
    },
    {
      "id": 2,
      "fields": {
        "author": "Updated Author Name",
        "available_quantity": 5
      }
    }
  ]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Updated 2 of 2 books",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "errors": []
}
```

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

---

#### Bulk Delete Books

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
