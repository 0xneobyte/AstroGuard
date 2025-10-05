import { useEffect, useState } from "react";
import useStore from "../store/useStore";
import {
  getCurrentThreats,
  getAsteroidDetails,
  calculateImpact,
  simulateRealImpact,
  calculateDeflection,
} from "../services/api";
import { Ruler, Zap, Calendar, AlertTriangle, ChevronDown, Search, X, Filter, Trash2, Database, MapPin, Shield, Rocket } from "lucide-react";
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
  
  // Dropdown and search state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAsteroids, setFilteredAsteroids] = useState([]);
  const [filterType, setFilterType] = useState("all"); // all, hazardous, non-hazardous
  const [sortBy, setSortBy] = useState("date"); // date, size, speed
  const [selectedAsteroids, setSelectedAsteroids] = useState([]); // Track multiple selections
  const [deflectionResults, setDeflectionResults] = useState(null);
  const [showDeflectionPanel, setShowDeflectionPanel] = useState(false);

  // Fetch asteroids on mount
  useEffect(() => {
    const fetchAsteroids = async () => {
      try {
        setLoading(true);
        const data = await getCurrentThreats();
        setAsteroids(data.asteroids);
        setFilteredAsteroids(data.asteroids);
      } catch (err) {
        setError("Failed to load asteroid data");
      } finally {
        setLoading(false);
      }
    };

    fetchAsteroids();
  }, []);

  // Filter asteroids based on search term, filter type, and sort
  useEffect(() => {
    let filtered = asteroids;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((asteroid) =>
        asteroid.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply hazard filter
    if (filterType === "hazardous") {
      filtered = filtered.filter((a) => a.is_potentially_hazardous);
    } else if (filterType === "non-hazardous") {
      filtered = filtered.filter((a) => !a.is_potentially_hazardous);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "size") {
        return b.average_diameter_m - a.average_diameter_m;
      } else if (sortBy === "speed") {
        return (
          (b.close_approach_data[0]?.relative_velocity_km_s || 0) -
          (a.close_approach_data[0]?.relative_velocity_km_s || 0)
        );
      } else {
        // Sort by date (default)
        const dateA = new Date(a.close_approach_data[0]?.close_approach_date || 0);
        const dateB = new Date(b.close_approach_data[0]?.close_approach_date || 0);
        return dateA - dateB;
      }
    });

    setFilteredAsteroids(sorted);
  }, [searchTerm, asteroids, filterType, sortBy]);

  const handleAsteroidClick = async (asteroid) => {
    try {
      setLoading(true);
      const details = await getAsteroidDetails(asteroid.id);
      setSelectedAsteroid(details);
      
      // Add to selected asteroids if not already added
      if (!selectedAsteroids.find(a => a.id === asteroid.id)) {
        setSelectedAsteroids([...selectedAsteroids, asteroid]);
      }
      
      setIsDropdownOpen(false); // Close dropdown after selection
    } catch (err) {
      setError("Failed to load asteroid details");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSelected = (asteroidId) => {
    setSelectedAsteroids(selectedAsteroids.filter(a => a.id !== asteroidId));
    if (selectedAsteroid?.id === asteroidId) {
      setSelectedAsteroid(null);
    }
  };

  const handleClearAll = () => {
    setSelectedAsteroids([]);
    setSelectedAsteroid(null);
  };

  const handleDeflectionCalculation = async (method) => {
    if (!selectedAsteroid) {
      alert("Please select an asteroid first");
      return;
    }

    if (!impactLocation) {
      alert("Please click on the map to select an impact location");
      return;
    }

    try {
      setLoading(true);
      const deflectionData = {
        asteroid_id: selectedAsteroid.id,
        method: method,
        asteroid_diameter_m: selectedAsteroid.estimated_diameter.meters.estimated_diameter_max,
        velocity_km_s: selectedAsteroid.close_approach_data[0]?.relative_velocity.kilometers_per_second || 20,
        distance_au: selectedAsteroid.close_approach_data[0]?.miss_distance.astronomical || 0.05,
        days_until_impact: Math.max(1, Math.floor((new Date(selectedAsteroid.close_approach_data[0]?.close_approach_date) - new Date()) / (1000 * 60 * 60 * 24))),
      };

      const result = await calculateDeflection(deflectionData);
      
      if (method === "nuclear" && deflectionData.asteroid_diameter_m < 200) {
        result.warning = "⚠️ Nuclear deflection may be excessive for small asteroids. Consider kinetic impactor instead.";
      }

      if (deflectionData.days_until_impact < 100) {
        result.timeWarning = "⚠️ Limited time for deflection mission. Success probability may be reduced.";
      }

      setDeflectionResults(result);
      setShowDeflectionPanel(true);
    } catch (error) {
      alert("Error calculating deflection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateImpact = async () => {
    if (!impactLocation) {
      alert("Please click on the map to select an impact location");
      return;
    }

    try {
      setLoading(true);

      let results;
      if (mode === "THREATS" && selectedAsteroid) {
        results = await simulateRealImpact(
          selectedAsteroid.id,
          impactLocation.lat,
          impactLocation.lon
        );
        setImpactResults(results.simulated_impact);
      } else {
        results = await calculateImpact({
          ...simulatorParams,
          lat: impactLocation.lat,
          lon: impactLocation.lon,
        });
        setImpactResults(results);
      }
    } catch (err) {
      setError("Failed to calculate impact");
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

      {/* Content based on mode */}
      {mode === "THREATS" ? (
        <div className="threats-mode">
          <h2 className="section-heading">
            Asteroid Selector
          </h2>
          {loading && <div className="loading">Loading...</div>}
          {error && <div className="error">{error}</div>}

          {/* Dropdown for asteroid selection */}
          <div className="asteroid-dropdown-container">
            <div 
              className="dropdown-header" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="dropdown-text">
                {selectedAsteroid 
                  ? selectedAsteroid.name 
                  : "Select asteroids to analyze..."}
              </span>
              <ChevronDown 
                size={18} 
                className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} 
              />
            </div>
            
            {isDropdownOpen && (
              <div className="dropdown-content">
                {/* Search input */}
                <div className="search-container">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search asteroids by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchTerm && (
                    <X 
                      size={16} 
                      className="clear-search" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm("");
                      }}
                    />
                  )}
                </div>

                {/* Filter and Sort Controls */}
                <div className="filter-controls">
                  <div className="filter-group">
                    <Filter size={14} className="filter-icon" />
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Asteroids</option>
                      <option value="hazardous">⚠️ Hazardous Only</option>
                      <option value="non-hazardous">✓ Non-Hazardous</option>
                    </select>
                  </div>
                  
                  <div className="sort-group">
                    <span className="sort-label">Sort:</span>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="sort-select"
                    >
                      <option value="date">Date</option>
                      <option value="size">Size</option>
                      <option value="speed">Speed</option>
                    </select>
                  </div>
                </div>

                {/* Result count */}
                <div className="result-count">
                  {filteredAsteroids.length} asteroid{filteredAsteroids.length !== 1 ? 's' : ''} found
                </div>
                
                {/* Asteroid options */}
                <div className="asteroid-options">
                  {filteredAsteroids.length > 0 ? (
                    filteredAsteroids.map((asteroid) => (
                      <div
                        key={asteroid.id}
                        className={`asteroid-option ${
                          asteroid.is_potentially_hazardous ? "hazardous" : ""
                        } ${selectedAsteroid?.id === asteroid.id ? "selected" : ""}`}
                        onClick={() => handleAsteroidClick(asteroid)}
                      >
                        <div className="option-header">
                          <span className="option-name">{asteroid.name}</span>
                          {asteroid.is_potentially_hazardous && (
                            <AlertTriangle size={14} className="hazard-icon" />
                          )}
                        </div>
                        <div className="option-details">
                          <span className="option-detail">
                            <Ruler size={12} />
                            {Math.round(asteroid.average_diameter_m)}m
                          </span>
                          <span className="option-detail">
                            <Zap size={12} />
                            {asteroid.close_approach_data[0]?.relative_velocity_km_s.toFixed(1)} km/s
                          </span>
                        </div>
                        <div className="option-date">
                          <Calendar size={10} />
                          {asteroid.close_approach_data[0]?.close_approach_date}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <Search size={32} className="no-results-icon" />
                      <p>No asteroids found</p>
                      <span>Try adjusting your filters or search term</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected Asteroids Section */}
          {selectedAsteroids.length > 0 && (
            <div className="selected-asteroids-section">
              <div className="selected-header">
                <h3>Selected Asteroids ({selectedAsteroids.length})</h3>
                <button 
                  className="clear-all-btn"
                  onClick={handleClearAll}
                  title="Clear all selections"
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              </div>
              
              <div className="selected-asteroids-list">
                {selectedAsteroids.map((asteroid) => (
                  <div 
                    key={asteroid.id} 
                    className={`selected-asteroid-card ${
                      asteroid.is_potentially_hazardous ? "hazardous" : ""
                    } ${selectedAsteroid?.id === asteroid.id ? "active" : ""}`}
                  >
                    <div className="selected-asteroid-info">
                      <div className="selected-name">
                        {asteroid.name}
                        {asteroid.is_potentially_hazardous && (
                          <AlertTriangle size={12} className="hazard-badge-small" />
                        )}
                      </div>
                      <div className="selected-details">
                        <span><Ruler size={10} /> {Math.round(asteroid.average_diameter_m)}m</span>
                        <span><Zap size={10} /> {asteroid.close_approach_data[0]?.relative_velocity_km_s.toFixed(1)} km/s</span>
                      </div>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemoveSelected(asteroid.id)}
                      title="Remove from selection"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Sources Info Panel */}
          {(selectedAsteroid || impactLocation) && (
            <div className="data-sources-panel">
              <div className="data-sources-header">
                <Database size={16} />
                <h3>Data Sources</h3>
              </div>
              <div className="data-sources-grid">
                <div className="data-source-item">
                  <div className="data-source-label">
                    <Ruler size={14} />
                    <span>Asteroid Size</span>
                  </div>
                  <div className="data-source-value">
                    {mode === "THREATS" ? "NASA JPL SBDB (Small-Body Database)" : "Custom Input"}
                  </div>
                </div>
                <div className="data-source-item">
                  <div className="data-source-label">
                    <Zap size={14} />
                    <span>Velocity</span>
                  </div>
                  <div className="data-source-value">
                    {mode === "THREATS" ? "NASA JPL Horizons System" : "Custom Input"}
                  </div>
                </div>
                <div className="data-source-item">
                  <div className="data-source-label">
                    <Calendar size={14} />
                    <span>Impact Angle</span>
                  </div>
                  <div className="data-source-value">
                    {mode === "THREATS" ? "45° (Statistical Average)" : "Custom Input"}
                  </div>
                </div>
                <div className="data-source-item">
                  <div className="data-source-label">
                    <MapPin size={14} />
                    <span>Impact Point</span>
                  </div>
                  <div className="data-source-value">
                    Interactive Map Selection
                  </div>
                </div>
              </div>
              <div className="data-source-footer">
                <span className="data-source-note">
                  📡 Real-time data from NASA's Near-Earth Object (NEO) Program
                </span>
              </div>
            </div>
          )}

          {/* Mitigation Strategies Panel */}
          {selectedAsteroid && (
            <div className="mitigation-panel">
              <div className="mitigation-header">
                <Shield size={16} />
                <h3>Mitigation Strategies</h3>
              </div>
              <div className="mitigation-buttons">
                <button
                  onClick={() => handleDeflectionCalculation("kinetic_impactor")}
                  className="mitigation-btn kinetic"
                  disabled={loading}
                >
                  <Rocket size={16} />
                  <div className="mitigation-btn-content">
                    <span className="mitigation-btn-title">Kinetic Impactor</span>
                    <span className="mitigation-btn-desc">High-speed collision</span>
                  </div>
                </button>

                <button
                  onClick={() => handleDeflectionCalculation("gravity_tractor")}
                  className="mitigation-btn gravity"
                  disabled={loading}
                >
                  <Shield size={16} />
                  <div className="mitigation-btn-content">
                    <span className="mitigation-btn-title">Gravity Tractor</span>
                    <span className="mitigation-btn-desc">Gradual gravitational pull</span>
                  </div>
                </button>

                <button
                  onClick={() => handleDeflectionCalculation("nuclear")}
                  className="mitigation-btn nuclear"
                  disabled={loading}
                >
                  <Zap size={16} />
                  <div className="mitigation-btn-content">
                    <span className="mitigation-btn-title">Nuclear Deflection</span>
                    <span className="mitigation-btn-desc">Maximum force option</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Deflection Results Panel */}
          {showDeflectionPanel && deflectionResults && (
            <div className="deflection-results-panel">
              <div className="deflection-results-header">
                <div className="deflection-title">
                  <Shield size={16} />
                  <h3>{deflectionResults.method}</h3>
                </div>
                <button
                  onClick={() => setShowDeflectionPanel(false)}
                  className="close-deflection-btn"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="deflection-stats">
                <div className="deflection-stat">
                  <span className="stat-label">Effectiveness</span>
                  <span 
                    className={`stat-value ${
                      deflectionResults.effectiveness > 70 ? 'success' : 
                      deflectionResults.effectiveness > 40 ? 'warning' : 'danger'
                    }`}
                  >
                    {deflectionResults.effectiveness}%
                  </span>
                </div>
                <div className="deflection-stat">
                  <span className="stat-label">Velocity Change</span>
                  <span className="stat-value">{deflectionResults.velocity_change_km_s} km/s</span>
                </div>
                <div className="deflection-stat">
                  <span className="stat-label">Deflection Distance</span>
                  <span className="stat-value">{deflectionResults.deflection_distance_km.toLocaleString()} km</span>
                </div>
                <div className="deflection-stat">
                  <span className="stat-label">Time Required</span>
                  <span className="stat-value">{deflectionResults.time_required_days} days</span>
                </div>
                <div className="deflection-stat">
                  <span className="stat-label">Success Rate</span>
                  <span className="stat-value">{deflectionResults.success_probability}%</span>
                </div>
              </div>

              <div className="deflection-status">
                <strong>Status:</strong> {deflectionResults.status}
              </div>

              <div className="deflection-description">
                {deflectionResults.description}
              </div>

              {deflectionResults.warning && (
                <div className="deflection-warning error">
                  {deflectionResults.warning}
                </div>
              )}

              {deflectionResults.timeWarning && (
                <div className="deflection-warning caution">
                  {deflectionResults.timeWarning}
                </div>
              )}
            </div>
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
