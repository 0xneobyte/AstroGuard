# Multi-Asteroid Camera Focus Feature

## Overview
When multiple asteroids are selected, you can now **click on any asteroid card** in the "Selected Asteroids" section to automatically focus the 3D camera on that specific asteroid.

---

## 🎯 How It Works

### Visual Indicators

1. **Hover Effect**
   - Card slides slightly to the right
   - Border color changes
   - Eye icon (👁️) appears in blue
   - Shadow effect applied

2. **Active Asteroid**
   - Highlighted with gradient background
   - Stronger border color
   - Eye icon remains visible
   - Box shadow for depth

3. **Clickable Feedback**
   - Cursor changes to pointer
   - Click animation (slight press effect)
   - Smooth transitions

---

## 🖱️ User Interaction

### Selecting Multiple Asteroids

```
1. Open asteroid dropdown
2. Click asteroids to add to selection
3. See them appear in "Selected Asteroids" section
4. Each card shows:
   - Asteroid name
   - Hazard indicator (⚠️ if dangerous)
   - Size (meters)
   - Velocity (km/s)
```

### Focusing on Specific Asteroid

```
1. Multiple asteroids in "Selected Asteroids" list
2. Hover over any card → Eye icon (👁️) appears
3. Click the card → Camera focuses on that asteroid
4. Active card highlighted with blue accent
5. 3D view smoothly follows the asteroid
```

### Removing Asteroids

```
1. Click the X button on any card
2. Card removed from selection
3. If it was the focused asteroid, focus is cleared
4. Click action DOES NOT trigger camera focus (stopPropagation)
```

---

## 🎨 Visual Design

### Card States

| State | Visual Changes |
|-------|----------------|
| **Default** | Dark background, subtle border, left accent line |
| **Hover** | Lighter background, eye icon appears, slides right |
| **Active** | Gradient background, blue eye icon, stronger shadow |
| **Click** | Brief press animation |

### Color Scheme

```css
/* Normal asteroid */
Border: #27272a
Accent: #52525b
Hover: #3f3f46

/* Hazardous asteroid */
Left accent: #ef4444 (red)

/* Active/Focus state */
Eye icon: #3b82f6 (blue)
Border: #52525b
```

---

## 💻 Technical Implementation

### Click Handler
```javascript
const handleFocusOnAsteroid = async (asteroid) => {
  try {
    setLoading(true);
    // Load full asteroid details
    const details = await getAsteroidDetails(asteroid.id);
    // Set as selected (triggers camera follow)
    setSelectedAsteroid(details);
  } catch (err) {
    setError("Failed to load asteroid details");
  } finally {
    setLoading(false);
  }
};
```

### Preventing Button Conflicts
```javascript
// Remove button doesn't trigger focus
<button onClick={(e) => {
  e.stopPropagation(); // Stop event bubbling
  handleRemoveSelected(asteroid.id);
}}>
  <X size={16} />
</button>
```

### Camera Focus Trigger

When `setSelectedAsteroid()` is called:
1. SpacekitView component detects change
2. Loads asteroid in 3D scene
3. Calls `viz.getViewer().followObject(obj, offset)`
4. Camera smoothly transitions to follow asteroid

---

## 🎬 User Flow Example

### Scenario: Comparing Multiple Asteroids

```
Step 1: Select 3 asteroids from dropdown
├─ Apophis (300m, 12 km/s) ⚠️
├─ Bennu (500m, 10 km/s)
└─ Ryugu (900m, 8 km/s)

Step 2: Click "Apophis" card
├─ Camera focuses on Apophis
├─ Card highlighted as active
└─ 3D view follows Apophis orbit

Step 3: Click "Bennu" card
├─ Camera switches to Bennu
├─ Bennu card now active
├─ Apophis card returns to normal
└─ Smooth transition between asteroids

Step 4: Remove "Apophis" (X button)
├─ Card removed from list
├─ Focus remains on Bennu
└─ Can still switch to Ryugu
```

---

## 📊 Comparison: Before vs After

### Before
```
❌ Selected multiple asteroids
❌ Camera stuck on first selection
❌ Had to re-select from dropdown to switch
❌ Lost other selections when switching
❌ No visual indication of which is focused
```

### After
```
✅ Selected multiple asteroids persist
✅ Click any card to switch camera focus
✅ Quick comparison between asteroids
✅ Keep entire selection intact
✅ Clear visual feedback (eye icon + active state)
```

---

## 🎯 Use Cases

### 1. Impact Comparison
```
Select: Small asteroid (100m) + Large asteroid (1km)
Action: Click each to compare size in 3D
Result: Visual understanding of scale difference
```

### 2. Orbit Analysis
```
Select: Multiple asteroids with different orbits
Action: Click through each one
Result: Study orbital patterns and trajectories
```

### 3. Threat Assessment
```
Select: All hazardous asteroids (⚠️)
Action: Focus on each to evaluate danger
Result: Better understanding of risks
```

### 4. Speed Comparison
```
Select: Slow (5 km/s) vs Fast (30 km/s) asteroids
Action: Watch both by clicking cards
Result: Visual speed difference in orbit
```

---

## 🎓 Best Practices

### For Users

1. **Select Multiple for Comparison**
   - Add 2-5 asteroids to compare
   - Click through to study differences
   - Use eye icon as guide

2. **Check Active State**
   - Blue eye icon = currently focused
   - Gradient background = active card
   - Clear which asteroid you're viewing

3. **Quick Switching**
   - No need to go back to dropdown
   - Click cards directly for instant switch
   - Smooth camera transitions

### For Developers

1. **Event Handling**
   ```javascript
   // Card click - focus
   onClick={() => handleFocusOnAsteroid(asteroid)}
   
   // Button click - don't focus
   onClick={(e) => {
     e.stopPropagation();
     handleRemoveSelected(asteroid.id);
   }}
   ```

2. **State Management**
   ```javascript
   // selectedAsteroids[] - Full list
   // selectedAsteroid - Currently focused one
   // Cards clickable when in list
   // Active styling when focused
   ```

3. **CSS Transitions**
   ```css
   /* Smooth animations */
   transition: all 0.2s ease;
   
   /* Transform for feedback */
   transform: translateX(2px);
   
   /* Opacity for eye icon */
   opacity: 0 → 1
   ```

---

## 🐛 Edge Cases Handled

### Multiple Rapid Clicks
- Loading state prevents conflicts
- API calls queued properly
- Smooth transitions maintained

### Removing Active Asteroid
- Focus cleared properly
- No orphaned camera states
- Safe removal from list

### Empty Selection
- Section hidden when no asteroids
- No crash on empty clicks
- Graceful state handling

### Network Errors
- Error message displayed
- Previous selection preserved
- Loading state cleared

---

## 📱 Responsive Design

Works seamlessly on:
- Desktop (full hover effects)
- Tablet (touch-friendly cards)
- Mobile (larger touch targets)

---

## 🚀 Future Enhancements

Potential improvements:
- [ ] Keyboard navigation (arrow keys)
- [ ] Double-click for detailed view
- [ ] Drag to reorder asteroids
- [ ] Compare mode (split view)
- [ ] Bookmark favorite combinations
- [ ] Export selection list

---

## 📚 Related Features

- **Asteroid Dropdown**: Initial selection
- **3D SpacekitView**: Camera control
- **Selected Asteroids Section**: Visual list
- **Remove/Clear Functions**: List management

---

**Key Benefit**: Effortlessly switch between multiple asteroids without losing your selection or navigating away! 🎯👁️
