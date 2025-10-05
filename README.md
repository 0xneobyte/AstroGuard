# 🌍 ASTROGUARD - Near-Earth Asteroid Threat Assessment System

## Overview
ASTROGUARD is a comprehensive asteroid threat assessment and visualization platform that combines NASA's Near-Earth Object data with AI-powered analysis and 3D visualization capabilities.

## Features

### 🎯 Core Features
- **Real-Time Asteroid Tracking**: Browse real and simulated potentially hazardous asteroids
- **Impact Simulation**: Calculate and visualize potential impact zones and damage
- **3D Visualization**: Interactive SpaceKit-powered 3D models and simulations
- **Mitigation Strategies**: Analyze kinetic impactor deflection scenarios
- **AI Chatbot**: GPT-4o-mini powered assistant for asteroid threat analysis

### 🤖 AI Assistant
- Context-aware Q&A about asteroid threats
- Automatic threat summary generation
- Real-time conversation about impact scenarios
- Mitigation strategy recommendations

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API Key (for AI chatbot)

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "NASA_API_KEY=DEMO_KEY" > .env
echo "OPENAI_API_KEY=your_key_here" >> .env

python main.py
```

Backend runs on: http://localhost:5000

#### Frontend
```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000" > .env

npm run dev
```

Frontend runs on: http://localhost:5173

## 🚀 Production Deployment

### DigitalOcean Deployment (Recommended)

We provide a complete deployment guide and automated setup script for DigitalOcean.

**Quick Deploy:**
```bash
# On your DigitalOcean droplet
wget https://raw.githubusercontent.com/yourusername/AstroNuts-Nasa-Space-Apps/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

**Manual Setup:**
See [DIGITALOCEAN_DEPLOYMENT.md](DIGITALOCEAN_DEPLOYMENT.md) for detailed instructions.

### Environment Variables

#### Frontend (.env.production)
```bash
VITE_API_URL=https://yourdomain.com  # Or http://your-droplet-ip:5000
```

#### Backend (.env)
```bash
NASA_API_KEY=DEMO_KEY
OPENAI_API_KEY=sk-proj-your-key-here
```

## Project Structure

```
AstroNuts-Nasa-Space-Apps/
├── backend/              # FastAPI backend
│   ├── main.py          # API endpoints + AI integration
│   ├── physics.py       # Impact & deflection calculations
│   └── requirements.txt
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── AIChatbot.jsx      # AI assistant
│   │   │   ├── MapView.jsx        # Leaflet map
│   │   │   ├── Sidebar.jsx        # Navigation
│   │   │   └── SpacekitView.jsx   # 3D visualization
│   │   ├── services/
│   │   │   └── api.js   # API client
│   │   └── store/
│   │       └── useStore.js # Zustand state management
│   └── spacekit/        # SpaceKit.js demos
├── deploy.sh            # Automated deployment script
└── DIGITALOCEAN_DEPLOYMENT.md  # Deployment guide
```

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