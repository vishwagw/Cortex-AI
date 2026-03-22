-- ============================================================
-- CORTEX AUTONOMY — Database Schema
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fuzzy text search

-- ── ORGANIZATIONS (tenants) ────────────────────────────────────────────────
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'operator'
                  CHECK (plan IN ('operator','manufacturer','enterprise')),
  white_label   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- white_label shape: { logo_url, primary_color, custom_domain, brand_name }
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USER PROFILES (extends auth.users) ────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  system_role   TEXT NOT NULL DEFAULT 'user'
                  CHECK (system_role IN ('user','super_admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ORG MEMBERS ────────────────────────────────────────────────────────────
CREATE TABLE org_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'operator'
                  CHECK (role IN ('operator','admin')),
  invited_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- ── DRONES ─────────────────────────────────────────────────────────────────
CREATE TABLE drones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  model             TEXT,
  serial_number     TEXT,
  platform          TEXT CHECK (platform IN ('mavlink','ardupilot','ros','px4','custom')),
  status            TEXT NOT NULL DEFAULT 'offline'
                      CHECK (status IN ('online','flying','idle','offline','error','maintenance')),
  battery_pct       INTEGER CHECK (battery_pct BETWEEN 0 AND 100),
  firmware_version  TEXT,
  last_seen_at      TIMESTAMPTZ,
  home_lat          DOUBLE PRECISION,
  home_lng          DOUBLE PRECISION,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MISSIONS ───────────────────────────────────────────────────────────────
CREATE TABLE missions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  drone_id            UUID REFERENCES drones(id) ON DELETE SET NULL,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  name                TEXT NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned','active','paused','completed','failed','aborted')),
  mission_type        TEXT CHECK (mission_type IN ('inspection','delivery','mapping','surveillance','survey','custom')),
  waypoints           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- waypoints shape: [{id, lat, lng, altitude_m, speed_ms, action, hold_s}]
  geofence            JSONB,
  -- geofence shape: GeoJSON Polygon
  planned_distance_m  FLOAT,
  planned_duration_s  INTEGER,
  actual_distance_m   FLOAT,
  actual_duration_s   INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FLIGHT LOGS ────────────────────────────────────────────────────────────
CREATE TABLE flight_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  drone_id          UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  mission_id        UUID REFERENCES missions(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed','failed','aborted','in_progress')),
  distance_m        FLOAT,
  duration_s        INTEGER,
  max_altitude_m    FLOAT,
  avg_speed_ms      FLOAT,
  max_speed_ms      FLOAT,
  min_battery_pct   INTEGER,
  waypoints_hit     INTEGER DEFAULT 0,
  telemetry_points  INTEGER DEFAULT 0,
  notes             TEXT,
  telemetry_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TELEMETRY (live + historical) ─────────────────────────────────────────
CREATE TABLE telemetry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  drone_id        UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  mission_id      UUID REFERENCES missions(id) ON DELETE SET NULL,
  flight_log_id   UUID REFERENCES flight_logs(id) ON DELETE SET NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  altitude_m      FLOAT,
  speed_ms        FLOAT,
  heading_deg     FLOAT,
  battery_pct     INTEGER,
  signal_pct      INTEGER,
  mode            TEXT,  -- e.g. 'GUIDED', 'AUTO', 'LOITER'
  satellites      INTEGER,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition telemetry by month for performance (optional, add later)
-- For MVP: add a time-based index

-- ── API KEYS ───────────────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,   -- bcrypt hash of full key
  key_prefix    TEXT NOT NULL,          -- first 8 chars, shown in UI
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  -- scopes: ['telemetry:read','telemetry:write','missions:read','missions:write','fleet:read']
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX idx_org_members_user    ON org_members(user_id);
CREATE INDEX idx_org_members_org     ON org_members(org_id);
CREATE INDEX idx_drones_org          ON drones(org_id);
CREATE INDEX idx_drones_status       ON drones(status);
CREATE INDEX idx_missions_org        ON missions(org_id);
CREATE INDEX idx_missions_status     ON missions(status);
CREATE INDEX idx_missions_drone      ON missions(drone_id);
CREATE INDEX idx_flight_logs_org     ON flight_logs(org_id);
CREATE INDEX idx_flight_logs_drone   ON flight_logs(drone_id);
CREATE INDEX idx_flight_logs_started ON flight_logs(started_at DESC);
CREATE INDEX idx_telemetry_drone     ON telemetry(drone_id, recorded_at DESC);
CREATE INDEX idx_telemetry_mission   ON telemetry(mission_id);
CREATE INDEX idx_api_keys_org        ON api_keys(org_id);

-- ── TRIGGERS: updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orgs_updated     BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_drones_updated   BEFORE UPDATE ON drones        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_missions_updated BEFORE UPDATE ON missions      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── TRIGGER: auto-create profile on signup ─────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry      ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys       ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of org?
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is user an org admin?
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is user super admin?
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ORGANIZATIONS policies
CREATE POLICY "members can read own org"     ON organizations FOR SELECT USING (is_org_member(id) OR is_super_admin());
CREATE POLICY "admins can update own org"    ON organizations FOR UPDATE USING (is_org_admin(id));
CREATE POLICY "super admin can manage orgs"  ON organizations FOR ALL    USING (is_super_admin());

-- PROFILES policies
CREATE POLICY "users read own profile"       ON profiles FOR SELECT USING (id = auth.uid() OR is_super_admin());
CREATE POLICY "users update own profile"     ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "org members read each other"  ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM org_members om1
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
  )
);

-- ORG_MEMBERS policies
CREATE POLICY "members read own memberships" ON org_members FOR SELECT USING (is_org_member(org_id) OR is_super_admin());
CREATE POLICY "admins manage members"        ON org_members FOR ALL    USING (is_org_admin(org_id) OR is_super_admin());

-- DRONES policies
CREATE POLICY "org members read drones"   ON drones FOR SELECT USING (is_org_member(org_id) OR is_super_admin());
CREATE POLICY "org admins manage drones"  ON drones FOR ALL    USING (is_org_admin(org_id) OR is_super_admin());

-- MISSIONS policies
CREATE POLICY "org members read missions"  ON missions FOR SELECT USING (is_org_member(org_id) OR is_super_admin());
CREATE POLICY "org members create missions" ON missions FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "org members update missions" ON missions FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "org admins delete missions"  ON missions FOR DELETE USING (is_org_admin(org_id) OR is_super_admin());

-- FLIGHT_LOGS policies
CREATE POLICY "org members read logs"      ON flight_logs FOR SELECT USING (is_org_member(org_id) OR is_super_admin());
CREATE POLICY "org members insert logs"    ON flight_logs FOR INSERT WITH CHECK (is_org_member(org_id));

-- TELEMETRY policies
CREATE POLICY "org members read telemetry"   ON telemetry FOR SELECT USING (is_org_member(org_id) OR is_super_admin());
CREATE POLICY "org members insert telemetry" ON telemetry FOR INSERT WITH CHECK (is_org_member(org_id));

-- API_KEYS policies
CREATE POLICY "org members read keys"   ON api_keys FOR SELECT USING (is_org_member(org_id) OR is_super_admin());
CREATE POLICY "org admins manage keys"  ON api_keys FOR ALL USING (is_org_admin(org_id) OR is_super_admin());

-- ── REALTIME ───────────────────────────────────────────────────────────────
-- Enable realtime for telemetry and drone status
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE drones;
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
