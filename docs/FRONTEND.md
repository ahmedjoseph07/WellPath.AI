# WellPath.AI — Frontend Component Documentation

**Author:** Joseph Ahmed (Student ID: 2007007)
**Module:** Frontend (React + Vite + Three.js)
**Path:** `WellPath.AI/frontend/src/`

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Application Entry: `main.jsx` and `App.jsx`](#2-application-entry-mainjsx-and-appjsx)
3. [State Management: `store/wellStore.js`](#3-state-management-storewellstorejs)
4. [API Client: `api/wellpath.js`](#4-api-client-apiwellpathjs)
5. [Layout Components](#5-layout-components)
   - [Header.jsx](#51-headerjsx)
   - [Sidebar.jsx](#52-sidebarjsx)
6. [Upload Components](#6-upload-components)
   - [UploadZone.jsx](#61-uploadzonejsx)
   - [DataPreview.jsx](#62-datapreviewjsx)
7. [Chart Components](#7-chart-components)
   - [WellLogChart.jsx](#71-welllogchartjsx)
   - [ProductivityChart.jsx](#72-productivitychartjsx)
   - [FeatureImportance.jsx](#73-featureimportancejsx)
8. [Visualization Components](#8-visualization-components)
   - [Scene3D.jsx](#81-scene3djsx)
   - [FormationLayers.jsx](#82-formationlayersjsx)
   - [WellTrajectory.jsx](#83-welltrajectoryjsx)
   - [VerticalWell.jsx](#84-verticalwelljsx)
   - [CameraControls.jsx](#85-cameracontrolsjsx)
9. [Build Configuration](#9-build-configuration)

---

## 1. Technology Stack

| Library | Version | Role |
|---------|---------|------|
| React | 18.3.1 | Component framework, hooks |
| Vite | 5.2.13 | Build tool, HMR dev server |
| Three.js | 0.165.0 | 3D WebGL rendering engine |
| @react-three/fiber | 8.16.8 | React bindings for Three.js |
| @react-three/drei | 9.105.6 | Three.js helper components (OrbitControls, Stars, Grid) |
| Recharts | 2.12.7 | SVG-based 2D chart library |
| Zustand | 4.5.4 | Minimal global state management |
| Tailwind CSS | 3.4.4 | Utility-first CSS framework |

### Custom Tailwind Color Palette

Defined in `tailwind.config.js`:

| Token | Hex | Usage |
|-------|-----|-------|
| `geo-dark` | `#0a0e1a` | Main background, canvas background |
| `geo-panel` | `#111827` | Card/sidebar/header background |
| `geo-border` | `#1f2937` | Borders, dividers, grid lines |
| `geo-accent` | `#06b6d4` | Primary cyan accent (buttons, GR track, trajectory) |
| `geo-green` | `#10b981` | Productive zone, success states |
| `geo-yellow` | `#f59e0b` | Marginal zone, GA button |
| `geo-red` | `#ef4444` | Non-productive zone, error states |

---

## 2. Application Entry: `main.jsx` and `App.jsx`

### `main.jsx`

Minimal React DOM entry point. Mounts `<App />` into `#root` via `ReactDOM.createRoot`.

### `App.jsx`

Root application layout. Defines the full-screen layout with four structural children:

```
<div className="flex flex-col h-screen bg-geo-dark overflow-hidden">
  <Header />           ← top bar, always visible
  <StepIndicator />    ← horizontal step progress, always visible
  <ErrorBanner />      ← conditional error ribbon
  <div className="flex flex-1 overflow-hidden">
    <Sidebar />        ← left panel, 320px wide, step-conditional content
    <main>             ← right content area, overflow-y-auto
      <MainPanel />    ← renders one of 4 step views
    </main>
  </div>
</div>
```

#### `StepIndicator` (inline component)

**Props:** None (reads from store)

**Store Interaction:** `activeStep = useWellStore(s => s.activeStep)`

Renders 4 step pills connected by horizontal dividers. Each pill has one of three visual states:
- `step-pending`: grey text, grey border (step not yet reached)
- `step-active`: cyan text, cyan border (current step)
- `step-done`: green text + ✓ checkmark (completed step)

The dividers between steps transition from grey to green when the preceding step is complete.

#### `ErrorBanner` (inline component)

**Props:** None (reads from store)

**Store Interaction:** `{ error, setError } = useWellStore()`

Renders a dismissible red banner when `error` is non-null. Includes:
- SVG warning circle icon
- Bold "Error" label
- Error message text
- X button calling `setError(null)`

Returns `null` when `error === null`.

#### `MainPanel` (inline component)

Conditionally renders one of four views based on `activeStep`:

| `activeStep` | Content |
|---|---|
| 1 | Landing screen with column icon grid |
| 2 | `<DataPreview />` + `<WellLogChart />` |
| 3 | `<ProductivityChart />` (which internally renders `<FeatureImportance />`) |
| 4 | `<Scene3D />` at `height: 100%` |

---

## 3. State Management: `store/wellStore.js`

### Architecture

Uses Zustand's `create()` to define a single global store with state fields and action methods. All components access the store via the `useWellStore()` hook — no prop drilling, no React Context boilerplate.

### Store Definition

```javascript
const useWellStore = create((set) => ({
  // State
  wellLog:     null,
  predictions: null,
  trajectory:  null,
  activeStep:  1,
  loading: { upload: false, predict: false, optimize: false },
  error:       null,

  // Actions
  setWellLog:     (data) => set({ wellLog: data, predictions: null,
                                   trajectory: null, activeStep: 2, error: null }),
  setPredictions: (data) => set({ predictions: data, trajectory: null, activeStep: 3 }),
  setTrajectory:  (data) => set({ trajectory: data, activeStep: 4 }),
  setLoading:     (key, val) => set((s) => ({ loading: { ...s.loading, [key]: val } })),
  setError:       (msg) => set({ error: msg }),
  reset:          () => set({ wellLog: null, predictions: null,
                               trajectory: null, activeStep: 1, error: null }),
}))
```

### State Fields

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `wellLog` | Object or null | null | Raw well log data from backend |
| `predictions` | Object or null | null | XGBoost predictions from backend |
| `trajectory` | Object or null | null | GA optimization results from backend |
| `activeStep` | 1 \| 2 \| 3 \| 4 | 1 | Current UI step |
| `loading.upload` | boolean | false | True while fetching synthetic or uploading CSV |
| `loading.predict` | boolean | false | True while XGBoost running |
| `loading.optimize` | boolean | false | True while GA running |
| `error` | string or null | null | Last error message |

### Action Methods

| Method | Side Effects |
|--------|-------------|
| `setWellLog(data)` | Sets wellLog, clears predictions+trajectory, advances to Step 2, clears error |
| `setPredictions(data)` | Sets predictions, clears trajectory, advances to Step 3 |
| `setTrajectory(data)` | Sets trajectory, advances to Step 4 |
| `setLoading(key, val)` | Updates `loading[key]` using spread merge |
| `setError(msg)` | Sets error string (pass null to clear) |
| `reset()` | Clears all data, returns to Step 1 |

### Usage Pattern in Components

```javascript
// Read-only access (only re-renders when selected values change)
const { wellLog, activeStep } = useWellStore()

// Action access
const { setWellLog, setError, setLoading } = useWellStore()

// Async action pattern
async function handleSynthetic() {
  setLoading('upload', true)
  setError(null)
  try {
    const data = await getSyntheticData()
    setWellLog(data)
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading('upload', false)
  }
}
```

---

## 4. API Client: `api/wellpath.js`

### Purpose

Thin fetch-based HTTP client for the FastAPI backend. Provides four async functions corresponding to the four backend endpoints. Handles error extraction from FastAPI's `{"detail": "..."}` error response format.

### Base URL

```javascript
const BASE = '/api'
```

Requests go to `/api/*`. Vite proxies `/api/*` to `http://localhost:8000` in development. In production, a reverse proxy (nginx, etc.) would handle the same routing.

### Error Handler

```javascript
async function handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body.detail || body.message || JSON.stringify(body)
    } catch {
      msg = await res.text().catch(() => msg)
    }
    throw new Error(msg)
  }
  return res.json()
}
```

FastAPI's HTTP error responses contain a `detail` field. This handler extracts it, falling back to raw text or status code if JSON parsing fails. The thrown `Error` is caught by each action handler in Sidebar and stored via `setError(e.message)`.

### Functions

#### `getSyntheticData()`

```javascript
export async function getSyntheticData() {
  const res = await fetch(`${BASE}/synthetic`)
  return handleResponse(res)
}
```

**Returns:** Well log dict `{depths, GR, Resistivity, Density, NeutronPorosity, Sonic}`

#### `uploadCSV(file)`

```javascript
export async function uploadCSV(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData })
  return handleResponse(res)
}
```

**Parameters:** `file` — a browser `File` object from an `<input type="file">` or `DataTransfer`

Note: No `Content-Type` header is set manually. The browser sets it automatically to `multipart/form-data` with the correct boundary when `FormData` is the body.

#### `runPrediction(wellLog)`

```javascript
export async function runPrediction(wellLog) {
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wellLog),
  })
  return handleResponse(res)
}
```

**Parameters:** `wellLog` — the wellStore `wellLog` object (already in correct shape for the backend)

#### `runOptimization(predictions, config)`

```javascript
export async function runOptimization(predictions, config) {
  const res = await fetch(`${BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      depths:              predictions.depths,
      productivity_score:  predictions.productivity_score,
      zone_label:          predictions.zone_label,
      feature_importance:  predictions.feature_importance,
      waypoints:    config?.waypoints   ?? 8,
      population:   config?.population  ?? 50,
      generations:  config?.generations ?? 80,
      dls_weight:   config?.dls_weight  ?? 0.3,
    }),
  })
  return handleResponse(res)
}
```

**Parameters:**
- `predictions` — the wellStore `predictions` object
- `config` — GA configuration `{waypoints, generations}` from Sidebar state (population and dls_weight use defaults)

---

## 5. Layout Components

### 5.1 `Header.jsx`

**Purpose:** Fixed top bar with application branding and status badges.

**Props:** None

**Store Interactions:** None

**Rendered Content:**

```
Left side:
  • SVG well icon (cyan stroke)
  • "WellPath" (cyan) + ".AI" (light) logotype
  • Vertical divider
  • "AI-Assisted Well Path Optimization" subtitle

Right side:
  • "CUET THESIS 2025" badge (cyan outline)
  • "Beta" badge (green outline)
```

---

### 5.2 `Sidebar.jsx`

**Purpose:** Step-conditional left panel providing all user interaction controls. Shows different content depending on `activeStep`.

**Props:** None

**Store Interactions:**
- Read: `activeStep`, `wellLog`, `predictions`, `trajectory`, `loading`
- Write: `setWellLog`, `setPredictions`, `setTrajectory`, `setLoading`, `setError`, `reset`

**Local State:**
```javascript
const [gaConfig, setGaConfig] = useState({ waypoints: 8, generations: 100 })
```

The GA configuration is local component state — it does not need to be global since only Sidebar reads and writes it.

#### Step 1 Content

- **"Load Synthetic Data" button** — calls `handleSynthetic()`:
  1. `setLoading('upload', true)`
  2. `await getSyntheticData()`
  3. `setWellLog(data)` → advances to Step 2
  4. On error: `setError(e.message)`
  5. `setLoading('upload', false)` (finally block)

- **Divider with "or upload CSV"**

- **`<UploadZone />`** — handles CSV drag-and-drop or file picker

#### Step 2 Content

- **Well Log Summary panel** (stats grid):
  - Depth Range: `min(depths)` – `max(depths)` m
  - Samples: `wellLog.depths.length`
  - GR Range: min–max API
  - Resistivity: min–max Ω·m

- **"Run XGBoost Prediction" button** — calls `handlePredict()`:
  1. `setLoading('predict', true)`
  2. `await runPrediction(wellLog)`
  3. `setPredictions(data)` → advances to Step 3

#### Step 3 Content

- **Prediction Summary panel** (zone counts):
  - Total Intervals, Productive count + %, Marginal count, Non-Productive count

- **GA Configuration panel** (two sliders):
  - Waypoints slider: 4–12 (default 8)
  - Generations slider: 50–200, step 10 (default 100 in UI)
  - Live numeric display above each slider (geo-accent color)

- **"Run GA Optimization" button** — calls `handleOptimize()`:
  1. `setLoading('optimize', true)`
  2. `await runOptimization(predictions, gaConfig)`
  3. `setTrajectory(data)` → advances to Step 4

#### Step 4 Content

- **Optimization Results panel** (stats grid):
  - Fitness Score (4 decimal places)
  - Productive Exposure (% with 1 decimal)
  - Max DLS (°/30m with 2 decimals)
  - Trajectory Points count

- **GA Convergence panel** (if `generation_history` exists):
  - Text: "Final fitness achieved in N generations"
  - Linear progress bar: `fitness_score * 100` width %

- **"Start Over" button** — calls `reset()`

#### Helper Sub-components

**`Spinner`:** Animated CSS border-radius spinner circle used in all loading states.

**`StatRow`:** Labeled key-value row with bottom border, used in all stats panels.

---

## 6. Upload Components

### 6.1 `UploadZone.jsx`

**Purpose:** Drag-and-drop and file-picker zone for CSV well log upload.

**Props:** None

**Store Interactions:**
- Read: `loading.upload`
- Write: `setWellLog`, `setLoading`, `setError`

**Local State:**
- `dragging: boolean` — whether a file is being dragged over the zone
- `fileName: string | null` — name of the selected file (displayed after selection)

**Event Handlers:**

| Handler | Trigger | Action |
|---------|---------|--------|
| `onDragOver` | drag enters zone | `setDragging(true)`, `e.preventDefault()` |
| `onDragLeave` | drag leaves zone | `setDragging(false)` |
| `onDrop` | file dropped | `setDragging(false)`, extract `e.dataTransfer.files[0]`, call `processFile` |
| `onChange` | file picker changes | Extract `e.target.files[0]`, call `processFile` |
| `onClick` | zone clicked | `inputRef.current.click()` (programmatic file dialog) |

**`processFile(file)`:**
1. Validates `.csv` extension → `setError(...)` and return if invalid
2. `setFileName(file.name)`
3. `setLoading('upload', true)`
4. `await uploadCSV(file)`
5. `setWellLog(data)` on success, or `setError(e.message)` + reset filename on failure
6. `setLoading('upload', false)` always

**Visual States:**

| State | Appearance |
|-------|-----------|
| Default | Dashed border, grey icon, "Drop CSV here" text |
| Dragging | Cyan dashed border, cyan background tint |
| Uploading | Spinner animation, "Uploading {fileName}..." text |
| Uploaded | Green icon, green filename, "Click to change" text |

---

### 6.2 `DataPreview.jsx`

**Purpose:** Shows the first 10 rows of the loaded well log in a styled HTML table.

**Props:** None

**Store Interactions:**
- Read: `wellLog`

**Column Configuration:**
```javascript
const COLUMNS = ['depths', 'GR', 'Resistivity', 'Density', 'NeutronPorosity', 'Sonic']
const LABELS  = ['Depth (m)', 'GR (API)', 'Res (Ω·m)', 'Density (g/cc)', 'NP (%)', 'Sonic (μs/ft)']
```

**Rendering Logic:**
- If `wellLog === null`, returns null (not rendered)
- `previewRows = Math.min(10, wellLog.depths.length)` — shows at most 10 rows
- Header shows total row count and preview count
- Values formatted to 2 decimal places with `Number(val).toFixed(2)`
- Alternating row background: `bg-geo-dark/30` for even rows
- Missing values (null/undefined) display as `—`

---

## 7. Chart Components

### 7.1 `WellLogChart.jsx`

**Purpose:** Multi-track vertical well log display using Recharts. Plots GR and Resistivity (always), plus Density and Neutron Porosity (when present in the data).

**Props:** None

**Store Interactions:**
- Read: `wellLog`

**Key Design Decisions:**

```javascript
const DOWNSAMPLE = 4  // render every 4th point for performance
```

With 200 depth points and DOWNSAMPLE=4, only 50 points are plotted per track. This keeps chart rendering smooth for this quantity of data.

**Chart Configuration:**
- `layout="vertical"`: depth on the Y axis, log value on the X axis
- Y axis is `reversed={true}`: depth increases downward (petroleum convention)
- `isAnimationActive={false}`: prevents animation lag on data change

**Track Colors:**

| Track | Color | Units |
|-------|-------|-------|
| Gamma Ray (GR) | `#06b6d4` (geo-accent cyan) | API |
| Resistivity | `#fb923c` (orange) | Ω·m |
| Density | `#c084fc` (purple) | g/cc |
| Neutron Porosity | `#4ade80` (green) | pu |

**`TrackChart` Sub-component:**

Reusable Recharts wrapper component accepting `{data, dataKey, name, color, unit, domain}` props. Renders a `ComposedChart` with one `Line` series. The `CustomTooltip` shows depth and value on hover.

**Layout:**
- Two 480px-tall track grids side by side (GR + Resistivity)
- Two 300px-tall tracks below (Density + Neutron Porosity), conditionally rendered

---

### 7.2 `ProductivityChart.jsx`

**Purpose:** Vertical bar chart showing XGBoost productivity score vs depth, color-coded by zone label. Also renders the `FeatureImportance` chart below.

**Props:** None

**Store Interactions:**
- Read: `predictions`

**Key Design Decisions:**

```javascript
const DOWNSAMPLE = 3  // render every 3rd point (≈67 bars for 200 depths)
```

```javascript
const ZONE_COLORS = {
  productive:       '#10b981',  // geo-green
  marginal:         '#f59e0b',  // geo-yellow
  'non-productive': '#ef4444',  // geo-red
}
```

**Chart Configuration:**
- `layout="vertical"`: depth on Y axis, score (0–1) on X axis
- `<Bar>` with `<Cell>` children for per-bar color control
- `maxBarSize={8}`: thin bars to show detail at 200 depth points
- Two `<ReferenceLine>` elements at x=0.5 (productive threshold) and x=0.35 (marginal threshold)

**Zone Counts:**
Computed with a `useMemo()` over `predictions.zone_label`:
```javascript
counts = { productive: N, marginal: N, 'non-productive': N }
```
Displayed as legend chips with counts in parentheses.

**Threshold Annotation:**
Below the chart, text labels describe the thresholds:
- Productive > 0.5
- Marginal 0.35–0.5
- Non-productive < 0.35

---

### 7.3 `FeatureImportance.jsx`

**Purpose:** Horizontal bar chart displaying XGBoost feature importances, sorted descending.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `data` | Object | `{GR: float, Resistivity: float, ...}` importance dict from predictions |

**Rendering Logic:**

```javascript
const chartData = useMemo(() => {
  return Object.entries(data)
    .map(([key, value]) => ({
      feature: FEATURE_LABELS[key] || key,  // human-readable name
      importance: value,
    }))
    .sort((a, b) => b.importance - a.importance)  // descending
}, [data])
```

**Visual Design:**
- `layout="vertical"` with `type="category"` Y axis for feature names
- Bars colored with opacity gradient: most important bar is `rgba(6,182,212, 1.0)`, least important is `rgba(6,182,212, 0.4)`
- `<LabelList>` renders importance as percentage on the right of each bar
- Chart height: 180px (compact panel below productivity chart)

**Feature Labels Mapping:**
```javascript
const FEATURE_LABELS = {
  GR:               'Gamma Ray',
  Resistivity:      'Resistivity',
  Density:          'Density',
  NeutronPorosity:  'Neutron Porosity',
  Sonic:            'Sonic',
}
```

---

## 8. Visualization Components

### 8.1 `Scene3D.jsx`

**Purpose:** Root 3D visualization component. Creates the React Three Fiber `<Canvas>`, composes all 3D sub-components, and overlays 2D HTML UI panels (legend, results stats, controls help).

**Props:** None

**Store Interactions:**
- Read: `trajectory`, `wellLog`

**`maxDepth` Calculation:**
```javascript
const maxDepth = trajectory?.trajectory
  ? Math.max(...trajectory.trajectory.map((p) => p.z ?? p.depth ?? 0))
  : wellLog?.depths
  ? Math.max(...wellLog.depths)
  : 3000
```

Uses trajectory TVD if available, falls back to well log depth range, falls back to 3000.

**Camera Configuration:**
```javascript
camera={{
  position: [400, -(maxDepth * 0.3), 600],  // east, 30% depth up, south
  fov: 50,
  near: 1,
  far: 20000,
  up: [0, 1, 0],
}}
```

The camera is positioned off-center (400m east, south of scene) and elevated to 30% of max depth from surface, giving a natural angled view of the formation slab stack and trajectory.

#### `SceneLights` (inline)

Three-point lighting setup:
| Light | Position | Intensity | Color | Purpose |
|-------|----------|-----------|-------|---------|
| AmbientLight | — | 0.4 | white | Fill shadows |
| DirectionalLight | [500, 500, 500] | 1.2 | white | Key light (casts shadows) |
| DirectionalLight | [-300, -800, -300] | 0.3 | `#06b6d4` | Cyan fill from below |
| PointLight | [0, 0, 0] | 0.5 | `#e2e8f0` | Soft rim at origin |

#### `DepthAxis` (inline)

Renders a vertical axis indicator at x=220 with horizontal tick marks at 500m intervals. Uses `BoxGeometry` for ticks and `CylinderGeometry` for the axis line, both with a dark grey `MeshBasicMaterial` that is unaffected by scene lighting.

#### `Legend` (inline HTML overlay)

Absolutely positioned in the bottom-left corner (CSS, not Three.js). Shows 5 color swatches:
- Green: Productive Zone
- Amber: Marginal Zone
- Red: Non-Productive
- Cyan: Optimized Path
- Slate: Vertical Reference

#### `SceneStats` (inline HTML overlay)

Absolutely positioned top-right. Shows:
- Fitness Score (4 decimal places)
- Productive Exposure (% with 1 decimal)
- Max DLS (°/30m with 2 decimals)

Returns null if `trajectory` is null.

#### `Controls3D` (inline HTML overlay)

Top-left corner instructions: Left drag: Rotate, Right drag: Pan, Scroll: Zoom.

**`Suspense` Fallback:**
The canvas is wrapped in `<Suspense>` with a spinner fallback for the WebGL context initialization delay.

---

### 8.2 `FormationLayers.jsx`

**Purpose:** Renders stacked 3D formation slabs (BoxGeometry) representing productive, marginal, and non-productive zones in the 3D scene.

**Props:** None (reads from store)

**Store Interactions:**
- Read: `trajectory.formation_layers`

**Rendering Logic:**

For each layer in `formation_layers`:
```javascript
const height  = depth_bottom - depth_top      // layer thickness in metres
const centerY = -((depth_top + depth_bottom) / 2)  // Y in Three.js (negated TVD)

// Color and opacity based on score/label
if (avg_score > 0.6 || label === 'productive')  → color: '#10b981', opacity: 0.65
if (avg_score > 0.35 || label === 'marginal')   → color: '#f59e0b', opacity: 0.50
else                                            → color: '#ef4444', opacity: 0.35
```

**Geometry:**
```javascript
<boxGeometry args={[400, height, 400]} />
```
Each slab is 400m × layer_thickness × 400m — wide enough to be visible as a horizontal band behind the trajectory.

**Material:**
`MeshPhongMaterial` with `transparent={true}` and varying opacity. Phong shading responds to scene lights, giving depth cues on the slab faces.

**Returns null** if `trajectory.formation_layers` is empty or undefined (before optimization runs).

---

### 8.3 `WellTrajectory.jsx`

**Purpose:** Renders the optimized well trajectory as a 3D tube following a smooth Catmull-Rom spline through the GA waypoints.

**Props:** None (reads from store)

**Store Interactions:**
- Read: `trajectory.trajectory`

**Key Computation (`useMemo`):**

```javascript
// Convert survey coordinates to Three.js space
const threePoints = points.map((pt) => new THREE.Vector3(
  pt.x ?? 0,       // East → Three.js X (unchanged)
  -(pt.z ?? pt.depth ?? 0),  // TVD → Three.js -Y (inverted)
  pt.y ?? 0,       // North → Three.js Z
))

// Fit smooth spline through waypoints
const curve = new CatmullRomCurve3(threePoints, false, 'catmullrom', 0.5)
```

**Why CatmullRomCurve3?**
The GA returns 8 waypoints (for n_waypoints=8). Rendering 8 straight-line segments would look faceted and unrealistic. CatmullRomCurve3 fits a smooth parametric spline through all waypoints with C¹ continuity (matching tangents at each point), approximating the physical shape of the wellbore.

The curve is then discretized into a `TubeGeometry` with 128 longitudinal segments and 12 radial segments, producing a smooth 3D tube of radius 3m.

**Rendered Objects:**

1. **Main tube** — `TubeGeometry(curve, 128, 3, 12, false)` with cyan Phong material (`emissive: #0284c7, emissiveIntensity: 0.4`)

2. **Tip sphere** — `SphereGeometry(7, 16, 16)` at the last trajectory point, high emissive intensity (glowing wellbore tip)

3. **Origin sphere** — `SphereGeometry(5, 16, 16)` at `[0, 0, 0]` (surface kick-off marker, white)

**Returns null** if fewer than 2 trajectory points are present.

---

### 8.4 `VerticalWell.jsx`

**Purpose:** Renders a reference vertical well (straight down from surface) as a faint grey cylinder with depth ring markers.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `depthTop` | number | 0 | Start depth of the reference well |
| `depthBottom` | number | 3000 | End depth of the reference well |

**Rendered Objects:**

1. **Main cylinder** — `CylinderGeometry(r=1, r=1, height, 8)` centered at `[0, centerY, 0]`. Transparent grey Phong material (`opacity: 0.4`).

2. **Torus rings** — One `TorusGeometry(6, 0.5, 6, 24)` ring every 500m of depth. Positioned at `[0, -depth, 0]`. These serve as depth markers visible in the 3D scene.

**Coordinate Note:**
`centerY = -((depthTop + depthBottom) / 2)` — the cylinder is positioned at negative Y (Three.js convention for positive TVD).

---

### 8.5 `CameraControls.jsx`

**Purpose:** Wraps `@react-three/drei`'s `OrbitControls` with application-specific settings for intuitive 3D navigation.

**Props:** None

**Configuration:**

```javascript
<OrbitControls
  enableDamping                  // Smooth inertia on release
  dampingFactor={0.05}           // 5% damping per frame (gentle deceleration)
  rotateSpeed={0.6}              // Slower than default for precision
  zoomSpeed={1.2}                // Slightly faster zoom
  panSpeed={0.8}                 // Moderate pan speed
  minDistance={50}               // Prevent zooming inside formations
  maxDistance={8000}             // Allow zooming out to see full well
/>
```

**Interaction Mapping:**
- Left mouse drag: Rotate (orbit around center)
- Right mouse drag: Pan (translate camera)
- Mouse wheel: Zoom (dolly in/out)
- Touch: Pinch to zoom, single finger to orbit

The `enableDamping` setting requires the Three.js renderer to call `controls.update()` each frame, which `@react-three/fiber` handles automatically via the render loop.

---

## 9. Build Configuration

### Vite (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'  // dev proxy
    }
  }
})
```

In development, all requests to `http://localhost:5173/api/*` are proxied to `http://localhost:8000/api/*`. This avoids CORS issues during development and mirrors production routing.

### Tailwind (`tailwind.config.js`)

Content paths `['./index.html', './src/**/*.{js,jsx}']` ensure Tailwind scans all component files for class names. The custom `colors` extension adds the petroleum-themed `geo-*` color tokens as first-class Tailwind utilities.

### Production Build

```bash
npm run build
```

Produces `frontend/dist/`:
- `index.html` — entry HTML
- `assets/index-*.js` — Vite-bundled JS (React + Three.js + all deps, minified)
- `assets/index-*.css` — PurgeCSS-processed Tailwind (only used classes retained)

The bundled JS is approximately 3–5 MB (primarily Three.js + @react-three/fiber + @react-three/drei). The CSS bundle is typically under 20 KB after purging.

---

*End of Frontend Documentation — WellPath.AI v1.0*
