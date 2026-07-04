-- 008-portal-scene-variants.sql
-- Allow multiple scene variants per portal (Tier 2 emergent portals).
-- Previously portal_scenes had one row per portal (portal_id was the conflict key).
-- Now (portal_id, variant) is unique, so a portal can have a 'default' scene
-- plus named variants added by the architect's "add_scene" action.

-- SQLite doesn't support adding constraints to existing tables directly, so we
-- add the column and create a new unique index on the composite key. The old
-- ON CONFLICT(portal_id) upserts in app code are updated to ON CONFLICT(portal_id, variant).

ALTER TABLE portal_scenes ADD COLUMN variant TEXT NOT NULL DEFAULT 'default';

-- Drop any existing single-column index on portal_id (if one existed) and
-- create the composite unique index. IF EXISTS guards repeated runs.
DROP INDEX IF EXISTS idx_portal_scenes_portal_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_scenes_portal_variant
    ON portal_scenes(portal_id, variant);
