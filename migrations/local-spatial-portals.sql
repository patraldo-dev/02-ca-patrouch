-- Local-dev setup for the spatial portals tables.
-- Schema captured from the remote D1 (sqlite_master) on 2026-07-10 so local
-- matches production. The spatial portals/galaxies tables were created ad-hoc
-- on remote and never captured in migrations/; this file fills that gap.
--
-- Apply locally with:
--   npx wrangler d1 execute DB_book --local --file=migrations/local-spatial-portals.sql

CREATE TABLE IF NOT EXISTS galaxies (
  id TEXT PRIMARY KEY,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  description_fr TEXT,
  icon TEXT DEFAULT '🌌',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portals (
  id TEXT PRIMARY KEY,
  galaxy_id TEXT NOT NULL,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  description_fr TEXT,
  icon TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_bg TEXT,
  color_text TEXT,
  narrator_tone TEXT,
  narrator_vocabulary TEXT,
  narrator_proclamation_style TEXT,
  narrator_greeting TEXT,
  placement_mode TEXT DEFAULT 'floating',
  portal_distance REAL DEFAULT -1.5,
  portal_y REAL DEFAULT -0.3,
  triggers TEXT,
  status TEXT DEFAULT 'active',
  active_writings_count INTEGER DEFAULT 0,
  discovered_at TEXT DEFAULT (datetime('now')),
  video_url TEXT,
  scene_image TEXT,
  FOREIGN KEY (galaxy_id) REFERENCES galaxies(id)
);

CREATE TABLE IF NOT EXISTS portal_scenes (
  portal_id TEXT NOT NULL,
  scene_config TEXT NOT NULL,
  source_writings TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  variant TEXT NOT NULL DEFAULT 'default',
  PRIMARY KEY (portal_id)
);

CREATE TABLE IF NOT EXISTS portal_narrations (
    portal_id     TEXT NOT NULL,
    locale        TEXT NOT NULL,          -- 'es' | 'en' | 'fr'
    audio_base64  TEXT,                   -- base64-encoded mp3 from melotts
    text_passage  TEXT,                   -- the spoken passage (for subtitles)
    generated_at  TIMESTAMP,
    PRIMARY KEY (portal_id, locale)
);

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
