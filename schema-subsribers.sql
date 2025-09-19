-- Drop table if it exists (only if safe to do so)
DROP TABLE IF EXISTS subscribers;

-- Create table with correct schema
CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    type TEXT NOT NULL,
    confirmation_token TEXT,
    token_expires_at TEXT,
    confirmed INTEGER NOT NULL DEFAULT 0,  -- ✅ INTEGER, not BOOLEAN
    confirmed_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(email, type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_confirmed ON subscribers(confirmed);
