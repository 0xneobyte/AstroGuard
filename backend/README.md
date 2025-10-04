# Asteroid Defense Command - Backend API

Real-time asteroid threat monitoring and impact simulation API using NASA data.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

**API running at:** `http://localhost:5001`
**Interactive docs:** `http://localhost:5001/docs`

---

## 📡 Endpoints (6 Total)

### 1. Get Current Asteroid Threats
**Get real asteroids approaching Earth in next 7 days**

```bash
GET /api/threats/current
```

Returns all asteroids with mass, kinetic energy, and approach data.

<details>
<summary>Example Response</summary>

```json
{
  "count": 13,
  "asteroids": [
    {
      "id": "2477719",
      "name": "477719 (2010 SG15)",
      "absolute_magnitude_h": 26.7,
      "estimated_diameter_min_m": 11.65,
      "estimated_diameter_max_m": 26.05,
      "is_potentially_hazardous": false,
      "average_diameter_m": 18.85,
      "estimated_mass_kg": 10521234.56,
      "close_approach_data": [
        {
          "close_approach_date": "2025-10-09",
          "relative_velocity_km_s": 5.16,
          "miss_distance_km": 14627345.0,
          "orbiting_body": "Earth",
          "kinetic_energy_joules": 1.4e+14,
          "kinetic_energy_megatons_tnt": 0.28
        }
      ],
      "orbital_data": null
    }
  ]
}
```
</details>

---

### 2. Calculate Impact Physics
**Simulate asteroid impact anywhere on Earth**

```bash
POST /api/calculate-impact
Content-Type: application/json

{
  "size_m": 500,
  "speed_km_s": 25,
  "lat": 40.7128,
  "lon": -74.0060,
  "angle": 45
}
```

<details>
<summary>Example Response</summary>

```json
{
  "energy_megatons": 14665.208,
  "crater_diameter_km": 10.75,
  "crater_depth_km": 3.22,
  "damage_zones": [
    {
      "radius_km": 2209.38,
      "type": "thermal_burns",
      "color": "pink"
    },
    {
      "radius_km": 2447.73,
      "type": "moderate_damage",
      "color": "yellow"
    },
    {
      "radius_km": 1272.82,
      "type": "severe_damage",
      "color": "orange"
    },
    {
      "radius_km": 685.36,
      "type": "total_destruction",
      "color": "red"
    },
    {
      "radius_km": 5.37,
      "type": "crater",
      "color": "black"
    }
  ],
  "deaths_estimated": 1032974179,
  "comparison": "14665 megatons (civilization-threatening)"
}
```
</details>

**Parameters:**
- `size_m`: 10-10,000 (asteroid diameter in meters)
- `speed_km_s`: 10-70 (velocity)
- `lat`: -90 to 90 (latitude)
- `lon`: -180 to 180 (longitude)
- `angle`: 15-90 (entry angle, default 45°)

---

### 3. Simulate Real Asteroid Impact
**Use a real NASA asteroid's parameters to simulate impact**

```bash
POST /api/simulate-real-impact
Content-Type: application/json

{
  "asteroid_id": "2000433",
  "lat": 40.7128,
  "lon": -74.0060,
  "angle": 45
}
```

<details>
<summary>Example Response</summary>

```json
{
  "asteroid": {
    "id": "2000433",
    "name": "433 Eros (A898 PA)",
    "actual_miss_distance_km": 47112733,
    "size_m": 35937.07,
    "speed_km_s": 5.58
  },
  "simulated_impact": {
    "energy_megatons": 271129702,
    "crater_diameter_km": 125.31,
    "crater_depth_km": 37.59,
    "damage_zones": [...],
    "deaths_estimated": 722240835809,
    "comparison": "271129702 megatons (dinosaur extinction level)"
  },
  "warning": "⚠️ This is a simulation. This asteroid will NOT hit Earth.",
  "actual_close_approach": "1900-12-27"
}
```
</details>

**What it does:**
1. Fetches real asteroid data from NASA
2. Uses its actual size and speed
3. Simulates impact at your chosen location
4. Includes disclaimer about actual safety

---

### 4. Get Specific Asteroid
**Fetch detailed data for any asteroid by ID**

```bash
GET /api/asteroid/{asteroid_id}
```

Example:
```bash
curl http://localhost:5001/api/asteroid/2000433
```

Returns complete asteroid data including ALL historical close approaches.

---

### 5. Browse Asteroid Database
**Paginated access to NASA's asteroid database**

```bash
GET /api/asteroids/browse?page=0&size=20
```

Returns asteroids with **full orbital data** (semi-major axis, eccentricity, inclination, etc.).

<details>
<summary>Example Response</summary>

```json
{
  "page": 0,
  "total_pages": 1234,
  "count": 20,
  "asteroids": [
    {
      "id": "2000433",
      "name": "433 Eros (A898 PA)",
      "average_diameter_m": 35937.07,
      "estimated_mass_kg": 7.29e+16,
      "close_approach_data": [
        // 34 approaches from 1900-2187
      ],
      "orbital_data": {
        "semi_major_axis_au": 1.458,
        "eccentricity": 0.223,
        "inclination_deg": 10.83,
        "orbital_period_days": 643.12,
        "perihelion_distance_au": 1.133,
        "aphelion_distance_au": 1.783,
        "orbit_class_type": "AMO"
      }
    }
  ]
}
```
</details>

---

### 6. Health Check
**API status check**

```bash
GET /
```

Returns: `{"status": "online", "service": "Asteroid Defense Command API"}`

---

## 🔬 Physics Calculations

The impact calculator uses real physics:

1. **Mass** = (4/3)π × r³ × 3000 kg/m³
2. **Kinetic Energy** = 0.5 × mass × velocity²
3. **Crater Size** = 1.8 × (E^0.25) × (ρ^-0.33) × sin(angle)^0.33
4. **Damage Zones** = Overpressure-based radii (20 psi, 5 psi, 1 psi)
5. **Casualties** = Area × population density × 70%

### Damage Zone Types:
- 🔴 **Total Destruction** (20 psi) - Buildings collapse
- 🟠 **Severe Damage** (5 psi) - Major structural damage
- 🟡 **Moderate Damage** (1 psi) - Windows shatter
- 🌸 **Thermal Burns** - 3rd degree burns from fireball
- ⚫ **Crater** - Complete vaporization

---

## 🎯 Quick Examples

### Get Real Asteroids
```bash
curl http://localhost:5001/api/threats/current
```

### Simulate NYC Impact
```bash
curl -X POST http://localhost:5001/api/calculate-impact \
  -H "Content-Type: application/json" \
  -d '{
    "size_m": 500,
    "speed_km_s": 25,
    "lat": 40.7128,
    "lon": -74.0060,
    "angle": 45
  }'
```

### Simulate Real Asteroid (Eros) Hitting NYC
```bash
curl -X POST http://localhost:5001/api/simulate-real-impact \
  -H "Content-Type: application/json" \
  -d '{
    "asteroid_id": "2000433",
    "lat": 40.7128,
    "lon": -74.0060,
    "angle": 45
  }'
```

### Get Eros Asteroid
```bash
curl http://localhost:5001/api/asteroid/2000433
```

### Browse Database
```bash
curl "http://localhost:5001/api/asteroids/browse?page=0&size=5"
```

---

## 📚 Additional Documentation

- **[API Summary](API_SUMMARY.md)** - Complete endpoint reference
- **[Browse Examples](BROWSE_API_EXAMPLES.md)** - Browse endpoint usage
- **[Test Commands](TEST_COMMANDS.md)** - All curl test commands

---

## 🔑 Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your NASA API key:
```
NASA_API_KEY=your_key_here
NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1
```

Get a free NASA API key: https://api.nasa.gov

---

## 🌐 CORS

Development mode allows all origins. For production, update `main.py`:

```python
allow_origins=["https://your-frontend.vercel.app"]
```

---

## 📊 Data Features

### What We Provide Beyond Basic NASA Data:
- ✅ **Mass calculations** (pre-computed)
- ✅ **Kinetic energy** (for every approach)
- ✅ **Historical approaches** (100+ years of data)
- ✅ **Orbital elements** (for 3D visualization)
- ✅ **Pretty JSON** (auto-formatted responses)

### Example Use Cases:
1. **3D Visualization** - Use orbital data to draw asteroid orbits
2. **Timeline View** - Plot all historical approaches
3. **Impact Simulator** - Use real asteroid speeds/sizes
4. **Map Overlay** - Draw damage zones on Earth map

---

## 🛠️ Tech Stack

- **FastAPI** - Modern Python web framework
- **NASA NEO API** - Real asteroid data
- **NumPy** - Physics calculations
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

---

## 📝 API Response Format

All responses use pretty-printed JSON with 2-space indentation:

```json
{
  "field": "value",
  "nested": {
    "key": "value"
  }
}
```

---

## 🚨 Error Handling

| Code | Meaning |
|------|---------|
| 200 | Success |
| 404 | Asteroid not found |
| 422 | Invalid parameters |
| 429 | NASA API rate limit |
| 503 | NASA API unavailable |

Example error:
```json
{
  "detail": "Asteroid size must be between 10 and 10000 meters"
}
```

---

## 🔗 NASA API Integration

We use NASA's NeoWs (Near Earth Object Web Service):

- **Feed Endpoint**: Current threats (7-day window)
- **Lookup Endpoint**: Specific asteroid details
- **Browse Endpoint**: Full database access

Rate limit: 1000 requests/hour (with API key)

---

## 📈 Performance

- **Response time**: < 500ms average
- **Pretty JSON**: Auto-formatted (no performance impact)
- **Caching**: None (always fresh NASA data)

---

## 🎓 Learn More

- [NASA NeoWs API](https://api.nasa.gov/)
- [Impact Physics](https://en.wikipedia.org/wiki/Impact_event)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

## 📄 License

Built for NASA Space Apps Challenge 2025

---

**Questions?** Check the interactive docs at `http://localhost:5001/docs` 🚀
