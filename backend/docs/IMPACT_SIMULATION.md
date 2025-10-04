# Impact Simulation Data Flow 💥

## 🗺️ Complete Journey: Map Click → Simulation Results

### Step-by-Step Process

```
User clicks map → Location saved → Click "Simulate" → Backend calculates → Results displayed
```

## 📍 Step 1: User Clicks on Map

**File:** `frontend/src/components/MapView.jsx`

```javascript
function MapClickHandler() {
  const setImpactLocation = useStore((state) => state.setImpactLocation);

  useMapEvents({
    click: (e) => {
      // User clicks anywhere on map
      setImpactLocation({
        lat: e.latlng.lat, // Example: 40.7128 (New York)
        lon: e.latlng.lng, // Example: -74.0060
      });
    },
  });
}
```

**What happens:**

- ✅ Map click event captured
- ✅ Latitude and longitude extracted
- ✅ Saved to global state (Zustand store)
- ✅ Red marker appears on map
- ✅ "SIMULATE IMPACT" button appears in sidebar

## 🎯 Step 2: Location Stored in State

**File:** `frontend/src/store/useStore.js`

```javascript
const useStore = create((set) => ({
  // Impact location saved here
  impactLocation: { lat: 40.7128, lon: -74.006 }, // New York

  // Other relevant state:
  selectedAsteroid: {
    /* asteroid data */
  }, // If in THREATS mode
  simulatorParams: {
    // If in SIMULATOR mode
    size_m: 500, // 500 meters diameter
    speed_km_s: 25, // 25 km/s velocity
    angle: 45, // 45° entry angle
  },
}));
```

## 🚀 Step 3: User Clicks "SIMULATE IMPACT"

**File:** `frontend/src/components/Sidebar.jsx`

```javascript
const handleSimulateImpact = async () => {
  if (!impactLocation) {
    alert("Please click on the map to select an impact location");
    return;
  }

  setLoading(true);

  let results;

  if (mode === "THREATS" && selectedAsteroid) {
    // 🌍 REAL ASTEROID MODE
    // Uses actual NASA asteroid data
    results = await simulateRealImpact(
      selectedAsteroid.id, // "54051399"
      impactLocation.lat, // 40.7128
      impactLocation.lon // -74.0060
    );
    setImpactResults(results.simulated_impact);
  } else {
    // 🎮 CUSTOM SIMULATOR MODE
    // Uses user-defined parameters
    results = await calculateImpact({
      size_m: simulatorParams.size_m, // 500
      speed_km_s: simulatorParams.speed_km_s, // 25
      angle: simulatorParams.angle, // 45
      lat: impactLocation.lat, // 40.7128
      lon: impactLocation.lon, // -74.0060
    });
    setImpactResults(results);
  }
};
```

## 🔀 Two Different Simulation Modes

### Mode 1: REAL THREATS (Real Asteroid)

**API Call:**

```
POST http://localhost:5001/api/simulate-real-impact
{
  "asteroid_id": "54051399",
  "lat": 40.7128,
  "lon": -74.0060,
  "angle": 45
}
```

**Backend (`main.py` line 518):**

```python
@app.post("/api/simulate-real-impact")
async def simulate_real_impact(request: SimulateRealImpactRequest):
    # 1. Fetch real asteroid data from NASA
    url = f"{NASA_BASE_URL}/neo/{request.asteroid_id}"
    response = requests.get(url, params={"api_key": NASA_API_KEY})
    asteroid = response.json()

    # 2. Extract real parameters
    diameter_min = asteroid["estimated_diameter"]["meters"]["estimated_diameter_min"]
    diameter_max = asteroid["estimated_diameter"]["meters"]["estimated_diameter_max"]
    avg_diameter = (diameter_min + diameter_max) / 2  # 31.4 meters

    velocity_km_s = asteroid["close_approach_data"][0]["relative_velocity"]["kilometers_per_second"]  # 13.6 km/s

    # 3. Calculate impact using REAL asteroid parameters
    impact_result = calculate_impact(
        size_m=int(avg_diameter),     # 31 meters
        speed_km_s=velocity_km_s,     # 13.6 km/s
        angle=request.angle,          # 45°
        lat=request.lat,              # 40.7128
        lon=request.lon               # -74.0060
    )
```

### Mode 2: SIMULATOR (Custom Parameters)

**API Call:**

```
POST http://localhost:5001/api/calculate-impact
{
  "size_m": 500,
  "speed_km_s": 25,
  "angle": 45,
  "lat": 40.7128,
  "lon": -74.0060
}
```

**Backend (`main.py` line 494):**

```python
@app.post("/api/calculate-impact")
async def calculate_impact_endpoint(impact: ImpactRequest):
    # Use user's custom parameters
    result = calculate_impact(
        size_m=impact.size_m,          # 500 meters
        speed_km_s=impact.speed_km_s,  # 25 km/s
        angle=impact.angle,            # 45°
        lat=impact.lat,                # 40.7128
        lon=impact.lon                 # -74.0060
    )
    return result
```

## 🧮 Step 4: Physics Calculations

**File:** `backend/physics.py`

All data is calculated using **real physics formulas**:

### 1️⃣ Mass Calculation

```python
radius_m = size_m / 2                    # 250 meters
volume_m3 = (4/3) × π × radius³         # 65,449,847 m³
density = 3000 kg/m³                     # Rocky asteroid
mass_kg = volume × density               # 196,349,540,800 kg
```

### 2️⃣ Kinetic Energy

```python
velocity_m_s = speed_km_s × 1000        # 25,000 m/s
energy_joules = 0.5 × mass × velocity²  # 6.14 × 10^16 joules
energy_megatons = joules / 4.184e15     # 14,679 megatons TNT
```

### 3️⃣ Crater Size

```python
# Formula: D = 1.8 × (E^0.25) × (ρ^-0.33) × sin(θ)^0.33
target_density = 2500 kg/m³  # Earth's crust
angle_rad = radians(45°)

crater_diameter_km = 1.8 × (energy^0.25) × (density^-0.33) × (sin(angle)^0.33)
# Result: 8.67 km diameter

crater_depth_km = diameter × 0.3
# Result: 2.60 km depth
```

### 4️⃣ Damage Zones

```python
tnt_tons = megatons × 1,000,000

# Overpressure zones:
total_destruction  = 0.28 × (tons^(1/3))  # 20 psi - 6.79 km
severe_damage      = 0.52 × (tons^(1/3))  # 5 psi  - 12.60 km
moderate_damage    = 1.00 × (tons^(1/3))  # 1 psi  - 24.23 km

# Thermal:
thermal_burns      = 0.15 × (tons^0.41)   # 3rd degree - 41.98 km
```

### 5️⃣ Death Estimate

```python
area_km2 = π × radius²                  # 144.83 km²
population_density = 1000 people/km²     # Urban average
casualty_rate = 0.7                      # 70% in destruction zone

deaths = area × density × rate          # 101,381 people
```

### 6️⃣ Comparison

```python
hiroshima = 0.015 megatons

if energy < hiroshima:
    return f"{energy*1000} kilotons"
elif energy < 15:
    return f"{energy/hiroshima}x Hiroshima bomb"
elif 10 <= energy <= 20:
    return "Tunguska event scale"
else:
    return f"{energy} megatons (major catastrophe)"
```

## 📤 Step 5: Results Sent Back

**Backend Response:**

```json
{
  "energy_megatons": 14679.3,
  "crater_diameter_km": 8.67,
  "crater_depth_km": 2.6,
  "damage_zones": [
    {
      "radius_km": 41.98,
      "type": "thermal_burns",
      "color": "pink"
    },
    {
      "radius_km": 24.23,
      "type": "moderate_damage",
      "color": "yellow"
    },
    {
      "radius_km": 12.6,
      "type": "severe_damage",
      "color": "orange"
    },
    {
      "radius_km": 6.79,
      "type": "total_destruction",
      "color": "red"
    },
    {
      "radius_km": 4.34,
      "type": "crater",
      "color": "black"
    }
  ],
  "deaths_estimated": 101381,
  "comparison": "14679 megatons (civilization-threatening)"
}
```

## 🗺️ Step 6: Results Displayed on Map

**File:** `frontend/src/components/MapView.jsx`

```javascript
function DamageZones() {
  const impactLocation = useStore((state) => state.impactLocation);
  const impactResults = useStore((state) => state.impactResults);

  if (!impactLocation || !impactResults) return null;

  const { lat, lon } = impactLocation;
  const zones = impactResults.damage_zones;

  return (
    <>
      {zones.map((zone, index) => (
        <Circle
          key={index}
          center={[lat, lon]}
          radius={zone.radius_km * 1000} // Convert km to meters
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.3,
            weight: 2,
          }}
        />
      ))}
      <Marker position={[lat, lon]} />
    </>
  );
}
```

**What you see on map:**

- 🟣 Pink circle = Thermal burns (41.98 km radius)
- 🟡 Yellow circle = Moderate damage (24.23 km)
- 🟠 Orange circle = Severe damage (12.60 km)
- 🔴 Red circle = Total destruction (6.79 km)
- ⚫ Black circle = Crater (4.34 km)
- 📍 Red marker = Impact point

## 📊 Step 7: Results Displayed in Sidebar

**File:** `frontend/src/components/Sidebar.jsx`

```javascript
{
  impactResults && (
    <div className="results-panel">
      <h3>Impact Results</h3>
      <div className="result-item">
        <strong>Energy:</strong> {impactResults.energy_megatons.toFixed(1)}{" "}
        megatons
      </div>
      <div className="result-item">
        <strong>Crater:</strong> {impactResults.crater_diameter_km.toFixed(2)}{" "}
        km diameter
      </div>
      <div className="result-item">
        <strong>Depth:</strong> {impactResults.crater_depth_km.toFixed(2)} km
      </div>
      <div className="result-item">
        <strong>Estimated Deaths:</strong>{" "}
        {impactResults.deaths_estimated.toLocaleString()}
      </div>
      <div className="comparison">{impactResults.comparison}</div>
    </div>
  );
}
```

## 🎯 Complete Data Sources

### Real Asteroid Mode (THREATS)

```
NASA API → Backend → Physics Calculation → Frontend
```

**Data from NASA:**

- ✅ Asteroid size (diameter)
- ✅ Asteroid velocity
- ❌ Angle (user default: 45°)
- ❌ Location (user clicks map)

**Calculated by backend:**

- ✅ Mass (from size + density)
- ✅ Kinetic energy
- ✅ Crater size
- ✅ Damage zones
- ✅ Death estimate
- ✅ Comparison

### Custom Simulator Mode

```
User Input → Backend → Physics Calculation → Frontend
```

**Data from user:**

- ✅ Asteroid size (slider)
- ✅ Asteroid velocity (slider)
- ✅ Angle (slider)
- ✅ Location (map click)

**Calculated by backend:**

- ✅ Everything else (same as above)

## 🧪 Example: Real Asteroid Impact

**Asteroid (2020 QU5):**

- Size: 31 meters
- Speed: 13.6 km/s
- Location: New York (40.71, -74.01)

**Calculation:**

1. Mass = 48.8 million kg
2. Energy = 4.5 billion joules = 1.08 megatons
3. Crater = 0.18 km diameter
4. Total destruction = 1.3 km radius
5. Deaths ≈ 3,000

**Comparison:** "72x Hiroshima bomb"

## 🎮 Example: Custom Impact

**User Settings:**

- Size: 1000 meters
- Speed: 30 km/s
- Location: Tokyo (35.68, 139.76)

**Calculation:**

1. Mass = 1.57 billion kg
2. Energy = 707 trillion joules = 169,000 megatons
3. Crater = 15.2 km diameter
4. Total destruction = 17.8 km radius
5. Deaths ≈ 700,000

**Comparison:** "169000 megatons (civilization-threatening)"

## 📝 Summary

**NO data comes from the 3D visualization!**

The Spacekit 3D view is **only for showing the orbit**. The impact simulation data comes from:

1. **NASA API** (if real asteroid)

   - Fetched when you click asteroid
   - Provides size and velocity

2. **User Input**

   - Map click (location)
   - Sliders (size, speed, angle)

3. **Physics Engine** (`physics.py`)

   - Calculates everything else
   - Uses real scientific formulas

4. **Map Display**
   - Shows colored circles
   - Each circle = damage zone

The 3D orbit and 2D impact map are **completely separate systems**! 🎯
