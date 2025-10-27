# 📚 To-Be-Read Exchange Hub

A smart inventory management system for book exchange with automated data enrichment and intelligent storage allocation.

## Features

- **Smart Inventory Logic**: Automatically determines optimal storage locations based on author names
- **Data Enrichment**: Fetches book metadata (cover, description, publisher) from Open Library and Google Books APIs
- **Pingo Sync**: Import and sync inventory data from Pingo systems
- **Manual Override**: Option to manually specify shelf/section locations
- **RESTful API**: Comprehensive API for book management
- **Responsive UI**: Modern web interface for managing inventory

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ksksrbiz-arch/To-Be-Read-Exchange-Hub.git
cd To-Be-Read-Exchange-Hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
```bash
createdb books_exchange
psql books_exchange < src/config/schema.sql
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Documentation

### Books API

#### POST /api/books
Create a new book with smart inventory logic and data enrichment.

**Request Body:**
```json
{
  "isbn": "9780747532743",
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "quantity": 5,
  "shelf_location": "A-12"  // Optional: manual override
}
```

**Response:**
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

#### GET /api/books
Get all books in inventory.

#### GET /api/books/:id
Get a specific book by ID.

#### PUT /api/books/:id
Update a book's information.

#### DELETE /api/books/:id
Delete a book from inventory.

### Sync API

#### POST /api/sync/pingo
Sync Pingo inventory data.

**Request Body:**
```json
{
  "books": [
    {
      "isbn": "9780747532743",
      "title": "Book Title",
      "author": "Author Name",
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "booksSynced": 1,
  "totalBooks": 1
}
```

#### GET /api/sync/history
Get sync operation history.

## Smart Inventory Logic

The system automatically determines optimal storage locations using the following algorithm:

1. **Manual Override**: If a shelf/section is specified, it takes precedence
2. **Alphabetical Organization**: Books are organized by the author's last name
   - Shelf is determined by the first letter (e.g., "Smith" → Shelf S)
   - Section is auto-incremented within each shelf
3. **Location Formats Supported**:
   - `A-12` (Shelf A, Section 12)
   - `Shelf A, Section 12`
   - `A` (Just shelf)

## Data Enrichment

When an ISBN is provided, the system automatically:
1. Queries Open Library API for book metadata
2. Queries Google Books API for additional information
3. Merges data prioritizing:
   - Title and author from first available source
   - Description primarily from Google Books
   - Cover image from best quality source
   - Publisher information from either source

## Testing

Run tests with:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Development

Run in development mode:
```bash
npm run dev
```

## Database Schema

### Books Table
- `id`: Primary key
- `isbn`: Unique ISBN (13 digits)
- `title`: Book title
- `author`: Author name
- `publisher`: Publisher name
- `description`: Book description
- `cover_url`: Cover image URL
- `shelf_location`: Shelf identifier
- `section`: Section within shelf
- `quantity`: Total quantity
- `available_quantity`: Available quantity
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Pingo Sync Log Table
- `id`: Primary key
- `sync_date`: Sync operation timestamp
- `books_synced`: Number of books synced
- `status`: Sync status (success/partial/failed)
- `error_message`: Error details if any

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.