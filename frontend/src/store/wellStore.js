import { create } from 'zustand'

const useWellStore = create((set) => ({
  wellLog: null,        // {depths, GR, Resistivity, Density, NeutronPorosity, Sonic}
  predictions: null,   // {depths, productivity_score, zone_label, feature_importance}
  trajectory: null,    // {trajectory, fitness_score, productive_zone_exposure, max_dogleg_severity, generation_history, formation_layers}
  activeStep: 1,       // 1-4
  loading: { upload: false, predict: false, optimize: false },
  error: null,

  setWellLog: (data) => set({ wellLog: data, predictions: null, trajectory: null, activeStep: 2, error: null }),
  setPredictions: (data) => set({ predictions: data, trajectory: null, activeStep: 3 }),
  setTrajectory: (data) => set({ trajectory: data, activeStep: 4 }),
  setLoading: (key, val) => set((s) => ({ loading: { ...s.loading, [key]: val } })),
  setError: (msg) => set({ error: msg }),
  reset: () => set({ wellLog: null, predictions: null, trajectory: null, activeStep: 1, error: null }),
}))

export default useWellStore
