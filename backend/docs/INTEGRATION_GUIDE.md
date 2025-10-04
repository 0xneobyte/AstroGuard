# Backend Integration Guide for Solar System 3D

Your team is using: https://github.com/N3rson/Solar-System-3D

## 🎯 Quick Start for Your Team

### **What They Need:**
1. API URL: `http://localhost:5001`
2. CORS: ✅ Already enabled
3. Docs: `http://localhost:5001/docs`

---

## 🌌 3D Team (Solar System Integration)

### **Fetch Asteroids with Orbital Data**
```javascript
// Get asteroids with orbital elements for 3D visualization
fetch('http://localhost:5001/api/asteroids/browse?size=10')
  .then(r => r.json())
  .then(data => {
    data.asteroids.forEach(asteroid => {
      if (asteroid.orbital_data) {
        createAsteroid3D(asteroid);
        drawOrbit(asteroid);
      }
    });
  });
```

### **Data Structure You'll Get**
```javascript
{
  id: "2000433",
  name: "433 Eros",
  average_diameter_m: 35937,              // For sphere size
  orbital_data: {
    semi_major_axis_au: 1.458,           // Orbit size (1 AU = 149.6M km)
    eccentricity: 0.223,                 // Shape (0=circle, 1=line)
    inclination_deg: 10.83,              // Tilt
    orbital_period_days: 643.12,         // Animation speed
    perihelion_distance_au: 1.133,
    aphelion_distance_au: 1.783
  }
}
```

### **Create Asteroid in Three.js**
```javascript
function createAsteroid3D(asteroid) {
  const { orbital_data } = asteroid;

  // Size (scale down for visualization)
  const radius = (asteroid.average_diameter_m / 2) / 1000000;

  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshPhongMaterial({
    color: asteroid.is_potentially_hazardous ? 0xff0000 : 0x808080
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return mesh;
}
```

### **Draw Orbital Path**
```javascript
function drawOrbit(asteroid) {
  const { semi_major_axis_au, eccentricity, inclination_deg } = asteroid.orbital_data;

  const a = semi_major_axis_au; // Already in AU
  const e = eccentricity;
  const i = inclination_deg * (Math.PI / 180);

  const points = [];

  // 72 points around orbit
  for (let theta = 0; theta < 2 * Math.PI; theta += Math.PI / 36) {
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta) * Math.cos(i);
    const z = r * Math.sin(theta) * Math.sin(i);
    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    opacity: 0.3,
    transparent: true
  });

  const orbit = new THREE.Line(geometry, material);
  scene.add(orbit);
}
```

### **⚠️ Important: Scaling**
```javascript
// Solar System 3D uses AU units (1 AU = Sun to Earth)
// Your API provides:
// - Orbital data: Already in AU ✅
// - Sizes: In meters (divide by 149,597,871 to get AU)

// Earth position in Solar System 3D
const EARTH_POS = { x: 1, y: 0, z: 0 }; // 1 AU from Sun
```

---

## 🗺️ Map Team Integration

### **Simulate Impact & Draw Zones**
```javascript
async function simulateAndDisplay(asteroidId, lat, lon) {
  // Simulate impact
  const response = await fetch('http://localhost:5001/api/simulate-real-impact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asteroid_id: asteroidId, lat, lon, angle: 45 })
  });

  const data = await response.json();
  const impact = data.simulated_impact;

  // Draw damage zones on map
  impact.damage_zones.forEach(zone => {
    drawCircleOnMap(lat, lon, zone.radius_km, zone.color);
  });
}
```

### **Damage Zone Colors (for Map)**
```javascript
const zoneColors = {
  crater: '#000000',           // Black
  total_destruction: '#ff0000', // Red
  severe_damage: '#ff8800',    // Orange
  moderate_damage: '#ffff00',  // Yellow
  thermal_burns: '#ffaaff'     // Pink
};
```

---

## 🎮 UI/Frontend Team

### **Display Asteroid List**
```jsx
function ThreatList() {
  const [threats, setThreats] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5001/api/threats/current')
      .then(r => r.json())
      .then(data => setThreats(data.asteroids));
  }, []);

  return (
    <div>
      {threats.map(ast => (
        <div key={ast.id}>
          <h3>{ast.name}</h3>
          <p>Size: {ast.average_diameter_m.toFixed(0)}m</p>
          <p>Speed: {ast.close_approach_data[0].relative_velocity_km_s} km/s</p>
          <p>Energy: {ast.close_approach_data[0].kinetic_energy_megatons_tnt.toFixed(1)} MT</p>
        </div>
      ))}
    </div>
  );
}
```

### **Impact Simulator**
```jsx
function Simulator({ asteroid }) {
  const [location, setLocation] = useState({ lat: 40.7, lon: -74 });

  const simulate = async () => {
    const res = await fetch('http://localhost:5001/api/simulate-real-impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asteroid_id: asteroid.id,
        lat: location.lat,
        lon: location.lon,
        angle: 45
      })
    });

    const data = await res.json();
    displayResults(data.simulated_impact);
  };

  return <button onClick={simulate}>Simulate Impact</button>;
}
```

---

## 📡 API Endpoints Summary

| Endpoint | Method | Use For |
|----------|--------|---------|
| `/api/threats/current` | GET | Get real asteroids (next 7 days) |
| `/api/asteroids/browse` | GET | Browse database (with orbital data) |
| `/api/asteroid/{id}` | GET | Get specific asteroid details |
| `/api/simulate-real-impact` | POST | Simulate real asteroid impact |
| `/api/calculate-impact` | POST | Custom impact simulation |
| `/` | GET | Health check |

---

## 🔧 API Configuration

```javascript
const API_CONFIG = {
  baseURL: 'http://localhost:5001',
  // Production: 'https://your-api.railway.app'
  endpoints: {
    threats: '/api/threats/current',
    browse: '/api/asteroids/browse',
    simulate: '/api/simulate-real-impact'
  }
};

// Usage
fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.threats}`)
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## ⚠️ Common Issues

### **1. CORS Errors**
✅ **Already solved** - Backend allows all origins

### **2. Scaling Issues**
```javascript
// Problem: Asteroids too small/big in 3D scene
// Solution: Use provided orbital data (already in AU)
// Don't convert - it's already scaled!
```

### **3. Missing Orbital Data**
```javascript
// /api/threats/current → Some asteroids lack orbital_data
// /api/asteroids/browse → All have orbital_data
// Use browse endpoint for 3D visualization!
```

---

## 📦 Copy-Paste Starter Code

### **Quick Integration Test**
```javascript
// Test API connection
fetch('http://localhost:5001/api/threats/current')
  .then(r => r.json())
  .then(data => {
    console.log(`✅ API Working! Found ${data.count} asteroids`);
    console.log('First asteroid:', data.asteroids[0]);
  })
  .catch(err => console.error('❌ API Error:', err));
```

### **Fetch Eros for Testing**
```javascript
// Famous asteroid with complete data
fetch('http://localhost:5001/api/asteroid/2000433')
  .then(r => r.json())
  .then(eros => {
    console.log('Eros:', eros.name);
    console.log('Diameter:', eros.average_diameter_m, 'm');
    console.log('Approaches:', eros.close_approach_data.length);
    console.log('Orbital period:', eros.orbital_data.orbital_period_days, 'days');
  });
```

---

## 🚀 Team Checklist

**3D Team:**
- [ ] Fetch asteroids from `/api/asteroids/browse`
- [ ] Use `orbital_data` for orbit paths
- [ ] Scale properly (data already in AU)
- [ ] Color hazardous asteroids red

**Map Team:**
- [ ] Fetch impacts from `/api/simulate-real-impact`
- [ ] Draw damage zones with correct colors
- [ ] Handle user clicks for location

**UI Team:**
- [ ] Display threat list from `/api/threats/current`
- [ ] Show asteroid details (size, speed, energy)
- [ ] Connect simulate button to API

---

## 📚 Additional Resources

- **Full API Docs**: `http://localhost:5001/docs`
- **Examples**: `backend/README.md`
- **Browse Examples**: `backend/BROWSE_API_EXAMPLES.md`
- **Test Commands**: `backend/TEST_COMMANDS.md`

---

## 💬 Quick Message for Your Team

```
🎯 BACKEND API IS READY!

📍 URL: http://localhost:5001
📚 Docs: http://localhost:5001/docs

✅ What's Working:
• Real NASA asteroid data
• Orbital elements for 3D visualization
• Impact physics calculations
• All CORS enabled

🔗 Key Endpoints:
• GET /api/threats/current (current threats)
• GET /api/asteroids/browse (orbital data for 3D)
• POST /api/simulate-real-impact (impact simulation)

📄 Integration Guide: backend/INTEGRATION_GUIDE.md

Start integrating! 🚀
```
