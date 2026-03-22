# Cortex Autonomy — SaaS Platform

Universal autonomy-as-a-service for drones. Computer vision navigation, AI path planning, and reinforcement learning — hardware-agnostic, plug-and-play.

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14 (App Router) + TypeScript |
| Styling       | Tailwind CSS + custom design system |
| Auth          | Supabase Auth                        |
| Database      | Supabase Postgres + Row Level Security |
| Real-time     | Supabase Realtime (websockets)       |
| Maps          | Mapbox GL JS + react-map-gl          |
| Charts        | Recharts                             |
| Deployment    | Vercel (frontend) + Supabase (backend) |

---

## Project Structure

```
cortex-saas/
├── app/
│   ├── (auth)/                   # Login, signup — no sidebar
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/              # Main app — sidebar layout
│   │   ├── layout.tsx            # Auth guard + sidebar
│   │   ├── dashboard/page.tsx    # Overview + live telemetry
│   │   ├── fleet/page.tsx        # Drone management
│   │   ├── missions/
│   │   │   ├── page.tsx          # Mission list
│   │   │   └── new/page.tsx      # Mission planner + map
│   │   ├── logs/page.tsx         # Flight logs + analytics
│   │   └── settings/page.tsx     # Org, members, API keys
│   ├── (admin)/
│   │   └── admin/page.tsx        # Super admin panel
│   ├── api/
│   │   ├── telemetry/route.ts    # POST/PUT — drone telemetry ingest
│   │   ├── drones/route.ts       # GET/POST — fleet management
│   │   └── missions/
│   │       ├── route.ts          # GET/POST — missions
│   │       └── [id]/route.ts     # PATCH — status updates
│   └── auth/callback/route.ts   # Supabase auth callback
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── Header.tsx            # Page header bar
│   │   └── SettingsClient.tsx    # Settings tabs
│   ├── dashboard/
│   │   ├── StatCard.tsx          # Metric display card
│   │   └── TelemetryChart.tsx    # Live Recharts + Supabase Realtime
│   ├── fleet/
│   │   └── FleetClient.tsx       # Drone cards + add modal
│   ├── missions/
│   │   ├── MissionMap.tsx        # Mapbox waypoint planner
│   │   └── MissionPlannerClient.tsx
│   └── logs/
│       └── LogsClient.tsx        # Filterable log table + chart
├── lib/
│   ├── types.ts                  # All TypeScript types
│   ├── utils.ts                  # Helpers, formatters, geo math
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server Supabase client + helpers
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql        # Full DB schema + RLS
│       └── 002_seed.sql          # Dev seed data
├── middleware.ts                 # Auth guard + role routing
├── .env.local.example            # Environment variables template
└── vercel.json                   # Vercel deployment config
```

---

## Setup Guide

### 1. Clone and install

```bash
git clone <your-repo>
cd cortex-saas
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to your users
3. Save your **database password**

### 3. Run database migrations

In Supabase Dashboard → **SQL Editor**, run the files in order:

```sql
-- First: paste and run supabase/migrations/001_schema.sql
-- Then (optional dev data): supabase/migrations/002_seed.sql
```

### 4. Configure Supabase Auth

In **Authentication → Settings**:
- Set **Site URL** to `http://localhost:3000` (dev) or your Vercel URL (prod)
- Add redirect URL: `https://your-domain.vercel.app/auth/callback`
- Enable **Email** provider (already on by default)

### 5. Set up Mapbox

1. Create account at [mapbox.com](https://mapbox.com)
2. Get your **public access token** from the dashboard

### 6. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### One-click deploy

```bash
npm install -g vercel
vercel
```

### Set environment variables in Vercel

In Vercel Dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

### After deploy

1. Update Supabase Auth **Site URL** to your Vercel URL
2. Add `https://your-app.vercel.app/auth/callback` to Supabase redirect URLs

---

## Telemetry API

Drones push telemetry to Cortex via a simple REST API.

### Authenticate

Generate an API key in **Settings → API Keys** with the `telemetry:write` scope.

### Push a telemetry point

```bash
POST https://your-app.vercel.app/api/telemetry
Authorization: Bearer cx_your_api_key

{
  "drone_id": "uuid-of-drone",
  "lat": 1.3521,
  "lng": 103.8198,
  "altitude_m": 45.2,
  "speed_ms": 8.5,
  "heading_deg": 270,
  "battery_pct": 72,
  "signal_pct": 91,
  "mode": "AUTO"
}
```

### Batch push (up to 500 points)

```bash
PUT https://your-app.vercel.app/api/telemetry
Authorization: Bearer cx_your_api_key

[ { "drone_id": "...", "lat": ..., ... }, ... ]
```

### MAVLink integration example (Python)

```python
import requests, time
from pymavlink import mavutil

API_URL = "https://your-app.vercel.app/api/telemetry"
API_KEY = "cx_your_key"
DRONE_ID = "your-drone-uuid"

mav = mavutil.mavlink_connection('udp:localhost:14550')

while True:
    msg = mav.recv_match(type='GLOBAL_POSITION_INT', blocking=True)
    if msg:
        requests.post(API_URL,
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "drone_id": DRONE_ID,
                "lat":         msg.lat / 1e7,
                "lng":         msg.lon / 1e7,
                "altitude_m":  msg.relative_alt / 1000,
                "speed_ms":    msg.vz / 100,
                "heading_deg": msg.hdg / 100,
            }
        )
    time.sleep(0.5)
```

---

## User Roles

| Role | Access |
|---|---|
| `operator` | View fleet, plan missions, view logs |
| `admin` | + Add/remove drones, invite members, manage API keys |
| `super_admin` | + Admin panel, all organizations |

To make a user super_admin:
```sql
UPDATE profiles SET system_role = 'super_admin' WHERE id = 'user-uuid';
```

---

## Multi-tenancy & White Label

Every row in the database is scoped to an `org_id`. Row Level Security policies enforce that users can only see their own organization's data — no application-level filtering needed.

For white-label deployments, set `organizations.white_label`:
```json
{
  "brand_name":    "SkyTech Autonomy",
  "logo_url":      "https://cdn.skytech.io/logo.png",
  "primary_color": "#ff6b35",
  "custom_domain": "app.skytech.io"
}
```

---

## Roadmap / Next Steps

- [ ] Mission detail page with live drone position on map
- [ ] Real-time drone position overlay on mission planner
- [ ] ArduPilot SITL simulator integration for testing
- [ ] ROS bridge WebSocket connector
- [ ] Geofence editor on mission planner map
- [ ] Flight replay from telemetry history
- [ ] Webhook notifications (mission completed, low battery, geofence breach)
- [ ] White-label theming engine from `organizations.white_label` config
- [ ] Manufacturer portal — sub-org provisioning
- [ ] Billing integration (Stripe)
