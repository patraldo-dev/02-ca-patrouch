CREATE TABLE IF NOT EXISTS refinements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text_preview TEXT,
    refined_text TEXT,
    locale TEXT DEFAULT 'en',
    created_at TEXT DEFAULT (datetime('now'))
);
