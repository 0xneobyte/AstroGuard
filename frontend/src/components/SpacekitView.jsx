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
  const currentAsteroidIdRef = useRef(null); // Track the ID of currently focused asteroid
  const labelsRef = useRef([]);
  const loadedAsteroidsRef = useRef(new Set()); // Track loaded asteroid IDs
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const mode = useStore((state) => state.mode);

  const selectedAsteroid = useStore((state) => state.selectedAsteroid);
  const impactLocation = useStore((state) => state.impactLocation);

  // Function to create a label for an object
  const createLabel = (text, objectId) => {
    const labelDiv = document.createElement("div");
    labelDiv.className = "spacekit-label";
    labelDiv.textContent = text;
    labelDiv.style.cssText = `
      position: absolute;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.8);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Poppins', sans-serif;
      pointer-events: none;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      z-index: 50;
      backdrop-filter: blur(8px);
      display: none;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    `;
    containerRef.current.appendChild(labelDiv);
    return { element: labelDiv, objectId, text };
  };

  // Function to update label positions
  const updateLabels = () => {
    if (!vizRef.current || !containerRef.current || !window.THREE) return;

    const viz = vizRef.current;
    const camera = viz.getViewer().get3jsCamera();
    const containerRect = containerRef.current.getBoundingClientRect();

    labelsRef.current.forEach((label) => {
      if (!label.element || !label.objectId) return;

      try {
        const obj = viz.getObject(label.objectId);
        if (!obj) return;

        const pos = obj.getPosition();
        if (!pos || pos.length < 3) return;

        const vector = new window.THREE.Vector3(pos[0], pos[1], pos[2]);
        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * containerRect.width;
        const y = (-(vector.y * 0.5) + 0.5) * containerRect.height;

        // Check if behind camera or out of view
        if (vector.z > 1 || x < 0 || x > containerRect.width || y < 0 || y > containerRect.height) {
          label.element.style.display = "none";
        } else {
          label.element.style.display = "block";
          label.element.style.left = `${x}px`;
          label.element.style.top = `${y - 20}px`; // Offset above object
          label.element.style.transform = "translate(-50%, -100%)";
        }
      } catch (error) {
        console.error("Error updating label:", error);
      }
    });
  };

  // Clear all labels
  const clearLabels = () => {
    labelsRef.current.forEach((label) => {
      if (label.element && label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
    });
    labelsRef.current = [];
  };

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
      const sun = viz.createObject("sun", window.Spacekit.SpaceObjectPresets.SUN);

      const earth = viz.createSphere("earth", {
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

      // Add labels for Sun and Earth
      const sunLabel = createLabel("☀️ Sun", "sun");
      labelsRef.current.push(sunLabel);

      const earthLabel = createLabel("🌍 Earth", "earth");
      labelsRef.current.push(earthLabel);

      viz.onTick = () => {
        setCurrentDate(viz.getDate());
        updateLabels();
      };

      setStatusMessage("Ready - Select an asteroid");

      vizRef.current = viz;

      return () => {
        clearLabels();
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
    const asteroidId = `asteroid_${selectedAsteroid.id}`;

    // Check if we're already viewing this exact asteroid - prevent redundant processing
    if (currentAsteroidIdRef.current === selectedAsteroid.id) {
      console.log(`Already viewing asteroid ${selectedAsteroid.name}, skipping`);
      return;
    }

    console.log(`Switching to asteroid ${selectedAsteroid.name} (ID: ${selectedAsteroid.id})`);
    console.log(`Previous asteroid ID: ${currentAsteroidIdRef.current}`);

    // Hide the previous asteroid if it exists - try multiple methods
    if (currentAsteroidIdRef.current && currentAsteroidIdRef.current !== selectedAsteroid.id) {
      const prevAsteroidId = `asteroid_${currentAsteroidIdRef.current}`;
      try {
        const prevObj = viz.getObject(prevAsteroidId);
        if (prevObj) {
          console.log(`Trying to hide previous asteroid: ${prevAsteroidId}`);
          
          // Try multiple ways to hide the object
          if (prevObj._object) {
            prevObj._object.visible = false;
            console.log(`Set _object.visible = false`);
          }
          
          if (prevObj._orbit) {
            prevObj._orbit.visible = false;
            console.log(`Set _orbit.visible = false`);
          }
          
          if (prevObj._renderMethod === 'SPHERE') {
            // For sphere objects
            if (prevObj._obj) {
              prevObj._obj.visible = false;
              console.log(`Set _obj.visible = false (sphere)`);
            }
          }
          
          // Try to access THREE.js mesh directly
          if (prevObj.get3jsObjects) {
            const objects = prevObj.get3jsObjects();
            objects.forEach(obj => {
              obj.visible = false;
              console.log(`Hid a THREE.js object`);
            });
          }
        }
      } catch (error) {
        console.log(`Could not hide previous asteroid: ${error.message}`);
      }
    }

    // FIRST: Check if the object actually exists in the Spacekit scene
    let existingObj = null;
    try {
      existingObj = viz.getObject(asteroidId);
    } catch (error) {
      console.log(`Error checking for existing object: ${error.message}`);
    }

    if (existingObj) {
      console.log(`Asteroid ${selectedAsteroid.name} (ID: ${selectedAsteroid.id}) found in scene, reusing it`);
      console.log(`Current tracked asteroids:`, Array.from(loadedAsteroidsRef.current));
      
      // Make sure this asteroid is visible - try all methods
      if (existingObj._object) {
        existingObj._object.visible = true;
        console.log(`Made _object visible`);
      }
      if (existingObj._orbit) {
        existingObj._orbit.visible = true;
      }
      if (existingObj._obj) {
        existingObj._obj.visible = true;
      }
      if (existingObj.get3jsObjects) {
        const objects = existingObj.get3jsObjects();
        objects.forEach(obj => {
          obj.visible = true;
        });
        console.log(`Made ${objects.length} THREE.js objects visible`);
      }
      
      // Object exists, just focus camera on it
      try {
        console.log(`About to call followObject on ${asteroidId}`);
        console.log(`Object properties:`, Object.keys(existingObj));
        
        // Try stopping any previous follow before starting new one
        try {
          viz.getViewer().stopFollowingObject();
        } catch (e) {
          // stopFollowingObject might not exist, try alternative
          try {
            viz.getViewer().followObject(null);
          } catch (e2) {
            console.log(`No stop method available`);
          }
        }
        
        viz.getViewer().followObject(existingObj, [-0.01, -0.01, 0.01]);
        
        console.log(`Successfully called followObject`);
        currentAsteroidRef.current = existingObj;
        currentAsteroidIdRef.current = selectedAsteroid.id; // Update currently viewed ID
        setStatusMessage(`Viewing ${selectedAsteroid.name}`);
        // Make sure it's tracked
        loadedAsteroidsRef.current.add(selectedAsteroid.id);
        return; // Exit early, don't recreate
      } catch (error) {
        console.error(`Error focusing on existing asteroid:`, error);
        // Continue to recreation if focus fails
      }
    }

    console.log(`Asteroid ${selectedAsteroid.name} not found in scene, creating new...`);
    console.log(`Asteroid ID to create: ${asteroidId}`);
    console.log(`Currently tracked IDs:`, Array.from(loadedAsteroidsRef.current));

    // Clear previous asteroid labels (keep Sun and Earth labels)
    labelsRef.current = labelsRef.current.filter((label) => {
      if (label.text.includes("Sun") || label.text.includes("Earth")) {
        return true; // Keep Sun and Earth labels
      } else {
        // Remove asteroid labels
        if (label.element && label.element.parentNode) {
          label.element.parentNode.removeChild(label.element);
        }
        return false;
      }
    });

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

        console.log(`Creating asteroid shape: ${asteroidId}`);
        const obj = viz.createShape(asteroidId, {
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

        console.log(`createShape returned:`, obj ? 'valid object' : 'NULL');

        if (obj) {
          obj.initRotation();
          obj.startRotation();

          currentAsteroidRef.current = obj;
          currentAsteroidIdRef.current = selectedAsteroid.id; // Track current asteroid ID
          
          // Hide all other asteroids
          loadedAsteroidsRef.current.forEach(id => {
            if (id !== selectedAsteroid.id) {
              try {
                const otherObj = viz.getObject(`asteroid_${id}`);
                if (otherObj) {
                  // Try all possible visibility properties
                  if (otherObj._object) otherObj._object.visible = false;
                  if (otherObj._orbit) otherObj._orbit.visible = false;
                  if (otherObj._obj) otherObj._obj.visible = false;
                  if (otherObj.get3jsObjects) {
                    otherObj.get3jsObjects().forEach(obj => obj.visible = false);
                  }
                  console.log(`Hiding other asteroid (orbital): asteroid_${id}`);
                }
              } catch (error) {
                console.log(`Could not hide asteroid_${id}: ${error.message}`);
              }
            }
          });
          
          // Make sure this asteroid is visible
          if (obj._object) {
            obj._object.visible = true;
          }
          if (obj._orbit) {
            obj._orbit.visible = true;
          }
          if (obj.get3jsObjects) {
            obj.get3jsObjects().forEach(o => o.visible = true);
          }
          
          // Track that this asteroid has been loaded
          loadedAsteroidsRef.current.add(selectedAsteroid.id);
          console.log(`Loaded asteroid ${selectedAsteroid.name} with ID ${selectedAsteroid.id}`);

          // Add label for asteroid
          const asteroidIcon = selectedAsteroid.is_potentially_hazardous ? "⚠️" : "☄️";
          const asteroidLabel = createLabel(
            `${asteroidIcon} ${selectedAsteroid.name}`,
            `asteroid_${selectedAsteroid.id}`
          );
          labelsRef.current.push(asteroidLabel);

          viz.getViewer().followObject(obj, [-0.01, -0.01, 0.01]);

          setStatusMessage(
            `${selectedAsteroid.name} - Orbit active (${a.toFixed(2)} AU)`
          );
        } else {
          throw new Error("createShape returned null");
        }
      } catch (error) {
        console.error(`Error loading asteroid:`, error);
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

        console.log(`Creating approximate asteroid shape: ${asteroidId}`);
        const obj = viz.createShape(asteroidId, {
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

        console.log(`createShape returned:`, obj ? 'valid object' : 'NULL');

        if (obj) {
          obj.initRotation();
          obj.startRotation();
          currentAsteroidRef.current = obj;
          currentAsteroidIdRef.current = selectedAsteroid.id; // Track current asteroid ID
          
          // Hide all other asteroids
          loadedAsteroidsRef.current.forEach(id => {
            if (id !== selectedAsteroid.id) {
              try {
                const otherObj = viz.getObject(`asteroid_${id}`);
                if (otherObj) {
                  // Try all possible visibility properties
                  if (otherObj._object) otherObj._object.visible = false;
                  if (otherObj._orbit) otherObj._orbit.visible = false;
                  if (otherObj._obj) otherObj._obj.visible = false;
                  if (otherObj.get3jsObjects) {
                    otherObj.get3jsObjects().forEach(obj => obj.visible = false);
                  }
                  console.log(`Hiding other asteroid (approximate): asteroid_${id}`);
                }
              } catch (error) {
                console.log(`Could not hide asteroid_${id}: ${error.message}`);
              }
            }
          });
          
          // Make sure this asteroid is visible
          if (obj._object) {
            obj._object.visible = true;
          }
          if (obj._orbit) {
            obj._orbit.visible = true;
          }
          if (obj.get3jsObjects) {
            obj.get3jsObjects().forEach(o => o.visible = true);
          }
          
          // Track that this asteroid has been loaded
          loadedAsteroidsRef.current.add(selectedAsteroid.id);
          console.log(`Loaded approximate orbit for ${selectedAsteroid.name} with ID ${selectedAsteroid.id}`);
          
          // Add label for approximate orbit asteroid
          const asteroidIcon = selectedAsteroid.is_potentially_hazardous ? "⚠️" : "☄️";
          const asteroidLabel = createLabel(
            `${asteroidIcon} ${selectedAsteroid.name}`,
            `asteroid_${selectedAsteroid.id}`
          );
          labelsRef.current.push(asteroidLabel);
          
          viz.getViewer().followObject(obj, [-0.01, -0.01, 0.01]);
          setStatusMessage(
            `${selectedAsteroid.name} - Approximate (no NASA data)`
          );
        }
      } catch (error) {
        console.error(`Error loading approximate orbit:`, error);
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

      {/* Modern Horizontal Time Control Panel (Bottom Center) */}
      <div
        style={{
          position: "absolute",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(39, 39, 42, 0.95) 100%)",
          backdropFilter: "blur(12px)",
          border: "1px solid #3f3f46",
          padding: "0.625rem 2rem",
          borderRadius: "9999px",
          fontSize: "0.813rem",
          fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
          zIndex: 100,
          color: "#fafafa",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          minWidth: "fit-content",
        }}
      >
        {/* Date Display */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem",
          paddingRight: "1.5rem",
          borderRight: "1px solid #3f3f46"
        }}>
          <Clock size={14} style={{ color: "#a1a1aa", flexShrink: 0 }} />
          <div style={{ 
            fontWeight: "600", 
            color: "#fafafa", 
            fontSize: "0.75rem",
            lineHeight: "1",
            whiteSpace: "nowrap"
          }}>
            {currentDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.625rem" 
        }}>
          <button
            onClick={handleSlower}
            style={{
              padding: "0.375rem 0.75rem",
              background: "rgba(39, 39, 42, 0.6)",
              border: "1px solid #3f3f46",
              borderRadius: "9999px",
              cursor: "pointer",
              fontSize: "0.688rem",
              color: "#a1a1aa",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3f3f46";
              e.currentTarget.style.color = "#fafafa";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(39, 39, 42, 0.6)";
              e.currentTarget.style.color = "#a1a1aa";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <ChevronLeft size={12} />
            <ChevronLeft size={12} style={{ marginLeft: "-0.5rem" }} />
            <span>Slower</span>
          </button>

          <button
            onClick={handleFaster}
            style={{
              padding: "0.375rem 0.75rem",
              background: "rgba(39, 39, 42, 0.6)",
              border: "1px solid #3f3f46",
              borderRadius: "9999px",
              cursor: "pointer",
              fontSize: "0.688rem",
              color: "#a1a1aa",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3f3f46";
              e.currentTarget.style.color = "#fafafa";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(39, 39, 42, 0.6)";
              e.currentTarget.style.color = "#a1a1aa";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>Faster</span>
            <ChevronRight size={12} style={{ marginRight: "-0.5rem" }} />
            <ChevronRight size={12} />
          </button>

          <button
            onClick={handleSetTime}
            style={{
              padding: "0.375rem 0.875rem",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "9999px",
              cursor: "pointer",
              fontSize: "0.688rem",
              color: "#60a5fa",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              fontWeight: "500",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.25)";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
              e.currentTarget.style.color = "#93c5fd";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
              e.currentTarget.style.color = "#60a5fa";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Set to Approach Date
          </button>
        </div>

        {/* Status Indicator */}
        <div style={{
          paddingLeft: "1.5rem",
          borderLeft: "1px solid #3f3f46",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <div style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: statusMessage.includes("Ready") ? "#22c55e" : 
                       statusMessage.includes("Loading") ? "#f59e0b" : "#3b82f6",
            boxShadow: statusMessage.includes("Ready") ? "0 0 6px #22c55e" : 
                      statusMessage.includes("Loading") ? "0 0 6px #f59e0b" : "0 0 6px #3b82f6",
          }} />
          <div style={{ 
            color: "#a1a1aa", 
            fontSize: "0.688rem",
            fontWeight: "500",
            whiteSpace: "nowrap"
          }}>
            {statusMessage}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpacekitView;
