CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY,
  game INTEGER NOT NULL DEFAULT 1,
  writing INTEGER NOT NULL DEFAULT 1,
  community INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
