import { useEffect, useState } from "react";
import useStore from "../store/useStore";
import {
  getCurrentThreats,
  getAsteroidDetails,
  calculateImpact,
  simulateRealImpact,
} from "../services/api";
import "./Sidebar.css";

const Sidebar = () => {
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const asteroids = useStore((state) => state.asteroids);
  const setAsteroids = useStore((state) => state.setAsteroids);
  const selectedAsteroid = useStore((state) => state.selectedAsteroid);
  const setSelectedAsteroid = useStore((state) => state.setSelectedAsteroid);
  const impactLocation = useStore((state) => state.impactLocation);
  const impactResults = useStore((state) => state.impactResults);
  const setImpactResults = useStore((state) => state.setImpactResults);
  const simulatorParams = useStore((state) => state.simulatorParams);
  const setSimulatorParams = useStore((state) => state.setSimulatorParams);
  const loading = useStore((state) => state.loading);
  const setLoading = useStore((state) => state.setLoading);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);
  const [showAll, setShowAll] = useState(false);

  // Fetch asteroids on mount
  useEffect(() => {
    const fetchAsteroids = async () => {
      try {
        setLoading(true);
        const data = await getCurrentThreats();
        setAsteroids(data.asteroids);
      } catch (err) {
        setError("Failed to load asteroid data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAsteroids();
  }, []);

  // Handle asteroid selection
  const handleAsteroidClick = async (asteroid) => {
    try {
      setLoading(true);
      // Fetch full details including orbital data
      const details = await getAsteroidDetails(asteroid.id);
      setSelectedAsteroid(details);
    } catch (err) {
      setError("Failed to load asteroid details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle impact simulation
  const handleSimulateImpact = async () => {
    if (!impactLocation) {
      alert("Please click on the map to select an impact location");
      return;
    }

    try {
      setLoading(true);

      let results;
      if (mode === "THREATS" && selectedAsteroid) {
        // Simulate real asteroid impact
        results = await simulateRealImpact(
          selectedAsteroid.id,
          impactLocation.lat,
          impactLocation.lon
        );
        setImpactResults(results.simulated_impact);
      } else {
        // Custom simulator
        results = await calculateImpact({
          ...simulatorParams,
          lat: impactLocation.lat,
          lon: impactLocation.lon,
        });
        setImpactResults(results);
      }
    } catch (err) {
      setError("Failed to calculate impact");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar">
      {/* Mode Switcher */}
      <div className="mode-switcher">
        <button
          className={mode === "THREATS" ? "active" : ""}
          onClick={() => setMode("THREATS")}
        >
          REAL THREATS
        </button>
        <button
          className={mode === "SIMULATOR" ? "active" : ""}
          onClick={() => setMode("SIMULATOR")}
        >
          SIMULATOR
        </button>
      </div>

      {/* Data Source Info Panel */}
      <div className="info-panel">
        <h4>📊 Data Sources</h4>
        {mode === "THREATS" ? (
          <div className="info-content">
            <div className="info-item">
              <span className="info-label">Size:</span>
              <span className="info-value">NASA API (diameter)</span>
            </div>
            <div className="info-item">
              <span className="info-label">Speed:</span>
              <span className="info-value">NASA API (velocity)</span>
            </div>
            <div className="info-item">
              <span className="info-label">Angle:</span>
              <span className="info-value">45° (default)</span>
            </div>
            <div className="info-item">
              <span className="info-label">Location:</span>
              <span className="info-value">Your map click</span>
            </div>
          </div>
        ) : (
          <div className="info-content">
            <div className="info-item">
              <span className="info-label">Size:</span>
              <span className="info-value">Your slider input</span>
            </div>
            <div className="info-item">
              <span className="info-label">Speed:</span>
              <span className="info-value">Your slider input</span>
            </div>
            <div className="info-item">
              <span className="info-label">Angle:</span>
              <span className="info-value">Your slider input</span>
            </div>
            <div className="info-item">
              <span className="info-label">Location:</span>
              <span className="info-value">Your map click</span>
            </div>
          </div>
        )}
      </div>

      {/* Content based on mode */}
      {mode === "THREATS" ? (
        <div className="threats-mode">
          <h2 className="section-heading">
            Asteroids Approaching Earth (Next 7 Days)
          </h2>
          {loading && <div className="loading">Loading...</div>}
          {error && <div className="error">{error}</div>}

          <div className="asteroid-list">
            {(showAll ? asteroids : asteroids.slice(0, 4)).map((asteroid) => (
              <div
                key={asteroid.id}
                className={`asteroid-card ${
                  asteroid.is_potentially_hazardous ? "hazardous" : ""
                } ${selectedAsteroid?.id === asteroid.id ? "selected" : ""}`}
                onClick={() => handleAsteroidClick(asteroid)}
              >
                <div className="asteroid-header">
                  <div className="asteroid-name">{asteroid.name}</div>
                  {asteroid.is_potentially_hazardous && (
                    <div className="hazard-badge">⚠️</div>
                  )}
                </div>
                <div className="asteroid-details">
                  <span className="detail-item">
                    <span className="detail-icon">📏</span>
                    {Math.round(asteroid.average_diameter_m)}m
                  </span>
                  <span className="detail-item">
                    <span className="detail-icon">⚡</span>
                    {asteroid.close_approach_data[0]?.relative_velocity_km_s.toFixed(
                      1
                    )}{" "}
                    km/s
                  </span>
                  <span className="detail-date">
                    {asteroid.close_approach_data[0]?.close_approach_date}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {asteroids.length > 4 && (
            <button
              className="load-more-btn"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Less" : `Load More (${asteroids.length - 4})`}
            </button>
          )}
        </div>
      ) : (
        <div className="simulator-mode">
          <h3>Custom Asteroid Simulator</h3>

          <div className="controls">
            <label>
              Size: {simulatorParams.size_m}m
              <input
                type="range"
                min="50"
                max="10000"
                value={simulatorParams.size_m}
                onChange={(e) =>
                  setSimulatorParams({
                    ...simulatorParams,
                    size_m: parseInt(e.target.value),
                  })
                }
              />
            </label>

            <label>
              Speed: {simulatorParams.speed_km_s} km/s
              <input
                type="range"
                min="10"
                max="70"
                value={simulatorParams.speed_km_s}
                onChange={(e) =>
                  setSimulatorParams({
                    ...simulatorParams,
                    speed_km_s: parseInt(e.target.value),
                  })
                }
              />
            </label>

            <label>
              Angle: {simulatorParams.angle}°
              <input
                type="range"
                min="15"
                max="90"
                value={simulatorParams.angle}
                onChange={(e) =>
                  setSimulatorParams({
                    ...simulatorParams,
                    angle: parseInt(e.target.value),
                  })
                }
              />
            </label>
          </div>
        </div>
      )}

      {/* Simulate Button */}
      {impactLocation && (
        <button
          className="simulate-btn"
          onClick={handleSimulateImpact}
          disabled={loading}
        >
          {loading ? "CALCULATING..." : "SIMULATE IMPACT"}
        </button>
      )}

      {/* Results Panel */}
      {impactResults && (
        <div className="results-panel">
          <h3>Impact Results</h3>
          <div className="result-item">
            <strong>Energy:</strong> {impactResults.energy_megatons.toFixed(1)}{" "}
            megatons
          </div>
          <div className="result-item">
            <strong>Crater:</strong>{" "}
            {impactResults.crater_diameter_km.toFixed(2)} km diameter
          </div>
          <div className="result-item">
            <strong>Depth:</strong> {impactResults.crater_depth_km.toFixed(2)}{" "}
            km
          </div>
          <div className="result-item">
            <strong>Estimated Deaths:</strong>{" "}
            {impactResults.deaths_estimated.toLocaleString()}
          </div>
          <div className="comparison">{impactResults.comparison}</div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
