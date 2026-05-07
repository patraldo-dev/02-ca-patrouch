PRAGMA foreign_keys = OFF;

CREATE TABLE user_writing_stats_new (
  user_id           TEXT PRIMARY KEY REFERENCES user(id),
  total_writings    INTEGER DEFAULT 0,
  total_words       INTEGER DEFAULT 0,
  current_streak    INTEGER DEFAULT 0,
  longest_streak    INTEGER DEFAULT 0,
  prompts_accepted  INTEGER DEFAULT 0,
  prompts_passed    INTEGER DEFAULT 0,
  last_writing_date TEXT DEFAULT NULL,
  updated_at        TEXT DEFAULT (datetime('now'))
);

INSERT INTO user_writing_stats_new SELECT * FROM user_writing_stats;
DROP TABLE user_writing_stats;
ALTER TABLE user_writing_stats_new RENAME TO user_writing_stats;

PRAGMA foreign_keys = ON;
