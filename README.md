# 📚 To-Be-Read Exchange Hub

A smart inventory management system for book exchange with automated data enrichment and intelligent
storage allocation.

## Table of Contents

- [Features](#features)
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

- **Smart Inventory Logic**: Automatically determines optimal storage locations based on author
  names
- **Data Enrichment**: Fetches book metadata (cover, description, publisher) from Open Library and
  Google Books APIs
- **Pingo Sync**: Import and sync inventory data from Pingo systems
- **Manual Override**: Option to manually specify shelf/section locations
- **RESTful API**: Comprehensive API for book management
- **Responsive UI**: Modern web interface for managing inventory

## Quick Start

Get started in 5 minutes:

```bash
# 1. Clone and navigate to the repository
git clone https://github.com/ksksrbiz-arch/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub

# 2. Install dependencies
npm install

# 3. Set up database
createdb books_exchange
psql books_exchange < src/config/schema.sql

# Or run the helper script (Linux/macOS):
bash scripts/init-db.sh

# 4. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 5. Start the application
npm start
```

Visit `http://localhost:3000` to access the application.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/) (tested on Node 20 LTS)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)

## Installation

Follow these detailed steps to set up the application:

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

Open the `.env` file and update the following variables:

```env
# Server Configuration
PORT=3000                    # Port for the application
NODE_ENV=development         # Environment: development or production

# Database Configuration
DB_USER=postgres             # Your PostgreSQL username
DB_HOST=localhost            # Database host
DB_NAME=books_exchange       # Database name
DB_PASSWORD=your_password    # Your PostgreSQL password
DB_PORT=5432                 # PostgreSQL port (default: 5432)
```

### 5. Start the Application

Start the server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

For development mode with auto-reload:

```bash
npm run dev
```

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

The application includes automated deployment workflows via GitHub Actions. Follow these steps to
set up and trigger deployments.

### Deployment Prerequisites

Before deploying, you need to configure the `DEPLOY_TOKEN` secret in your GitHub repository:

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub
   - Click on **Settings** > **Secrets and variables** > **Actions**

2. **Add DEPLOY_TOKEN Secret**
   - Click **New repository secret**
   - Name: `DEPLOY_TOKEN`
   - Value: Your deployment token/key (see platform-specific instructions below)

### Platform-Specific Setup

#### Vercel Deployment

1. Get your Vercel token from [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Add it as `DEPLOY_TOKEN` in GitHub Secrets
3. Uncomment the Vercel deployment command in `.github/workflows/deploy.yml`:

   ```yaml
   vercel --prod --token=$DEPLOY_TOKEN
   ```

#### Netlify Deployment

1. Generate a Netlify personal access token from your
   [Netlify account settings](https://app.netlify.com/user/applications)
2. Add it as `DEPLOY_TOKEN` in GitHub Secrets
3. Uncomment the Netlify deployment command in `.github/workflows/deploy.yml`:

   ```yaml
   netlify deploy --prod --auth=$DEPLOY_TOKEN
   ```

#### AWS S3 Deployment

1. Create AWS credentials (Access Key ID and Secret Access Key) with S3 permissions
2. Format them as `AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY`
3. Add the formatted string as `DEPLOY_TOKEN` in GitHub Secrets
4. Uncomment and configure the AWS deployment command in `.github/workflows/deploy.yml`:

   ```yaml
   aws s3 sync dist/ s3://your-bucket --region us-east-1
   ```

### Triggering Deployments

Deployments can be triggered in two ways:

1. **Automatic Deployment**
   - Deployments automatically run when code is pushed to the `main` branch
   - The workflow will build, test, and deploy your application

2. **Manual Deployment**
   - Go to **Actions** tab in your GitHub repository
   - Select the **Deploy** workflow
   - Click **Run workflow**
   - Choose the branch to deploy (usually `main`)
   - Click **Run workflow** button

### Security Notes

⚠️ **Important Security Considerations:**

- Never commit deployment tokens or credentials to your repository
- Always use GitHub Secrets to store sensitive tokens
- Regularly rotate your deployment tokens
- Use environment-specific tokens (separate tokens for staging/production)
- Review deployment logs for any exposed credentials
- Consider using OIDC authentication for AWS/Azure deployments instead of static credentials

### Deployment Process

The deployment workflow automatically:

1. ✅ Verifies that `DEPLOY_TOKEN` is configured
2. 📦 Installs dependencies with `npm ci`
3. 🔨 Builds the application with `npm run build`
4. 🧪 Runs tests to ensure code quality
5. 🚀 Deploys to your configured platform
6. ✅ Confirms successful deployment or initiates rollback on failure

### Troubleshooting Deployment

**Deployment fails with "DEPLOY_TOKEN not set":**

- Ensure you've added the `DEPLOY_TOKEN` secret in GitHub repository settings
- Verify the secret name is exactly `DEPLOY_TOKEN` (case-sensitive)

**Deployment succeeds but application doesn't update:**

- Check your platform-specific deployment command is uncommented
- Verify the deployment target (bucket, site ID, etc.) is correct
- Review deployment logs in the Actions tab

## Development

### Development Mode

Run the application in development mode:

```bash
npm run dev
```

This starts the server with the development environment settings.

### Project Structure

```plaintext
To-Be-Read-Exchange-Hub/
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
