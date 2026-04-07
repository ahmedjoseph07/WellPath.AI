# Frontend — WellPath.AI

React + Vite application. Provides a 4-step workflow UI with 2D well log charts, a 3D trajectory viewer, and drag-and-drop CSV upload.

## Running

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
```

Vite proxies all `/api/*` requests to `http://localhost:8000` (see `vite.config.js`). The backend must be running for any data operations.

## Directory Layout

```
frontend/src/
├── main.jsx                        # React DOM entry point
├── App.jsx                         # Root layout, step indicator, error banner
├── api/
│   └── wellpath.js                 # fetch wrappers for all 4 backend endpoints
├── store/
│   └── wellStore.js                # Zustand global state (wellLog, predictions, trajectory)
├── components/
│   ├── layout/
│   │   ├── Header.jsx              # Top navigation bar with logo
│   │   └── Sidebar.jsx             # Left panel: step controls + action buttons
│   ├── upload/
│   │   ├── UploadZone.jsx          # Drag-and-drop / click-to-browse CSV uploader
│   │   └── DataPreview.jsx         # Table showing first 10 rows of uploaded data
│   ├── charts/
│   │   ├── WellLogChart.jsx        # Recharts line chart for raw well log curves
│   │   ├── ProductivityChart.jsx   # Productivity score curve with zone color bands
│   │   └── FeatureImportance.jsx   # Horizontal bar chart of XGBoost importances
│   └── visualization/
│       ├── Scene3D.jsx             # @react-three/fiber Canvas root + lighting
│       ├── FormationLayers.jsx     # Translucent 3D boxes colored by productivity label
│       ├── WellTrajectory.jsx      # Tube geometry following optimized XYZ trajectory
│       ├── VerticalWell.jsx        # Reference vertical well cylinder
│       └── CameraControls.jsx      # OrbitControls (zoom, pan, rotate)
└── styles/
```

## Application Workflow

The app is divided into 4 sequential steps tracked in `wellStore.activeStep`:

| Step | Trigger | What Happens |
|------|---------|--------------|
| 1 | App load | Upload zone visible; user drops or selects a CSV |
| 2 | Successful upload | DataPreview table shown; "Run XGBoost" button enabled |
| 3 | Prediction complete | Well log + productivity charts visible; "Optimize" button enabled |
| 4 | Optimization complete | 3D viewer shows formation layers + optimized well path |

## State Management (`wellStore.js`)

Single Zustand store shared across all components:

```js
{
  wellLog:     null,  // { depths, GR, Resistivity, Density, NeutronPorosity, Sonic }
  predictions: null,  // { depths, productivity_score, zone_label, feature_importance }
  trajectory:  null,  // { trajectory, fitness_score, formation_layers, ... }
  activeStep:  1,     // 1–4
  loading:     { upload: false, predict: false, optimize: false },
  error:       null,
}
```

Mutations: `setWellLog`, `setPredictions`, `setTrajectory`, `setLoading`, `setError`, `reset`.

## API Client (`api/wellpath.js`)

```js
getSyntheticData()           // GET  /api/synthetic
uploadCSV(file)              // POST /api/upload     (multipart FormData)
runPrediction(wellLog)       // POST /api/predict    (JSON)
runOptimization(preds, cfg)  // POST /api/optimize   (JSON)
```

All functions throw an `Error` with the backend's `detail` message on non-2xx responses, which the store propagates to the UI error banner.

## Styling

- **Tailwind CSS** with a custom `geo-dark` color palette defined in `tailwind.config.js`
- Key color tokens: `geo-dark`, `geo-panel`, `geo-border`, `geo-accent`, `geo-green`
- All components use dark-mode-only styles — no light theme

## 3D Visualization Notes

- `Scene3D.jsx` sets up the R3F canvas with `shadows`, `antialias`, and a `Stars` background
- Formation layers (from `/api/optimize` response `formation_layers`) are rendered as semi-transparent `BoxGeometry` meshes colored green/yellow/red by productivity label
- The well trajectory is rendered as a `TubeGeometry` threaded through the XYZ waypoints returned by the backend
- `CameraControls.jsx` wraps Drei's `OrbitControls` — click-drag to orbit, scroll to zoom, right-drag to pan

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| react | 18.3.1 | UI framework |
| vite | 5.2.13 | Dev server + bundler |
| three | 0.165.0 | WebGL 3D rendering |
| @react-three/fiber | 8.16.8 | React bindings for Three.js |
| @react-three/drei | 9.105.6 | OrbitControls, Stars, helpers |
| recharts | 2.12.7 | 2D SVG charts |
| zustand | 4.5.4 | Global state management |
| tailwindcss | 3.4.4 | Utility CSS |
