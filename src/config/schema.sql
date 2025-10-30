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

-- User accounts for role-based access (passwords stored as bcrypt hashes)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table (e.g., admin, staff, customer)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Permissions table for fine-grained control (e.g., INVENTORY_READ, INVENTORY_WRITE)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Mapping users -> roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Mapping roles -> permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed baseline roles & permissions (idempotent patterns)
INSERT INTO roles (name, description) VALUES
    ('admin', 'Platform administrator'),
    ('staff', 'Internal staff user'),
    ('customer', 'Customer facing user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
    ('INVENTORY_READ', 'Read inventory data'),
    ('INVENTORY_WRITE', 'Modify inventory data'),
    ('SYNC_EXECUTE', 'Trigger sync operations'),
    ('FEATURE_FLAG_MANAGE', 'Manage feature flags'),
    ('SALES_CREATE_ORDER', 'Create sales orders'),
    ('SALES_READ_ORDER', 'Read sales orders')
ON CONFLICT (code) DO NOTHING;
