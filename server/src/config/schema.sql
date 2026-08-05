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

-- Player Profile: links a roster entry to an authenticated account (nullable —
-- not every roster player has logged in) and gives it a stable public-facing ID
-- so we never need to expose the internal serial `id` in URLs/APIs.
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS public_player_id VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
-- One player profile per user account, but many players can have no linked account yet.
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_user_id_unique ON players(user_id) WHERE user_id IS NOT NULL;

-- Self-service cricket identity fields (Player Dashboard/Profile). A player
-- created via self-service (no roster/scoring flow) starts with no role
-- until they complete their profile, so `role` can no longer be mandatory.
ALTER TABLE players ALTER COLUMN role DROP NOT NULL;
-- VARCHAR(20) was too narrow for 'WICKET_KEEPER_BATSMAN' (21 chars).
ALTER TABLE players ALTER COLUMN role TYPE VARCHAR(30);
ALTER TABLE players ADD COLUMN IF NOT EXISTS jersey_number SMALLINT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE players ADD COLUMN IF NOT EXISTS bio VARCHAR(280);

-- ============================================================================
-- PHASE 3 — Authoritative scoring domain (innings / deliveries / events)
-- ============================================================================

-- Match-level scoring configuration. NULL overs_per_innings = no limit (future
-- Test-style support). `rules` holds rarely-queried toggles (allowRetiredHurt,
-- allowSubstitutes, maxOversPerBowler, maxPlayers, ...) as JSONB so adding one
-- never requires a migration.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS overs_per_innings SMALLINT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS balls_per_over SMALLINT NOT NULL DEFAULT 6;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '{}';

-- A player's participation in one specific match. Deliveries/wickets/wagon-wheel
-- shots reference MatchPlayer.id (not players.id directly) so the database
-- structurally guarantees "every player referenced during scoring actually
-- belongs to this match."
CREATE TABLE IF NOT EXISTS match_players (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  is_playing_xi BOOLEAN NOT NULL DEFAULT true,
  is_captain BOOLEAN NOT NULL DEFAULT false,
  is_wicketkeeper BOOLEAN NOT NULL DEFAULT false,
  batting_order SMALLINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);

-- One innings of one match. Doubles as the derived-state read cache: runs/
-- wickets/legal_balls/striker/non_striker/bowler/is_free_hit_next are CACHE
-- columns, wholesale-overwritten by the replay engine after every delivery or
-- event — never written directly by a controller. `version` is the optimistic-
-- concurrency counter (bumped on every accepted write) and doubles as the
-- staleness marker Phase 5's AI layer will read.
CREATE TABLE IF NOT EXISTS innings (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_number SMALLINT NOT NULL,
  batting_team_id INTEGER NOT NULL REFERENCES teams(id),
  bowling_team_id INTEGER NOT NULL REFERENCES teams(id),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','live','paused','completed','declared','forfeited')),
  next_log_sequence INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- cache / read model (see comment above)
  runs INTEGER NOT NULL DEFAULT 0,
  wickets SMALLINT NOT NULL DEFAULT 0,
  legal_balls INTEGER NOT NULL DEFAULT 0,
  striker_match_player_id INTEGER REFERENCES match_players(id),
  non_striker_match_player_id INTEGER REFERENCES match_players(id),
  bowler_match_player_id INTEGER REFERENCES match_players(id),
  is_free_hit_next BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (match_id, innings_number)
);
CREATE INDEX IF NOT EXISTS idx_innings_match_id ON innings(match_id);

-- The authoritative, append-only ball-by-ball log. `id` is stable identity,
-- `log_sequence` is chronological order (shared numbering axis with
-- match_events — see below) — over.ball is NEVER identity, only a derived
-- display value.
--
-- AUTHORITATIVE INPUT: is_dead_ball, bat_runs, illegal_*, extra_*,
--   swap_striker_non_striker, bowler_match_player_id (see note below), voided.
-- DERIVED / CACHE (written only by the replay service): over_number,
--   ball_in_over, striker_match_player_id, non_striker_match_player_id,
--   is_legal_delivery, is_free_hit, total_runs.
--
-- Unlike striker/non-striker (mechanically inferable from run-parity replay),
-- who bowled a ball is a human decision with no run-outcome relationship, so
-- bowler_match_player_id is stamped as authoritative input at record time and
-- read BY replay (to compute bowling figures) rather than computed BY replay.
-- Correcting one delivery's bowler therefore never cascades to reassign other
-- overs — it was never derived from anything to begin with.
CREATE TABLE IF NOT EXISTS deliveries (
  id BIGSERIAL PRIMARY KEY,
  innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  log_sequence INTEGER NOT NULL,
  recorded_by_user_id INTEGER REFERENCES users(id),
  client_action_id UUID,

  is_dead_ball BOOLEAN NOT NULL DEFAULT false,
  bat_runs SMALLINT NOT NULL DEFAULT 0 CHECK (bat_runs BETWEEN 0 AND 6),
  illegal_type VARCHAR(10) CHECK (illegal_type IN ('wide','no-ball')),
  illegal_runs SMALLINT CHECK (illegal_runs IS NULL OR illegal_runs >= 1),
  extra_type VARCHAR(10) CHECK (extra_type IN ('bye','leg-bye')),
  extra_runs SMALLINT CHECK (extra_runs IS NULL OR extra_runs >= 0),
  swap_striker_non_striker BOOLEAN NOT NULL DEFAULT false,
  bowler_match_player_id INTEGER NOT NULL REFERENCES match_players(id),
  voided BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- derived / cache
  over_number SMALLINT,
  ball_in_over SMALLINT,
  striker_match_player_id INTEGER REFERENCES match_players(id),
  non_striker_match_player_id INTEGER REFERENCES match_players(id),
  is_legal_delivery BOOLEAN,
  is_free_hit BOOLEAN,
  total_runs SMALLINT,

  UNIQUE (innings_id, log_sequence)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_client_action
  ON deliveries(innings_id, client_action_id) WHERE client_action_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_striker ON deliveries(striker_match_player_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_bowler ON deliveries(bowler_match_player_id);

-- Every non-delivery match event, unified in one table and discriminated by
-- event_type — batsman-in, bowler-change, strike-swap, retire, penalty-runs,
-- catch-dropped, fielding-event, appeal, review, plus room for match-level
-- events (drinks-break, rain-delay, injury, match-paused/resumed). They share
-- identical shape (optional delivery linkage, JSONB payload, same chronological
-- axis as deliveries) — splitting into separate fielding/umpire/match tables
-- would just force every timeline read to UNION three tables for no benefit.
--
-- event_type is VARCHAR + CHECK rather than a Postgres ENUM so a new event kind
-- is a constraint update, not an ALTER TYPE migration. The canonical list lives
-- in server/src/domain/scoring/eventTypes.js — keep this CHECK in sync with it.
CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY,
  innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  delivery_id BIGINT REFERENCES deliveries(id) ON DELETE SET NULL,
  log_sequence INTEGER NOT NULL,
  client_action_id UUID,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'batsman-in','bowler-change','strike-swap','retire','penalty-runs',
    'catch-dropped','fielding-event','appeal','review',
    'drinks-break','rain-delay','injury','match-paused','match-resumed'
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  voided BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (innings_id, log_sequence)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_events_client_action
  ON match_events(innings_id, client_action_id) WHERE client_action_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_events_delivery_id ON match_events(delivery_id);

-- One wicket per delivery. dismissed_match_player_id is AUTHORITATIVE INPUT
-- only when dismissal_type = 'run-out' (the scorer must say which end was
-- dismissed — that can't be inferred from run-parity). For every other
-- dismissal type it is DERIVED/overwritten by replay (= the striker at fold
-- time), matching the existing client engine's behavior exactly.
CREATE TABLE IF NOT EXISTS wickets (
  id SERIAL PRIMARY KEY,
  delivery_id BIGINT NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
  dismissal_type VARCHAR(20) NOT NULL CHECK (dismissal_type IN (
    'bowled','caught','lbw','run-out','stumped','hit-wicket',
    'obstructing-field','hit-ball-twice','timed-out','retired-out'
  )),
  dismissed_match_player_id INTEGER NOT NULL REFERENCES match_players(id),
  fielder_match_player_id INTEGER REFERENCES match_players(id),
  secondary_fielder_match_player_id INTEGER REFERENCES match_players(id),
  is_direct_hit BOOLEAN,
  runs_completed SMALLINT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One wagon-wheel shot per delivery. No batsman_match_player_id column — the
-- batsman is always deliveries.striker_match_player_id for that delivery;
-- storing it again here would be exactly the kind of independently-driftable
-- duplicate fact the architecture is trying to avoid. Coordinates are
-- normalized to -1..1 (matches wagonWheel.model.js's resolveShot()), not 0..1.
CREATE TABLE IF NOT EXISTS wagon_wheel_shots (
  id SERIAL PRIMARY KEY,
  delivery_id BIGINT NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
  normalized_x NUMERIC(5,4) NOT NULL CHECK (normalized_x BETWEEN -1 AND 1),
  normalized_y NUMERIC(5,4) NOT NULL CHECK (normalized_y BETWEEN -1 AND 1),
  angle_degrees NUMERIC(6,2) NOT NULL CHECK (angle_degrees >= 0 AND angle_degrees < 360),
  region_id VARCHAR(20) NOT NULL,
  shot_type VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PHASE 4 — Historical score correction audit trail
-- ============================================================================

-- Immutable — rows are only ever INSERTed, never UPDATEd/DELETEd. Undoing a
-- correction creates a NEW row (before/after swapped, undoes_correction_id
-- set) rather than touching the original, so history is never rewritten.
-- target_id has no FK: it points at either deliveries.id or match_events.id
-- depending on target_type, and a polymorphic FK isn't expressible in
-- PostgreSQL without a trigger — application code resolves it, same pattern
-- match_events.event_type already uses for its own extensibility tradeoff.
CREATE TABLE IF NOT EXISTS score_corrections (
  id SERIAL PRIMARY KEY,
  innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('delivery', 'event')),
  target_id BIGINT NOT NULL,
  reason_code VARCHAR(30) NOT NULL CHECK (reason_code IN (
    'WRONG_RUNS', 'WRONG_EXTRA', 'WRONG_WICKET', 'WRONG_BATSMAN', 'WRONG_BOWLER',
    'WRONG_FIELDER', 'WRONG_SHOT', 'ACCIDENTAL_DELIVERY', 'MISSED_DELIVERY', 'UNDO', 'OTHER'
  )),
  note TEXT,
  before_data JSONB NOT NULL,
  after_data JSONB NOT NULL,
  source_version INTEGER NOT NULL,
  result_version INTEGER NOT NULL,
  corrected_by_user_id INTEGER NOT NULL REFERENCES users(id),
  client_action_id UUID,
  undoes_correction_id INTEGER REFERENCES score_corrections(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_score_corrections_innings ON score_corrections(innings_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_corrections_client_action
  ON score_corrections(innings_id, client_action_id) WHERE client_action_id IS NOT NULL;

-- ============================================================================
-- PHASE 5 — Real match creation + backend-authoritative scoring
-- ============================================================================

-- toss_winner_id already existed (Phase 1/2); toss_decision is the one
-- additive column Phase 5 needs so the server (not the client) can derive
-- which team bats first from the toss result.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS toss_decision VARCHAR(4) CHECK (toss_decision IN ('bat', 'bowl'));

-- ============================================================================
-- PHASE 6 — Match & innings lifecycle
-- ============================================================================

-- matches.status gains two more conventional values on top of the existing
-- upcoming/live/completed (no CHECK constraint existed before, so this is
-- additive by convention, not by migration): 'completed' now means the match
-- result is decided but still open to authorized review/correction;
-- 'finalized' means the official record is locked (see correction.service.js
-- — that lock moved from checking 'completed' to checking 'finalized').
--
-- `result` (existing TEXT column) already covers the human-readable summary
-- ("Warriors XI won by 4 wickets") — these add the STRUCTURED fields that
-- stay authoritative even if the text is regenerated later. No `target`
-- column: target is always innings-1's live (possibly corrected) score + 1,
-- computed on demand — never cached, so it can never go stale.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_team_id INTEGER REFERENCES teams(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_type VARCHAR(10) CHECK (result_type IN ('WICKETS', 'RUNS', 'TIE', 'NO_RESULT'));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_margin INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;

-- ============================================================================
-- PHASE 12 — Deterministic commentary projection
-- ============================================================================

-- A PROJECTION of authoritative cricket history, never a second truth (see
-- server/src/domain/commentary's module comment). Lives in PostgreSQL
-- alongside the deliveries/match_events it describes — not MongoDB — because
-- it is transactionally/referentially tied to one innings' log (FK cascade
-- on delivery/innings deletion, correction-time delete+regenerate as one
-- atomic replace), which a document store would not give for free. If
-- disagreement with the replay engine is ever found, this table is wrong and
-- gets regenerated (rebuildInningsCommentary) — deliveries/match_events are
-- never touched to make commentary match.
--
-- entry_key is a deterministic, content-derived identity (e.g. 'd:4821',
-- 'm:4821:fifty:17', 'oe:12:3', 'ie:12', 'ib:12', 'mr:9') — never an
-- auto-generated surrogate meaning — so the SAME logical event (replayed
-- identically after a correction or a retried request) always maps to the
-- same row instead of accumulating duplicates. `sequence` is assigned by
-- generateInningsCommentary's fold over the log (Part 7) — NEVER created_at —
-- so an historical correction that shifts what happens after the edited
-- point re-derives a fully consistent order, not a randomly-reordered feed.
CREATE TABLE IF NOT EXISTS commentary_entries (
  id BIGSERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_id INTEGER NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  entry_key VARCHAR(80) NOT NULL,
  sequence INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'DELIVERY', 'WICKET', 'MILESTONE', 'OVER_END', 'INNINGS_END', 'INNINGS_BREAK', 'MATCH_RESULT', 'MATCH_EVENT'
  )),
  source_delivery_id BIGINT REFERENCES deliveries(id) ON DELETE CASCADE,
  source_event_id BIGINT REFERENCES match_events(id) ON DELETE CASCADE,
  over_number SMALLINT,
  ball_in_over SMALLINT,
  ball_label VARCHAR(10),
  text TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  score_runs INTEGER,
  score_wickets SMALLINT,
  -- The innings.version this entry was generated FROM — lets a client
  -- reconcile a paginated commentary response against the match:state it
  -- already has, and lets the realtime layer tell "append" from "resync"
  -- apart without inventing a second version counter (Part 32).
  innings_version INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (innings_id, entry_key)
);
CREATE INDEX IF NOT EXISTS idx_commentary_entries_innings_seq ON commentary_entries(innings_id, sequence);
CREATE INDEX IF NOT EXISTS idx_commentary_entries_match ON commentary_entries(match_id, sequence);

-- ============================================================================
-- PHASE 14 Part 1 — Player match availability / RSVP
-- ============================================================================

-- Eligibility is derived from players.team_id (the player belongs to one of
-- the match's two teams), NOT match_players — RSVP happens BEFORE the Playing
-- XI is chosen (Upcoming Match -> availability -> organizer picks XI), so
-- match_players rows typically don't exist yet when a player responds.
-- Informational only: nothing reads this table to auto-populate match_players.
CREATE TABLE IF NOT EXISTS match_availability (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AVAILABLE', 'NOT_AVAILABLE')),
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_match_availability_match_id ON match_availability(match_id);

-- ============================================================================
-- PHASE 14 Part 3 — Ground booking
-- ============================================================================

-- PostgreSQL chosen as the booking source of truth (not MongoDB): bookings
-- have relational references (users, and LOC matches for occupancy checks),
-- overlapping-time-range queries, and a hard concurrency requirement — the
-- exact shape PostgreSQL's transactional/constraint machinery is built for,
-- and MongoDB has no equivalent to a range exclusion constraint. Google
-- Calendar is sync-only, never queried for availability (see
-- googleCalendar.service.js).
--
-- btree_gist is required for the EXCLUDE constraint below to index a plain
-- scalar (start/end timestamps) alongside a range comparison.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- One table for both real customer bookings AND staff-created "block" rows
-- (booking_type). They share the same EXCLUDE constraint, so a staff block
-- and a customer booking mutually exclude each other for free — no separate
-- "is this range blocked by staff OR booked by a customer" merge query needed.
CREATE TABLE IF NOT EXISTS ground_bookings (
  id SERIAL PRIMARY KEY,
  public_booking_id VARCHAR(20) UNIQUE NOT NULL,
  booking_type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (booking_type IN ('CUSTOMER', 'STAFF_BLOCK')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(150) NOT NULL,
  contact_phone VARCHAR(30),
  contact_email VARCHAR(150),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  purpose VARCHAR(200),
  expected_players SMALLINT,
  notes VARCHAR(500),
  client_action_id UUID,
  google_calendar_event_id VARCHAR(200),
  google_sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (google_sync_status IN ('PENDING', 'SYNCED', 'FAILED', 'NOT_CONFIGURED')),
  created_by_staff_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT ground_bookings_end_after_start CHECK (end_time > start_time),
  -- THE non-negotiable concurrency guarantee (Phase 14 Part 3): two
  -- transactions concurrently inserting overlapping [start_time, end_time)
  -- ranges with status='CONFIRMED' cannot both commit — Postgres enforces
  -- this at the index level, independent of any application-level check or
  -- row lock. The loser gets a 23P01 exclusion-violation error, translated to
  -- HTTP 409 BOOKING_CONFLICT by groundBooking.service.js. CANCELLED rows are
  -- excluded from the constraint (the WHERE clause) so a cancelled booking's
  -- time range becomes bookable again.
  CONSTRAINT ground_bookings_no_overlap EXCLUDE USING gist (
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status = 'CONFIRMED')
);
CREATE INDEX IF NOT EXISTS idx_ground_bookings_start_time ON ground_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_ground_bookings_user_id ON ground_bookings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ground_bookings_client_action_id ON ground_bookings(client_action_id) WHERE client_action_id IS NOT NULL;
