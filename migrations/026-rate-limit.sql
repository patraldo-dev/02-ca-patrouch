-- 026: where the sign-in library keeps its count of attempts.
-- The library held the count in memory, on an instance that lives for one
-- request, and switched itself on only when told it runs in production: its
-- limits never held, and a password could be guessed at full speed. Measured
-- on the live site on 2026-11-26: six wrong passwords in a row, not one
-- refused. Kept in the database they hold for the whole site: three sign-in
-- or sign-up attempts in ten seconds from one address, three reset or
-- verification requests in a minute. One row per address and path; the
-- library prunes rows whose window has passed.
-- Apply to BOTH live DBs (staging and prod) BEFORE deploying the code that
-- reads this table (rateLimit.storage "database" in src/lib/auth.js). That
-- code reads it on every sign-in request, and the library does not step over
-- a missing table: without it, every such request fails.
-- Additive only: nothing existing is touched. Written from the library's
-- own definition of the table.

CREATE TABLE IF NOT EXISTS rate_limit (
  id text PRIMARY KEY NOT NULL,
  key text NOT NULL,
  count integer NOT NULL,
  lastRequest integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_key_unique ON rate_limit ("key");
