-- Dictée attempts: one row per completed dictation exercise (typed on
-- screen or photographed handwritten page). Feeds the progress chart and
-- the "Mes dictées" history on /dictation, and keeps per-attempt metadata
-- (source writing, word count) so difficulty analysis can be added later
-- without schema changes. Applied directly to both live DBs; this file
-- documents the shape for fresh environments.

CREATE TABLE IF NOT EXISTS dictation_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  writing_id TEXT,
  locale TEXT DEFAULT 'es',
  mode TEXT DEFAULT 'typed',        -- 'typed' | 'handwritten'
  accuracy REAL NOT NULL DEFAULT 0, -- 0–100
  faults INTEGER DEFAULT 0,
  extras INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  manuscript_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dictation_attempts_user
  ON dictation_attempts(user_id, created_at DESC);
