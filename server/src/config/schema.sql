CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- role: 'user' (not chosen yet) | 'player' | 'staff'
ALTER TABLE users ADD COLUMN IF NOT EXISTS player_type VARCHAR(20);
-- player_type: NULL | 'team_player' | 'umpire' (only meaningful when role = 'player')

CREATE TABLE IF NOT EXISTS umpire_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMP,
  decided_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  batting_style VARCHAR(30),
  bowling_style VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ground_photos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150),
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS amenities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertisements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150),
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  team_a_id INTEGER NOT NULL REFERENCES teams(id),
  team_b_id INTEGER NOT NULL REFERENCES teams(id),
  venue VARCHAR(150),
  match_date TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  toss_winner_id INTEGER REFERENCES teams(id),
  result TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_runs INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_wickets INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_overs NUMERIC(4,1);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_runs INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_wickets INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_overs NUMERIC(4,1);
