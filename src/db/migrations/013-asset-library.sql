-- 013-asset-library.sql
-- The GLB asset library. Each row is a 3D model stored in R2, with
-- metadata that lets the scene element system match it to what Mistral
-- generated from the user's writing.
--
-- The library supports packs (curated collections by an artist) and
-- tiers (free/premium) for the business model where premium users
-- get access to richer illustrated worlds.

CREATE TABLE IF NOT EXISTS asset_library (
  id TEXT PRIMARY KEY,                  -- 'quadruped-dog-01' (kind-label-variant)
  kind TEXT NOT NULL,                   -- matches scene_elements.kind: quadruped|figure|vehicle|structure|plant|water|light_source|object
  label TEXT NOT NULL,                  -- primary label: 'dog'
  match_labels TEXT,                    -- JSON array of synonyms: ["dog","wolf","perro","puppy"]
  file_path TEXT NOT NULL,              -- R2 key: 'scene-elements/quadruped-dog-01.glb'
  pack TEXT NOT NULL DEFAULT 'core',    -- collection: 'core'|'antoine'|'guest-artist'
  artist TEXT,                          -- attribution: 'Antoine Patraldo'
  tier TEXT NOT NULL DEFAULT 'free',    -- access: 'free'|'premium'
  scale REAL DEFAULT 1.0,               -- normalized scale multiplier
  collider_type TEXT DEFAULT 'box',     -- 'box'|'sphere'|'cylinder'|'capsule'
  collider_size TEXT,                   -- JSON array: [w, h, d] for box, [r] for sphere, etc.
  description TEXT,                     -- human-readable notes
  tags TEXT,                            -- JSON array: ["animal","mammal","ground"]
  status TEXT NOT NULL DEFAULT 'active',-- 'active'|'retired' (soft delete)
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Primary query path: find models by kind (what Mistral generated)
CREATE INDEX IF NOT EXISTS idx_asset_library_kind ON asset_library(kind, status);
-- Search by label within a kind
CREATE INDEX IF NOT EXISTS idx_asset_library_label ON asset_library(kind, label);
-- Filter by pack/tier (for premium gating)
CREATE INDEX IF NOT EXISTS idx_asset_library_pack ON asset_library(pack, tier, status);
