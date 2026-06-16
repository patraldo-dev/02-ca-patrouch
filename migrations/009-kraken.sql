-- Migration: Create bq_kraken table
-- The Kraken — a roaming sea monster

CREATE TABLE IF NOT EXISTS bq_kraken (
    id TEXT PRIMARY KEY DEFAULT 'kraken',
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    last_displacement TEXT DEFAULT (datetime('now')),
    attack_count INTEGER DEFAULT 0,
    last_attack_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
