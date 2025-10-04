# claude.md - Asteroid Defense Command Project Guide

## Project Overview
Build "Asteroid Defense Command" - an interactive web app that shows real NASA asteroid threats and simulates their impacts on Earth. Users can drop asteroids anywhere, see devastation, and test deflection strategies.

## Tech Stack
- **Backend**: Python FastAPI
- **Frontend**: React + Vite
- **3D Visualization**: Three.js (using Solar System 3D repo as base)
- **2D Maps**: D3.js or react-simple-maps
- **State Management**: Zustand
- **Deployment**: Vercel (frontend) + Railway (backend)

## Project Structure
```
asteroid-defense/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── physics.py           # Impact calculations
│   ├── nasa_api.py          # NASA integration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3D/         # Solar System integration
│   │   │   ├── Map/        # D3.js map
│   │   │   └── UI/         # React components
│   │   ├── store/          # Zustand state
│   │   └── services/       # API calls
│   └── package.json
└── README.md
```

## Core Features

### Mode 1: Real Threat Monitor
- Fetch live asteroids from NASA NEO API
- Display list with size, speed, approach date, hazard level
- Show orbital trajectories in 3D
- Click asteroid + map location → simulate "what if it hit here?"

### Mode 2: Impact Simulator
- User sets asteroid parameters (size, speed, angle)
- Click anywhere on Earth map
- Calculate impact effects using real physics
- Visualize in 3D scene and 2D map

### Mode 3: Deflection System
- After impact shown, try to deflect
- Choose method: Kinetic Impactor or Gravity Tractor
- Set days before impact
- Calculate success probability and new trajectory

## Key Integration Points

### NASA API Integration
**Endpoint**: `https://api.nasa.gov/neo/rest/v1/feed`
- Get API key from https://api.nasa.gov (free, instant)
- Fetch asteroids approaching Earth this week
- Extract: ID, name, size, speed, close approach date, miss distance, hazard flag
- Store in .env file

**Detail Endpoint**: `https://api.nasa.gov/neo/rest/v1/neo/{id}`
- Get orbital elements for trajectory calculation
- Extract: semi-major axis, eccentricity, inclination

### Solar System 3D Base
**Repository**: https://github.com/N3rson/Solar-System-3D
- Already has: Earth model, orbital mechanics, camera controls, animation loop
- Modify to add: asteroids, impact markers, explosion effects, trajectory lines
- Keep: lighting, textures, scene setup

### Backend API Endpoints Needed
```
GET  /api/threats/current          # Real asteroids from NASA
POST /api/calculate-impact         # Impact physics
GET  /api/asteroid/{id}/trajectory # Orbital path points
POST /api/deflect                  # Deflection simulation
GET  /api/scenarios                # Preset impacts
```

### Frontend State Structure (Zustand)
```
- mode: 'THREATS' | 'SIMULATOR'
- realThreats: Array of asteroids
- selectedAsteroid: Current asteroid
- simulatorSettings: {size, speed, angle}
- impactLocation: {lat, lon}
- impactResults: {energy, crater, zones, deaths}
- deflectionAttempt: {success, new_trajectory}
```

## Physics Calculations Logic

### Impact Energy
1. Calculate mass from diameter (assume 3000 kg/m³ density for rocky asteroid)
2. Calculate kinetic energy: E = 0.5 × mass × velocity²
3. Convert to TNT megatons: divide by 4.184 × 10¹⁵

### Crater Size
1. Use scaling formula: D = 1.8 × (E^0.25) × (ρ^-0.33) × sin(angle)^0.33
2. Depth = Diameter × 0.3

### Damage Zones (concentric circles)
- Crater ejecta: crater diameter × 2
- Total destruction (20 psi): 0.28 × (TNT tons)^(1/3) km
- Severe damage (5 psi): 0.52 × (TNT tons)^(1/3) km
- Moderate damage (1 psi): 1.0 × (TNT tons)^(1/3) km
- Thermal burns: 0.15 × (TNT tons)^0.41 km

### Death Estimate
- Calculate affected area: π × radius²
- Assume population density (1000 people/km² in cities)
- Apply casualty rate (70% in total destruction zone)

### Deflection Success
**Kinetic Impactor**: Fast but risky
- Success rate = 100 - (size/20) - (60/days_before)
- Velocity change = 0.5 × (100 - size/100) m/s

**Gravity Tractor**: Slow but reliable
- Success rate = 80 - (size/50) + (days_before/10)
- Velocity change = 0.01 × days_before m/s

**Miss Distance**: delta_v × days × 86400 / 1000 km

## 3D Visualization Tasks

### Modifications to Solar System 3D
1. Add Asteroid class (similar to Planet class)
2. Position asteroids using orbital elements from NASA
3. Add impact marker on Earth surface (convert lat/lon to 3D coords)
4. Draw trajectory path as Line geometry
5. Animate asteroid toward Earth
6. Detect collision (distance check)
7. Create particle explosion effect (1000 particles, sphere distribution)

### React Integration Approach
- Mount Solar System 3D canvas in React div
- Pass asteroid data and impact location as props
- Use callbacks to communicate 3D events to React state
- Update 3D scene when React state changes

## Map Visualization Tasks

### D3.js Map Setup
1. Load world TopoJSON from CDN
2. Use Mercator or Natural Earth projection
3. Render countries (gray fill, white borders)
4. Add click handler to get lat/lon coordinates
5. Show crosshair marker at click point

### Damage Zone Rendering
1. Project impact location to pixel coordinates
2. Calculate zone radii (km to pixels)
3. Draw concentric SVG circles with colors:
   - Black: crater
   - Red: total destruction
   - Orange: severe damage
   - Yellow: moderate damage
   - Pink: thermal burns
4. Add opacity (0.4-0.6) for layering
5. Draw largest circles first (z-index)

### Interactive Features
- Click to select impact location
- Zoom/pan controls
- City markers (show major cities >1M population)
- Highlight affected cities
- Calculate population in zones
- Export map as PNG

## UI/UX Components

### Layout Structure
- Sidebar (320px): Controls and stats
- Main area (flex-1): 3D Solar System view
- Bottom panel (400px): 2D impact map

### Mode Switcher
- Two pill buttons: "REAL THREATS" | "SIMULATOR"
- Changes sidebar content completely

### Threat List (Mode 1)
- Scrollable cards showing NASA asteroids
- Display: name, size icon, speed, approach date, miss distance
- Hazardous asteroids highlighted in red
- Click to select for simulation

### Simulator Controls (Mode 2)
- Size slider: 50m - 10km (with visual comparison icons)
- Speed slider: 10-70 km/s
- Angle slider: 15-90° (with entry angle icon)
- "DROP ASTEROID" button

### Results Display
- Shows after impact calculation
- Energy in megatons
- Crater dimensions
- Seismic magnitude
- Death estimate
- Comparison text (e.g., "750x Hiroshima")

### Deflection Panel
- Appears after impact shown
- Method selector (Kinetic Impactor / Gravity Tractor)
- Days before impact slider
- Real-time success probability
- "ATTEMPT DEFLECTION" button
- Result animation (success/failure message)

## Data Flow Architecture

### User Selects Real Threat
1. User clicks asteroid card (Person 4 → Zustand)
2. UI fetches orbital data (Person 4 → Person 1 API)
3. 3D scene draws trajectory (Person 4 → Person 2)
4. User clicks map location (Person 3 → Zustand)
5. UI triggers impact calculation (Person 4 → Person 1 API)
6. Results update all views (Zustand → Person 2, 3, 4)

### User Creates Custom Simulation
1. User adjusts sliders (Person 4 → Zustand)
2. User clicks map (Person 3 → Zustand)
3. User clicks "DROP ASTEROID" (Person 4 → Person 1 API)
4. Backend calculates impact (Person 1 physics)
5. Results return (Person 1 → Zustand)
6. 3D animates asteroid (Zustand → Person 2)
7. Map draws zones (Zustand → Person 3)
8. Stats display (Zustand → Person 4)

### User Attempts Deflection
1. User selects method and timing (Person 4 → Zustand)
2. UI calls deflection API (Person 4 → Person 1)
3. Backend calculates success (Person 1 physics)
4. Result shows new trajectory or failure (Person 1 → Zustand)
5. If success: 3D updates path (Zustand → Person 2)

## Development Priorities

### Must-Have (Core MVP)
- NASA API integration working
- Impact physics calculations accurate
- 3D Earth with asteroids visible
- 2D map with damage zones
- Both modes functional
- App deployed and live

### Should-Have (Strong Demo)
- Deflection system working
- Explosion particle effects
- Orbital trajectory visualization
- Real-time data updates
- Preset scenarios (NYC, Tokyo, etc.)
- Mobile responsive

### Nice-to-Have (Wow Factor)
- Game mode with scoring
- Historical impact comparisons
- Sound effects
- AR features
- Social sharing
- Multi-language support

## Testing Strategy

### Hour 8 Checkpoint
- Test: Fetch NASA data → display in UI
- Test: Click map → get coordinates
- Test: Custom asteroid → calculate impact
- Test: Results show in all 3 views

### Hour 20 Checkpoint
- Test: Both modes complete
- Test: Deflection calculation works
- Test: All visualizations polished
- Test: No critical bugs
- Test: Deployed version works

### Hour 30 Final Testing
- Test: All features work end-to-end
- Test: Mobile responsive
- Test: Cross-browser compatible
- Test: Performance acceptable
- Test: Demo scenarios ready

## Deployment Checklist

### Backend (Railway/Render)
- Set environment variables (NASA_API_KEY)
- Configure CORS for frontend domain
- Test all endpoints in production
- Monitor error logs

### Frontend (Vercel)
- Update API URL to production backend
- Test live deployment
- Check mobile responsiveness
- Verify all assets load
- Test on different browsers

## Demo Presentation Structure

### Slide 1: Hook (30 sec)
"Every day, asteroids pass near Earth. What if one didn't miss?"

### Slide 2: Problem (1 min)
- Real asteroids are tracked by NASA
- Current tools are too technical or too simple
- Public needs accessible impact visualization

### Slide 3: Solution (1 min)
- Live NASA data integration
- Interactive simulation
- Deflection testing capability
- Educational and decision-support tool

### Slide 4: Live Demo (2 min)
- Show real asteroid from NASA
- Simulate impact on major city
- Display devastation zones
- Attempt deflection and show success

### Slide 5: Technical Highlights (30 sec)
- Real NASA API integration
- Accurate physics calculations
- 3D and 2D visualization
- Built on Solar System 3D

### Slide 6: Impact & Future (30 sec)
- Educational value for public
- Decision support for scientists
- Future: AR, mobile app, more scenarios

## Key Success Factors

### Visual Impact
- 3D visualization must be smooth and impressive
- Explosion effects should be dramatic
- Color-coded damage zones must be clear
- UI should feel professional

### Data Accuracy
- Use real NASA asteroid data
- Physics calculations must be correct
- Compare results to known impacts (Tunguska, etc.)
- Cite all data sources

### User Experience
- Intuitive controls (anyone can use)
- Fast response times (<2 seconds)
- Clear visual feedback
- Mobile-friendly interface

### Presentation Quality
- Rehearse demo multiple times
- Have backup plan if live demo fails
- Record demo video beforehand
- Practice under 5 minutes

## Common Pitfalls to Avoid

### Technical
- Don't overcomplicate physics (simple models work fine)
- Don't use localStorage (not supported in artifacts)
- Don't add features after Hour 30
- Don't skip error handling

### Integration
- Define data contracts early (everyone uses same format)
- Test integration at Hour 8 and Hour 20
- Communication breakdowns cause delays
- Person 5 should coordinate all integration

### Presentation
- Don't go over time limit
- Don't use technical jargon with judges
- Don't apologize for missing features
- Don't wing the demo without practice

## Resources & Links

### APIs & Data
- NASA API: https://api.nasa.gov
- NASA NEO Feed: https://api.nasa.gov/neo/rest/v1/feed
- World Map Data: https://cdn.jsdelivr.net/npm/world-atlas@2
- Earth Texture: https://visibleearth.nasa.gov

### Base Code
- Solar System 3D: https://github.com/N3rson/Solar-System-3D
- Three.js Docs: https://threejs.org/docs
- D3.js Gallery: https://observablehq.com/@d3/gallery

### Deployment
- Vercel: https://vercel.com
- Railway: https://railway.app
- Render: https://render.com

### Documentation
- FastAPI: https://fastapi.tiangolo.com
- React: https://react.dev
- Zustand: https://github.com/pmndrs/zustand