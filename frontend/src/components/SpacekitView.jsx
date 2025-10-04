import { useEffect, useRef } from "react";
import useStore from "../store/useStore";

const SpacekitView = () => {
  const containerRef = useRef(null);
  const simRef = useRef(null);
  const asteroidObjectsRef = useRef({});

  const selectedAsteroid = useStore((state) => state.selectedAsteroid);
  const impactLocation = useStore((state) => state.impactLocation);

  // Initialize Spacekit simulation
  useEffect(() => {
    if (!containerRef.current || simRef.current || !window.Spacekit) return;

    // Create the simulation
    const sim = new window.Spacekit.Simulation(containerRef.current, {
      basePath: "https://typpo.github.io/spacekit/src",
      camera: {
        initialPosition: [0, -3, 1.5],
        enableDrift: false,
      },
      debug: {
        showAxes: false,
        showGrid: false,
        showStats: false,
      },
    });

    // Add skybox
    sim.createSkybox(window.Spacekit.SkyboxPresets.NASA_TYCHO);

    // Add Earth with preset (has built-in texture)
    const earth = sim.createObject(
      "earth",
      window.Spacekit.SpaceObjectPresets.EARTH
    );

    // Override Earth's rotation to slow it down
    if (earth && earth.obj && earth.obj.rotation) {
      // Slow rotation - Earth rotates once per 24 hours in real life
      // This will make it barely noticeable
      const rotationSpeed = 0.0001; // Very slow rotation
      const originalAnimate = earth.obj.rotation.y;

      sim.onTick = () => {
        if (earth && earth.obj) {
          earth.obj.rotation.y += rotationSpeed;
        }
      };
    }

    // Add Sun (for reference)
    sim.createObject("sun", window.Spacekit.SpaceObjectPresets.SUN);

    simRef.current = sim;

    // Cleanup
    return () => {
      if (simRef.current) {
        simRef.current = null;
      }
    };
  }, []);

  // Add/update asteroid when selected
  useEffect(() => {
    if (!simRef.current || !selectedAsteroid) return;

    const sim = simRef.current;
    const asteroidId = selectedAsteroid.id;

    // Remove old asteroid if exists
    if (asteroidObjectsRef.current[asteroidId]) {
      // Spacekit doesn't have a remove method, so we'll just hide it
      // In a production app, you'd want to properly manage object lifecycle
    }

    // Check if we have orbital data
    const orbitalData = selectedAsteroid.orbital_data;

    if (orbitalData && orbitalData.semi_major_axis_au) {
      // Create asteroid with real orbit using Kepler elements
      const ephem = new window.Spacekit.Ephem(
        {
          epoch: orbitalData.epoch_osculation || 2451545.0,
          a: orbitalData.semi_major_axis_au,
          e: orbitalData.eccentricity,
          i: orbitalData.inclination_deg,
          om: orbitalData.ascending_node_longitude_deg || 0,
          w: orbitalData.perihelion_argument_deg || 0,
          ma: orbitalData.mean_anomaly_deg || 0,
        },
        "deg"
      );

      // Calculate asteroid size based on diameter (scale it down for visibility)
      const sizeKm = selectedAsteroid.average_diameter_m / 1000; // meters to km
      const scaledSize = Math.max(0.001, sizeKm / 10000); // Scale for visibility

      const asteroidObj = sim.createObject(selectedAsteroid.name, {
        ephem,
        labelText: selectedAsteroid.name,
        particleSize: 50, // Make particle visible
        theme: {
          color: selectedAsteroid.is_potentially_hazardous
            ? 0xff0000
            : 0xffaa00,
        },
        ecliptic: {
          displayLines: true,
          lineColor: selectedAsteroid.is_potentially_hazardous
            ? 0xff0000
            : 0x888888,
        },
      });

      asteroidObjectsRef.current[asteroidId] = asteroidObj;
    } else {
      // No orbital data, just show as a point at approximate distance
      const approach = selectedAsteroid.close_approach_data?.[0];
      if (approach) {
        const distance_au = approach.miss_distance_km / 149597870.7; // km to AU

        const asteroidObj = sim.createObject(selectedAsteroid.name, {
          position: [distance_au, 0, 0],
          labelText: selectedAsteroid.name,
          particleSize: 50,
          theme: {
            color: selectedAsteroid.is_potentially_hazardous
              ? 0xff0000
              : 0xffaa00,
          },
        });

        asteroidObjectsRef.current[asteroidId] = asteroidObj;
      }
    }
  }, [selectedAsteroid]);

  // Show impact point on Earth when location is selected
  useEffect(() => {
    if (!simRef.current || !impactLocation) return;

    // Convert lat/lon to 3D coordinates on Earth surface
    const lat = impactLocation.lat * (Math.PI / 180);
    const lon = impactLocation.lon * (Math.PI / 180);
    const radius = 1; // Earth radius in our scene

    const x = radius * Math.cos(lat) * Math.cos(lon);
    const y = radius * Math.cos(lat) * Math.sin(lon);
    const z = radius * Math.sin(lat);

    // Create impact marker
    const sim = simRef.current;

    // Remove old impact marker if exists
    // (In production, you'd want proper object management)

    // Add a small red sphere at impact point
    sim.createSphere("impact-point", {
      radius: 0.02,
      position: [x, y, z],
      theme: {
        color: 0xff0000,
      },
    });
  }, [impactLocation]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
      }}
    />
  );
};

export default SpacekitView;
