-- Cloudflare D1 SQLite Schema for badminton-tournament-maker-v2

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'upcoming',
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS predefined_rosters (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tournaments_stage ON tournaments(current_stage);
CREATE INDEX IF NOT EXISTS idx_tournaments_created ON tournaments(created_at DESC);
