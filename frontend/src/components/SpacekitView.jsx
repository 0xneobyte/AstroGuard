import { useEffect, useRef, useState } from "react";
import useStore from "../store/useStore";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

const SpacekitView = () => {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const currentAsteroidRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const mode = useStore((state) => state.mode);

  const selectedAsteroid = useStore((state) => state.selectedAsteroid);
  const impactLocation = useStore((state) => state.impactLocation);

  useEffect(() => {
    if (!containerRef.current || vizRef.current || !window.Spacekit) return;

    setStatusMessage("Starting simulation...");

    try {
      const viz = new window.Spacekit.Simulation(containerRef.current, {
        basePath: "https://typpo.github.io/spacekit/src",
        unitsPerAu: 10.0,
        startDate: Date.now(),
        jdPerSecond: 1.0,
        camera: {
          enableDrift: false,
        },
      });

      viz.createStars();
      viz.createObject("sun", window.Spacekit.SpaceObjectPresets.SUN);

      viz.createSphere("earth", {
        textureUrl:
          "https://typpo.github.io/spacekit/examples/basic_asteroid_earth_flyby/earthtexture.jpg",
        radius: 0.01,
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

      viz.createLight([0, 0, 0]);
      viz.createAmbientLight();

      viz.onTick = () => {
        setCurrentDate(viz.getDate());
      };

      setStatusMessage("Ready - Select an asteroid");

      vizRef.current = viz;

      return () => {
        if (vizRef.current) {
          vizRef.current = null;
        }
      };
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    if (!vizRef.current || !selectedAsteroid) return;

    const viz = vizRef.current;

    if (currentAsteroidRef.current) {
      currentAsteroidRef.current = null;
    }

    const orbitalData = selectedAsteroid.orbital_data;

    const hasOrbitalData =
      orbitalData &&
      orbitalData.semi_major_axis_au != null &&
      orbitalData.eccentricity != null &&
      orbitalData.inclination_deg != null;

    if (hasOrbitalData) {
      setStatusMessage(`Loading ${selectedAsteroid.name}...`);

      try {
        const epoch = orbitalData.epoch_osculation || 2458600.5;
        const a = parseFloat(orbitalData.semi_major_axis_au);
        const e = parseFloat(orbitalData.eccentricity);
        const i = parseFloat(orbitalData.inclination_deg);
        const om = parseFloat(orbitalData.ascending_node_longitude_deg || 0);
        const w = parseFloat(orbitalData.perihelion_argument_deg || 0);
        const ma = parseFloat(orbitalData.mean_anomaly_deg || 0);

        if (isNaN(a) || a <= 0 || isNaN(e) || e < 0 || e >= 1 || isNaN(i)) {
          throw new Error(`Invalid orbital elements`);
        }

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

        const color = selectedAsteroid.is_potentially_hazardous
          ? 0xff0000
          : 0xffaa00;

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
          obj.initRotation();
          obj.startRotation();

          currentAsteroidRef.current = obj;

          viz.getViewer().followObject(obj, [-0.01, -0.01, 0.01]);

          setStatusMessage(
            `${selectedAsteroid.name} - Orbit active (${a.toFixed(2)} AU)`
          );
        } else {
          throw new Error("createShape returned null");
        }
      } catch (error) {
        setStatusMessage(`Error: ${error.message}`);
      }
    } else {
      setStatusMessage(`${selectedAsteroid.name} - Approximate orbit`);

      try {
        const approach = selectedAsteroid.close_approach_data?.[0];
        if (!approach) {
          throw new Error("No approach data available");
        }

        const missDistance_km = approach.miss_distance_km;
        const missDistance_au = missDistance_km / 149597870.7;
        const a = Math.max(0.8, Math.min(3.0, missDistance_au));
        const e = 0.15;
        const i = 10;

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
        setStatusMessage(`Error: ${error.message}`);
      }
    }
  }, [selectedAsteroid]);

  useEffect(() => {
    if (!vizRef.current || !impactLocation) return;

    const lat = impactLocation.lat * (Math.PI / 180);
    const lon = impactLocation.lon * (Math.PI / 180);
    const radius = 0.01;

    const x = radius * Math.cos(lat) * Math.cos(lon);
    const y = radius * Math.cos(lat) * Math.sin(lon);
    const z = radius * Math.sin(lat);

    vizRef.current.createSphere("impact-point", {
      radius: 0.002,
      position: [x, y, z],
      theme: { color: 0xff0000 },
    });
  }, [impactLocation]);

  const handleFaster = () => {
    if (!vizRef.current) return;
    const current = vizRef.current.getJdDelta();
    vizRef.current.setJdDelta(current * 1.5);
  };

  const handleSlower = () => {
    if (!vizRef.current) return;
    const current = vizRef.current.getJdDelta();
    vizRef.current.setJdDelta(current * 0.5);
  };

  const handleSetTime = () => {
    if (!vizRef.current) return;
    const dateStr = prompt("Enter a date (YYYY-MM-DD):");
    if (dateStr) {
      try {
        const newDate = new Date(dateStr);
        vizRef.current.setDate(newDate);
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
