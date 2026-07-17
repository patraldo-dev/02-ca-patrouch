-- 012-saved-realms.sql
-- Extends the portals system to support user-saved materialized realms.
-- Mirrors the writings privacy pattern (private/public visibility).
-- Collective portals (cron-generated) keep owner_id=NULL, visibility='public'.

-- Track who owns a personal realm (NULL for collective portals)
ALTER TABLE portals ADD COLUMN owner_id TEXT REFERENCES users(id);

-- Visibility: 'private' (default for saved realms) or 'public' (shared)
-- Default 'public' so existing collective portals are unaffected.
ALTER TABLE portals ADD COLUMN visibility TEXT DEFAULT 'public';

-- The original text the user wrote to materialize this realm
ALTER TABLE portals ADD COLUMN source_text TEXT;

-- New galaxy for personal realms (user-saved materialized worlds)
INSERT OR IGNORE INTO galaxies (id, name_es, name_en, name_fr, icon, sort_order)
VALUES ('personal', 'Mis reinos', 'My realms', 'Mes royaumes', '🔖', 99);

-- Index for querying a user's realms by visibility
CREATE INDEX IF NOT EXISTS idx_portals_owner ON portals(owner_id, visibility);
