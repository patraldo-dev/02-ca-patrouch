-- 010-portal-presence.sql
-- Tracks who has visited each portal realm. Enables:
--   (a) co-presence notifications ("🟢 someone is exploring a realm you've visited")
--   (b) "recent visitors to this realm" for the in-world HUD.
--
-- Apply locally with:
--   npx wrangler d1 execute DB_book --local --file=src/db/migrations/010-portal-presence.sql
-- Apply to remote production with:
--   npx wrangler d1 execute DB_book --remote --file=src/db/migrations/010-portal-presence.sql
--
-- user_id is nullable so anonymous visitors can still be counted for HUD display
-- without requiring an account.

CREATE TABLE IF NOT EXISTS portal_visits (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  portal_id TEXT NOT NULL,
  user_id TEXT,
  display_name TEXT,
  visited_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portal_visits_portal ON portal_visits(portal_id, visited_at);
CREATE INDEX IF NOT EXISTS idx_portal_visits_user ON portal_visits(user_id, visited_at);
