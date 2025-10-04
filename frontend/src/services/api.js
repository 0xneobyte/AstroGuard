import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://api.readrizz.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Get current asteroid threats (7-day window)
export const getCurrentThreats = async () => {
  const response = await api.get("/api/threats/current");
  return response.data;
};

// Get detailed asteroid data with orbital elements
export const getAsteroidDetails = async (asteroidId) => {
  const response = await api.get(`/api/asteroid/${asteroidId}`);
  return response.data;
};

// Calculate impact physics for custom parameters
export const calculateImpact = async (params) => {
  const response = await api.post("/api/calculate-impact", params);
  return response.data;
};

// Simulate real asteroid impact
export const simulateRealImpact = async (asteroidId, lat, lon, angle = 45) => {
  const response = await api.post("/api/simulate-real-impact", {
    asteroid_id: asteroidId,
    lat,
    lon,
    angle,
  });
  return response.data;
};

// Browse asteroid database (with pagination)
export const browseAsteroids = async (page = 0, size = 20) => {
  const response = await api.get("/api/asteroids/browse", {
    params: { page, size },
  });
  return response.data;
};

export const calculateDeflection = async (deflectionData) => {
  try {
    const params = new URLSearchParams({
      size_m: deflectionData.size_m,
      mass_kg: deflectionData.mass_kg,
      velocity_km_s: deflectionData.velocity_km_s,
      time_to_impact_days: deflectionData.time_to_impact_days,
      method: deflectionData.method,
      spacecraft_mass_kg: deflectionData.spacecraft_mass_kg || 1000,
      spacecraft_velocity_km_s: deflectionData.spacecraft_velocity_km_s || 10.0,
    });

    const response = await api.get(`/api/deflection/calculate?${params}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
