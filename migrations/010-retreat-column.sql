-- Migration: Add retreat_until column to bq_players
-- Tracks cooldown for pier retreat ability

ALTER TABLE bq_players ADD COLUMN retreat_until TEXT;
