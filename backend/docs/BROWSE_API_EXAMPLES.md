# Browse API Examples

## Basic Usage

### 1. Get First Page (20 asteroids with full orbital data)
```bash
curl http://localhost:5001/api/asteroids/browse
```

### 2. Get Specific Page
```bash
curl "http://localhost:5001/api/asteroids/browse?page=5"
```

### 3. Control Page Size (max 20)
```bash
curl "http://localhost:5001/api/asteroids/browse?page=0&size=10"
```

---

## Example Responses

### Get First 5 Asteroids
```bash
curl "http://localhost:5001/api/asteroids/browse?size=5"
```

Response:
```json
{
  "page": 0,
  "total_pages": 1234,
  "count": 5,
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
          "kinetic_energy_megatons_tnt": 271131195.22
        },
        // ... 33 more historical approaches
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

---

## Practical Examples

### Example 1: Find Famous Asteroids (Eros)
```bash
curl -s "http://localhost:5001/api/asteroids/browse?size=5" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)

# Find Eros
eros = [a for a in data['asteroids'] if 'Eros' in a['name']][0]

print(f\"🌑 {eros['name']}\")
print(f\"Diameter: {eros['average_diameter_m']:.0f}m (~{eros['average_diameter_m']/1000:.1f}km)\")
print(f\"Mass: {eros['estimated_mass_kg']:.2e} kg\")
print(f\"Orbital Period: {eros['orbital_data']['orbital_period_days']:.1f} days (~{eros['orbital_data']['orbital_period_days']/365:.1f} years)\")
print(f\"Orbit Type: {eros['orbital_data']['orbit_class_type']}\")
print(f\"Total Approaches: {len(eros['close_approach_data'])}\")
"
```

Output:
```
🌑 433 Eros (A898 PA)
Diameter: 35937m (~35.9km)
Mass: 7.29e+16 kg
Orbital Period: 643.1 days (~1.8 years)
Orbit Type: AMO
Total Approaches: 34
```

---

### Example 2: Get All Eros Close Approaches
```bash
curl -s "http://localhost:5001/api/asteroids/browse?size=5" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
eros = [a for a in data['asteroids'] if 'Eros' in a['name']][0]

print(f\"All {len(eros['close_approach_data'])} close approaches for Eros:\n\")
for i, approach in enumerate(eros['close_approach_data'][:10], 1):
    date = approach['close_approach_date']
    distance = approach['miss_distance_km']
    energy = approach['kinetic_energy_megatons_tnt']
    print(f\"{i:2d}. {date}: {distance:,.0f} km away, {energy:,.0f} MT potential energy\")

if len(eros['close_approach_data']) > 10:
    print(f\"\\n... and {len(eros['close_approach_data']) - 10} more approaches\")
"
```

Output:
```
All 34 close approaches for Eros:

 1. 1900-12-27: 47,112,733 km away, 271,131,195 MT potential energy
 2. 1907-11-05: 70,533,233 km away, 168,245,398 MT potential energy
 3. 1917-04-20: 74,687,815 km away, 202,134,480 MT potential energy
 4. 1924-03-05: 53,823,292 km away, 184,033,323 MT potential energy
 5. 1931-01-30: 26,040,972 km away, 305,414,434 MT potential energy
 6. 1938-01-13: 32,164,326 km away, 322,486,804 MT potential energy
 7. 1944-11-27: 60,289,296 km away, 114,552,688 MT potential energy
 8. 1961-04-04: 66,195,880 km away, 119,775,280 MT potential energy
 9. 1968-02-11: 39,833,635 km away, 320,669,443 MT potential energy
10. 1975-01-23: 22,609,353 km away, 295,640,409 MT potential energy

... and 24 more approaches
```

---

### Example 3: Find Hazardous Asteroids
```bash
curl -s "http://localhost:5001/api/asteroids/browse?size=20" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)

hazardous = [a for a in data['asteroids'] if a['is_potentially_hazardous']]

print(f\"Found {len(hazardous)} potentially hazardous asteroids:\n\")
for i, ast in enumerate(hazardous[:5], 1):
    print(f\"{i}. {ast['name']}\")
    print(f\"   Size: {ast['average_diameter_m']:.0f}m\")
    print(f\"   Approaches: {len(ast['close_approach_data'])}\")
    if ast['close_approach_data']:
        closest = min(ast['close_approach_data'], key=lambda x: x['miss_distance_km'])
        print(f\"   Closest approach: {closest['close_approach_date']} at {closest['miss_distance_km']:,.0f}km\")
    print()
"
```

---

### Example 4: Visualize Orbital Data
```bash
curl -s "http://localhost:5001/api/asteroids/browse?size=10" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)

print(\"Asteroid Orbital Parameters:\\n\")
print(f\"{'Name':<30} {'Semi-major axis':>15} {'Eccentricity':>12} {'Orbit Type':>12}\")
print(\"-\" * 75)

for ast in data['asteroids'][:10]:
    if ast['orbital_data']:
        od = ast['orbital_data']
        name = ast['name'][:28]
        sma = f\"{od['semi_major_axis_au']:.3f} AU\" if od['semi_major_axis_au'] else 'N/A'
        ecc = f\"{od['eccentricity']:.3f}\" if od['eccentricity'] else 'N/A'
        orbit_type = od['orbit_class_type'] or 'N/A'
        print(f\"{name:<30} {sma:>15} {ecc:>12} {orbit_type:>12}\")
"
```

Output:
```
Asteroid Orbital Parameters:

Name                           Semi-major axis  Eccentricity   Orbit Type
---------------------------------------------------------------------------
433 Eros (A898 PA)                   1.458 AU        0.223          AMO
719 Albert (A911 TB)                 2.629 AU        0.552          AMO
887 Alinda (A918 AA)                 2.477 AU        0.567          AMO
1036 Ganymed (A924 UB)               2.662 AU        0.534          AMO
1221 Amor (A932 EA1)                 1.920 AU        0.435          AMO
```

---

### Example 5: Get Specific Asteroid by ID
```bash
# Once you know the ID from browse, get full details
curl http://localhost:5001/api/asteroid/2000433
```

---

### Example 6: Pagination - Get Next Pages
```bash
# Get page 0 (first 20)
curl "http://localhost:5001/api/asteroids/browse?page=0&size=20"

# Get page 1 (next 20)
curl "http://localhost:5001/api/asteroids/browse?page=1&size=20"

# Get page 2 (next 20)
curl "http://localhost:5001/api/asteroids/browse?page=2&size=20"
```

Check total pages:
```bash
curl -s "http://localhost:5001/api/asteroids/browse?page=0" | \
  python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Total pages: {data['total_pages']}\")"
```

---

### Example 7: Extract Data for 3D Visualization
```bash
curl -s "http://localhost:5001/api/asteroids/browse?size=10" | \
  python3 -c "
import sys, json, math
data = json.load(sys.stdin)

print(\"Asteroids for 3D Visualization:\n\")

for ast in data['asteroids']:
    if ast['orbital_data']:
        od = ast['orbital_data']

        # Calculate orbital points (simplified)
        a = od['semi_major_axis_au']
        e = od['eccentricity']

        if a and e:
            perihelion = a * (1 - e)
            aphelion = a * (1 + e)

            print(f\"{ast['name'][:30]}\")
            print(f\"  Semi-major axis: {a:.3f} AU\")
            print(f\"  Perihelion: {perihelion:.3f} AU\")
            print(f\"  Aphelion: {aphelion:.3f} AU\")
            print(f\"  Inclination: {od['inclination_deg']:.2f}°\")
            print()
"
```

---

## Use Cases for Frontend

### 1. Timeline Visualization
Get all historical approaches and plot on timeline:
```javascript
fetch('http://localhost:5001/api/asteroids/browse?size=5')
  .then(r => r.json())
  .then(data => {
    const eros = data.asteroids.find(a => a.name.includes('Eros'));
    const timeline = eros.close_approach_data.map(a => ({
      date: a.close_approach_date,
      distance: a.miss_distance_km,
      energy: a.kinetic_energy_megatons_tnt
    }));
    // Plot timeline...
  });
```

### 2. 3D Orbital Path
Use orbital elements to draw orbit:
```javascript
fetch('http://localhost:5001/api/asteroids/browse?size=20')
  .then(r => r.json())
  .then(data => {
    data.asteroids.forEach(asteroid => {
      if (asteroid.orbital_data) {
        const { semi_major_axis_au, eccentricity, inclination_deg } = asteroid.orbital_data;
        // Draw orbital ellipse in Three.js...
      }
    });
  });
```

### 3. Filter Hazardous Asteroids
```javascript
fetch('http://localhost:5001/api/asteroids/browse?size=20')
  .then(r => r.json())
  .then(data => {
    const hazardous = data.asteroids.filter(a => a.is_potentially_hazardous);
    console.log(`Found ${hazardous.length} hazardous asteroids`);
  });
```

---

## Quick Reference

| Endpoint | Purpose | Orbital Data? |
|----------|---------|---------------|
| `/api/threats/current` | Upcoming threats (next 7 days) | ❌ No |
| `/api/asteroids/browse` | Full database with history | ✅ Yes |
| `/api/asteroid/{id}` | Single asteroid details | ✅ Yes |

**Pro Tip:** Use `/browse` for:
- Historical analysis
- Orbital visualization
- Complete asteroid data
- Famous asteroids (Eros, Apophis, etc.)
