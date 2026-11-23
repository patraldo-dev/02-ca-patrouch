-- 025: Oulipo duel — the solitaire mode.
-- Sappho drafts one hidden piece per language per day, against the day's
-- community prompt. Each member may lock one duel against it: send words
-- from their own piece, score the ones her draft used, then read her
-- rewrite without them. Additive only; nothing existing is touched.
-- Apply to both live DBs (staging and prod) before deploying the duel.

CREATE TABLE IF NOT EXISTS oulipo_duel_drafts (
  id TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  duel_date TEXT NOT NULL,
  prompt_id TEXT,
  prompt_text TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- One hidden draft per language per day. The unique index settles the race
-- when two players ask for the same draft at the same moment.
CREATE UNIQUE INDEX IF NOT EXISTS idx_duel_drafts_day
  ON oulipo_duel_drafts(locale, duel_date);

CREATE TABLE IF NOT EXISTS oulipo_duel_rounds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  locale TEXT NOT NULL,
  duel_date TEXT NOT NULL,
  draft_id TEXT NOT NULL REFERENCES oulipo_duel_drafts(id),
  story TEXT NOT NULL,
  policy TEXT NOT NULL,
  ropes TEXT NOT NULL,
  rope_count INTEGER NOT NULL,
  story_types INTEGER NOT NULL,
  bites INTEGER NOT NULL,
  misses INTEGER NOT NULL,
  score INTEGER NOT NULL,
  muzzle_pct INTEGER NOT NULL,
  draft_tokens INTEGER NOT NULL,
  -- Her best rewrite so far, with the forbidden words it still uses; and
  -- the words that got through on the last pass, for the next one to avoid.
  rewrite TEXT,
  rewrite_status TEXT NOT NULL DEFAULT 'pending',
  rewrite_attempts INTEGER NOT NULL DEFAULT 0,
  rewrite_violations TEXT,
  rewrite_slipped TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- One duel per member per day, whatever language it was played in.
CREATE UNIQUE INDEX IF NOT EXISTS idx_duel_rounds_player_day
  ON oulipo_duel_rounds(user_id, duel_date);

-- The day's board, per language.
CREATE INDEX IF NOT EXISTS idx_duel_rounds_board
  ON oulipo_duel_rounds(duel_date, locale, score DESC);
