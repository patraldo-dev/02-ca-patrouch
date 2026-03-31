-- Creative Writing Platform Schema

CREATE TABLE IF NOT EXISTS writing_prompts (
  id TEXT PRIMARY KEY,
  prompt_text TEXT NOT NULL,
  prompt_date TEXT NOT NULL,
  category TEXT NOT NULL,
  locale TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompts_date ON writing_prompts(prompt_date);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON writing_prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_date_cat_locale ON writing_prompts(prompt_date, category, locale);

CREATE TABLE IF NOT EXISTS writings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  prompt_id TEXT REFERENCES writing_prompts(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  ai_assisted INTEGER DEFAULT 0,
  visibility TEXT DEFAULT 'private',
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_writings_user ON writings(user_id);
CREATE INDEX IF NOT EXISTS idx_writings_visibility ON writings(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_writings_status ON writings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_writings_created ON writings(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_prompt_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  prompt_id TEXT NOT NULL REFERENCES writing_prompts(id),
  prompt_date TEXT NOT NULL,
  action TEXT NOT NULL,
  locale TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompt_log_user_date ON daily_prompt_log(user_id, prompt_date, locale);
CREATE INDEX IF NOT EXISTS idx_prompt_log_action ON daily_prompt_log(user_id, prompt_date, locale, action);

-- Migration: add locale column to existing tables
-- ALTER TABLE writing_prompts ADD COLUMN locale TEXT DEFAULT 'en';
-- ALTER TABLE daily_prompt_log ADD COLUMN locale TEXT DEFAULT 'en';

CREATE TABLE IF NOT EXISTS user_writing_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  total_writings INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  prompts_accepted INTEGER DEFAULT 0,
  prompts_passed INTEGER DEFAULT 0,
  last_writing_date TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
