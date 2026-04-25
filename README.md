<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/XGBoost-1.7-006400?style=flat-square" />
  <img src="https://img.shields.io/badge/Three.js-3D-000000?style=flat-square&logo=three.js" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

# WellPath.AI

**AI-Assisted Well Path Optimization Integrating Geosteering Principles and Historical Well Log Data**

> BSc Thesis Project — Petroleum & Mining Engineering, CUET
> Author: Joseph Ahmed (ID: 2007007) | Supervisor: Aqif Hosain Khan

---

## What It Does

WellPath.AI is an end-to-end decision-support system that automates directional well path planning. It replaces the traditional multi-step manual workflow (petrophysical interpretation + trajectory design in commercial software) with a single browser-based tool.

```
  CSV Well Log    XGBoost Zone      Genetic Algorithm       Interactive 3D
  ──────────► ──────────────► ──────────────────────► ──────────────────►
   5 log curves    Classifies each     Evolves 50 candidate     Formation layers
   200 depth pts   depth as:           trajectories over        + optimized path
   1000-2000 m     - Productive        80 generations           + survey stations
                   - Marginal                                   + convergence chart
                   - Non-productive    Fitness = zone exposure
                                       - DLS penalty
```

### Pipeline

| Stage | Input | Process | Output |
|-------|-------|---------|--------|
| **1. Data Input** | CSV file or synthetic demo data | Parse & validate 5 log curves (GR, Rt, RHOB, NPHI, DT) | Well log arrays |
| **2. Zone Prediction** | Well log arrays | XGBoost (150 trees, heuristic pseudo-labels) | Productivity scores + zone labels + feature importance |
| **3. Trajectory Optimization** | Productivity scores | Genetic Algorithm (DEAP: SBX crossover, polynomial mutation) | Best (Inc, Az) sequence decoded via Minimum Curvature Method |
| **4. 3D Visualization** | Trajectory + formation layers | Three.js scene with rig, compass, depth axis, ground plane | Interactive 3D view with survey station coordinates |

---

## Quick Start

### Prerequisites

- Python 3.9+ with pip
- Node.js 18+ with npm

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs at [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at [http://localhost:5173](http://localhost:5173)

> Both must run simultaneously. Vite proxies `/api/*` requests to `localhost:8000`.

### macOS Note

XGBoost requires the OpenMP runtime. If you see an `XGBoostError` about `libomp.dylib`:

```bash
# Option A: Install libomp via Homebrew
brew install libomp

# Option B: Use XGBoost 1.7.x which works without it
pip install 'xgboost==1.7.6'
```

---

## CSV Format

Upload any CSV with these columns (case-insensitive, common aliases accepted):

| Required Column | Accepted Aliases | Unit |
|---|---|---|
| Depth | md, measured_depth, tvd, dept | m |
| GR | gamma_ray, gr_api | API |
| Resistivity | rt, res, ild, deep_resistivity | ohm.m |
| Density | rhob, bulk_density, den | g/cc |
| NeutronPorosity | nphi, neutron, cnl, porosity | fraction |
| Sonic | dt, dtco, travel_time, dtc | us/ft |

**Example:**
```csv
Depth,GR,RT,RHOB,NPHI,DT
1000,25,50,2.3,0.18,58
1010,30,55,2.4,0.19,57
```

Or click **Load Synthetic Data** to use the built-in demo dataset (seed: 2007007).

---

## Features

### Machine Learning
- **XGBoost** gradient boosting classifier (150 trees, regularised, histogram-based)
- Heuristic pseudo-labels from published petrophysical cutoffs
- Per-depth productivity probability scores (not binary classification)
- Feature importance ranking for model interpretability

### Trajectory Optimization
- **Genetic Algorithm** via DEAP framework (population=50, generations=80)
- SBX crossover + polynomial bounded mutation
- Fitness = productive zone exposure - DLS penalty (weight=0.3)
- **Minimum Curvature Method** — industry standard survey calculation

### 3D Visualization
- Interactive Three.js scene with formation layers, well trajectory, and rig model
- Three control modes: Orbit (rotate), Grab (pan), Zoom
- Four camera presets: Perspective, Front, Side, Top-Down
- Auto-rotate, show/hide labels, ground reference plane
- Survey station waypoints colored by inclination
- Kick-off Point and Total Depth markers
- GA convergence sparkline chart
- Light-theme HUD overlays (Legend, SceneStats, ConvergenceChart, Controls, ModeBar) layered above the dark inner canvas

### UI / Theme
- Slate-tinted **light** theme matching the thesis-defence presentation design language
- Clickable WellPath.AI logo always returns home with a clean Step 1
- Header dashboard toggle with run-count badge
- Per-step Back buttons preserve the workflow data while walking backwards

### Navigation & History
- **Step-by-step workflow** with clickable step indicator (navigate to any completed step via `goToStep`, gated by data prerequisites)
- **Back button** on every step to return to previous stage
- **Run history** persisted to `localStorage` via Zustand `persist` (key: `wellpath-store`, only `runHistory` is persisted)
- **Dashboard** with aggregate stats (total runs, best fitness, avg zone exposure, avg productive %) across all runs
- **Load Run / Delete** actions on each saved run
- **Survey station table** showing all trajectory point coordinates (MD, Inc, Az, TVD, N, E)

---

## Repository Structure

```
WellPath.AI/
├── backend/                    # Python FastAPI server
│   ├── main.py                 # App entry, CORS, router registration
│   ├── requirements.txt
│   ├── api/routes/
│   │   ├── upload.py           # POST /api/upload — CSV ingestion
│   │   ├── predict.py          # POST /api/predict — XGBoost inference
│   │   ├── optimize.py         # POST /api/optimize — GA optimization
│   │   └── synthetic.py        # GET /api/synthetic — demo data
│   ├── ml/
│   │   ├── xgboost_model.py    # XGBoost training + prediction
│   │   ├── preprocessor.py     # StandardScaler + heuristic labelling
│   │   └── synthetic_data.py   # Deterministic synthetic well log generator
│   ├── optimization/
│   │   ├── genetic_algorithm.py # DEAP GA (SBX, polynomial mutation, tournament)
│   │   ├── fitness.py          # Fitness = zone exposure - DLS penalty
│   │   └── well_trajectory.py  # Minimum Curvature Method
│   ├── utils/
│   │   └── csv_parser.py       # CSV alias resolution + validation
│   └── README.md
│
├── frontend/                   # React + Vite + Three.js
│   ├── src/
│   │   ├── App.jsx             # Root layout, step indicator, navigation
│   │   ├── store/wellStore.js  # Zustand state (persist middleware for history)
│   │   ├── api/wellpath.js     # Fetch wrappers for backend endpoints
│   │   ├── components/
│   │   │   ├── layout/         # Header, Sidebar (with back navigation)
│   │   │   ├── upload/         # UploadZone, DataPreview
│   │   │   ├── charts/         # WellLogChart, ProductivityChart, FeatureImportance
│   │   │   ├── visualization/  # Scene3D, FormationLayers, WellTrajectory, VerticalWell
│   │   │   └── Dashboard.jsx   # Run history dashboard with aggregate stats
│   │   └── styles/
│   ├── vite.config.js
│   └── README.md
│
├── docs/                       # Technical documentation
│   ├── README.md               # Documentation index
│   ├── ARCHITECTURE.md         # System design, data flow, API contract
│   ├── ALGORITHMS.md           # XGBoost, GA, MCM algorithm details
│   ├── BACKEND.md              # Backend module reference
│   ├── FRONTEND.md             # Frontend component reference
│   ├── PETROPHYSICS.md         # Well log interpretation theory
│   ├── MACHINE_LEARNING.md     # XGBoost theory + configuration
│   ├── GENETIC_ALGORITHM.md    # GA theory + DEAP implementation
│   ├── DIRECTIONAL_DRILLING.md # MCM equations + borehole geometry
│   └── THESIS_DEFENSE_GUIDE.md # Defense Q&A, presentation structure
│
└── .github/                    # GitHub templates
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Python 3.9, FastAPI, Uvicorn | REST API server |
| **ML** | XGBoost 1.7, scikit-learn, pandas, NumPy | Zone classification |
| **Optimization** | DEAP | Genetic Algorithm framework |
| **Frontend** | React 18, Vite | UI framework + build tool |
| **3D** | Three.js, @react-three/fiber, @react-three/drei | 3D visualization |
| **Charts** | Recharts | 2D well log and productivity charts |
| **State** | Zustand (with persist middleware) | Global state + localStorage history |
| **Styling** | Tailwind CSS | Slate-tinted light-theme utility palette (`geo-*` tokens) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/synthetic` | Returns synthetic demo well log data |
| `POST` | `/api/upload` | Accepts CSV file, returns parsed well log JSON |
| `POST` | `/api/predict` | Runs XGBoost on well log, returns zone predictions |
| `POST` | `/api/optimize` | Runs GA optimization, returns trajectory + formation layers |

Full API documentation with request/response schemas: [backend/README.md](backend/README.md)

---

## Documentation

All technical documentation is in the [docs/](docs/) directory:

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow diagrams, API contract, deployment |
| [Algorithms](docs/ALGORITHMS.md) | XGBoost pipeline, GA design, Minimum Curvature Method details |
| [Backend Reference](docs/BACKEND.md) | FastAPI routes, ML modules, optimization modules |
| [Frontend Reference](docs/FRONTEND.md) | React components, Zustand store, Three.js scene graph |
| [Petrophysics](docs/PETROPHYSICS.md) | Well log theory — GR, Resistivity, Density, Neutron Porosity, Sonic |
| [Machine Learning](docs/MACHINE_LEARNING.md) | Gradient boosting theory, XGBoost equations, heuristic labelling |
| [Genetic Algorithm](docs/GENETIC_ALGORITHM.md) | GA theory, SBX crossover, convergence analysis, DEAP framework |
| [Directional Drilling](docs/DIRECTIONAL_DRILLING.md) | MCM equations, borehole geometry, dogleg severity, coordinate systems |
| [Thesis Defense Guide](docs/THESIS_DEFENSE_GUIDE.md) | Committee Q&A, presentation structure, key numbers, vocabulary |

Package-level references: [backend/README.md](backend/README.md) | [frontend/README.md](frontend/README.md)

---

## Key Parameters

| Parameter | Value | Description |
|---|---|---|
| XGBoost trees | 150 | `n_estimators` |
| Max tree depth | 5 | Controls model complexity |
| Learning rate | 0.08 | Shrinkage per tree |
| GA population | 50 | Individuals per generation |
| GA generations | 80 | Default iteration count |
| Waypoints | 8 | Survey stations per trajectory |
| DLS weight | 0.3 | Dogleg severity penalty |
| Synthetic seed | 2007007 | Deterministic demo data |

---

## Thesis Context

**Title:** AI-Assisted Well Path Optimization Integrating Geosteering Principles and Historical Well Log Data

**Author:** Joseph Ahmed (ID: 2007007)
**Program:** BSc Petroleum & Mining Engineering
**Institution:** Chittagong University of Engineering & Technology (CUET)
**Supervisor:** Aqif Hosain Khan
**Year:** 2025

---

## License

MIT
