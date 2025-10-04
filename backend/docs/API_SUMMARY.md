# Asteroid Defense Command API - Enhanced Version

## Base URL
`http://localhost:5001`

---

## Endpoints

### 1. Health Check
**GET** `/`

Returns API status.

```bash
curl http://localhost:5001/
```

Response:
```json
{"status": "online", "service": "Asteroid Defense Command API"}
```

---

### 2. Current Threats (Enhanced)
**GET** `/api/threats/current`

Returns top 10 closest asteroids approaching Earth in the next 7 days with **full data**.

```bash
curl http://localhost:5001/api/threats/current
```

**Enhanced Response includes:**
- ✅ Mass calculations (kg)
- ✅ Diameter min/max/average (meters)
- ✅ Kinetic energy (joules & megatons TNT) for each approach
- ✅ All close approach dates
- ✅ Absolute magnitude
- ✅ Orbital data (if available)

Example Response:
```json
{
  "count": 10,
  "asteroids": [
    {
      "id": "54549118",
      "name": "(2025 SP23)",
      "absolute_magnitude_h": 25.468,
      "estimated_diameter_min_m": 21.43,
      "estimated_diameter_max_m": 47.91,
      "is_potentially_hazardous": false,
      "average_diameter_m": 34.67,
      "estimated_mass_kg": 65455738.57,
      "close_approach_data": [
        {
          "close_approach_date": "2025-10-09",
          "relative_velocity_km_s": 14.76,
          "miss_distance_km": 494631.76,
          "orbiting_body": "Earth",
          "kinetic_energy_joules": 7.13e+15,
          "kinetic_energy_megatons_tnt": 1.70
        }
      ],
      "orbital_data": null
    }
  ]
}
```

---

### 3. Browse Asteroids (NEW!)
**GET** `/api/asteroids/browse?page=0&size=20`

Browse NASA's asteroid database with **complete historical close approach data**.

**Perfect for finding famous asteroids like Eros with ALL their historical approaches!**

```bash
curl "http://localhost:5001/api/asteroids/browse?page=0&size=20"
```

Query Parameters:
- `page` (int, default: 0) - Page number
- `size` (int, default: 20, max: 20) - Results per page

Response:
```json
{
  "page": 0,
  "total_pages": 1234,
  "count": 20,
  "asteroids": [
    {
      "id": "2000433",
      "name": "433 Eros (A898 PA)",
      "absolute_magnitude_h": 10.39,
      "estimated_diameter_min_m": 22210.33,
      "estimated_diameter_max_m": 49663.80,
      "is_potentially_hazardous": false,
      "average_diameter_m": 35937.07,
      "estimated_mass_kg": 7.29e+16,
      "close_approach_data": [
        {
          "close_approach_date": "1900-12-27",
          "relative_velocity_km_s": 5.58,
          "miss_distance_km": 47112732.93,
          "orbiting_body": "Earth",
          "kinetic_energy_joules": 1.13e+24,
          "kinetic_energy_megatons_tnt": 271131195
        },
        ... // 33 more historical approaches!
      ],
      "orbital_data": null
    }
  ]
}
```

---

### 4. Get Specific Asteroid (NEW!)
**GET** `/api/asteroid/{asteroid_id}`

Get detailed data for a specific asteroid by ID.

```bash
curl http://localhost:5001/api/asteroid/2000433
```

Response: Same format as browse endpoint, single asteroid with all approaches.

---

### 5. Calculate Impact
**POST** `/api/calculate-impact`

Calculate asteroid impact physics.

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

Request Body:
```json
{
  "size_m": 500,        // 10-10000
  "speed_km_s": 25,     // 10-70
  "lat": 40.7128,       // -90 to 90
  "lon": -74.0060,      // -180 to 180
  "angle": 45           // 15-90 (optional, default: 45)
}
```

Response:
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

---

## Example: Get Eros Data with All Historical Approaches

```bash
# Browse to find Eros
curl -s "http://localhost:5001/api/asteroids/browse?page=0&size=5" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
eros = [a for a in data['asteroids'] if 'Eros' in a['name']][0]
print(f\"Name: {eros['name']}\")
print(f\"Mass: {eros['estimated_mass_kg']:.2e} kg\")
print(f\"Diameter: {eros['average_diameter_m']:.0f}m\")
print(f\"Total approaches: {len(eros['close_approach_data'])}\")
print(f\"\nHistorical approaches:\")
for a in eros['close_approach_data'][:5]:
    print(f\"  {a['close_approach_date']}: {a['miss_distance_km']:.0f}km, {a['kinetic_energy_megatons_tnt']:.0f} MT\")
"
```

Output:
```
Name: 433 Eros (A898 PA)
Mass: 7.29e+16 kg
Diameter: 35937m
Total approaches: 34

Historical approaches:
  1900-12-27: 47112733km, 271131195 MT
  1907-11-05: 70533233km, 168245398 MT
  1917-04-20: 74687815km, 202134480 MT
  1924-03-05: 53823292km, 184033323 MT
  1931-01-30: 26040972km, 305414434 MT
```

---

## Key Features

### ✅ What's New:
1. **Mass calculations** - Pre-computed for all asteroids
2. **Kinetic energy** - Calculated for every close approach
3. **Historical data** - Browse endpoint shows ALL approaches (100+ years)
4. **Famous asteroids** - Easy access to Eros, Apophis, etc.
5. **Complete dataset** - Min/max/avg diameter, magnitude, orbital data

### 🔥 Use Cases:
- **Frontend visualization**: Plot all Eros approaches over time
- **Impact simulator**: Use pre-calculated kinetic energy
- **3D rendering**: Show orbital paths with actual orbital elements
- **Historical analysis**: Compare past approaches to future ones

---

## Interactive Docs
Visit: `http://localhost:5001/docs`

---

## Error Codes
- `200` - Success
- `404` - Asteroid not found
- `422` - Validation error (invalid parameters)
- `429` - NASA API rate limit
- `503` - NASA API unavailable

---

## Notes
- NASA API limited to 1000 requests/hour
- Browse endpoint returns max 20 asteroids per page
- All kinetic energy assumes rocky asteroid (3000 kg/m³ density)
- Mass = (4/3)πr³ × 3000 kg/m³
- Kinetic Energy = 0.5 × mass × velocity²
