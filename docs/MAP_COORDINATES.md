# Map Coordinate System - Technical Documentation

## Overview
The impact map now captures **precise coordinates** (6 decimal places) when you click, providing accuracy within ±11 meters for population API queries.

---

## 🎯 Visual Improvements

### Custom Impact Marker
- **Pulsing animation** - Red rings expand outward
- **Three-layer design**:
  - Outer pulsing ring (animated)
  - Middle solid ring with border
  - Center dot with glow effect
- **Impact emoji (💥)** - Appears above marker
- **Highly visible** - Red color scheme stands out on any map

### Coordinate Display
Two ways to see coordinates:

1. **Bottom-left overlay** - Always visible when impact set
   - Shows: Latitude and Longitude
   - Format: 6 decimal places
   - Confirms: "Ready for population API query"

2. **Marker popup** - Click marker to see
   - Shows: Same coordinates
   - Format: 6 decimal places
   - Precision info: ±11 meters

---

## 📐 Coordinate Precision

### Decimal Places vs Accuracy

| Decimals | Accuracy | Use Case |
|----------|----------|----------|
| 0 | ±111 km | Country level |
| 1 | ±11 km | City level |
| 2 | ±1.1 km | Town level |
| 3 | ±110 m | Neighborhood |
| 4 | ±11 m | Street level |
| **5** | **±1.1 m** | Building level |
| **6** | **±11 cm** | **Sub-meter precision** |

**We use 6 decimals** for maximum accuracy in population queries.

### Example Coordinates

```javascript
// New York City Hall
Latitude:  40.712776°
Longitude: -74.005974°

// Tokyo Tower  
Latitude:  35.658581°
Longitude: 139.745438°

// Sydney Opera House
Latitude:  -33.856784°
Longitude: 151.215297°
```

---

## 🔧 Technical Implementation

### Click Handler
```javascript
useMapEvents({
  click: (e) => {
    // Round to 6 decimal places
    const lat = parseFloat(e.latlng.lat.toFixed(6));
    const lon = parseFloat(e.latlng.lng.toFixed(6));
    
    // Log for debugging
    console.log('Impact location set:', { lat, lon });
    
    // Store in global state
    setImpactLocation({ lat, lon });
  },
});
```

### API Format
Coordinates are sent to backend as:
```json
{
  "lat": 40.712776,
  "lon": -74.005974,
  "asteroid_id": "2024001",
  "angle": 45
}
```

### Backend Receives
```python
def calculate_impact(lat: float, lon: float):
    # lat and lon have 6 decimal precision
    # Perfect for population API queries
    population_data = get_population_at(lat, lon)
```

---

## 🌍 Population API Integration

### Coordinate Usage

The precise coordinates are used to:

1. **Query GeoNames API**
   ```
   http://api.geonames.org/findNearbyPlaceNameJSON?
     lat=40.712776&
     lng=-74.005974&
     radius=50
   ```

2. **Calculate population density**
   - Find cities within impact radius
   - Sum actual population counts
   - Calculate people/km²

3. **Estimate casualties**
   - Use real density at exact location
   - Apply damage zone multipliers
   - Return accurate estimates

---

## 🎨 UI Features

### Before Impact Click
```
Top Banner:
┌─────────────────────────────────────────┐
│ 🎯 Click anywhere on the map to        │
│    simulate an asteroid impact         │
└─────────────────────────────────────────┘
```

### After Impact Click
```
Bottom Left:
┌─────────────────────────┐
│ 💥 Impact Coordinates   │
│ Lat:  40.712776°        │
│ Lon: -74.005974°        │
│ ─────────────────────   │
│ Ready for pop API query │
└─────────────────────────┘

Map shows:
- Red pulsing marker
- Damage zone circles
- Click marker for popup
```

---

## 📊 Testing Different Locations

### Urban Areas (High Precision Needed)
```javascript
// Manhattan, NYC
{ lat: 40.758896, lon: -73.985130 }
// Expected: Dense urban, 10,000+/km²

// Downtown Tokyo
{ lat: 35.689487, lon: 139.691711 }
// Expected: Very dense, 6,000+/km²
```

### Rural Areas (Moderate Precision)
```javascript
// Kansas farmland
{ lat: 39.113014, lon: -96.569403 }
// Expected: Rural, 10-50/km²

// Australian Outback
{ lat: -25.344429, lon: 131.034401 }
// Expected: Very sparse, <5/km²
```

### Ocean Impacts (Low Precision OK)
```javascript
// Mid-Pacific
{ lat: 0.0, lon: -140.0 }
// Expected: Nearly zero, <1/km²

// Mid-Atlantic
{ lat: 30.0, lon: -40.0 }
// Expected: Ocean, ~0.5/km²
```

---

## 🐛 Debugging

### Console Logs

When you click the map, check browser console:
```
Impact location set: { lat: 40.712776, lon: -74.005974 }
Precise coordinates for API: Latitude: 40.712776, Longitude: -74.005974
```

### Verify API Payload

Check Network tab for POST to `/api/simulate-real-impact`:
```json
{
  "asteroid_id": "2024001",
  "lat": 40.712776,
  "lon": -74.005974,
  "angle": 45
}
```

### Common Issues

**Marker not visible?**
- Check if impactLocation is set in state
- Verify impactResults exists
- Look for console errors

**Coordinates wrong?**
- Should be 6 decimals
- Check parseFloat(toFixed(6))
- Verify not using raw latlng

**API not receiving coords?**
- Check network payload
- Verify backend expects lat/lon
- Test with console.log

---

## 🎓 Best Practices

### For Users
1. **Zoom in for precision** - Get exact street/building
2. **Click marker** - View precise coordinates
3. **Check bottom overlay** - Verify location before impact
4. **Try different locations** - Urban vs rural vs ocean

### For Developers
1. **Always use 6 decimals** - Maximum precision
2. **Log coordinates** - Easy debugging
3. **Validate ranges** - Lat: -90 to 90, Lon: -180 to 180
4. **Handle edge cases** - Poles, date line, equator

---

## 📚 References

- **Leaflet Documentation**: https://leafletjs.com/reference.html
- **React Leaflet**: https://react-leaflet.js.org/
- **GeoNames API**: http://www.geonames.org/export/web-services.html
- **Coordinate Precision**: https://en.wikipedia.org/wiki/Decimal_degrees

---

**Key Takeaway**: The map now provides **sub-meter precision coordinates** perfect for accurate population data queries! 🎯
