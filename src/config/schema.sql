-- Create books table with inventory tracking
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(13) UNIQUE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    publisher VARCHAR(255),
    description TEXT,
    cover_url TEXT,
    shelf_location VARCHAR(100),
    section VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on ISBN for faster lookups
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- Create index on shelf location and section
CREATE INDEX IF NOT EXISTS idx_books_location ON books(shelf_location, section);

-- Create pingo_sync_log table to track sync operations
CREATE TABLE IF NOT EXISTS pingo_sync_log (
    id SERIAL PRIMARY KEY,
    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    books_synced INTEGER DEFAULT 0,
    status VARCHAR(50),
    error_message TEXT
);
