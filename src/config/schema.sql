-- Create books table with inventory tracking
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(13) UNIQUE,
    upc VARCHAR(12),
    asin VARCHAR(10),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    publisher VARCHAR(255),
    description TEXT,
    cover_url TEXT,
    user_image_url TEXT,
    condition VARCHAR(50) DEFAULT 'Good',
    genre VARCHAR(100),
    format VARCHAR(50),
    pages INTEGER,
    shelf_location VARCHAR(100),
    section VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    enrichment_source VARCHAR(50),
    enrichment_status VARCHAR(50) DEFAULT 'pending',
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

-- Shelf capacity tracking
CREATE TABLE IF NOT EXISTS shelf_capacity (
    id SERIAL PRIMARY KEY,
    shelf_location VARCHAR(100) NOT NULL,
    section VARCHAR(100),
    max_capacity INTEGER DEFAULT 100,
    current_count INTEGER DEFAULT 0,
    genre_preference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shelf_location, section)
);

-- Batch upload tracking
CREATE TABLE IF NOT EXISTS batch_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(255),
    total_books INTEGER DEFAULT 0,
    processed_books INTEGER DEFAULT 0,
    successful_books INTEGER DEFAULT 0,
    failed_books INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_log JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Incoming book queue for processing
CREATE TABLE IF NOT EXISTS incoming_books (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batch_uploads(id),
    raw_data JSONB NOT NULL,
    isbn VARCHAR(13),
    upc VARCHAR(12),
    asin VARCHAR(10),
    title VARCHAR(255),
    author VARCHAR(255),
    condition VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    user_image_path TEXT,
    assigned_shelf VARCHAR(100),
    assigned_section VARCHAR(100),
    processing_status VARCHAR(50) DEFAULT 'pending',
    enrichment_attempts INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incoming_status ON incoming_books(processing_status);
CREATE INDEX IF NOT EXISTS idx_incoming_batch ON incoming_books(batch_id);

INSERT INTO permissions (code, description) VALUES
    ('INVENTORY_READ', 'Read inventory data'),
    ('INVENTORY_WRITE', 'Modify inventory data'),
    ('SYNC_EXECUTE', 'Trigger sync operations'),
    ('FEATURE_FLAG_MANAGE', 'Manage feature flags'),
    ('SALES_CREATE_ORDER', 'Create sales orders'),
    ('SALES_READ_ORDER', 'Read sales orders')
ON CONFLICT (code) DO NOTHING;

-- Site content key-value storage (business info, policies, affiliate links, notes)
CREATE TABLE IF NOT EXISTS site_content (
    content_key VARCHAR(100) PRIMARY KEY,
    content_value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default business info & placeholders
INSERT INTO site_content (content_key, content_value) VALUES
    ('business_info', '{"name":"Your Store Name","tagline":"Community Book Exchange","address":"123 Main St, City, ST","hours":"Mon-Sat 10am-6pm","phone":"(555) 555-1212","google_business_url":"https://business.google.com/your-store","email":"contact@example.com"}'::jsonb),
    ('affiliate_links', '{"links":[]}'::jsonb),
    ('owner_notes', '{"notes":""}'::jsonb),
    ('exchange_policy_md', '{"markdown":"# Exchange & Credit Policy\n\n_Store owner has not added a policy yet._"}'::jsonb)
ON CONFLICT (content_key) DO NOTHING;

-- Store profiles imported / managed externally (e.g., in-store POS) for auto-linking
CREATE TABLE IF NOT EXISTS store_profiles (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    external_id VARCHAR(100),
    display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link between application users and store profiles (auto-created on registration if email matches)
CREATE TABLE IF NOT EXISTS user_store_links (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_profile_id INTEGER REFERENCES store_profiles(id) ON DELETE CASCADE,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, store_profile_id)
);

-- Audit log of linking events
CREATE TABLE IF NOT EXISTS user_link_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_profile_id INTEGER REFERENCES store_profiles(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- AUTO_LINK, MANUAL_LINK
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
