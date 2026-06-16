-- Migration: Create bq_aliens table
-- Alien armies — two factions waging eternal war in PV waters

CREATE TABLE IF NOT EXISTS bq_aliens (
    id TEXT PRIMARY KEY,
    faction TEXT NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    hp INTEGER DEFAULT 100,
    status TEXT DEFAULT 'active',  -- 'active' or 'defeated'
    respawn_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
