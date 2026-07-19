-- 014-game-fields.sql
-- Game metadata on asset_library models. Each model can participate in
-- different game worlds with specific behaviors and point values.

-- Which game world this model is designed for (NULL = general use)
ALTER TABLE asset_library ADD COLUMN game_name TEXT DEFAULT NULL;

-- Behavior type: 'passive' | 'evade' | 'attack' | 'hide' | 'follow'
ALTER TABLE asset_library ADD COLUMN game_behavior TEXT DEFAULT 'passive';

-- Point value when collected/defeated in a game
ALTER TABLE asset_library ADD COLUMN game_points INTEGER DEFAULT 1;
