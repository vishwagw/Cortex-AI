// ============================================================
// CORTEX AUTONOMY — Shared TypeScript Types
// ============================================================

// ── Database Row Types ─────────────────────────────────────────────────────

export type OrgPlan = 'operator' | 'manufacturer' | 'enterprise'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  white_label: WhiteLabelConfig
  created_at: string
  updated_at: string
}

export interface WhiteLabelConfig {
  logo_url?:      string
  primary_color?: string
  custom_domain?: string
  brand_name?:    string
}

export type SystemRole = 'user' | 'super_admin'
export type OrgRole    = 'operator' | 'admin'

export interface Profile {
  id:          string
  full_name?:  string
  avatar_url?: string
  system_role: SystemRole
  created_at:  string
  updated_at:  string
}

export interface OrgMember {
  id:          string
  org_id:      string
  user_id:     string
  role:        OrgRole
  invited_by?: string
  created_at:  string
}

export type DroneStatus   = 'online' | 'flying' | 'idle' | 'offline' | 'error' | 'maintenance'
export type DronePlatform = 'mavlink' | 'ardupilot' | 'ros' | 'px4' | 'custom'

export interface Drone {
  id:               string
  org_id:           string
  name:             string
  model?:           string
  serial_number?:   string
  platform?:        DronePlatform
  status:           DroneStatus
  battery_pct?:     number
  firmware_version?: string
  last_seen_at?:    string
  home_lat?:        number
  home_lng?:        number
  metadata:         Record<string, unknown>
  created_at:       string
  updated_at:       string
}

export type MissionStatus = 'planned' | 'active' | 'paused' | 'completed' | 'failed' | 'aborted'
export type MissionType   = 'inspection' | 'delivery' | 'mapping' | 'surveillance' | 'survey' | 'custom'

export interface Waypoint {
  id:        string
  lat:       number
  lng:       number
  altitude_m: number
  speed_ms?: number
  action?:   string
  hold_s?:   number
}

export interface Mission {
  id:                  string
  org_id:              string
  drone_id?:           string
  created_by:          string
  name:                string
  description?:        string
  status:              MissionStatus
  mission_type?:       MissionType
  waypoints:           Waypoint[]
  geofence?:           GeoJSONPolygon
  planned_distance_m?: number
  planned_duration_s?: number
  actual_distance_m?:  number
  actual_duration_s?:  number
  created_at:          string
  started_at?:         string
  completed_at?:       string
  updated_at:          string
}

export type FlightLogStatus = 'completed' | 'failed' | 'aborted' | 'in_progress'

export interface FlightLog {
  id:                string
  org_id:            string
  drone_id:          string
  mission_id?:       string
  status:            FlightLogStatus
  distance_m?:       number
  duration_s?:       number
  max_altitude_m?:   number
  avg_speed_ms?:     number
  max_speed_ms?:     number
  min_battery_pct?:  number
  waypoints_hit?:    number
  telemetry_points?: number
  notes?:            string
  telemetry_summary: Record<string, unknown>
  started_at:        string
  ended_at?:         string
  created_at:        string
  // Joined fields
  drone?:            Pick<Drone, 'id' | 'name' | 'model'>
  mission?:          Pick<Mission, 'id' | 'name' | 'mission_type'>
}

export interface TelemetryPoint {
  id:            string
  org_id:        string
  drone_id:      string
  mission_id?:   string
  flight_log_id?: string
  lat:           number
  lng:           number
  altitude_m?:   number
  speed_ms?:     number
  heading_deg?:  number
  battery_pct?:  number
  signal_pct?:   number
  mode?:         string
  satellites?:   number
  recorded_at:   string
}

export interface ApiKey {
  id:            string
  org_id:        string
  created_by:    string
  name:          string
  key_hash:      string
  key_prefix:    string
  scopes:        string[]
  last_used_at?: string
  expires_at?:   string
  revoked_at?:   string
  created_at:    string
}

// ── GeoJSON ────────────────────────────────────────────────────────────────
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]
}

// ── Auth / Session types ────────────────────────────────────────────────────
export interface AuthUser {
  id:          string
  email?:      string
  profile:     Profile
  org?:        Organization
  orgRole?:    OrgRole
}

// ── API response types ──────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T
  error?: string
}

// ── Dashboard stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  total_drones:    number
  active_drones:   number
  flying_drones:   number
  missions_today:  number
  flights_total:   number
  distance_total_km: number
  data_points:     number
}

// ── Form types ──────────────────────────────────────────────────────────────
export interface CreateMissionForm {
  name:         string
  description?: string
  mission_type: MissionType
  drone_id:     string
  waypoints:    Waypoint[]
}

export interface CreateDroneForm {
  name:          string
  model?:        string
  serial_number?: string
  platform:      DronePlatform
}

export interface SignUpForm {
  full_name:    string
  email:        string
  password:     string
  org_name:     string
  org_plan:     OrgPlan
}
