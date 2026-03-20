# ☀️ SolarSense — AI Solar Design Platform

A full-stack SaaS for analyzing geospatial & satellite data to design optimal solar panel systems for any location worldwide.

## Features

- 🛰 **Satellite Map View** — Esri World Imagery + OpenStreetMap with layer toggle
- 📐 **Roof Drawing Tool** — Click-drag to draw roof rectangle & calculate area
- ☀️ **Solar Irradiance Analysis** — Live data from PVGIS (EU JRC) / fallback estimation
- ⚡ **Energy Yield Simulation** — Monthly/annual production forecasts
- 💰 **Financial Modeling** — ROI, NPV, payback period, LCOE, 25-year cashflow
- 🌿 **Environmental Impact** — CO₂ offset & tree equivalents
- 📊 **Interactive Charts** — Recharts-powered visualizations
- 📥 **Report Export** — Print/PDF export of complete design

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Map**: Leaflet.js with Esri satellite tiles
- **Charts**: Recharts
- **Styling**: Tailwind CSS + custom CSS variables
- **Solar Data**: PVGIS API (EU Joint Research Centre) — no API key needed
- **Geocoding**: Nominatim (OpenStreetMap) — no API key needed
- **Deployment**: Vercel

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/solar-saas

# 2. Install dependencies  
npm install

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

## Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

No environment variables required. The app uses free public APIs:
- **PVGIS**: https://re.jrc.ec.europa.eu/pvg_tools/en/
- **Nominatim**: https://nominatim.openstreetmap.org/

## How to Use

1. **Search** any address or city in the left sidebar
2. The map **flies to** the location with satellite imagery
3. Click **"Draw Rectangle"** and drag on the map to outline the roof
4. **Adjust parameters** (panel wattage, electricity rate, etc.)
5. View **Energy**, **Financial**, and **Layout** tabs for analysis
6. **Export** a full design report as PDF

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/
│   │   └── page.tsx          # Design studio
│   └── api/
│       └── solar/route.ts    # PVGIS proxy
├── components/
│   ├── SolarDashboard.tsx    # Main dashboard
│   └── MapView.tsx           # Leaflet map
├── lib/
│   └── solar-calculator.ts   # Physics engine
└── vercel.json
```

## License

MIT — Free to use, modify, and deploy.
