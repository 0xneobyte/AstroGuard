import { create } from "zustand";

const useStore = create((set) => ({
  // Mode: 'THREATS' or 'SIMULATOR'
  mode: "THREATS",
  setMode: (mode) => set({ mode }),

  // Real asteroid threats from NASA
  asteroids: [],
  setAsteroids: (asteroids) => set({ asteroids }),

  // Selected asteroid (with full orbital data)
  selectedAsteroid: null,
  setSelectedAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),

  // Impact location {lat, lon}
  impactLocation: null,
  setImpactLocation: (location) => set({ impactLocation: location }),

  // Impact simulation results
  impactResults: null,
  setImpactResults: (results) => set({ impactResults: results }),

  // Simulator parameters
  simulatorParams: {
    size_m: 500,
    speed_km_s: 25,
    angle: 45,
  },
  setSimulatorParams: (params) => set({ simulatorParams: params }),

  // Loading states
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Reset impact state
  resetImpact: () =>
    set({
      impactLocation: null,
      impactResults: null,
    }),
}));

export default useStore;
