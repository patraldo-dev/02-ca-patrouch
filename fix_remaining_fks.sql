PRAGMA foreign_keys = OFF;

CREATE TABLE session_new (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES users("id") ON DELETE CASCADE
);
INSERT INTO session_new SELECT * FROM session;
DROP TABLE session;
ALTER TABLE session_new RENAME TO session;

CREATE TABLE account_new (
  "id" TEXT PRIMARY KEY NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TEXT,
  "refreshTokenExpiresAt" TEXT,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);
INSERT INTO account_new SELECT * FROM account;
DROP TABLE account;
ALTER TABLE account_new RENAME TO account;

CREATE TABLE user_writing_stats_new (
  user_id          TEXT PRIMARY KEY REFERENCES users(id),
  total_writings   INTEGER DEFAULT 0,
  total_words      INTEGER DEFAULT 0,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  prompts_accepted INTEGER DEFAULT 0,
  prompts_passed   INTEGER DEFAULT 0,
  last_writing_date TEXT DEFAULT NULL,
  updated_at       TEXT DEFAULT (datetime('now'))
);
INSERT INTO user_writing_stats_new SELECT * FROM user_writing_stats;
DROP TABLE user_writing_stats;
ALTER TABLE user_writing_stats_new RENAME TO user_writing_stats;

DROP TABLE "user";

PRAGMA foreign_keys = ON;
