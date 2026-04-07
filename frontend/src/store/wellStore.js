import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWellStore = create(
  persist(
    (set, get) => ({
      // ── Current workflow state ────────────────────────────────────────────
      wellLog: null,        // { depths, GR, Resistivity, Density, NeutronPorosity, Sonic }
      predictions: null,   // { depths, productivity_score, zone_label, feature_importance, model_backend }
      trajectory: null,    // { trajectory, fitness_score, productive_zone_exposure, max_dogleg_severity, ... }
      activeStep: 1,       // 1–4
      loading: { upload: false, predict: false, optimize: false },
      error: null,

      // ── View ─────────────────────────────────────────────────────────────
      view: 'workflow',    // 'workflow' | 'dashboard'
      setView: (v) => set({ view: v }),

      // ── Run history (persisted to localStorage) ───────────────────────────
      runHistory: [],      // array of run snapshot objects, newest first

      // ── Workflow actions ──────────────────────────────────────────────────
      setWellLog: (data) => set({
        wellLog: data,
        predictions: null,
        trajectory: null,
        activeStep: 2,
        error: null,
      }),

      setPredictions: (data) => set({
        predictions: data,
        trajectory: null,
        activeStep: 3,
      }),

      setTrajectory: (data) => {
        const { wellLog, predictions } = get()
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          depthMin: wellLog ? Math.min(...wellLog.depths) : 0,
          depthMax: wellLog ? Math.max(...wellLog.depths) : 0,
          samples: wellLog ? wellLog.depths.length : 0,
          productivePct: predictions
            ? (predictions.zone_label.filter((z) => z === 'productive').length /
               predictions.zone_label.length) * 100
            : 0,
          fitnessScore: data.fitness_score ?? null,
          productiveExposure: data.productive_zone_exposure ?? null,
          maxDLS: data.max_dogleg_severity ?? null,
          modelBackend: predictions?.model_backend ?? 'Unknown',
          wellLog,
          predictions,
          trajectory: data,
        }
        set((s) => ({
          trajectory: data,
          activeStep: 4,
          runHistory: [entry, ...s.runHistory].slice(0, 20), // keep last 20
        }))
      },

      setLoading: (key, val) => set((s) => ({ loading: { ...s.loading, [key]: val } })),
      setError: (msg) => set({ error: msg }),

      // ── Navigation ────────────────────────────────────────────────────────
      goBack: () => set((s) => ({
        activeStep: Math.max(1, s.activeStep - 1),
        error: null,
      })),

      // ── History actions ───────────────────────────────────────────────────
      loadFromHistory: (entry) => set({
        wellLog: entry.wellLog,
        predictions: entry.predictions,
        trajectory: entry.trajectory,
        activeStep: 4,
        view: 'workflow',
        error: null,
      }),

      deleteHistoryEntry: (id) => set((s) => ({
        runHistory: s.runHistory.filter((e) => e.id !== id),
      })),

      clearHistory: () => set({ runHistory: [] }),

      // ── Reset current run ─────────────────────────────────────────────────
      reset: () => set({
        wellLog: null,
        predictions: null,
        trajectory: null,
        activeStep: 1,
        error: null,
      }),
    }),
    {
      name: 'wellpath-ai-storage',
      partialize: (state) => ({ runHistory: state.runHistory }), // only history is persisted
    }
  )
)

export default useWellStore
