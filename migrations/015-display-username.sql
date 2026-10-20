-- 015: the username plugin (better-auth 1.6.8) writes displayUsername on
-- signup; declare it in the users table (additive, nullable — safe on prod).
ALTER TABLE users ADD COLUMN displayUsername TEXT;
