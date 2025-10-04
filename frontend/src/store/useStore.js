import { create } from "zustand";

const useStore = create((set) => ({
  mode: "THREATS",
  setMode: (mode) => set({ mode }),

  asteroids: [],
  setAsteroids: (asteroids) => set({ asteroids }),

  selectedAsteroid: null,
  setSelectedAsteroid: (asteroid) => set({ selectedAsteroid: asteroid }),

  impactLocation: null,
  setImpactLocation: (location) => set({ impactLocation: location }),

  impactResults: null,
  setImpactResults: (results) => set({ impactResults: results }),

  simulatorParams: {
    size_m: 500,
    speed_km_s: 25,
    angle: 45,
  },
  setSimulatorParams: (params) => set({ simulatorParams: params }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  error: null,
  setError: (error) => set({ error }),

  resetImpact: () =>
    set({
      impactLocation: null,
      impactResults: null,
    }),
}));

export default useStore;
