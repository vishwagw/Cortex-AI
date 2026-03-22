-- ============================================================
-- CORTEX — Development Seed Data
-- Run AFTER 001_schema.sql
-- NOTE: First create a user via Supabase Auth (signup page),
--       then replace 'YOUR-USER-ID-HERE' with the actual UUID.
-- ============================================================

-- Promote a user to super_admin (replace with real user id)
-- UPDATE profiles SET system_role = 'super_admin' WHERE id = 'YOUR-USER-ID-HERE';

-- ── Demo org ───────────────────────────────────────────────────────────────
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Drone Ops', 'acme-drone-ops', 'operator'),
  ('22222222-2222-2222-2222-222222222222', 'SkyTech Manufacturer', 'skytech', 'manufacturer')
ON CONFLICT (slug) DO NOTHING;

-- ── Demo drones ────────────────────────────────────────────────────────────
INSERT INTO drones (id, org_id, name, model, serial_number, platform, status, battery_pct, last_seen_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Alpha-1',  'DJI Matrice 300 RTK', 'SN-A001', 'mavlink',   'flying',  78, NOW() - INTERVAL '30 seconds'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Bravo-2',  'DJI Matrice 300 RTK', 'SN-B002', 'mavlink',   'idle',    92, NOW() - INTERVAL '5 minutes'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Charlie-3','Autel EVO II Pro',    'SN-C003', 'ardupilot', 'offline', 45, NOW() - INTERVAL '2 hours'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Delta-4',  'Parrot ANAFI USA',    'SN-D004', 'ros',       'maintenance', NULL, NULL)
ON CONFLICT DO NOTHING;

-- ── Demo missions ──────────────────────────────────────────────────────────
-- NOTE: Replace 'YOUR-USER-ID-HERE' with a real user id from auth.users
-- INSERT INTO missions (org_id, drone_id, created_by, name, mission_type, status, waypoints, planned_distance_m) VALUES
-- ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'YOUR-USER-ID-HERE',
--  'Site A Perimeter Inspection', 'inspection', 'active',
--  '[{"id":"w1","lat":1.3521,"lng":103.8198,"altitude_m":50,"speed_ms":8},{"id":"w2","lat":1.3541,"lng":103.8218,"altitude_m":50,"speed_ms":8},{"id":"w3","lat":1.3531,"lng":103.8238,"altitude_m":50,"speed_ms":8}]',
--  450.5),
-- ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'YOUR-USER-ID-HERE',
--  'Warehouse Mapping Run', 'mapping', 'completed',
--  '[{"id":"w1","lat":1.3400,"lng":103.8100,"altitude_m":30,"speed_ms":5},{"id":"w2","lat":1.3420,"lng":103.8120,"altitude_m":30,"speed_ms":5}]',
--  220.0);

-- ── Dummy telemetry (last hour, for Alpha-1) ───────────────────────────────
-- Generates 60 telemetry points over the past hour
-- NOTE: Uncomment and replace org/drone IDs if you want chart data
/*
INSERT INTO telemetry (org_id, drone_id, lat, lng, altitude_m, speed_ms, heading_deg, battery_pct, signal_pct, mode, recorded_at)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1.3521 + (random() - 0.5) * 0.01,
  103.8198 + (random() - 0.5) * 0.01,
  40 + random() * 30,
  5 + random() * 10,
  random() * 360,
  78 - (n * 0.1)::int,
  85 + (random() * 10)::int,
  'AUTO',
  NOW() - (60 - n) * INTERVAL '1 minute'
FROM generate_series(1, 60) AS n;
*/
