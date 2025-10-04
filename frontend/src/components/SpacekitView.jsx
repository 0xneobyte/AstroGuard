import { useEffect, useRef, useState } from "react";
import useStore from "../store/useStore";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const SpacekitView = () => {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const currentAsteroidRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const mode = useStore((state) => state.mode);

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
      // Configuration based on NASA example but with current date
      const viz = new window.Spacekit.Simulation(containerRef.current, {
        basePath: "https://typpo.github.io/spacekit/src",
        unitsPerAu: 10.0,
        startDate: Date.now(), // Use current date instead of 1978!
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

      {/* Data Sources Panel (Top Left) */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          background: "#18181b",
          border: "1px solid #27272a",
          padding: "1rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
          zIndex: 100,
          minWidth: "240px",
          color: "#fafafa",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h4
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "0.875rem",
            color: "#fafafa",
            fontWeight: "600",
          }}
        >
          Data Sources
        </h4>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.25rem 0",
            }}
          >
            <span
              style={{
                fontWeight: "500",
                color: "#a1a1aa",
                fontSize: "0.813rem",
              }}
            >
              Size:
            </span>
            <span
              style={{
                color: "#fafafa",
                fontSize: "0.813rem",
                textAlign: "right",
                fontWeight: "500",
              }}
            >
              {mode === "THREATS" ? "NASA API (diameter)" : "Your slider input"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.25rem 0",
            }}
          >
            <span
              style={{
                fontWeight: "500",
                color: "#a1a1aa",
                fontSize: "0.813rem",
              }}
            >
              Speed:
            </span>
            <span
              style={{
                color: "#fafafa",
                fontSize: "0.813rem",
                textAlign: "right",
                fontWeight: "500",
              }}
            >
              {mode === "THREATS" ? "NASA API (velocity)" : "Your slider input"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.25rem 0",
            }}
          >
            <span
              style={{
                fontWeight: "500",
                color: "#a1a1aa",
                fontSize: "0.813rem",
              }}
            >
              Angle:
            </span>
            <span
              style={{
                color: "#fafafa",
                fontSize: "0.813rem",
                textAlign: "right",
                fontWeight: "500",
              }}
            >
              {mode === "THREATS" ? "45° (default)" : "Your slider input"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.25rem 0",
            }}
          >
            <span
              style={{
                fontWeight: "500",
                color: "#a1a1aa",
                fontSize: "0.813rem",
              }}
            >
              Location:
            </span>
            <span
              style={{
                color: "#fafafa",
                fontSize: "0.813rem",
                textAlign: "right",
                fontWeight: "500",
              }}
            >
              Your map click
            </span>
          </div>
        </div>
      </div>

      {/* Control Panel (shadcn style) */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "#18181b",
          border: "1px solid #27272a",
          padding: "1rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
          zIndex: 100,
          minWidth: "240px",
          color: "#fafafa",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              fontWeight: "600",
              color: "#fafafa",
              marginBottom: "0.25rem",
            }}
          >
            Current Date
          </div>
          <div style={{ color: "#a1a1aa", fontSize: "0.813rem" }}>
            {currentDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <button
            onClick={handleSlower}
            style={{
              padding: "0.5rem 0.75rem",
              background: "transparent",
              border: "1px solid #27272a",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.813rem",
              color: "#a1a1aa",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#27272a";
              e.target.style.color = "#fafafa";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#a1a1aa";
            }}
          >
            <ChevronLeft size={14} />
            <ChevronLeft size={14} />
            <span>Slower</span>
          </button>
          <button
            onClick={handleFaster}
            style={{
              padding: "0.5rem 0.75rem",
              background: "transparent",
              border: "1px solid #27272a",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.813rem",
              color: "#a1a1aa",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#27272a";
              e.target.style.color = "#fafafa";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#a1a1aa";
            }}
          >
            <span>Faster</span>
            <ChevronRight size={14} />
            <ChevronRight size={14} />
          </button>
          <button
            onClick={handleSetTime}
            style={{
              padding: "0.5rem 0.75rem",
              background: "transparent",
              border: "1px solid #27272a",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.813rem",
              color: "#a1a1aa",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#27272a";
              e.target.style.color = "#fafafa";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#a1a1aa";
            }}
          >
            <Clock size={14} />
            <span>Set Time</span>
          </button>
        </div>

        <div
          style={{
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #27272a",
            fontSize: "0.813rem",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              color: "#fafafa",
              marginBottom: "0.25rem",
            }}
          >
            Status
          </div>
          <div style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>
            {statusMessage}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpacekitView;
