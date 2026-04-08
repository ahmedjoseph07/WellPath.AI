# Frontend — WellPath.AI

React + Vite application. Provides a 4-step workflow UI with 2D well log charts, a 3D trajectory viewer, run history dashboard, and full back-navigation between steps.

## Running

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # production build -> dist/
```

Vite proxies all `/api/*` requests to `http://localhost:8000` (see `vite.config.js`). The backend must be running for any data operations.

## Directory Layout

```
frontend/src/
├── main.jsx                        # React DOM entry point
├── App.jsx                         # Root layout, step indicator, back-navigation
├── api/
│   └── wellpath.js                 # Fetch wrappers for all 4 backend endpoints
├── store/
│   └── wellStore.js                # Zustand global state (persist middleware for run history)
├── components/
│   ├── layout/
│   │   ├── Header.jsx              # Top bar: logo, dashboard toggle, new run button
│   │   └── Sidebar.jsx             # Left panel: step controls, stats, survey station table
│   ├── upload/
│   │   ├── UploadZone.jsx          # Drag-and-drop / click-to-browse CSV uploader
│   │   └── DataPreview.jsx         # Table showing first 10 rows of uploaded data
│   ├── charts/
│   │   ├── WellLogChart.jsx        # All 5 log tracks: GR, Resistivity, Density, NP, Sonic
│   │   ├── ProductivityChart.jsx   # Productivity score curve with zone color bands
│   │   └── FeatureImportance.jsx   # Horizontal bar chart of XGBoost importances
│   ├── visualization/
│   │   ├── Scene3D.jsx             # R3F Canvas: lighting, ground plane, compass, depth axis,
│   │   │                           #   rig model, camera controller, control modes, legend
│   │   ├── FormationLayers.jsx     # Translucent 3D boxes colored by productivity label
│   │   ├── WellTrajectory.jsx      # Tube geometry + waypoint spheres + KOP/TD markers
│   │   └── VerticalWell.jsx        # Reference vertical well cylinder
│   └── Dashboard.jsx               # Run history dashboard with aggregate stats
└── styles/
```

## Application Workflow

The app has 4 sequential steps tracked in `wellStore.activeStep`. **Navigation is bidirectional** — users can go back to any step that has data.

| Step | Trigger | Main Panel Content | Sidebar Content |
|------|---------|-------------------|----------------|
| 1 | App load | Instructions + expected columns | Upload zone + "Load Synthetic Data" |
| 2 | Data loaded | DataPreview table + all 5 log charts | Well log summary stats + "Run XGBoost" |
| 3 | Prediction done | All 5 log charts + productivity chart | Zone stats + GA config sliders + "Run GA" |
| 4 | GA done | Interactive 3D scene | Results + convergence + survey station table |

### Navigation

- **Step indicator** (top bar): Click any step that has data to jump there
- **Back button** (sidebar): Returns to previous step
- **Dashboard**: Toggle via header button; shows all past run history
- **Run history**: Click "Load Run" on any past run to restore its full state

## State Management (`wellStore.js`)

Single Zustand store shared across all components, with `persist` middleware for run history:

```js
{
  // Current workflow (session only — not persisted)
  wellLog:     null,   // { depths, GR, Resistivity, Density, NeutronPorosity, Sonic }
  predictions: null,   // { depths, productivity_score, zone_label, feature_importance, model_backend }
  trajectory:  null,   // { trajectory, fitness_score, formation_layers, generation_history, ... }
  activeStep:  1,      // 1-4
  loading:     { upload: false, predict: false, optimize: false },
  error:       null,
  view:        'workflow',  // 'workflow' | 'dashboard'

  // Persisted to localStorage
  runHistory:  [],     // Last 20 run snapshots with full wellLog/predictions/trajectory
}
```

**Navigation actions:**
- `goBack()` — step - 1
- `goToStep(n)` — jump to any step whose prerequisite data exists
- `loadFromHistory(entry)` — restore a past run (sets all data + jumps to step 4)
- `reset()` — clear current run, return to step 1

## 3D Visualization (`Scene3D.jsx`)

### Scene Elements
- **Ground plane**: Solid slab at y=0 with "Ground Level 0 m TVD" label, 200m scale bar
- **Compass arrows**: N/S/E/W directional indicators on ground
- **Depth axis**: Tick labels from surface to TD
- **Surface rig**: Platform, derrick, cross braces, BOP stack, wellhead
- **Formation layers**: Translucent boxes colored by zone (green/yellow/red) with labels
- **Well trajectory**: Tube geometry with glow effect, waypoint spheres colored by inclination
- **Kick-off Point**: Orange sphere + label at first deviation > 3 degrees
- **TD marker**: Glowing cyan sphere + label at total depth
- **Convergence chart**: GA fitness sparkline with improvement percentage
- **Legend**: Color key for all scene elements

### Control System
Three interaction modes, selectable via floating toolbar:
- **Orbit** (default): Left-click drag to rotate, scroll to zoom
- **Grab**: Left-click drag to pan (hand cursor)
- **Zoom**: Left-click drag to dolly in/out

Four camera presets: Perspective, Front, Side, Top-Down. Plus auto-rotate toggle and label visibility toggle.

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
- Key color tokens: `geo-dark`, `geo-panel`, `geo-border`, `geo-accent` (cyan), `geo-green`, `geo-yellow`, `geo-red`
- Dark-mode only — no light theme

## Key Dependencies

| Package | Purpose |
|---|---|
| react 18 | UI framework |
| vite | Dev server + bundler |
| three | WebGL 3D rendering |
| @react-three/fiber | React bindings for Three.js |
| @react-three/drei | OrbitControls, Stars, Html, Grid helpers |
| recharts | 2D SVG charts |
| zustand | Global state management + localStorage persistence |
| tailwindcss | Utility CSS |

---

See also: [docs/FRONTEND.md](../docs/FRONTEND.md) | [docs/THESIS_DEFENSE_GUIDE.md](../docs/THESIS_DEFENSE_GUIDE.md)
