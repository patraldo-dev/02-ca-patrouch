-- ar_portals: Narrator-generated AR portals from El Ágora writings
-- Created: 2026-05-05

CREATE TABLE IF NOT EXISTS ar_portals (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  theme TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_m INTEGER DEFAULT 30,
  proclamation TEXT NOT NULL,
  agora_ref TEXT,
  narrator_clip_url TEXT,
  glb_variant TEXT,
  created_by TEXT DEFAULT 'narrator',
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  captured_by TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_portals_game_expires ON ar_portals(game_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_portals_coords ON ar_portals(lat, lng);
CREATE INDEX IF NOT EXISTS idx_portals_agora ON ar_portals(agora_ref);
