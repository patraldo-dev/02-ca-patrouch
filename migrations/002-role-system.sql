-- Migration: Role-based access system
-- Run with: npx wrangler d1 execute patrouch-ca-book-app --remote --file migrations/002-role-system.sql

-- 1. Ensure role column exists on users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- 2. Migrate existing admin users
UPDATE users SET role = 'admin' WHERE username IN ('agrimaldor', 'xpat', 'adminbigdaddy', 'mxurbano', 'superuser');

-- 3. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invited_by TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  accepted_at INTEGER,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_used ON invitations(used);
