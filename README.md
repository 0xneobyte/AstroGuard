# AstroGuard - Near-Earth Asteroid Threat Assessment System

**NASA Space Apps Challenge 2024 Submission**

## Overview

AstroGuard is a scientifically accurate asteroid impact assessment platform that transforms NASA's Near-Earth Object data into actionable threat intelligence. Built during the NASA Space Apps hackathon, this system provides real-time asteroid tracking, precise impact simulations, and comprehensive threat visualization capabilities.

## Key Features

### Scientific Accuracy
- **NASA-Grade Physics**: Implements Collins crater scaling laws and peer-reviewed impact formulas
- **Real Population Data**: Integrates WorldPop API for accurate casualty estimates
- **Atmospheric Modeling**: Accounts for atmospheric entry deceleration effects
- **Historical Validation**: Validated against Tunguska (1908) and Chelyabinsk (2013) events

### Visualization & Analysis
- **3D Space Visualization**: Interactive orbital trajectories using SpaceKit.js
- **Impact Zone Mapping**: Geographic visualization of blast zones and crater formation
- **Real-Time NEO Data**: Live asteroid tracking from NASA's Small-Body Database
- **Multiple Asteroid Loading**: Simultaneous visualization of current NEO threats

### AI-Powered Assistance
- **Threat Analysis**: Context-aware AI assistant for impact scenario evaluation
- **Automatic Summarization**: Generate detailed threat assessments
- **Mitigation Planning**: Analysis of deflection strategies and intervention timelines

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API Key (optional, for AI features)

### Installation

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment variables
echo "NASA_API_KEY=DEMO_KEY" > .env
echo "OPENAI_API_KEY=your_openai_key" >> .env

python main.py
```

Backend available at: `http://localhost:5000`

#### Frontend Setup
```bash
cd frontend
npm install

# Configure API endpoint
echo "VITE_API_URL=http://localhost:5000" > .env

npm run dev
```

Frontend available at: `http://localhost:5173`

## Architecture

### Backend (FastAPI)
- **physics.py**: Scientific impact calculations and Collins crater scaling
- **main.py**: REST API endpoints and AI integration
- **External APIs**: NASA NEO Database, WorldPop population data

### Frontend (React + Vite)
- **SpacekitView**: 3D orbital visualization and asteroid rendering
- **MapView**: Geographic impact visualization using Leaflet
- **AIChatbot**: OpenAI-powered threat analysis assistant
- **Sidebar**: Control panel for asteroid selection and simulation parameters

## API Endpoints

### Asteroid Data
- `GET /api/asteroids` - Get all asteroids
- `GET /api/asteroids/{id}` - Get specific asteroid

### Impact Simulation
- `POST /api/simulate-impact` - Calculate impact parameters
  ```json
  {
    "mass": 1000000000,
    "velocity": 20000,
    "latitude": 40.7128,
    "longitude": -74.0060
  }
  ```

### Mitigation
- `POST /api/deflection` - Calculate deflection trajectory
  ```json
  {
    "mass": 1000000000,
    "velocity": 20000,
    "method": "kinetic_impactor"
  }
  ```

### AI Chatbot
- `POST /api/ai/chat` - Conversational AI
  ```json
  {
    "message": "What's the danger level?",
    "context": { "asteroid": "...", "impact": "..." }
  }
  ```
- `POST /api/ai/summary` - Generate threat summary
  ```json
  {
    "asteroid": { ... },
    "impact": { ... }
  }
  ```

## Technologies

### Frontend
- **React 18** - UI framework
- **Zustand** - State management
- **SpaceKit.js** - 3D space visualization
- **Leaflet** - Interactive maps
- **Vite** - Build tool

### Backend
- **FastAPI** - Python web framework
- **OpenAI API** - GPT-4o-mini for AI chatbot
- **NASA NEO API** - Asteroid data source
- **Uvicorn** - ASGI server

## Cost Estimate

**Development:** Free
**Production (DigitalOcean):**
- Droplet: $12/month (2GB RAM)
- OpenAI API: ~$1-5/month (1000 conversations)
- Total: ~$13-17/month

## Troubleshooting

### AI Chatbot Not Working
1. Check backend logs: `pm2 logs astroguard-backend`
2. Verify OpenAI API key in backend/.env
3. Confirm frontend VITE_API_URL matches your backend URL
4. Rebuild frontend: `npm run build`

### Backend Errors
```bash
# Check Python environment
cd backend
source venv/bin/activate
python main.py

# Check environment variables
cat .env
```

### Frontend Build Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Contributing
Contributions welcome! Please open an issue or PR.

## License
MIT License

## Acknowledgments
- NASA Near-Earth Object Program
- SpaceKit.js
- OpenAI GPT-4o-mini

---

**Built for NASA Space Apps Challenge 2024** 🚀