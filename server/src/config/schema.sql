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

-- ============================================================================
-- PHASE 15 — Tournament Management
-- ============================================================================
--
-- Tournament logic sits ABOVE the existing match system: a tournament_fixture
-- links to at most one real `matches` row (UNIQUE(match_id) below), and that
-- match is scored/replayed/finalized through the existing, unmodified
-- scoring/replay/correction/finalize pipeline. Nothing here duplicates score
-- state, result derivation, or player statistics — see
-- docs/ARCHITECTURE.md's Phase 15 section.
--
-- No tournament_standings/tournament_groups tables (audited first): standings
-- (points/NRR) are cheap to derive on every read from fixtures+matches+innings
-- — the same "replay, never accumulate" principle career stats/leaderboards
-- already use (README principle #1) — and V1's group format is fixed at
-- exactly two groups, so `group_name` is just a column, not a registry table.

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  public_tournament_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  format VARCHAR(20) NOT NULL CHECK (format IN ('LEAGUE', 'GROUPS_KNOCKOUT', 'KNOCKOUT')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REGISTRATION', 'SCHEDULED', 'LIVE', 'COMPLETED')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  overs_per_innings SMALLINT NOT NULL CHECK (overs_per_innings > 0),
  balls_per_over SMALLINT NOT NULL DEFAULT 6 CHECK (balls_per_over > 0),
  max_teams SMALLINT NOT NULL CHECK (max_teams >= 2),
  max_squad_size SMALLINT NOT NULL DEFAULT 15 CHECK (max_squad_size >= 2),
  champion_team_id INTEGER REFERENCES teams(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT tournaments_end_after_start CHECK (end_date >= start_date)
);

-- References an EXISTING team (never a tournament-private copy). group_name
-- ('A'/'B') is only meaningful for format = 'GROUPS_KNOCKOUT'.
CREATE TABLE IF NOT EXISTS tournament_teams (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  group_name VARCHAR(1) CHECK (group_name IN ('A', 'B')),
  registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);

-- Historical squad snapshot — mirrors match_players' documented principle
-- (schema.sql Phase 3 comment): a later players.team_id transfer must never
-- rewrite which team a player represented in a tournament that already
-- happened. UNIQUE(tournament_id, player_id) — not (tournament_team_id,
-- player_id) — is what structurally guarantees a player can't represent two
-- different teams in the same tournament.
CREATE TABLE IF NOT EXISTS tournament_squad_players (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  tournament_team_id INTEGER NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id),
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_tournament_squad_players_team ON tournament_squad_players(tournament_team_id);

-- One row per competition fixture. `round`/`bracket_slot` drive deterministic
-- knockout pairing (slot i & i+1 feed the next round's slot ceil(i/2)/2) —
-- no self-referencing "source fixture" FK needed. `match_id` is set only once
-- an organizer schedules the fixture (creates the real LOC match via the
-- existing match.service.js) — UNTIL then the fixture has no date/venue of
-- its own (never a duplicate of matches.match_date). UNIQUE(match_id) keeps
-- one match mapped to at most one fixture; UNIQUE(tournament_id, stage,
-- bracket_slot) is the DB-level backstop against duplicate knockout-round
-- generation (GROUP/LEAGUE fixtures all have bracket_slot NULL, and multiple
-- NULLs never collide under a unique index, so round-robin rows are
-- unaffected by this constraint).
--
-- manual_result_winner_team_id: Part 35/36 — LOC has no authoritative
-- Super Over/tie-break engine, so a tied or no-result knockout match must
-- NEVER auto-advance a fabricated winner. This column is the explicit,
-- authorized, persisted override a staff member records after resolving a
-- tie off-app (e.g. a real Super Over bowled at the ground) — progression
-- only ever reads it, never invents it.
CREATE TABLE IF NOT EXISTS tournament_fixtures (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage VARCHAR(20) NOT NULL CHECK (stage IN ('LEAGUE', 'GROUP', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL')),
  group_name VARCHAR(1) CHECK (group_name IN ('A', 'B')),
  round SMALLINT NOT NULL DEFAULT 1,
  bracket_slot SMALLINT,
  fixture_number SMALLINT NOT NULL,
  team_a_id INTEGER NOT NULL REFERENCES teams(id),
  team_b_id INTEGER NOT NULL REFERENCES teams(id),
  match_id INTEGER REFERENCES matches(id),
  manual_result_winner_team_id INTEGER REFERENCES teams(id),
  manual_result_by INTEGER REFERENCES users(id),
  manual_result_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, fixture_number),
  UNIQUE (tournament_id, stage, bracket_slot),
  UNIQUE (match_id),
  CONSTRAINT tournament_fixtures_teams_differ CHECK (team_a_id <> team_b_id)
);
CREATE INDEX IF NOT EXISTS idx_tournament_fixtures_tournament ON tournament_fixtures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_fixtures_match ON tournament_fixtures(match_id);

-- ============================================================================
-- PHASE 18 — Ground Operations & Management
-- ============================================================================
--
-- "Ground Blocks" (maintenance, pitch work, private events, rain, emergency,
-- ...) are deliberately NOT a new table. `ground_bookings.booking_type =
-- 'STAFF_BLOCK'` (Phase 14 Part 3) already models exactly this — a row in the
-- SAME table, protected by the SAME `ground_bookings_no_overlap` EXCLUDE
-- constraint, already synced by the SAME Google Calendar code path. A second,
-- parallel table would mean a second concurrency mechanism (advisory locks,
-- cross-table overlap checks) to safely coordinate two tables representing
-- one physical ground's occupancy — solving a problem the existing schema
-- already solves for free. `block_type` only adds the richer, named taxonomy
-- Phase 18 needs (Feature 3/15) on top of the existing STAFF_BLOCK concept —
-- reuse, not redesign. It is intentionally nullable and CHECK-constrained
-- independently of `booking_type` (never required for a CUSTOMER row).
ALTER TABLE ground_bookings ADD COLUMN IF NOT EXISTS block_type VARCHAR(30)
  CHECK (block_type IN (
    'GRASS_MAINTENANCE', 'PITCH_MAINTENANCE', 'CLEANING', 'ELECTRICAL_WORK', 'WATER_MAINTENANCE',
    'PITCH_ROLLING', 'PITCH_WATERING', 'PRIVATE_EVENT', 'FESTIVAL', 'RAIN', 'EMERGENCY', 'OTHER'
  ));

-- Append-only, immutable audit trail (Feature 16) — mirrors score_corrections'
-- proven shape (schema.sql Phase 4): polymorphic target via a CHECK-
-- constrained `entity_type` + plain `entity_id` (no FK — resolved by
-- application code, same documented tradeoff match_events.event_type/
-- score_corrections.target_type already accept), full before/after JSONB
-- snapshots (never a diff), actor attribution, indexed for reverse-
-- chronological reads per entity. Rows are never UPDATEd/DELETEd.
CREATE TABLE IF NOT EXISTS ground_audit_log (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('BOOKING', 'BLOCK')),
  entity_id INTEGER NOT NULL,
  action VARCHAR(30) NOT NULL CHECK (action IN ('CREATED', 'CANCELLED', 'GOOGLE_SYNC')),
  -- SET NULL (not a plain REFERENCES, and never CASCADE): the audit trail
  -- must survive even if the actor's account is later deleted — same
  -- reasoning/convention as ground_bookings.user_id ON DELETE SET NULL above.
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ground_audit_log_entity ON ground_audit_log(entity_type, entity_id, created_at DESC);

-- Migration safety: the table may already exist (from an earlier `db:migrate`
-- run within this same phase) with the constraint's original plain
-- REFERENCES (no ON DELETE clause) — this idempotently upgrades it to SET
-- NULL without requiring a table drop.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ground_audit_log' AND constraint_name = 'ground_audit_log_actor_user_id_fkey'
  ) THEN
    ALTER TABLE ground_audit_log DROP CONSTRAINT ground_audit_log_actor_user_id_fkey;
    ALTER TABLE ground_audit_log ADD CONSTRAINT ground_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- In-app only (Feature 17 explicitly excludes email/SMS). One row per
-- addressed notification, read/unread tracked directly (no separate
-- read-receipt table — a single ground, modest booking volume, no need).
CREATE TABLE IF NOT EXISTS ground_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('BOOKING_APPROVED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'GROUND_CLOSED')),
  title VARCHAR(150) NOT NULL,
  body VARCHAR(500),
  related_booking_id INTEGER REFERENCES ground_bookings(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ground_notifications_user ON ground_notifications(user_id, created_at DESC);

-- ============================================================================
-- PHASE 20 — Super Admin Staff Dashboard: staff sub-roles
-- ============================================================================
--
-- `role = 'staff'` alone (existing since Phase 1) is too coarse for the new
-- Super Admin dashboard, which needs to distinguish super_admin/admin/
-- canteen_staff permission levels. Rather than repurposing `role` (checked
-- verbatim as `requireRole('staff')` across ~30 route files today — changing
-- its meaning would ripple everywhere), staff_role_id is a NEW, separate
-- qualifier column, exactly mirroring how `player_type` already qualifies
-- `role = 'player'` above.
CREATE TABLE IF NOT EXISTS staff_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL
);
INSERT INTO staff_roles (name) VALUES ('super_admin'), ('admin'), ('canteen_staff')
  ON CONFLICT (name) DO NOTHING;

-- Meaningful only when role = 'staff'. NULL for every non-staff user, and
-- NULL for any pre-existing staff row until explicitly assigned.
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role_id INTEGER REFERENCES staff_roles(id);

-- Human-facing reference/display ID shown on the Create Staff screen and
-- staff lists — NOT a login credential (login stays email + password,
-- unchanged). Unique at the DB level; duplicates are caught and translated
-- to a clean validation error in staff.controller.js.
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) UNIQUE;

-- ============================================================================
-- PHASE 10 (3D homepage project) — Ground media storage migrated to Cloudinary
-- ============================================================================
--
-- ground_photos/amenities/partners previously stored uploaded images on local
-- disk (server/uploads/*, via multer diskStorage) — lost on any redeploy to
-- an ephemeral filesystem. Storage moved to Cloudinary, mirroring the
-- existing, already-proven GalleryImage (MongoDB) pattern's exact rationale
-- for keeping the public_id: deleting/replacing an asset needs it, and
-- `image_url`/`logo_url` alone (the pre-existing column) isn't reliably
-- reversible into one. Nullable — a row created via the plain
-- add(name+imageUrl) JSON path (an externally-hosted URL, never uploaded
-- through this app) legitimately has no Cloudinary asset to delete.
ALTER TABLE ground_photos ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

-- ============================================================================
-- MongoDB cleanup, Phase 1 — GalleryImage migrated to PostgreSQL
-- ============================================================================
--
-- Direct relational translation of the retired MongoDB `GalleryImage`
-- collection (see server/src/models/galleryImageMongoLegacy.model.js, kept
-- only for the one-time migration script / rollback reference — no longer on
-- the live request path). Field-for-field identical shape to
-- ground_photos/amenities/partners above, which already proved this exact
-- Cloudinary-URL-plus-metadata pattern; the sub-document `image.{url,
-- publicId,width,height,format,bytes}` simply flattens to columns.
CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  category VARCHAR(20) NOT NULL DEFAULT 'ground'
    CHECK (category IN ('ground','match','tournament','event')),
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  image_format VARCHAR(10),
  image_bytes INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Temporary migration metadata only — maps a migrated row back to the
  -- original MongoDB GalleryImage._id for auditability/idempotent re-runs
  -- during the burn-in period. NULL for any row created directly in
  -- PostgreSQL after this migration (never required). Never exposed through
  -- the public API (see galleryImage.service.js#toPublicShape). Safe to drop
  -- in a later cleanup phase once production is verified.
  legacy_mongo_id TEXT
);

-- The one real query pattern this table serves (same rationale as the
-- retired Mongo index it replaces): "active images in a category, in
-- display order" — public gallery reads + the homepage carousel.
CREATE INDEX IF NOT EXISTS idx_gallery_images_category_active_order
  ON gallery_images(category, is_active, sort_order);

-- Lets the migration script upsert by legacy_mongo_id (ON CONFLICT) so
-- re-running it after a partial failure never creates duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_images_legacy_mongo_id
  ON gallery_images(legacy_mongo_id) WHERE legacy_mongo_id IS NOT NULL;

-- ============================================================================
-- MongoDB cleanup, Phase 2 — AiInsight migrated to PostgreSQL
-- ============================================================================
--
-- Direct relational translation of the retired MongoDB `AiInsight` cache
-- collection (see server/src/models/aiInsightMongoLegacy.model.js, kept only
-- for the one-time migration script / rollback reference — no longer on the
-- live request path). This is still purely a CACHE, never a second source of
-- cricket truth (README principle #4/#9, ARCHITECTURE.md §16.5) — colocating
-- it in PostgreSQL doesn't change that, it only changes which database holds
-- the cache. Deleting every row here loses nothing authoritative; the next
-- read simply regenerates it from PostgreSQL's own cricket data.
--
-- `source_id` is intentionally VARCHAR, not an INTEGER FK: it's a
-- polymorphic reference (a `matches.id` when source_type='MATCH', a
-- `teams.id` when 'TEAM', but a `players.public_player_id` — already a
-- VARCHAR, not `players.id` — when 'PLAYER'), so a single-column FK to three
-- differently-shaped targets isn't expressible. Same documented tradeoff
-- `score_corrections.target_id`/`ground_audit_log.entity_id` already accept
-- above — resolved by application code, not a trigger.
--
-- `payload` stays JSONB deliberately, not because Mongo happened to store it
-- as a nested document: it's genuinely variable-shaped, schema-validated
-- AI-generated content (a different shape per source_type — see
-- ai/schemas/matchInsightSchema.js vs personInsightSchema.js), never
-- filtered/queried by its internal fields anywhere in this app — the exact
-- same reasoning `matches.rules` and `match_events.payload` already use.
CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('MATCH', 'PLAYER', 'TEAM')),
  source_id VARCHAR(30) NOT NULL,
  -- sha256 hex digest (see domain/ai/computeSourceFingerprint.js) — always
  -- exactly 64 hex characters, never guessed-at width.
  source_fingerprint VARCHAR(64) NOT NULL,
  provider VARCHAR(30) NOT NULL,
  model VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Temporary migration metadata only — see gallery_images.legacy_mongo_id's
  -- comment above for the exact rationale, identical here.
  legacy_mongo_id TEXT,
  -- The actual caching key (mirrors the retired Mongo collection's unique
  -- compound index exactly): at most one cached insight per entity at a
  -- time — a regeneration overwrites this row in place, it never creates
  -- history/versioning. Every live read/write goes through THIS constraint
  -- (ON CONFLICT (source_type, source_id)), not legacy_mongo_id.
  UNIQUE (source_type, source_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_insights_legacy_mongo_id
  ON ai_insights(legacy_mongo_id) WHERE legacy_mongo_id IS NOT NULL;

-- ============================================================================
-- MongoDB cleanup, Phase 3 — MenuItem migrated to PostgreSQL
-- ============================================================================
--
-- Direct relational translation of the retired MongoDB `MenuItem` collection
-- (see server/src/models/canteenMenuItemMongoLegacy.model.js, kept only for
-- the one-time migration script / rollback reference — no longer on the
-- live request path). No existing PostgreSQL table could be reused for
-- this — audited first (no canteen/menu table exists anywhere in this
-- schema) — so this is a genuinely new table, not a duplicate of one.
--
-- `price` is NUMERIC, never FLOAT/REAL/DOUBLE: this is real currency (INR),
-- and floating point cannot represent money exactly — the same reasoning
-- every other money-shaped value in a well-modeled schema follows, even
-- though no other LOC table happens to store a price today.
--
-- Deliberately NO `ground_id`/`canteen_id` column: audited first (Step 6)
-- — the retired Mongoose schema had no such field, and this app manages
-- exactly one physical ground/canteen today (see ARCHITECTURE.md §18.1's
-- same "no ground_id anywhere" statement for ground_bookings). A future,
-- dedicated multi-ground phase will need to add `canteen_id` here (and to
-- `TodayMenu`/`Order` once THEY migrate) — intentionally not pre-built now,
-- consistent with this project's own "audit-first, no speculative columns"
-- discipline.
--
-- TodayMenu and Order remain on MongoDB this phase (unchanged, per strict
-- scope) and continue to reference a menu item by whatever string `id` this
-- table hands back (Mongoose's `TodayMenu.items[].id` / `Order.items[].id`/
-- `.foodId` are plain, unconstrained String fields — never a real Mongo
-- ObjectId ref — so a Postgres integer-as-string slots in with zero schema
-- friction on the Mongo side). One real, documented consequence: currently
-- PUBLISHED `TodayMenu` entries reference the OLD Mongo ObjectId string, so
-- after this migration they will not match any *new* Postgres-backed
-- `menu_items.id` until staff republish today's menu — see the Phase 3
-- report's "Order relationship compatibility analysis" section.
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  price NUMERIC(8,2) NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  cloudinary_public_id TEXT NOT NULL DEFAULT '',
  default_stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Temporary migration metadata only — see gallery_images.legacy_mongo_id's
  -- comment for the exact rationale, identical here. Also doubles as the
  -- breadcrumb a future Order-migration phase needs: a historical Order's
  -- `items[].foodId` (a MongoDB ObjectId string) can be resolved back to
  -- this row via `legacy_mongo_id`, even though Order itself doesn't
  -- migrate in this phase.
  legacy_mongo_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_legacy_mongo_id
  ON menu_items(legacy_mongo_id) WHERE legacy_mongo_id IS NOT NULL;

-- ============================================================================
-- MongoDB cleanup, Phase 4 — TodayMenu migrated to PostgreSQL
-- ============================================================================
--
-- Direct relational translation of the retired MongoDB `TodayMenu` singleton
-- document (see server/src/models/canteenTodayMenuMongoLegacy.model.js, kept
-- only for the one-time migration script / rollback reference). Two tables,
-- not one JSONB blob: `items[]` in Mongo already had a fixed, fully-typed
-- shape (id/available/stock/dailyPrice) referencing another collection by
-- id — exactly the relational shape `menu_items`'s own Cloudinary+Postgres
-- siblings already use, and exactly what a real `menu_item_id` foreign key
-- (Step 5's explicit ask) requires child ROWS for, not a nested document.
--
-- `today_menu` is a practical singleton — the retired code always operated
-- on "the one document" via `findOne({})` with no filter, never a real
-- uniqueness constraint. Application code preserves that exact convention
-- (always the lowest/only id), so no artificial `CHECK (id = 1)` is added
-- for a constraint the app never actually needed enforced at the DB level.
CREATE TABLE IF NOT EXISTS today_menu (
  id SERIAL PRIMARY KEY,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Temporary migration metadata only — see gallery_images.legacy_mongo_id's
  -- comment for the exact rationale, identical here.
  legacy_mongo_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_today_menu_legacy_mongo_id
  ON today_menu(legacy_mongo_id) WHERE legacy_mongo_id IS NOT NULL;

-- One row per published item. A REAL foreign key to menu_items (Step 5) —
-- unlike the retired Mongo array, which could (and, prior to Phase 3A,
-- silently did) hold an item id with no matching MenuItem, invisible only
-- at READ time via a JS `.filter(Boolean)`. That's no longer representable
-- here on purpose: `updateTodaysMenu`'s write path now resolves/validates
-- ids BEFORE insert, so an unresolvable id is simply never written, instead
-- of being written and then silently ignored later. Zero observable API
-- difference (an unresolvable id was already invisible through every read
-- endpoint before) — see the Phase 4 report's "Replacement semantics"
-- section for the full reasoning.
--
-- `UNIQUE(today_menu_id, menu_item_id)`: the retired code's own read path
-- (`Object.fromEntries(items.map(i => [i.id, i]))`) already collapsed
-- duplicate ids in one publish to "last one wins" — this constraint plus a
-- write-side dedup (same rule, keep the last occurrence) makes that
-- pre-existing, already-observable behavior a real guarantee instead of an
-- accident of `Object.fromEntries` key ordering.
--
-- `sort_order`: publish order is observably meaningful (both the staff
-- dashboard's today's-items list and the public menu render in the order
-- the API returns) — preserved explicitly rather than relying on insertion
-- order, which SQL never guarantees on its own.
CREATE TABLE IF NOT EXISTS today_menu_items (
  id SERIAL PRIMARY KEY,
  today_menu_id INTEGER NOT NULL REFERENCES today_menu(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  available BOOLEAN NOT NULL DEFAULT false,
  stock INTEGER NOT NULL DEFAULT 0,
  daily_price NUMERIC(8,2) NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (today_menu_id, menu_item_id)
);
-- today_menu_id: every read (listMenu/getTodaysMenuConfig) fetches "this
-- publish's items, in order" — the one real query pattern this table serves.
CREATE INDEX IF NOT EXISTS idx_today_menu_items_today_menu_id ON today_menu_items(today_menu_id, sort_order);
-- menu_item_id: backs deleteMenuItem's existing cross-table cleanup (remove
-- this item's entry from today's published menu), now a real indexed
-- lookup instead of an in-memory JS array filter.
CREATE INDEX IF NOT EXISTS idx_today_menu_items_menu_item_id ON today_menu_items(menu_item_id);

-- ============================================================================
-- MongoDB cleanup, Phase 5 (final feature) — Order migrated to PostgreSQL
-- ============================================================================
--
-- Direct relational translation of the retired MongoDB `Order` collection
-- (see server/src/models/canteenOrderMongoLegacy.model.js, kept only for
-- the one-time migration script / rollback reference). The real identity
-- on an order is `user_id` (an integer FK to `users` — `req.user.id` from
-- the JWT), NOT a mobile number; the retired schema never had a mobile
-- number field. There is also no separate `cancelled_at` — the retired
-- code stamps the SAME `completedAt` field for both 'Completed' and
-- 'Cancelled' (any FINISHED_STATUSES transition), never a second column —
-- preserved exactly as `completed_at`, not split into two.
--
-- `public_order_id` reuses the EXACT SAME `generatePublicId()` utility
-- already used for `ground_bookings.public_booking_id` and
-- `tournaments.public_tournament_id` (utils/publicId.js) — the retired
-- Mongo-backed API exposed the raw Mongo `_id` hex string as `order.id`;
-- exposing PostgreSQL's sequential integer PK the same way would leak
-- internal row counts, so this app's own established pattern is reused
-- instead of inventing a new one.
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  public_order_id VARCHAR(20) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  customer_name VARCHAR(150) NOT NULL DEFAULT '',
  seat_id VARCHAR(50) NOT NULL DEFAULT 'unknown',
  total NUMERIC(10,2) NOT NULL,
  -- The exact 6 values PRESET_STATUS already enforces for every new write
  -- in the retired code (canteenOrder.controller.js) — legacy display-only
  -- names ('Order Placed'/'Prepared'/'Ready for Pickup') are normalized via
  -- LEGACY_STATUS_MAP at migration/write time, never stored verbatim (see
  -- the migration script) — matching how normalizeOrder() already
  -- transparently displays them as their current equivalents today.
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN (
    'Pending', 'Accepted', 'Preparing', 'Ready', 'Completed', 'Cancelled'
  )),
  -- Direct translation of the retired Mongo `hasActiveOrderFlag` field:
  -- NULL (not false) while inactive, so the partial unique index below only
  -- ever applies to genuinely active orders — an UPDATE to a terminal
  -- status must explicitly SET this NULL, mirroring the retired code's
  -- explicit Mongo `$unset` (its own comment there: "Mongoose does not
  -- reliably translate doc.field = undefined into a real $unset on save()").
  has_active_order_flag BOOLEAN,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legacy_mongo_id TEXT
);

-- THE concurrency guarantee (Step 11/12) — direct translation of the proven
-- MongoDB partial unique index `{userId, hasActiveOrderFlag}`. Two
-- transactions concurrently inserting an active order for the same user_id
-- cannot both commit; the loser gets a 23505 unique-violation error,
-- translated to the same HTTP 409 the Mongo E11000 path already produced.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_one_active_per_user
  ON orders(user_id) WHERE has_active_order_flag = true;
-- order history / active-order lookup: "this user's orders, newest first"
-- (getOrderHistory, lookupOrderByUser) and "this user's active order"
-- (getActiveOrder) are both this exact shape.
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id, ordered_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_legacy_mongo_id
  ON orders(legacy_mongo_id) WHERE legacy_mongo_id IS NOT NULL;
-- No separate index needed for public_order_id — the column's own
-- `UNIQUE NOT NULL` constraint already creates one automatically.

-- One row per ordered line item. `raw_item_id` is the AUTHORITATIVE,
-- always-present identifier — exactly mirroring the retired schema's own
-- `items[].id`/`.foodId` (plain, unconstrained Mongoose Strings, always
-- kept equal to each other by normalizeItems()), because Order's own
-- business rule (proven in Phase 3's test suite) is that it NEVER validates
-- an item id against MenuItem, at creation or afterward — a fabricated id
-- must remain fully representable. `menu_item_id` is a best-effort,
-- OPTIONAL resolution of that same string against a real menu_items row
-- (nullable — Step 15: historical orders must stay readable even if their
-- MenuItem was later deleted, or never existed at all), useful only for
-- analytics/future joins, never for display: `item_name`/`unit_price` are
-- the permanent, authoritative snapshot and are NEVER re-derived from
-- menu_items, even if the live price changes.
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
  raw_item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(8,2) NOT NULL,
  quantity SMALLINT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================================
-- Phase 8 — Ground + Canteen foundation (multi-ground architecture, Part 1)
-- ============================================================================
--
-- Per the Phase 7 audit: introduces the two anchor tables the whole
-- multi-ground design (§7-9 of that audit) hangs off — `grounds` as the
-- primary tenancy boundary, `canteens` as the intermediate parent for the
-- existing menu_items/today_menu/orders tables (still ungrounded this
-- phase — deliberately out of scope, see the Phase 8 report). No other
-- table gains a ground_id/canteen_id column yet.
--
-- `latitude`/`longitude` are plain NUMERIC, not PostGIS `geography` as
-- Phase 7 recommended for the *ground-creation* moment: audited first, this
-- Postgres host has no PostGIS extension available at all
-- (`pg_available_extensions` has no `postgis` row) — not a "not yet
-- installed," a hard environment constraint. Migrating a lat/lng pair to a
-- geography column later is a small, self-contained change; blocking this
-- phase on an extension this host cannot install would not be.
--
-- `status` defaults to 'DRAFT' at the schema level (a new ground, from a
-- future onboarding flow, shouldn't appear live before review) — the one
-- real ground this phase seeds is explicitly set to 'ACTIVE' at seed time,
-- not by relying on this default.
CREATE TABLE IF NOT EXISTS grounds (
  id SERIAL PRIMARY KEY,
  public_ground_id VARCHAR(20) UNIQUE NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  address_line VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  postal_code VARCHAR(20),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  phone VARCHAR(30),
  email VARCHAR(150),
  website TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A ground may have more than one canteen (Phase 7 §9's stated reason for
-- this table existing at all, instead of a flat `canteen_id`-free design) —
-- deliberately no UNIQUE(ground_id) here.
CREATE TABLE IF NOT EXISTS canteens (
  id SERIAL PRIMARY KEY,
  ground_id INTEGER NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  public_canteen_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL DEFAULT 'Main Canteen',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canteens_ground_id ON canteens(ground_id);

-- Phase 9 — ground-scoped authorization. A user's GLOBAL role (users.role /
-- staff_role_id, unchanged) says what kind of account they have; a row here
-- says what they're allowed to do AT A SPECIFIC GROUND. SUPER_ADMIN is
-- deliberately NOT a value here — it stays the existing platform-wide
-- staff_role_id=1 concept (Phase 7 §14/Step 14) and bypasses this table
-- entirely in the authorization middleware, so a Super Admin is never forced
-- to hold a membership row per ground.
--
-- Role is a plain CHECK-constrained VARCHAR, not a role_id FK into
-- staff_roles: staff_roles is the GLOBAL staff sub-role lookup (super_admin/
-- admin/canteen_staff, referenced by users.staff_role_id) and is a different
-- concept from a ground-scoped role — reusing it would let a ground
-- membership row claim 'super_admin', contradicting Step 14. A plain CHECK
-- mirrors the existing grounds.status convention (this file, above) instead
-- of introducing a second lookup-table pattern for what is still a small,
-- fixed enum.
--
-- One row per (user, ground, role) — not one row per (user, ground) — so a
-- single user can hold multiple roles at the same ground (e.g. OWNER and
-- CANTEEN_STAFF) without a separate permissions/many-role structure.
-- UNIQUE(user_id, ground_id, role) is the constraint that makes that legal
-- while still rejecting an exact duplicate grant.
--
-- Revocation is is_active=false, never a DELETE — a past grant is
-- authorization history, not disposable business data (Step 6/Step 7).
-- ON DELETE CASCADE from users/grounds only removes the membership ROW
-- itself if the user or ground is hard-deleted; it never reaches into any
-- other table (orders, menu_items, etc. don't reference ground_users at
-- all), so it cannot silently erase business data.
CREATE TABLE IF NOT EXISTS ground_users (
  id SERIAL PRIMARY KEY,
  ground_id INTEGER NOT NULL REFERENCES grounds(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('GROUND_OWNER', 'GROUND_ADMIN', 'CANTEEN_STAFF', 'UMPIRE', 'SCORER')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ground_id, role)
);
-- ============================================================================
-- Phase 10 — canteen data tenancy (menu_items/today_menu/orders)
-- ============================================================================
--
-- Ownership chain per Step 2: each table gets its OWN canteen_id, not a
-- ground_id — canteens.ground_id (above) already establishes
-- resource -> canteen -> ground, so a parallel ground_id here would be
-- denormalized state that could drift from canteen_id's own ground.
-- order_items deliberately does NOT get canteen_id (Step 6): its ownership
-- chain is order_item -> order -> canteen, avoiding a third redundant
-- tenancy column on the highest-row-count table in the schema.
--
-- Columns are added nullable, backfilled, THEN set NOT NULL in the same
-- statement batch (migrate.js applies this whole file as one multi-statement
-- query, which Postgres runs as one implicit transaction — see the Phase 10
-- report's "Migration strategy" section) — safe to re-run: ADD COLUMN IF NOT
-- EXISTS/the backfill's WHERE canteen_id IS NULL/SET NOT NULL are all no-ops
-- once already applied.
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS canteen_id INTEGER REFERENCES canteens(id);
ALTER TABLE today_menu ADD COLUMN IF NOT EXISTS canteen_id INTEGER REFERENCES canteens(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS canteen_id INTEGER REFERENCES canteens(id);

-- Backfill: every pre-Phase-10 row belongs to the single canteen Phase 8
-- seeded — there is no other candidate canteen in this database, so this is
-- a confident assignment (Phase 10 report's Pre-Implementation Audit), not
-- an invented default. A future multi-canteen environment never reaches
-- this UPDATE again (WHERE canteen_id IS NULL matches nothing once
-- backfilled), so it can never mis-assign a genuinely new canteen's rows.
UPDATE menu_items SET canteen_id = (SELECT id FROM canteens ORDER BY id LIMIT 1) WHERE canteen_id IS NULL;
UPDATE today_menu SET canteen_id = (SELECT id FROM canteens ORDER BY id LIMIT 1) WHERE canteen_id IS NULL;
UPDATE orders SET canteen_id = (SELECT id FROM canteens ORDER BY id LIMIT 1) WHERE canteen_id IS NULL;

ALTER TABLE menu_items ALTER COLUMN canteen_id SET NOT NULL;
-- today_menu: one row PER CANTEEN now (was a global singleton pre-Phase-10,
-- "the" row found via ORDER BY id LIMIT 1 with no filter) — UNIQUE enforces
-- that a canteen can never accumulate two "today" rows, exactly preserving
-- the old singleton guarantee, just scoped per-tenant instead of globally.
ALTER TABLE today_menu ALTER COLUMN canteen_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN canteen_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_items_canteen_id ON menu_items(canteen_id);
-- CREATE UNIQUE INDEX (not a named ADD CONSTRAINT — Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS", which would break this file's established
-- re-run-safe idempotency) doubling as the exact index "today_menu WHERE
-- canteen_id = ?" needs — no separate plain index required.
CREATE UNIQUE INDEX IF NOT EXISTS idx_today_menu_canteen_id ON today_menu(canteen_id);

-- Step 12 — the active-order guarantee moves from GLOBAL-per-user to
-- PER-CANTEEN-per-user: the same person may hold one active order at Ground
-- A's canteen AND a separate active order at Ground B's canteen
-- simultaneously, but never two active orders at the SAME canteen. Replaces
-- (not narrows past correctness of) the Phase 5 global partial unique index.
DROP INDEX IF EXISTS idx_orders_one_active_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_one_active_per_canteen_user
  ON orders(canteen_id, user_id) WHERE has_active_order_flag = true;
-- Step 10/11 — order history ("this user's orders at this canteen, newest
-- first") and active-order lookup pre-checks are both this exact shape;
-- (canteen_id, user_id) as leading columns also serves a bare
-- "WHERE canteen_id = ?" staff order-list query via prefix match, so this
-- replaces (not supplements) the old global idx_orders_user_id — under the
-- new tenancy model "all of a user's orders regardless of canteen" is no
-- longer a real query pattern (Step 11 canteen-scopes order history).
DROP INDEX IF EXISTS idx_orders_user_id;
CREATE INDEX IF NOT EXISTS idx_orders_canteen_user ON orders(canteen_id, user_id, ordered_at DESC);

-- UNIQUE(user_id, ground_id, role) above already gives a btree index whose
-- leading columns (user_id) and leading pair (user_id, ground_id) cover the
-- two most common authorization checks ("this user, this ground" and "all of
-- this user's memberships") for free. The one query shape it can't serve —
-- "everyone active at this ground" (e.g. a future owner-dashboard staff
-- list), which filters on ground_id without user_id — needs its own index,
-- same reasoning as idx_canteens_ground_id above.
CREATE INDEX IF NOT EXISTS idx_ground_users_ground_id ON ground_users(ground_id);

-- ============================================================================
-- Phase 12 — ground discovery / public ground profile foundation
-- ============================================================================
--
-- ground_photos and amenities were global, ground-less tables (same
-- situation Phase 10 found for menu_items/today_menu/orders pre-tenancy).
-- The public ground profile (Step 14/15/16) requires an explicit ground
-- boundary on these queries — "never SELECT all photos" — so they get the
-- exact same nullable -> backfill -> NOT NULL treatment Phase 10 used for
-- canteen_id, backfilled to the single existing ground (the only candidate
-- in this database — a confident assignment, not an invented default,
-- verified via direct query before writing this migration).
--
-- gallery_images is deliberately NOT touched here — Phase 12's brief
-- explicitly forbids silently redesigning it this phase; it stays a global
-- table and is omitted (not guessed at) from the public ground profile
-- response until a future phase gives it a real ground relationship.
ALTER TABLE ground_photos ADD COLUMN IF NOT EXISTS ground_id INTEGER REFERENCES grounds(id);
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS ground_id INTEGER REFERENCES grounds(id);

UPDATE ground_photos SET ground_id = (SELECT id FROM grounds ORDER BY id LIMIT 1) WHERE ground_id IS NULL;
UPDATE amenities SET ground_id = (SELECT id FROM grounds ORDER BY id LIMIT 1) WHERE ground_id IS NULL;

ALTER TABLE ground_photos ALTER COLUMN ground_id SET NOT NULL;
ALTER TABLE amenities ALTER COLUMN ground_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ground_photos_ground_id ON ground_photos(ground_id);
CREATE INDEX IF NOT EXISTS idx_amenities_ground_id ON amenities(ground_id);

-- Step 20 — status/public_ground_id/slug already have indexes (status has
-- none yet; public_ground_id and slug are UNIQUE, which is itself a btree
-- index). The nearby-search query filters on status = 'ACTIVE' AND
-- latitude/longitude IS NOT NULL before computing distance — with grounds
-- still numbering in the single digits, Postgres correctly prefers a Seq
-- Scan over any index here (see Phase 12 report's EXPLAIN section), so a
-- status index would sit unused today. It is cheap, safe, and exactly the
-- column the discovery query filters on first, so it's added now rather
-- than deferred — unlike latitude/longitude, which Step 20 explicitly says
-- NOT to index with a plain B-tree (that isn't equivalent to a spatial
-- index and would be actively misleading to add without PostGIS).
CREATE INDEX IF NOT EXISTS idx_grounds_status ON grounds(status);

-- ============================================================================
-- PHASE 21 — Umpire Network & Match Officiating (U1: Database Foundation)
-- ============================================================================
--
-- Ground-owner "which matches are at my ground" and match-scoped umpire
-- assignment both need a real ground<->match link, which has never existed
-- (venue was always free text). Nullable and backward-compatible: every
-- match created before this phase simply has ground_id = NULL and is
-- invisible to any ground-owner query — the Phase 0 audit found no reliable
-- way to infer which existing match belongs to which ground, so none are
-- backfilled.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ground_id INTEGER REFERENCES grounds(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS required_umpires SMALLINT NOT NULL DEFAULT 0 CHECK (required_umpires >= 0);
CREATE INDEX IF NOT EXISTS idx_matches_ground_id ON matches(ground_id) WHERE ground_id IS NOT NULL;

-- One row PER SLOT, not a counter column (Phase 0 plan's approved Decision
-- 3): with exactly `required_umpires` rows pre-created per match, claiming a
-- slot is a single atomic `UPDATE ... WHERE status = 'AVAILABLE' RETURNING
-- *`, so over-allocation is structurally impossible — there are only ever N
-- rows to claim — rather than relying on a counted aggregate, which a plain
-- CHECK constraint can't express across rows anyway. The assignment/claim
-- endpoint itself is U3, not this phase; this table only lays the
-- foundation it will claim rows from.
CREATE TABLE IF NOT EXISTS match_umpire_slots (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  slot_number SMALLINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  umpire_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason VARCHAR(280),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, slot_number)
);
-- Decision 3's second guarantee ("same umpire cannot hold duplicate active
-- assignments for the same match") — a PARTIAL unique index rather than a
-- table-level UNIQUE(match_id, umpire_user_id), since umpire_user_id must
-- stay reusable across a match's CANCELLED/COMPLETED history rows once a
-- slot has passed through more than one umpire over time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_umpire_slots_active_umpire
  ON match_umpire_slots(match_id, umpire_user_id) WHERE status = 'ASSIGNED';
-- "My Assignments" (an umpire's own slots, across every match) filters on
-- umpire_user_id without match_id — UNIQUE(match_id, slot_number) above only
-- indexes match_id first, so this query shape needs its own index (same
-- reasoning as idx_ground_users_ground_id elsewhere in this file).
CREATE INDEX IF NOT EXISTS idx_match_umpire_slots_umpire_user_id
  ON match_umpire_slots(umpire_user_id) WHERE umpire_user_id IS NOT NULL;

-- Umpire-specific extended profile — never duplicates users/players (name,
-- email, photo already live there). user_id IS the primary key: a true 1:1,
-- created lazily (on umpire-request approval or first slot claim, both a
-- later phase) rather than backfilled for every existing user.
CREATE TABLE IF NOT EXISTS umpire_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio VARCHAR(500),
  is_available BOOLEAN NOT NULL DEFAULT true,
  matches_officiated INTEGER NOT NULL DEFAULT 0,
  matches_cancelled INTEGER NOT NULL DEFAULT 0,
  matches_no_show INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approved Decision 4 — one row per (match, participant), not three separate
-- Ground/Umpire/LOC tables: it's naturally a single progressive submission,
-- and one UNIQUE constraint enforces "once per match per person" instead of
-- three. umpire_user_id/umpire_* stay NULL when the match had no assigned
-- umpire (required_umpires can be 0). No ground_id column here — a ground's
-- aggregate rating is computed by joining through matches.ground_id,
-- avoiding a second column that could drift from it. Eligibility ("did this
-- user actually play in this match") is enforced by application code against
-- the existing match_players relationship, not by anything in this table.
CREATE TABLE IF NOT EXISTS match_feedback (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ground_rating SMALLINT NOT NULL CHECK (ground_rating BETWEEN 1 AND 5),
  ground_comment_liked VARCHAR(500),
  ground_comment_improve VARCHAR(500),
  umpire_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  umpire_rating SMALLINT CHECK (umpire_rating BETWEEN 1 AND 5),
  umpire_comment_liked VARCHAR(500),
  umpire_comment_improve VARCHAR(500),
  app_rating SMALLINT NOT NULL CHECK (app_rating BETWEEN 1 AND 5),
  app_comment VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, submitted_by)
);
-- (idx_match_feedback_umpire_user_id, the original index on this table's
-- since-removed umpire_user_id column, was dropped in Phase 22/U6 below —
-- removed from here too, not just left dangling, since re-running this
-- CREATE INDEX against a column Phase 22 has since dropped would break a
-- fresh migrate on an already-migrated database.)

-- Cached aggregates, recomputed from match_feedback (joined through
-- matches.ground_id) by application code once feedback submission exists
-- (a later phase) — never written here. rating_count = 0 / rating_avg = NULL
-- means "no reviews yet", the same honest-absence convention GroundCard has
-- followed throughout this project rather than a placeholder value.
ALTER TABLE grounds ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) CHECK (rating_avg BETWEEN 0 AND 5);
ALTER TABLE grounds ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- Notifications need to reference the umpire's match, not a booking —
-- related_match_id is a new, separate nullable FK mirroring the existing
-- related_booking_id column rather than overloading it. Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS" (established at Phase 10 above), so the
-- type CHECK is widened the same idempotent drop-then-add way the
-- ground_audit_log FK was fixed earlier in this file.
ALTER TABLE ground_notifications ADD COLUMN IF NOT EXISTS related_match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ground_notifications' AND constraint_name = 'ground_notifications_type_check'
  ) THEN
    ALTER TABLE ground_notifications DROP CONSTRAINT ground_notifications_type_check;
  END IF;
END $$;
ALTER TABLE ground_notifications ADD CONSTRAINT ground_notifications_type_check
  CHECK (type IN ('BOOKING_APPROVED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'GROUND_CLOSED',
                   'UMPIRE_SLOT_ASSIGNED', 'UMPIRE_SLOT_CANCELLED', 'UMPIRE_REQUEST_DECIDED'));

-- ============================================================================
-- PHASE 22 (U6) — Feedback & Rating System
-- ============================================================================
--
-- match_feedback stays the single "one row per (match, submitted_by)"
-- submission shell (U1's own design, unchanged) for the two categories that
-- really are 1:1 with a submission — Ground and LOC/App. Both rating
-- columns become nullable: U6's eligibility model means not every eligible
-- submitter is eligible for every category (a Ground Owner reviewing their
-- own ground would be a self-rating loophole, so they submit Umpire+App
-- only), so "every category populated" can no longer be assumed the way
-- the original NOT NULL implied.
ALTER TABLE match_feedback ALTER COLUMN ground_rating DROP NOT NULL;
ALTER TABLE match_feedback ALTER COLUMN app_rating DROP NOT NULL;

-- app_comment -> app_comment_liked (symmetry with ground_comment_liked/
-- umpire_comment_liked — this category never had a "what improved" field,
-- unlike the other two) + a new app_comment_improve. Renamed rather than
-- left as a lone oddly-named column — safe because this feature has not
-- shipped yet (no real rows depend on the old name).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_feedback' AND column_name = 'app_comment')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_feedback' AND column_name = 'app_comment_liked') THEN
    ALTER TABLE match_feedback RENAME COLUMN app_comment TO app_comment_liked;
  END IF;
END $$;
ALTER TABLE match_feedback ADD COLUMN IF NOT EXISTS app_comment_improve VARCHAR(500);
-- One structured field for "which LOC feature did you like most" — a fixed,
-- small taxonomy validated at the service layer (app.controller-level list,
-- not a DB CHECK/enum — matches this schema's existing convention of plain
-- VARCHAR + application validation for small option sets, e.g.
-- umpire_requests.status). Free text stays covered by app_comment_liked/
-- app_comment_improve; this is additive, not a replacement.
ALTER TABLE match_feedback ADD COLUMN IF NOT EXISTS app_feature_liked VARCHAR(50);

-- The one real schema gap U1 flagged for a future phase to resolve: a match
-- can have more than one assigned umpire (required_umpires, U1/U3), but the
-- old umpire_user_id/umpire_rating/umpire_comment_* columns on
-- match_feedback could only ever hold ONE. Rather than force multiple
-- match_feedback rows per submitter (destroying the UNIQUE(match_id,
-- submitted_by) "one submission" rule) or cram an array into one column,
-- per-umpire ratings are normalized into their own child table — the same
-- one-row-per-relationship principle match_umpire_slots already established
-- for "more than one umpire on a match". match_feedback remains the single
-- submission shell; this table is the one-to-many part of it.
ALTER TABLE match_feedback DROP COLUMN IF EXISTS umpire_user_id;
ALTER TABLE match_feedback DROP COLUMN IF EXISTS umpire_rating;
ALTER TABLE match_feedback DROP COLUMN IF EXISTS umpire_comment_liked;
ALTER TABLE match_feedback DROP COLUMN IF EXISTS umpire_comment_improve;
DROP INDEX IF EXISTS idx_match_feedback_umpire_user_id;

CREATE TABLE IF NOT EXISTS match_feedback_umpire_ratings (
  id SERIAL PRIMARY KEY,
  match_feedback_id INTEGER NOT NULL REFERENCES match_feedback(id) ON DELETE CASCADE,
  umpire_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment_liked VARCHAR(500),
  comment_improve VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The same submitter can rate two different assigned umpires within one
  -- submission, but never the same umpire twice.
  UNIQUE (match_feedback_id, umpire_user_id)
);
-- recalculateUmpireRating(umpireUserId)'s query shape: "every rating for
-- this umpire, across every submission" — filters on umpire_user_id alone.
CREATE INDEX IF NOT EXISTS idx_match_feedback_umpire_ratings_umpire ON match_feedback_umpire_ratings(umpire_user_id);

-- ============================================================================
-- Ground Owner match lifecycle + umpire staffing notifications
-- ============================================================================
--
-- Three new notification types, same idempotent drop-then-add widening of
-- ground_notifications_type_check already used once above (Phase 21):
-- UMPIRE_SLOTS_FULLY_STAFFED (distinct from UMPIRE_SLOT_ASSIGNED — fires
-- once, only when the assignment that just landed brought a match to
-- fully-staffed, not on every assignment), MATCH_STARTING and
-- MATCH_COMPLETED (a Ground-Owner-controlled lifecycle action notifying the
-- assigned umpire — no existing type covers either).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ground_notifications' AND constraint_name = 'ground_notifications_type_check'
  ) THEN
    ALTER TABLE ground_notifications DROP CONSTRAINT ground_notifications_type_check;
  END IF;
END $$;
ALTER TABLE ground_notifications ADD CONSTRAINT ground_notifications_type_check
  CHECK (type IN ('BOOKING_APPROVED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'GROUND_CLOSED',
                   'UMPIRE_SLOT_ASSIGNED', 'UMPIRE_SLOT_CANCELLED', 'UMPIRE_REQUEST_DECIDED',
                   'UMPIRE_SLOTS_FULLY_STAFFED', 'MATCH_STARTING', 'MATCH_COMPLETED'));
