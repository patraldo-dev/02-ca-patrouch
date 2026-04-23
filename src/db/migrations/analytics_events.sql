-- Analytics events table for self-hosted tracking
-- Run: npx wrangler d1 execute patrouch-ca-book-app --remote --file=src/db/migrations/analytics_events.sql

CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_id TEXT,
    session_hash TEXT NOT NULL,
    user_agent TEXT,
    device TEXT,
    country TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_hash);
