-- Bottlequest schema alignment: staging was created from migrations that lack
-- the bq_* game tables (only bq_kraken/bq_aliens existed), so the keyword
-- deployment feature ("palabra clave en Bottle Booty") 500'd with
-- 'no such table: bq_keyword_proposals'. This file mirrors prod's
-- live bq_* definitions (2026-10-29) so fresh environments match.
-- Applied directly to staging; prod already had these.

CREATE TABLE IF NOT EXISTS bq_players (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT, port_id TEXT, lat REAL, lon REAL, team_id TEXT, created_at TEXT DEFAULT (datetime('now')), type TEXT DEFAULT 'human', points INTEGER DEFAULT 0, fuel INTEGER DEFAULT 0, solo INTEGER DEFAULT 1, paralyzed_until TEXT, checkin_fuel INTEGER DEFAULT 0, checkin_date TEXT, avatar_url TEXT, port_name TEXT, team_name TEXT, team_color TEXT, booty_points INTEGER DEFAULT 0, games TEXT DEFAULT 'booty', arbooty_points INTEGER DEFAULT 0, retreat_until TEXT, current_poi TEXT);

CREATE TABLE IF NOT EXISTS bq_ports (id TEXT PRIMARY KEY, name TEXT, lat REAL, lon REAL, region TEXT);

CREATE TABLE IF NOT EXISTS bq_teams (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT, motto TEXT, created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS bq_keywords (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), word TEXT NOT NULL, source_writing_id TEXT, found_by_player_id TEXT, points_value INTEGER DEFAULT 10, created_at TEXT DEFAULT (datetime('now')), is_hidden INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS bq_keyword_proposals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  player_id TEXT NOT NULL,
  word TEXT NOT NULL,
  proposal_date TEXT NOT NULL DEFAULT (date('now')),
  status TEXT DEFAULT 'pending',
  matched_writing_id TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
, match_count INTEGER DEFAULT 0, decay_rate REAL DEFAULT 0.5, source_writing_id TEXT);

CREATE TABLE IF NOT EXISTS bq_transfers (id TEXT PRIMARY KEY, from_player_id TEXT NOT NULL, to_player_id TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS bq_bank (
  id TEXT PRIMARY KEY DEFAULT 'the-bank',
  total_fees_collected INTEGER DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bq_market (
  id TEXT PRIMARY KEY DEFAULT 'daily',
  brent_price REAL DEFAULT 73.0,
  fed_rate REAL DEFAULT 5.25,
  cost_per_km REAL DEFAULT 0.73,
  brent_change REAL DEFAULT 0,
  fed_change REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bq_moves (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  from_lat REAL NOT NULL,
  from_lon REAL NOT NULL,
  to_lat REAL NOT NULL,
  to_lon REAL NOT NULL,
  distance_km REAL,
  fuel_cost INTEGER,
  speed TEXT DEFAULT 'sail',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bq_bets (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  bottle_id TEXT NOT NULL,
  bet_on_player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  odds REAL NOT NULL DEFAULT 1.0,
  status TEXT DEFAULT 'open',
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bq_checkins (
  player_id TEXT NOT NULL,
  checkin_date TEXT NOT NULL DEFAULT (date('now', '-6 hours')),
  fuel_awarded INTEGER NOT NULL DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now', '-6 hours')),
  PRIMARY KEY (player_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS bq_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  player_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  related_id TEXT,
  created_at TEXT DEFAULT (datetime('now', '-6 hours'))
);

CREATE TABLE IF NOT EXISTS bq_fuel_requests (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'open',
    fulfilled_by TEXT,
    fulfilled_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES bq_players(id)
);

CREATE TABLE IF NOT EXISTS bq_marketplace (
    id TEXT PRIMARY KEY,
    writing_id TEXT NOT NULL,
    seller_player_id TEXT NOT NULL,
    price INTEGER NOT NULL,
    listed_at TEXT DEFAULT (datetime('now')),
    sold_at TEXT,
    buyer_player_id TEXT,
    status TEXT DEFAULT 'listed',
    original_author_id TEXT,
    resale_count INTEGER DEFAULT 0,
    royalty_paid INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bq_writing_ownership (
    id TEXT PRIMARY KEY,
    writing_id TEXT NOT NULL,
    owner_player_id TEXT NOT NULL,
    acquired_at TEXT DEFAULT (datetime('now')),
    acquired_price INTEGER,
    acquired_from_player_id TEXT,
    is_original_author INTEGER DEFAULT 0,
    passive_fuel_earned INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bq_bean_inventory (
    player_id TEXT NOT NULL,
    bean_type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    PRIMARY KEY (player_id, bean_type),
    FOREIGN KEY (player_id) REFERENCES bq_players(id)
);

CREATE TABLE IF NOT EXISTS bq_booty_bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  personality TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  beans INTEGER DEFAULT 50,
  captured_bottles INTEGER DEFAULT 0,
  hijacked_by TEXT,
  hijacked_until TEXT,
  created_at TEXT DEFAULT (datetime('now'))
, avatar_url TEXT);

CREATE TABLE IF NOT EXISTS bq_kraken (
    id TEXT PRIMARY KEY DEFAULT 'kraken',
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    last_displacement TEXT DEFAULT (datetime('now')),
    attack_count INTEGER DEFAULT 0,
    last_attack_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bq_aliens (
    id TEXT PRIMARY KEY,
    faction TEXT NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    hp INTEGER DEFAULT 100,
    status TEXT DEFAULT 'active',  -- 'active' or 'defeated'
    respawn_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
