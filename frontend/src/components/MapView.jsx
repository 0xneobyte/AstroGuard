import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet';
import useStore from '../store/useStore';
import 'leaflet/dist/leaflet.css';

// Map click handler component
function MapClickHandler() {
  const setImpactLocation = useStore((state) => state.setImpactLocation);

  useMapEvents({
    click: (e) => {
      setImpactLocation({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      });
    },
  });

  return null;
}

// Damage zones visualization
function DamageZones() {
  const impactLocation = useStore((state) => state.impactLocation);
  const impactResults = useStore((state) => state.impactResults);

  if (!impactLocation || !impactResults) return null;

  const { lat, lon } = impactLocation;
  const zones = impactResults.damage_zones || [];

  // Convert km radius to meters for Leaflet
  return (
    <>
      {zones.map((zone, index) => (
        <Circle
          key={index}
          center={[lat, lon]}
          radius={zone.radius_km * 1000} // km to meters
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.3,
            weight: 2,
          }}
        />
      ))}
      {/* Impact marker */}
      <Marker position={[lat, lon]} />
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

      {/* Instruction overlay */}
      {!impactLocation && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          Click anywhere on the map to simulate an impact
        </div>
      )}
    </div>
  );
};

export default MapView;
