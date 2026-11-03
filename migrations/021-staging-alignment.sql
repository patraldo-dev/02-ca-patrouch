-- Staging alignment (2026-10-29 audit): mirror prod's out-of-band schema.
-- Tables + columns + indexes. Data (badges etc.) copied separately.
CREATE TABLE IF NOT EXISTS agora_game_guesses (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES agora_game_rounds(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    writing_id TEXT NOT NULL,
    guess TEXT NOT NULL,          -- 'ai' or 'human'
    was_correct INTEGER DEFAULT 0,
    guessed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agora_game_rounds (
    id TEXT PRIMARY KEY,
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    writings_json TEXT,           -- JSON of writings used in round
    is_active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,          -- emoji or icon class
    category TEXT NOT NULL,       -- 'streak', 'words', 'agora', 'social', 'challenge', 'milestone'
    rarity TEXT DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'legendary'
    criteria TEXT NOT NULL,       -- JSON describing unlock conditions
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS beach_zones (
    id TEXT PRIMARY KEY,
    name TEXT,
    polygon_geojson TEXT NOT NULL,
    country TEXT,
    min_lat REAL,
    max_lat REAL,
    min_lon REAL,
    max_lon REAL
);
CREATE TABLE IF NOT EXISTS bottle_events (
    id TEXT PRIMARY KEY,
    bottle_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    lat REAL,
    lon REAL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (bottle_id) REFERENCES bottles(id)
);
CREATE TABLE IF NOT EXISTS challenge_entries (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL REFERENCES writing_challenges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    writing_id TEXT REFERENCES writings(id),
    submitted_at TEXT DEFAULT (datetime('now')),
    votes INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS comment_likes (
  user_id TEXT NOT NULL REFERENCES "users_old"(id),
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, comment_id)
);
CREATE TABLE IF NOT EXISTS current_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    min_lat REAL NOT NULL,
    max_lat REAL NOT NULL,
    min_lon REAL NOT NULL,
    max_lon REAL NOT NULL,
    base_u REAL DEFAULT 0,
    base_v REAL DEFAULT 0,
    seasonal_u_amp REAL DEFAULT 0,
    seasonal_v_amp REAL DEFAULT 0,
    noise_factor REAL DEFAULT 0.3,
    mode TEXT DEFAULT 'simple'
);
CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, text_preview TEXT NOT NULL, evaluation TEXT NOT NULL, locale TEXT DEFAULT 'en', model TEXT DEFAULT 'mistral-small-3.1-24b', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES "users_old"(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS feedback_requests (
    id TEXT PRIMARY KEY,
    writing_id TEXT NOT NULL REFERENCES writings(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    feedback_type TEXT DEFAULT 'general',  -- 'general', 'grammar', 'style', 'structure'
    specific_questions TEXT,               -- JSON with specific questions
    is_open INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS feedback_responses (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
    responder_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    helpful_votes INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS narrator_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    narrative TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'flavor',
    modifier_type TEXT,
    modifier_value REAL,
    affected_zone TEXT,
    target_players TEXT,
    duration_hours INTEGER DEFAULT 6,
    started_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
, title_es TEXT, narrative_es TEXT, title_fr TEXT, narrative_fr TEXT, target_game TEXT DEFAULT 'both', effects TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS ocean_current_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    current_u REAL,
    current_v REAL,
    speed REAL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(lat, lon)
);
CREATE TABLE IF NOT EXISTS ocean_drift_events (
    id TEXT PRIMARY KEY,
    bottle_id TEXT NOT NULL,
    old_lat REAL,
    old_lon REAL,
    new_lat REAL NOT NULL,
    new_lon REAL NOT NULL,
    current_u REAL,
    current_v REAL,
    wind_u REAL,
    wind_v REAL,
    speed_kmh REAL,
    distance_km REAL,
    data_source TEXT DEFAULT 'noaa_oscar',
    simulated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (bottle_id) REFERENCES bottles(id)
);
CREATE TABLE IF NOT EXISTS sst_cache (zone_id TEXT PRIMARY KEY, zone_name TEXT, avg_sst REAL, anomaly REAL, data_points INTEGER, updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS tour_landmarks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  category TEXT DEFAULT 'landmark',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS user_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TEXT DEFAULT (datetime('now')),
    context TEXT,                 -- JSON with unlock context
    UNIQUE(user_id, badge_id)
);
CREATE TABLE IF NOT EXISTS writer_of_the_week (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,     -- ISO date of week start (Monday)
    week_end TEXT NOT NULL,
    featured_writing_id TEXT REFERENCES writings(id),
    reason TEXT,                  -- why they were chosen
    words_written INTEGER DEFAULT 0,
    writings_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(week_start)
);
CREATE TABLE IF NOT EXISTS writing_challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    prompt_text TEXT,
    constraint_type TEXT NOT NULL,  -- 'word_limit', 'keyword', 'theme', 'style', 'free'
    constraint_value TEXT,          -- JSON with constraint details
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    locale TEXT DEFAULT 'en',
    created_by TEXT REFERENCES "users_old"(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS writing_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES writing_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',   -- 'admin', 'member'
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
);
CREATE TABLE IF NOT EXISTS writing_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 10,
    is_private INTEGER DEFAULT 0,
    invite_code TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS writing_milestones (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "users_old"(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL,  -- 'words', 'writings', 'streak'
    milestone_value INTEGER NOT NULL,
    achieved_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, milestone_type, milestone_value)
);

-- column additions
ALTER TABLE books ADD COLUMN slug TEXT;
ALTER TABLE books ADD COLUMN published INTEGER DEFAULT 0;
ALTER TABLE bottles ADD COLUMN bottle_key TEXT DEFAULT '';
ALTER TABLE bottles ADD COLUMN opened_by TEXT DEFAULT NULL;
ALTER TABLE comments ADD COLUMN writing_id TEXT;
ALTER TABLE comments ADD COLUMN parent_id TEXT;
ALTER TABLE comments ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE comments ADD COLUMN is_featured INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN updated_at TEXT;
ALTER TABLE profiles ADD COLUMN show_in_scoreboard INTEGER DEFAULT 1;
ALTER TABLE profiles ADD COLUMN show_email INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE subscribers ADD COLUMN locale TEXT DEFAULT 'en';
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN elevenlabs_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN cf_api_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN cf_account_id TEXT;
ALTER TABLE users ADD COLUMN hf_api_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN deepinfra_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN booty_keywords_opt_in INTEGER DEFAULT 0;

-- indexes
CREATE INDEX IF NOT EXISTS idx_agora_guesses_round ON agora_game_guesses(round_id);
CREATE INDEX IF NOT EXISTS idx_agora_guesses_user ON agora_game_guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_bottle ON bottle_positions(bottle_id);
CREATE INDEX IF NOT EXISTS idx_bottles_user ON bottles(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_date_status ON bq_keyword_proposals(proposal_date, status);
CREATE INDEX IF NOT EXISTS idx_proposals_word ON bq_keyword_proposals(word);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON bq_marketplace(status);
CREATE INDEX IF NOT EXISTS idx_bq_trans_player ON bq_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_bq_trans_type ON bq_transactions(player_id, type);
CREATE INDEX IF NOT EXISTS idx_ownership_owner ON bq_writing_ownership(owner_player_id);
CREATE INDEX IF NOT EXISTS idx_ownership_writing ON bq_writing_ownership(writing_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_user ON challenge_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_writing ON comments(writing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_writing ON feedback_requests(writing_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_request ON feedback_responses(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_scenes_portal_variant
    ON portal_scenes(portal_id, variant);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_writer_week_start ON writer_of_the_week(week_start);
CREATE INDEX IF NOT EXISTS idx_writer_week_user ON writer_of_the_week(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON writing_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON writing_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON writing_milestones(user_id);
