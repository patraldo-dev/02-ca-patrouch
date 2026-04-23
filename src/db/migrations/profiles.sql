-- Profiles (pen names) table
-- Each user can have up to 5 profiles/pen names for writing in different languages/voices
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    display_name TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'es', 'fr')),
    bio TEXT DEFAULT '',
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Only one profile can be active per user
-- Only one profile can be primary per user
-- Max 5 profiles per user (enforced in application logic)

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(user_id, is_active);
