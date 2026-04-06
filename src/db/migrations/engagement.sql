-- Engagement & Gamification Schema
-- Run: npx wrangler d1 execute patrouch-ca-book-app --remote --file=schema-engagement.sql

-- ── Badges & Achievements ──
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

CREATE TABLE IF NOT EXISTS user_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TEXT DEFAULT (datetime('now')),
    context TEXT,                 -- JSON with unlock context
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- ── Writer of the Week ──
CREATE TABLE IF NOT EXISTS writer_of_the_week (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,     -- ISO date of week start (Monday)
    week_end TEXT NOT NULL,
    featured_writing_id TEXT REFERENCES writings(id),
    reason TEXT,                  -- why they were chosen
    words_written INTEGER DEFAULT 0,
    writings_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(week_start)
);

CREATE INDEX IF NOT EXISTS idx_writer_week_user ON writer_of_the_week(user_id);
CREATE INDEX IF NOT EXISTS idx_writer_week_start ON writer_of_the_week(week_start);

-- ── Writing Challenges ──
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
    created_by TEXT REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_entries (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL REFERENCES writing_challenges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    writing_id TEXT REFERENCES writings(id),
    submitted_at TEXT DEFAULT (datetime('now')),
    votes INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_user ON challenge_entries(user_id);

-- ── Writing Groups / Circles ──
CREATE TABLE IF NOT EXISTS writing_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 10,
    is_private INTEGER DEFAULT 0,
    invite_code TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS writing_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES writing_groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',   -- 'admin', 'member'
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON writing_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON writing_group_members(user_id);

-- ── Peer Reviews / Feedback ──
CREATE TABLE IF NOT EXISTS feedback_requests (
    id TEXT PRIMARY KEY,
    writing_id TEXT NOT NULL REFERENCES writings(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type TEXT DEFAULT 'general',  -- 'general', 'grammar', 'style', 'structure'
    specific_questions TEXT,               -- JSON with specific questions
    is_open INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback_responses (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
    responder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    helpful_votes INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_writing ON feedback_requests(writing_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_request ON feedback_responses(request_id);

-- ── Agora Game Rounds & Leaderboard ──
CREATE TABLE IF NOT EXISTS agora_game_rounds (
    id TEXT PRIMARY KEY,
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    writings_json TEXT,           -- JSON of writings used in round
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS agora_game_guesses (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES agora_game_rounds(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    writing_id TEXT NOT NULL,
    guess TEXT NOT NULL,          -- 'ai' or 'human'
    was_correct INTEGER DEFAULT 0,
    guessed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agora_guesses_round ON agora_game_guesses(round_id);
CREATE INDEX IF NOT EXISTS idx_agora_guesses_user ON agora_game_guesses(user_id);

-- ── Writing Milestones ──
CREATE TABLE IF NOT EXISTS writing_milestones (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL,  -- 'words', 'writings', 'streak'
    milestone_value INTEGER NOT NULL,
    achieved_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, milestone_type, milestone_value)
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON writing_milestones(user_id);

-- ── Seed Default Badges ──
INSERT OR IGNORE INTO badges (id, slug, name, description, icon, category, rarity, criteria) VALUES
    ('badge_001', 'first-writing', 'First Words', 'Published your first writing', '✍️', 'milestone', 'common', '{"type":"writings_count","value":1}'),
    ('badge_002', 'seven-day-streak', 'Week Warrior', 'Maintained a 7-day writing streak', '🔥', 'streak', 'uncommon', '{"type":"streak","value":7}'),
    ('badge_003', 'thirty-day-streak', 'Monthly Muse', 'Maintained a 30-day writing streak', '🔥', 'streak', 'rare', '{"type":"streak","value":30}'),
    ('badge_004', 'hundred-day-streak', 'Century Scribe', 'Maintained a 100-day writing streak', '🔥', 'legendary', '{"type":"streak","value":100}'),
    ('badge_005', '1k-words', 'Word Smith', 'Wrote 1,000 total words', '📝', 'words', 'common', '{"type":"total_words","value":1000}'),
    ('badge_006', '10k-words', 'Novella Starter', 'Wrote 10,000 total words', '📝', 'words', 'uncommon', '{"type":"total_words","value":10000}'),
    ('badge_007', '50k-words', 'NaNoWriMo Spirit', 'Wrote 50,000 total words — in the spirit of NaNoWriMo', '📚', 'words', 'rare', '{"type":"total_words","value":50000}'),
    ('badge_008', '100k-words', 'Novelist', 'Wrote 100,000 total words', '📚', 'words', 'legendary', '{"type":"total_words","value":100000}'),
    ('badge_009', 'first-share', 'Community Voice', 'Shared your first writing in the Agora', '🌟', 'social', 'common', '{"type":"agora_share","value":1}'),
    ('badge_010', 'agora-detective', 'Agora Detective', 'Correctly identified 10 AI writings', '🔍', 'agora', 'uncommon', '{"type":"agora_correct","value":10}'),
    ('badge_011', 'agora-master', 'Agora Master', 'Achieved 90%+ accuracy in an Agora game', '🏆', 'agora', 'rare', '{"type":"agora_accuracy","value":90}'),
    ('badge_012', 'challenge-entered', 'Challenge Seeker', 'Entered your first writing challenge', '🎯', 'challenge', 'common', '{"type":"challenge_entries","value":1}'),
    ('badge_013', 'ten-writings', 'Prolific Pen', 'Published 10 writings', '🖊️', 'milestone', 'uncommon', '{"type":"writings_count","value":10}'),
    ('badge_014', 'fifty-writings', 'Half Century', 'Published 50 writings', '🖊️', 'milestone', 'rare', '{"type":"writings_count","value":50}'),
    ('badge_015', 'feedback-giver', 'Helpful Reader', 'Gave feedback on 5 writings', '💬', 'social', 'uncommon', '{"type":"feedback_given","value":5}'),
    ('badge_016', 'writer-of-week', 'Writer of the Week', 'Featured as Writer of the Week', '⭐', 'milestone', 'legendary', '{"type":"writer_of_week","value":1}'),
    ('badge_017', 'group-founder', 'Circle Leader', 'Created your first writing group', '👥', 'social', 'uncommon', '{"type":"group_created","value":1}'),
    ('badge_018', 'trilingual', 'Polyglot Writer', 'Wrote in all 3 languages', '🌍', 'milestone', 'rare', '{"type":"languages_used","value":3}');
