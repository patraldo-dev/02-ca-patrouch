-- Align daily_prompt_log with what the prompt pass/accept flow expects.
-- Prod got these via out-of-band ALTERs; staging was missing is_community,
-- which 500'd every "pass" on the daily prompt (fixed 2026-10-29).
-- Applied directly to both live DBs — this file exists so fresh
-- environments are created correctly. SQLite has no ADD COLUMN IF NOT
-- EXISTS; skip manually if the column is already present.

ALTER TABLE daily_prompt_log ADD COLUMN locale TEXT DEFAULT 'en';
ALTER TABLE daily_prompt_log ADD COLUMN is_community INTEGER DEFAULT 1;
