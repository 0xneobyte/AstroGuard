import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents } from 'react-leaflet';
import useStore from '../store/useStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Create a custom impact marker icon that's highly visible
const impactIcon = L.divIcon({
  className: 'custom-impact-marker',
  html: `
    <div style="
      position: relative;
      width: 40px;
      height: 40px;
    ">
      <!-- Pulsing outer ring -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 0, 0, 0.3);
        animation: pulse 2s ease-out infinite;
      "></div>
      <!-- Middle ring -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(255, 50, 0, 0.6);
        border: 2px solid #ff0000;
      "></div>
      <!-- Center dot -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ff0000;
        border: 2px solid white;
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
      "></div>
      <!-- Impact symbol -->
      <div style="
        position: absolute;
        top: -35px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 24px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      ">💥</div>
    </div>
    <style>
      @keyframes pulse {
        0% {
          width: 40px;
          height: 40px;
          opacity: 1;
        }
        100% {
          width: 80px;
          height: 80px;
          opacity: 0;
        }
      }
    </style>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

function MapClickHandler() {
  const setImpactLocation = useStore((state) => state.setImpactLocation);

  useMapEvents({
    click: (e) => {
      // Get precise coordinates with 6 decimal places (accurate to ~0.1 meters)
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lon = parseFloat(e.latlng.lng.toFixed(6));
      
      console.log('Impact location set:', { lat, lon });
      console.log('Precise coordinates for API:', `Latitude: ${lat}, Longitude: ${lon}`);
      
      setImpactLocation({
        lat: lat,
        lon: lon,
      });
    },
  });

  return null;
}

function DamageZones() {
  const impactLocation = useStore((state) => state.impactLocation);
  const impactResults = useStore((state) => state.impactResults);

  if (!impactLocation || !impactResults) return null;

  const { lat, lon } = impactLocation;
  const zones = impactResults.damage_zones || [];

  return (
    <>
      {/* Render damage zones */}
      {zones.map((zone, index) => (
        <Circle
          key={index}
          center={[lat, lon]}
          radius={zone.radius_km * 1000}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.3,
            weight: 2,
          }}
        />
      ))}
      
      {/* Render custom impact marker with precise coordinates */}
      <Marker position={[lat, lon]} icon={impactIcon}>
        <Popup>
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: '12px',
            padding: '8px',
            minWidth: '200px'
          }}>
            <div style={{ 
              fontWeight: 'bold', 
              fontSize: '14px', 
              marginBottom: '8px',
              color: '#ff0000'
            }}>
              💥 Impact Location
            </div>
            <div style={{ marginBottom: '4px' }}>
              <strong>Latitude:</strong> {lat.toFixed(6)}°
            </div>
            <div style={{ marginBottom: '4px' }}>
              <strong>Longitude:</strong> {lon.toFixed(6)}°
            </div>
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '8px', 
              borderTop: '1px solid #ddd',
              fontSize: '10px',
              color: '#666'
            }}>
              Precision: ±11 meters
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

const MapView = () => {
  const impactLocation = useStore((state) => state.impactLocation);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapClickHandler />
        <DamageZones />
      </MapContainer>

      {/* Instruction banner when no impact location set */}
      {!impactLocation && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 1000,
            pointerEvents: 'none',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          🎯 Click anywhere on the map to simulate an asteroid impact
        </div>
      )}

      {/* Coordinate display when impact location is set */}
      {impactLocation && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            zIndex: 1000,
            fontFamily: 'monospace',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            minWidth: '220px',
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            fontSize: '13px',
            color: '#ff6b6b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            💥 Impact Coordinates
          </div>
          <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>Lat:</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>
              {impactLocation.lat.toFixed(6)}°
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#aaa' }}>Lon:</span>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>
              {impactLocation.lon.toFixed(6)}°
            </span>
          </div>
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '10px',
            color: '#888',
            textAlign: 'center'
          }}>
            Ready for population API query
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
