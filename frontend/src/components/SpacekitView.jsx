import { useEffect, useRef, useState } from "react";
import useStore from "../store/useStore";

const SpacekitView = () => {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const currentAsteroidRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusMessage, setStatusMessage] = useState("Initializing...");

  const selectedAsteroid = useStore((state) => state.selectedAsteroid);
  const impactLocation = useStore((state) => state.impactLocation);

  // Initialize Spacekit - Exact NASA basic_asteroid_earth_flyby style
  useEffect(() => {
    if (!containerRef.current || vizRef.current || !window.Spacekit) return;

    console.log(
      "🚀 Initializing Spacekit (NASA basic_asteroid_earth_flyby)..."
    );
    setStatusMessage("Starting simulation...");

    try {
      // Exact configuration from NASA example
      const viz = new window.Spacekit.Simulation(containerRef.current, {
        basePath: "https://typpo.github.io/spacekit/src",
        unitsPerAu: 10.0,
        jd: 2443568.0,
        jdPerSecond: 1.0,
        camera: {
          enableDrift: false,
        },
      });

      // Create stars
      viz.createStars();

      // Create Sun
      viz.createObject("sun", window.Spacekit.SpaceObjectPresets.SUN);

      // Create Earth sphere with texture (exactly like NASA example)
      viz.createSphere("earth", {
        textureUrl:
          "https://typpo.github.io/spacekit/examples/basic_asteroid_earth_flyby/earthtexture.jpg",
        radius: 0.01, // Exaggerated size
        ephem: window.Spacekit.EphemPresets.EARTH,
        levelsOfDetail: [
          { radii: 0, segments: 64 },
          { radii: 30, segments: 16 },
          { radii: 60, segments: 8 },
        ],
        atmosphere: {
          enable: true,
          color: 0xc7c1a8,
        },
        rotation: {
          enable: true,
          lambdaDeg: 50,
          betaDeg: -63,
          period: 3.755067,
          yorp: 1.9e-8,
          phi0: 0,
          jd0: 2443568.0,
          speed: 1,
        },
      });

      // Add lights (exactly like NASA example)
      viz.createLight([0, 0, 0]);
      viz.createAmbientLight();

      // Update date display
      viz.onTick = () => {
        setCurrentDate(viz.getDate());
      };

      console.log("✅ Spacekit initialized");
      setStatusMessage("Ready - Select an asteroid");

      vizRef.current = viz;

      return () => {
        if (vizRef.current) {
          vizRef.current = null;
        }
      };
    } catch (error) {
      console.error("❌ Init error:", error);
      setStatusMessage(`Error: ${error.message}`);
    }
  }, []);

  // Add asteroid when selected (exactly like NASA example)
  useEffect(() => {
    if (!vizRef.current || !selectedAsteroid) return;

    console.log("\n🎯 === ASTEROID SELECTED ===");
    console.log("Name:", selectedAsteroid.name);
    console.log("ID:", selectedAsteroid.id);

    const viz = vizRef.current;

    // Remove previous asteroid
    if (currentAsteroidRef.current) {
      console.log("Clearing previous asteroid");
      currentAsteroidRef.current = null;
    }

    const orbitalData = selectedAsteroid.orbital_data;
    console.log("Orbital data:", orbitalData);

    // Check if we have orbital data
    const hasOrbitalData =
      orbitalData &&
      orbitalData.semi_major_axis_au != null &&
      orbitalData.eccentricity != null &&
      orbitalData.inclination_deg != null;

    if (hasOrbitalData) {
      // USE REAL ORBITAL DATA
      console.log("✅ Creating asteroid with REAL orbital data");
      setStatusMessage(`Loading ${selectedAsteroid.name}...`);

      try {
        // Parse orbital elements
        const epoch = orbitalData.epoch_osculation || 2458600.5;
        const a = parseFloat(orbitalData.semi_major_axis_au);
        const e = parseFloat(orbitalData.eccentricity);
        const i = parseFloat(orbitalData.inclination_deg);
        const om = parseFloat(orbitalData.ascending_node_longitude_deg || 0);
        const w = parseFloat(orbitalData.perihelion_argument_deg || 0);
        const ma = parseFloat(orbitalData.mean_anomaly_deg || 0);

        console.log("Orbital elements:");
        console.log(`  epoch: ${epoch}`);
        console.log(`  a: ${a} AU`);
        console.log(`  e: ${e}`);
        console.log(`  i: ${i}°`);
        console.log(`  om: ${om}°`);
        console.log(`  w: ${w}°`);
        console.log(`  ma: ${ma}°`);

        // Validate
        if (isNaN(a) || a <= 0 || isNaN(e) || e < 0 || e >= 1 || isNaN(i)) {
          throw new Error(`Invalid orbital elements`);
        }

        // Create Ephem (exactly like NASA example)
        const ephem = new window.Spacekit.Ephem(
          {
            epoch: epoch,
            a: a,
            e: e,
            i: i,
            om: om,
            w: w,
            ma: ma,
          },
          "deg"
        );

        console.log("✅ Ephem created");

        // Determine color
        const color = selectedAsteroid.is_potentially_hazardous
          ? 0xff0000
          : 0xffaa00;

        // Create 3D asteroid shape (exactly like NASA example)
        const obj = viz.createShape(`asteroid_${selectedAsteroid.id}`, {
          ephem,
          ecliptic: {
            displayLines: true,
            lineColor: color,
          },
          shape: {
            shapeUrl:
              "https://raw.githubusercontent.com/typpo/spacekit/master/examples/asteroid_shape_from_earth/A1046.M1863.obj",
          },
          rotation: {
            lambdaDeg: 251,
            betaDeg: -63,
            period: 3.755067,
            yorp: 1.9e-8,
            phi0: 0,
            jd0: 2443568.0,
          },
        });

        if (obj) {
          // Initialize rotation (exactly like NASA example)
          obj.initRotation();
          obj.startRotation();

          currentAsteroidRef.current = obj;
          console.log("✅ Asteroid created successfully!");

          // Follow the object (exactly like NASA example)
          viz.getViewer().followObject(obj, [-0.01, -0.01, 0.01]);
          console.log("✅ Camera following asteroid");

          setStatusMessage(
            `${selectedAsteroid.name} - Orbit active (${a.toFixed(2)} AU)`
          );
        } else {
          throw new Error("createShape returned null");
        }
      } catch (error) {
        console.error("❌ Error creating asteroid:", error);
        console.error("Stack:", error.stack);
        setStatusMessage(`Error: ${error.message}`);
      }
    } else {
      // FALLBACK: Use approximate orbital data
      console.log("⚠️ No orbital data - creating approximate orbit");
      setStatusMessage(`${selectedAsteroid.name} - Approximate orbit`);

      try {
        const approach = selectedAsteroid.close_approach_data?.[0];
        if (!approach) {
          throw new Error("No approach data available");
        }

        // Estimate orbital elements
        const missDistance_km = approach.miss_distance_km;
        const missDistance_au = missDistance_km / 149597870.7;
        const a = Math.max(0.8, Math.min(3.0, missDistance_au));
        const e = 0.15;
        const i = 10;

        console.log(`Approximate orbit: a=${a.toFixed(2)} AU`);

        const ephem = new window.Spacekit.Ephem(
          {
            epoch: 2458600.5,
            a: a,
            e: e,
            i: i,
            om: 0,
            w: 0,
            ma: 0,
          },
          "deg"
        );

        const obj = viz.createShape(`asteroid_${selectedAsteroid.id}`, {
          ephem,
          ecliptic: {
            displayLines: true,
            lineColor: 0x888888,
          },
          shape: {
            shapeUrl:
              "https://raw.githubusercontent.com/typpo/spacekit/master/examples/asteroid_shape_from_earth/A1046.M1863.obj",
          },
          rotation: {
            lambdaDeg: 251,
            betaDeg: -63,
            period: 3.755067,
            yorp: 1.9e-8,
            phi0: 0,
            jd0: 2443568.0,
          },
        });

        if (obj) {
          obj.initRotation();
          obj.startRotation();
          currentAsteroidRef.current = obj;
          viz.getViewer().followObject(obj, [-0.01, -0.01, 0.01]);
          setStatusMessage(
            `${selectedAsteroid.name} - Approximate (no NASA data)`
          );
        }
      } catch (error) {
        console.error("❌ Fallback failed:", error);
        setStatusMessage(`Error: ${error.message}`);
      }
    }
  }, [selectedAsteroid]);

  // Show impact point
  useEffect(() => {
    if (!vizRef.current || !impactLocation) return;

    console.log("📍 Adding impact point");
    const lat = impactLocation.lat * (Math.PI / 180);
    const lon = impactLocation.lon * (Math.PI / 180);
    const radius = 0.01; // Earth's radius

    const x = radius * Math.cos(lat) * Math.cos(lon);
    const y = radius * Math.cos(lat) * Math.sin(lon);
    const z = radius * Math.sin(lat);

    vizRef.current.createSphere("impact-point", {
      radius: 0.002,
      position: [x, y, z],
      theme: { color: 0xff0000 },
    });
  }, [impactLocation]);

  // Simulation controls
  const handleFaster = () => {
    if (!vizRef.current) return;
    const current = vizRef.current.getJdDelta();
    vizRef.current.setJdDelta(current * 1.5);
    console.log("⚡ Faster");
  };

  const handleSlower = () => {
    if (!vizRef.current) return;
    const current = vizRef.current.getJdDelta();
    vizRef.current.setJdDelta(current * 0.5);
    console.log("⚡ Slower");
  };

  const handleSetTime = () => {
    if (!vizRef.current) return;
    const dateStr = prompt("Enter a date (YYYY-MM-DD):");
    if (dateStr) {
      try {
        const newDate = new Date(dateStr);
        vizRef.current.setDate(newDate);
        console.log("📅 Date set to:", newDate);
      } catch {
        alert("Invalid date format");
      }
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#000" }}
      />

      {/* Control Panel (NASA style) */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "rgba(204, 204, 204, 0.95)",
          padding: "1em",
          borderRadius: "4px",
          fontSize: "14px",
          fontFamily: "sans-serif",
          zIndex: 100,
          minWidth: "220px",
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <strong>Current Date: </strong>
          <span id="current-date">
            {currentDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <button
            onClick={handleSlower}
            style={{
              padding: "6px 12px",
              background: "#fff",
              border: "1px solid #999",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ◀◀ Slower
          </button>
          <button
            onClick={handleFaster}
            style={{
              padding: "6px 12px",
              background: "#fff",
              border: "1px solid #999",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Faster ▶▶
          </button>
          <button
            onClick={handleSetTime}
            style={{
              padding: "6px 12px",
              background: "#fff",
              border: "1px solid #999",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Set Time
          </button>
        </div>

        <div
          style={{
            marginTop: "12px",
            paddingTop: "8px",
            borderTop: "1px solid #999",
            fontSize: "11px",
            color: "#333",
          }}
        >
          <strong>Status:</strong>
          <div style={{ marginTop: "4px", color: "#666" }}>{statusMessage}</div>
        </div>
      </div>
    </div>
  );
};

export default SpacekitView;
