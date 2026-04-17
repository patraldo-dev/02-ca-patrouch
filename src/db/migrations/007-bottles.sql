-- Migration 007: Bottles feature tables
-- Already created via schema, this file documents the schema for reference.

CREATE TABLE IF NOT EXISTS bottles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  writing_id TEXT,
  content TEXT,
  content_type TEXT DEFAULT 'message',
  title TEXT DEFAULT '',
  status TEXT DEFAULT 'preparing',
  launch_lat REAL,
  launch_lon REAL,
  current_lat REAL,
  current_lon REAL,
  bottle_type TEXT DEFAULT 'glass',
  launched_at TEXT,
  beached_at TEXT,
  found_by TEXT,
  found_at TEXT,
  is_test INTEGER DEFAULT 0,
  distance_km REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bottle_positions (
  id TEXT PRIMARY KEY,
  bottle_id TEXT NOT NULL REFERENCES bottles(id),
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  heading REAL,
  speed_knots REAL,
  sea_temp REAL,
  wind_speed REAL,
  wind_dir TEXT,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bottle_launches (
  id TEXT PRIMARY KEY,
  name TEXT,
  launch_date TEXT,
  launch_lat REAL,
  launch_lon REAL,
  total_bottles INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bottles_user_id ON bottles(user_id);
CREATE INDEX IF NOT EXISTS idx_bottles_status ON bottles(status);
CREATE INDEX IF NOT EXISTS idx_bottle_positions_bottle_id ON bottle_positions(bottle_id);
