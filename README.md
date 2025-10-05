# AstroGuard - Near-Earth Asteroid Threat Assessment System

**NASA Space Apps Challenge 2025 "Meteor Madness" Submission**

## Challenge Response

AstroGuard directly addresses the [2025 NASA Space Apps Challenge "Meteor Madness"](https://www.spaceappschallenge.org/2025/challenges/meteor-madness/) by creating an interactive visualization and simulation tool that integrates real NASA and USGS datasets to model asteroid impact scenarios, predict consequences, and evaluate mitigation strategies.

### Key Features

- **Real NASA Data**: Live NEO API integration with orbital mechanics modeling
- **Scientific Physics**: Collins crater scaling laws and peer-reviewed impact formulas
- **Population Modeling**: WorldPop API for accurate casualty estimates
- **3D Visualization**: Interactive orbital trajectories and impact zone mapping
- **Mitigation Testing**: Deflection scenario analysis (kinetic impactors, gravity tractors)
- **"Impactor-2025" Ready**: Simulates the challenge's hypothetical asteroid scenario

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "NASA_API_KEY=DEMO_KEY" > .env
python main.py  # Runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5000" > .env
npm run dev  # Runs on http://localhost:5173
```

## Scientific Implementation

**Based on extensive peer-reviewed research** ([full research documentation](https://www.perplexity.ai/page/scientific-replacements-for-na-px4wbRtNRnSsIyAH0YYo7A)):

- **Asteroid Density**: Taxonomic classification using H-magnitude (Carry 2012)
- **Impact Physics**: Collins crater scaling laws with atmospheric entry effects
- **Population Data**: WorldPop API for real-time coordinate-based density
- **Casualty Estimates**: Nuclear test mortality rates (Glasstone & Dolan 1977)
- **Historical Validation**: 53% accuracy against Tunguska and Chelyabinsk events

## Technology Stack

**Frontend**: React 18, SpaceKit.js (3D), Leaflet (mapping), D3.js  
**Backend**: FastAPI, NASA NEO API, WorldPop API, OpenAI GPT-4  
**Physics**: Validated against historical impact events using peer-reviewed formulas

## System Architecture
<img width="4497" height="1188" alt="image" src="https://github.com/user-attachments/assets/cb733e6d-45ec-430b-aab3-9c00a48c638a" />


## API Example

```json
POST /api/simulate-impact
{
  "asteroid_name": "Impactor-2025",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "custom_density": 2500
}

Response:
{
  "crater_diameter": 1200,
  "blast_zones": {"severe_damage": 8.0, "moderate_damage": 15.2},
  "estimated_casualties": 145000,
  "population_density": 1847
}
```

## Challenge Objectives Met

- Interactive visualization tool with 3D asteroid trajectories  
- NASA NEO API integration with real asteroid characteristics  
- USGS dataset integration for environmental impact modeling  
- Physics-based impact consequence prediction  
- Mitigation strategy evaluation and visualization  
- Multi-audience accessibility (scientists to public)

---

**Links**: [Challenge Details](https://www.spaceappschallenge.org/2025/challenges/meteor-madness/) | [Research Documentation](https://www.perplexity.ai/page/scientific-replacements-for-na-px4wbRtNRnSsIyAH0YYo7A)

_Transforming asteroid threat data into actionable planetary defense intelligence_
