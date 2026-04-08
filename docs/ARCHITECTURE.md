# WellPath.AI — System Architecture & Developer Documentation

**Author:** Joseph Ahmed (Student ID: 2007007)
**Supervisor:** Assistant Professor Aqif Hosain Khan
**Institution:** Chittagong University of Engineering & Technology (CUET)
**Department:** Petroleum and Mining Engineering
**Year:** 2025

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Full End-to-End Data Flow](#2-full-end-to-end-data-flow)
3. [Project Directory Structure](#3-project-directory-structure)
4. [Backend Architecture (FastAPI)](#4-backend-architecture-fastapi)
5. [Machine Learning Pipeline](#5-machine-learning-pipeline)
6. [Genetic Algorithm for Well Path Optimization](#6-genetic-algorithm-for-well-path-optimization)
7. [Minimum Curvature Method](#7-minimum-curvature-method)
8. [3D Visualization Architecture](#8-3d-visualization-architecture)
9. [State Management (Zustand Store)](#9-state-management-zustand-store)
10. [Synthetic Data Generation](#10-synthetic-data-generation)
11. [CSV Upload Format](#11-csv-upload-format)
12. [API Reference](#12-api-reference)
13. [Running the Project](#13-running-the-project)

---

## 1. System Overview

WellPath.AI is an AI-assisted wellbore trajectory optimization tool designed for the petroleum engineering domain. It combines machine learning-based formation evaluation with evolutionary computation to compute the optimal directional drilling path through productive subsurface zones, rendered in real time as an interactive 3D scene.

The system is structured as a classic **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WellPath.AI System                                │
├──────────────────────┬────────────────────────┬────────────────────────────┤
│  PRESENTATION LAYER  │   INTELLIGENCE LAYER   │  DATA LAYER                │
│  (React + Three.js)  │  (FastAPI + Python)    │  (In-Memory / CSV)         │
│                      │                        │                            │
│  • 4-Step Workflow   │  • XGBoost / HGB       │  • Synthetic Generator     │
│  • Well Log Charts   │  • Genetic Algorithm   │  • CSV Upload Parser       │
│  • 3D Visualization  │  • Min. Curvature      │  • Well Log Columns:       │
│  • Orbit Controls    │  • Fitness Function    │    GR, RT, RHOB,           │
│  • Recharts panels   │  • DEAP framework      │    NPHI, DT                │
│  • Zustand store     │  • StandardScaler      │  • Heuristic labeling      │
└──────────────────────┴────────────────────────┴────────────────────────────┘
```

### Tier Responsibilities

| Tier | Technology | Responsibility |
|------|-----------|----------------|
| Presentation | React 18, Three.js, @react-three/fiber, Recharts, Zustand | User interaction, visualization, state management |
| Intelligence | FastAPI, Python, XGBoost, DEAP | ML prediction, GA optimization, trajectory math |
| Data | pandas, NumPy, in-memory dicts | Synthetic generation, CSV parsing, data normalization |

### Technology Stack Summary

**Frontend:**
- React 18.3 (functional components, hooks)
- Vite 5 (build tool, dev server with proxy)
- Three.js 0.165 via @react-three/fiber and @react-three/drei
- Recharts 2.12 for 2D well log and productivity charts
- Zustand 4.5 for global state management
- Tailwind CSS 3.4 with custom geo-dark color palette

**Backend:**
- FastAPI 0.111 (ASGI web framework)
- Uvicorn (ASGI server)
- XGBoost 2.0 / scikit-learn 1.4 (gradient boosting classifier)
- DEAP 1.4.1 (evolutionary computation framework)
- pandas 2.2 + NumPy 1.26 (data manipulation)
- Pydantic v2 (request/response validation)

---

## 2. Full End-to-End Data Flow

The application progresses through four steps. Each step's action triggers a backend call, updates Zustand global state, and advances the UI to the next step.

```
USER ACTION                  FRONTEND (React)             BACKEND (FastAPI)
──────────────────────────────────────────────────────────────────────────────
"Load Synthetic"   ──────►  Sidebar.jsx                  GET /api/synthetic
                             handleSynthetic()                    │
                             getSyntheticData()                   ▼
                                  │                       synthetic_data.py
                                  │                       generate_synthetic_well_log()
                                  │                           • 200 depth points
                                  │                           • linspace(1000, 2000, 200)
                                  │                           • 6–8 random formation layers
                                  │                           • Sandstone / Shale / Limestone
                                  │                           • 2% Gaussian noise per curve
                                  │                           • Physical range clipping
                                  ◄──────────────────  { depths, GR, Resistivity,
                                  │                      Density, NeutronPorosity, Sonic }
                             wellStore.js
                             setWellLog(data)              → activeStep = 2
                                  │
──────────────────────────────────────────────────────────────────────────────
"Upload CSV"       ──────►  UploadZone.jsx                POST /api/upload
                             uploadCSV(file)               multipart form-data
                                  │                               │
                                  │                       csv_parser.py
                                  │                       parse_well_log_csv()
                                  │                           • Alias resolution
                                  │                           • NaN row dropping
                                  │                           • Depth sort ascending
                                  ◄──────────────────  { Depth, GR, Resistivity,
                                  │                      Density, NeutronPorosity, Sonic }
                             setWellLog(data)              → activeStep = 2
                                  │
──────────────────────────────────────────────────────────────────────────────
"Run XGBoost"      ──────►  Sidebar.jsx                   POST /api/predict
                             handlePredict()               WellLogInput (Pydantic)
                             runPrediction(wellLog)                │
                                  │                               ▼
                                  │                       preprocessor.py
                                  │                       normalize_features()  ← StandardScaler
                                  │                       label_by_heuristics() ← Rule-based
                                  │                               │
                                  │                               ▼
                                  │                       xgboost_model.py
                                  │                       XGBClassifier (or HGBClassifier)
                                  │                       .fit(X_scaled, labels)
                                  │                       .predict_proba(X_orig)
                                  │                       .predict(X_orig)
                                  │                       feature_importances_
                                  │                               │
                                  ◄──────────────────  { depths, productivity_score,
                                  │                      zone_label, feature_importance,
                                  │                      model_backend }
                             setPredictions(data)          → activeStep = 3
                                  │
──────────────────────────────────────────────────────────────────────────────
"Run GA"           ──────►  Sidebar.jsx                   POST /api/optimize
                             handleOptimize()              OptimizeInput (Pydantic)
                             runOptimization(                      │
                               predictions, gaConfig)             ▼
                                  │                       genetic_algorithm.py
                                  │                       run_ga_optimization()
                                  │                           │
                                  │                           ├─► _build_md_array()
                                  │                           │     evenly-spaced MD stations
                                  │                           │
                                  │                           ├─► DEAP toolbox setup
                                  │                           │     • cxSimulatedBinaryBounded
                                  │                           │     • mutPolynomialBounded
                                  │                           │     • selTournament (k=3)
                                  │                           │
                                  │                           ├─► Population init (size=50)
                                  │                           │     random inc ∈ [0,85]
                                  │                           │     random az  ∈ [0,360]
                                  │                           │
                                  │                           └─► Evolution loop (gen=80)
                                  │                                 │
                                  │                          _evaluate_individual()
                                  │                                 │
                                  │                          well_trajectory.py
                                  │                          minimum_curvature()
                                  │                                 │
                                  │                          fitness.py
                                  │                          compute_fitness()
                                  │                            productive_exposure
                                  │                            - dls_weight * dls_penalty
                                  │                                 │
                                  │                       Best individual decode
                                  │                       _build_formation_layers()
                                  │                           • smooth scores
                                  │                           • group by label
                                  │                           • merge thin layers (< 30m)
                                  │                               │
                                  ◄──────────────────  { trajectory, fitness_score,
                                  │                      productive_zone_exposure,
                                  │                      max_dogleg_severity,
                                  │                      generation_history,
                                  │                      formation_layers }
                             setTrajectory(data)           → activeStep = 4
                                  │
──────────────────────────────────────────────────────────────────────────────
3D Scene renders   ──────►  Scene3D.jsx (React Three Fiber Canvas)
                             ├── FormationLayers.jsx
                             │       formation_layers[]
                             │       BoxGeometry per layer
                             │       Green/Amber/Red by score
                             │
                             ├── WellTrajectory.jsx
                             │       trajectory[] → THREE.Vector3[]
                             │       CatmullRomCurve3 (catmullrom, tension=0.5)
                             │       TubeGeometry (radius=3, segments=128)
                             │       Cyan emissive material
                             │
                             ├── VerticalWell.jsx
                             │       CylinderGeometry reference
                             │       Torus ring markers every 500m
                             │
                             ├── DepthAxis
                             │       Tick marks every 500m
                             │
                             └── CameraControls.jsx
                                     OrbitControls
                                     enableDamping, dampingFactor=0.05
```

---

## 3. Project Directory Structure

```
WellPath.AI/
│
├── ARCHITECTURE.md                 ← This document
│
├── backend/                        ← Python FastAPI application
│   ├── main.py                     ← FastAPI app factory, CORS, router registration
│   ├── requirements.txt            ← Python dependencies
│   │
│   ├── api/                        ← HTTP route handlers (thin controllers)
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── synthetic.py        ← GET /api/synthetic → synthetic well log
│   │       ├── upload.py           ← POST /api/upload  → CSV parsing
│   │       ├── predict.py          ← POST /api/predict → XGBoost classification
│   │       └── optimize.py         ← POST /api/optimize → GA trajectory optimization
│   │
│   ├── ml/                         ← Machine learning modules
│   │   ├── __init__.py
│   │   ├── synthetic_data.py       ← Synthetic well log generator (6–8 layers, 200 pts)
│   │   ├── preprocessor.py         ← StandardScaler normalization + heuristic labeling
│   │   └── xgboost_model.py        ← XGBClassifier / HGBClassifier train+predict
│   │
│   ├── optimization/               ← Well path optimization modules
│   │   ├── __init__.py
│   │   ├── genetic_algorithm.py    ← DEAP-based GA: chromosome encoding, evolution loop
│   │   ├── well_trajectory.py      ← Minimum curvature method + DLS computation
│   │   └── fitness.py              ← Fitness function: productive_exposure − w·DLS
│   │
│   └── utils/                      ← Shared utilities
│       ├── __init__.py
│       └── csv_parser.py           ← CSV column alias resolution, NaN drop, depth sort
│
├── frontend/                       ← React + Vite + Three.js SPA
│   ├── index.html                  ← Entry HTML (Vite entrypoint)
│   ├── package.json                ← npm dependencies (react, three, recharts, zustand)
│   ├── vite.config.js              ← Vite config: React plugin, /api proxy → :8000
│   ├── tailwind.config.js          ← Custom colors: geo-dark, geo-panel, geo-accent, etc.
│   ├── postcss.config.js           ← PostCSS for Tailwind
│   │
│   ├── dist/                       ← Production build output (Vite)
│   │   ├── index.html
│   │   └── assets/
│   │       ├── index-*.css         ← Compiled Tailwind CSS
│   │       └── index-*.js          ← Bundled JS (React + Three.js + all deps)
│   │
│   └── src/                        ← Application source
│       ├── main.jsx                ← React DOM root mount
│       ├── App.jsx                 ← Root layout: Header, StepIndicator, Sidebar, MainPanel
│       │
│       ├── api/
│       │   └── wellpath.js         ← Fetch-based API client (4 functions)
│       │
│       ├── store/
│       │   └── wellStore.js        ← Zustand store: wellLog, predictions, trajectory, step
│       │
│       ├── styles/
│       │   └── index.css           ← Tailwind directives + custom CSS classes
│       │
│       └── components/
│           ├── layout/
│           │   ├── Header.jsx      ← App title bar, CUET badge
│           │   └── Sidebar.jsx     ← Step-conditional controls + GA sliders + stats
│           │
│           ├── upload/
│           │   ├── UploadZone.jsx  ← Drag-and-drop / click CSV upload zone
│           │   └── DataPreview.jsx ← First-10-rows tabular preview of well log
│           │
│           ├── charts/
│           │   ├── WellLogChart.jsx       ← Recharts vertical GR/Res/Density/NPHI tracks
│           │   ├── ProductivityChart.jsx  ← Vertical bar chart: productivity score by depth
│           │   └── FeatureImportance.jsx  ← Horizontal bar chart: XGBoost importances
│           │
│           └── visualization/
│               ├── Scene3D.jsx            ← React Three Fiber Canvas: full 3D scene
│               ├── FormationLayers.jsx    ← 3D formation slab meshes (BoxGeometry)
│               ├── WellTrajectory.jsx     ← 3D tube along CatmullRomCurve3
│               ├── VerticalWell.jsx       ← Reference vertical well cylinder
│               └── CameraControls.jsx     ← OrbitControls wrapper (damping, limits)
```

---

## 4. Backend Architecture (FastAPI)

### Application Entry Point: `main.py`

FastAPI is instantiated with title, description, and version metadata. CORSMiddleware is configured to allow all origins (`*`), methods, and headers, which is appropriate for a thesis prototype where backend and frontend may run on different ports. Four routers are registered under the `/api` prefix.

A dedicated health check endpoint (`GET /health`) returns a simple JSON object and is used to verify the backend process is alive.

### API Endpoint Table

| Method | Endpoint | Input | Output | Handler Module |
|--------|----------|-------|--------|---------------|
| GET | `/api/synthetic` | None | Well log JSON (6 arrays) | `routes/synthetic.py` |
| POST | `/api/upload` | Multipart CSV file | Well log JSON (6 arrays) | `routes/upload.py` |
| POST | `/api/predict` | WellLogInput JSON | Productivity predictions | `routes/predict.py` |
| POST | `/api/optimize` | OptimizeInput JSON | Trajectory + GA results | `routes/optimize.py` |
| GET | `/health` | None | `{status: "ok"}` | `main.py` |

### Route Handlers

**`routes/synthetic.py`**
Thin handler. Calls `generate_synthetic_well_log()` and returns the dict directly (FastAPI serializes it to JSON). No request body required.

**`routes/upload.py`**
Accepts a multipart file upload. Validates the `.csv` extension, reads file bytes, decodes UTF-8, wraps in a `StringIO`, and passes to `parse_well_log_csv()`. Returns the resulting DataFrame column-by-column as JSON arrays. Raises HTTP 400 for non-CSV files; HTTP 422 with descriptive message for parsing failures.

**`routes/predict.py`**
Accepts a `WellLogInput` Pydantic model (six typed list fields). Calls `predict_zones()` from `xgboost_model.py`. Returns predictions dict. Raises HTTP 500 with the exception message on internal errors.

**`routes/optimize.py`**
Accepts an `OptimizeInput` Pydantic model with prediction data plus optional GA configuration fields (`waypoints`, `population`, `generations`, `dls_weight`). Calls `run_ga_optimization()`. Returns the full optimization result dict. Raises HTTP 500 on errors.

### Module Dependency Graph

```
main.py
├── routes/synthetic.py  ──► ml/synthetic_data.py
├── routes/upload.py     ──► utils/csv_parser.py
├── routes/predict.py    ──► ml/xgboost_model.py
│                                  ├── ml/preprocessor.py
│                                  └── xgboost (XGBClassifier)
└── routes/optimize.py   ──► optimization/genetic_algorithm.py
                                   ├── optimization/well_trajectory.py
                                   └── optimization/fitness.py
                                              └── optimization/well_trajectory.py
```

---

## 5. Machine Learning Pipeline

### 5.1 Heuristic Labeling Strategy

Supervised machine learning requires labeled training data. In the absence of ground-truth formation evaluation reports, WellPath.AI derives labels automatically from the well log measurements using established petrophysical rules. This approach is called **heuristic labeling** (also known as rule-based pseudo-labeling).

The labeling rules encode the following petrophysical relationships:

```
Labeling Rules — label_by_heuristics() in preprocessor.py
┌────────────────────────────────────────────────────┬─────────┬─────────────┐
│  Condition                                         │  Class  │  Label      │
├────────────────────────────────────────────────────┼─────────┼─────────────┤
│  Resistivity > 15 Ω·m  AND                         │    1    │ Productive  │
│  GR < 60 API           AND                         │         │             │
│  NeutronPorosity > 0.12 frac                       │         │             │
├────────────────────────────────────────────────────┼─────────┼─────────────┤
│  Resistivity > 8 Ω·m   AND                         │    2    │ Marginal    │
│  GR < 80 API                                       │         │             │
├────────────────────────────────────────────────────┼─────────┼─────────────┤
│  All other cases                                   │    0    │ Non-prod.   │
└────────────────────────────────────────────────────┴─────────┴─────────────┘

Evaluation order: labels start at 0 (non-productive), marginal mask is applied
first (overrides to 2), then productive mask is applied (overrides to 1).
This ensures productive class wins over marginal when both conditions are met.
```

**Petrophysical Basis:**

| Feature | Threshold | Interpretation |
|---------|-----------|----------------|
| GR < 60 API | Low gamma ray | Sand-dominated lithology (not shale). Shales have high GR due to potassium/thorium/uranium. |
| GR < 80 API | Moderate gamma ray | Silty sand or marginal sand, possibly with clay content. |
| Resistivity > 15 Ω·m | High resistivity | Hydrocarbon-bearing pore space. Brine has low resistivity (~0.5–2 Ω·m); hydrocarbons are resistive. |
| Resistivity > 8 Ω·m | Moderate resistivity | Partially hydrocarbon-bearing or tight formation. |
| NPHI > 0.12 frac | High neutron porosity | Porous formation capable of holding significant fluid volume. |

### 5.2 XGBoost Model

WellPath.AI uses real XGBoost directly:

```python
from xgboost import XGBClassifier
```

On macOS, XGBoost 1.7.x works without `libomp`; version 2.x+ requires `brew install libomp`.

**XGBoost Hyperparameters:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `n_estimators` | 100 | Sufficient boosting rounds for 200 training samples; avoids overfitting |
| `max_depth` | 4 | Shallow trees reduce variance; well log features have clear threshold-based relationships |
| `learning_rate` | 0.1 | Conservative shrinkage; each tree contributes 10% of its estimate |
| `eval_metric` | mlogloss | Multi-class log loss; appropriate for 3-class softmax output |
| `random_state` | 42 | Reproducible initialization |

**Gradient Boosting Tree Ensemble (ASCII):**

```
Input: X_scaled (200×5 matrix, StandardScaler normalized)

Tree 1 (weak learner):          Tree 2 (residual fitter):
       [NPHI > 0.13?]                  [Rt > 10.2?]
       /           \                   /           \
  [GR < 55?]    [non-prod]        [GR < 72?]   [non-prod]
  /       \                       /       \
prod   marginal               marginal   non-prod

F_1(x) = α·T1(x)              F_2(x) = F_1(x) + α·T2(x)
                                    ...
                               F_100(x) = Σ α·Tᵢ(x)
                                         i=1..100

α = learning_rate = 0.1

Final prediction: softmax(F_100(x)) → P(class=0), P(class=1), P(class=2)
productivity_score = P(class=1) = P("productive")
```

**Class Augmentation:**
If any of the three classes is absent from the heuristic labels (e.g., no productive zones in an all-shale log), one synthetic dummy row per missing class is appended to the training set. This ensures the classifier initializes correctly for 3-class softmax.

**Feature Importance:**
XGBoost reports `feature_importances_` as the mean gain reduction per split across all trees. In this domain, Resistivity typically dominates because it is the primary hydrocarbon indicator. GR is secondary as the lithology discriminator. NeutronPorosity, Density, and Sonic provide additional context.

### 5.3 Feature Engineering

The five well log input features fed to the model are:

| Feature | Internal Name | Physical Measurement | Unit | Typical Range | Tool |
|---------|--------------|---------------------|------|--------------|------|
| Gamma Ray | GR | Natural radioactivity of formation | API | 5–200 | Gamma Ray Tool (GR) |
| Resistivity | Resistivity | Deep formation resistivity (Rt) | Ω·m | 0.5–300 | Induction / Laterolog (ILD/LLD) |
| Density | Density | Bulk density (RHOB) | g/cc | 1.8–3.0 | Density Tool (LDT/Litho-Density) |
| Neutron Porosity | NeutronPorosity | Hydrogen index / apparent porosity | fraction | 0.0–0.60 | Compensated Neutron Tool (CNL) |
| Sonic | Sonic | Compressional travel time (DT / DTCO) | μs/ft | 40–120 | Sonic Tool (BHC/DSI) |

All five features are passed through `StandardScaler` before being fed to the model:

```
X_scaled[i,j] = (X[i,j] − mean_j) / std_j
```

This ensures that no single feature dominates gradient updates due to scale differences (e.g., GR in hundreds vs. NPHI in fractions).

---

## 6. Genetic Algorithm for Well Path Optimization

### 6.1 Problem Formulation

The GA optimizes wellbore trajectory to maximize time spent in productive formations while minimizing mechanical complexity (dogleg severity):

```
Maximize:  F(chromosome) = E_prod(T) − w · DLS_norm(T)

Where:
  T        = wellbore trajectory {(depth_i, x_i, y_i, z_i) | i = 0..N−1}
  E_prod   = mean productivity score interpolated at each trajectory point z-depth
             = mean(np.interp(traj_z, depths_arr, scores_arr))
  DLS_norm = mean dogleg severity / MAX_DLS   (normalized to [0,1])
             MAX_DLS = 3.0 °/30m (industry-standard reference maximum)
  w        = dls_weight (default 0.3)
  N        = number of trajectory points = n_waypoints (default 8)

Subject to:
  0°  ≤ inclination_i ≤ 85°     for i = 1..N−1
  0°  ≤ azimuth_i    ≤ 360°    for i = 1..N−1
  inclination_0 = 0°  (vertical at surface / kick-off point)
  azimuth_0     = 0°  (north at surface / kick-off point)
  start_z = min(depths),  end_z = max(depths)
  MD stations evenly spaced: md_i = start_depth + i·(end_depth−start_depth)/(N−1)
```

The problem is **non-convex**: the fitness landscape has many local optima because small changes to inclination/azimuth at one station can cause large non-linear changes in the final TVD position. Gradient-based methods cannot reliably find the global optimum. Evolutionary computation is well-suited for this type of search.

### 6.2 Chromosome Encoding

Each individual in the GA population encodes a complete directional drilling survey program:

```
Chromosome = [inc₁, az₁, inc₂, az₂, inc₃, az₃, ..., inc_{N−1}, az_{N−1}]
              └──┬──┘  └──┬──┘  └──┬──┘              └──────┬──────┘
            Station 1  Station 2  Station 3           Station N−1
            (genes 0,1) (genes 2,3) (genes 4,5)    (genes 2N−4, 2N−3)

Total genes: 2 × (N−1)
[Station 0 is fixed: inc=0°, az=0° — vertical kick-off]

Example (N=8 waypoints, 14 genes):
Index:  [0]    [1]    [2]    [3]    [4]    [5]  ...  [12]   [13]
Gene:   inc₁   az₁   inc₂   az₂   inc₃   az₃  ...  inc₇   az₇
Range: 0−85  0−360  0−85  0−360  0−85  0−360      0−85   0−360

Decoding (_decode_individual):
  md_array  = linspace(start_depth, end_depth, N)
  inc_array = [0.0, inc₁, inc₂, ..., inc_{N−1}]
  az_array  = [0.0,  az₁,  az₂, ...,  az_{N−1}]
  → passed to minimum_curvature() → Cartesian trajectory
```

### 6.3 GA Operators

| Operator | DEAP Function | Parameters | Purpose |
|----------|--------------|-----------|---------|
| Selection | `tools.selTournament` | `tournsize=3` | Randomly sample 3 individuals, select the fittest. Balances exploration (small tournament) vs exploitation (large tournament). |
| Crossover | `tools.cxSimulatedBinaryBounded` | `eta=20, p_cx=0.7` | SBX creates offspring near parents (high eta = tight offspring). Preserves physically meaningful angle continuity better than uniform crossover. Bounded to [0,85] / [0,360]. |
| Mutation | `tools.mutPolynomialBounded` | `eta=20, indpb=0.2` | Each gene mutated independently with probability 0.2. Polynomial distribution favors small perturbations (high eta). Maintains search diversity. |

**Why SBX over Uniform Crossover?**
For real-valued parameters representing physical angles, SBX (Simulated Binary Crossover) produces children that are statistically close to their parents. This is important because the trajectory is a continuous physical object — drastically different inclination values between parent and child would produce geometrically unrelated trajectories, disrupting the building-block hypothesis. SBX with η=20 produces children concentrated near the midpoint of the two parents, analogous to single-point crossover in binary GAs.

### 6.4 Evolution Loop Flowchart

```
                   Initialize Population (size=50)
                   Each individual: 2×(N−1) random genes
                   inc genes: U[0, 85],  az genes: U[0, 360]
                             │
                   Evaluate Fitness (all 50 individuals)
                   _evaluate_individual() for each:
                     decode → minimum_curvature() → compute_fitness()
                             │
                   ┌─────────▼─────────────┐
                   │   Generation Loop      │ ◄──────────────────────────┐
                   │   g = 0 .. N_gen−1     │                            │
                   │   (default: 80 gens)   │                            │
                   └─────────┬─────────────┘                            │
                             │                                           │
                   Tournament Selection (k=3)                            │
                   Select len(pop)=50 offspring                          │
                   (with replacement)                                    │
                             │                                           │
                   ┌─────────▼─────────────┐                            │
                   │  Crossover             │                            │
                   │  p_cx = 0.7            │                            │
                   │  SBX (η=20, bounded)   │                            │
                   │  Pairs: [0,1],[2,3]... │                            │
                   └─────────┬─────────────┘                            │
                             │                                           │
                   ┌─────────▼─────────────┐                            │
                   │  Mutation              │                            │
                   │  p_mut = 0.2           │                            │
                   │  Polynomial (η=20)     │                            │
                   │  Per-gene prob = 0.2   │                            │
                   └─────────┬─────────────┘                            │
                             │                                           │
                   Evaluate invalid individuals only                     │
                   (those whose fitness was deleted)                     │
                             │                                           │
                   pop[:] = offspring  (generational replacement)        │
                             │                                           │
                   Record best fitness ─────────────────────────────────┘
                   generation_history.append(max_fitness)
                             │
                   ┌─────────▼──────────────────────────┐
                   │  Return best individual              │
                   │  tools.selBest(pop, 1)[0]           │
                   │  Decode chromosome                   │
                   │  Compute final minimum_curvature()  │
                   │  compute_dogleg_severity()           │
                   │  productive_exposure (np.interp)     │
                   │  _build_formation_layers()           │
                   └─────────────────────────────────────┘
```

---

## 7. Minimum Curvature Method

The minimum curvature method is the industry-standard algorithm (referenced in API RP 11V9 and the IADCO handbook) for converting directional survey measurements into 3D Cartesian coordinates.

```
Minimum Curvature Method — well_trajectory.py

Given two consecutive survey stations:
  Station i:   MD_i,   Inc_i,   Az_i    (measured depth, inclination, azimuth)
  Station i+1: MD_i+1, Inc_i+1, Az_i+1

All angles converted to radians for computation.

Step 1: Compute dogleg angle (DL) in radians
─────────────────────────────────────────────
  cos(DL) = cos(Inc_{i+1} − Inc_i)
            − sin(Inc_i) · sin(Inc_{i+1}) · (1 − cos(Az_{i+1} − Az_i))

  DL = acos(cos(DL))   [clamped to [−1, 1] for numerical stability]

Step 2: Compute Ratio Factor (RF)
──────────────────────────────────
  If |DL| < 1×10⁻¹⁰:   RF = 1.0   (straight section → Average Angle Method)
  Otherwise:             RF = (2/DL) · tan(DL/2)

  Physical interpretation: RF weights the contribution of each station's
  direction vector. For a perfectly straight section (DL=0), RF=1 and the
  method degenerates to the average angle method.

Step 3: Compute coordinate increments
──────────────────────────────────────
  ΔMD = MD_{i+1} − MD_i

  Δx = (ΔMD/2) · [sin(Inc_i)·sin(Az_i) + sin(Inc_{i+1})·sin(Az_{i+1})] · RF
       (East offset increment)

  Δy = (ΔMD/2) · [sin(Inc_i)·cos(Az_i) + sin(Inc_{i+1})·cos(Az_{i+1})] · RF
       (North offset increment)

  Δz = (ΔMD/2) · [cos(Inc_i) + cos(Inc_{i+1})] · RF
       (TVD increment, positive = deeper)

Step 4: Accumulate position
────────────────────────────
  x_{i+1} = x_i + Δx
  y_{i+1} = y_i + Δy
  z_{i+1} = z_i + Δz

Output per station:
  { depth: MD_i, x: float, y: float, z: float,
    inclination: Inc_i°, azimuth: Az_i° }

Dogleg Severity (DLS) per interval — compute_dogleg_severity():
──────────────────────────────────────────────────────────────────
  DL_deg = degrees(acos(cos_dl))          [dogleg angle in degrees]
  DLS    = (DL_deg / ΔMD) × 30           [normalized to °/30m]

  Industry limit: DLS ≤ 3°/30m for most wellbores (higher limits for ERD wells).
  WellPath.AI normalizes against MAX_DLS = 3.0 °/30m in the fitness function.
```

---

## 8. 3D Visualization Architecture

### Coordinate System Mapping

The petroleum industry uses a right-handed survey coordinate system where depth increases downward (positive TVD). Three.js uses a right-handed system where +Y is "up". The mapping applied in `WellTrajectory.jsx` and `FormationLayers.jsx` inverts the TVD:

```
Coordinate System Mapping
──────────────────────────────────────────────────────────────────
Petroleum Survey Convention:          Three.js World Space:
  +x = East                             +x = East  (unchanged)
  +y = North                            +y = Up     (inverted TVD!)
  +z = TVD (positive = deeper)          +z = South  (North → +Z)

Mapping:
  THREE.Vector3.x = survey.x           (east offset, direct)
  THREE.Vector3.y = -(survey.z)        (negate TVD: deeper → negative Y)
  THREE.Vector3.z =  survey.y          (north offset → Three.js Z axis)

FormationLayer position:
  centerY = -((depth_top + depth_bottom) / 2)   [midpoint, negated]
  mesh position: [0, centerY, 0]
  BoxGeometry: [400, height, 400]                [wide slab, height = thickness]

Camera:
  position: [400, -(maxDepth * 0.3), 600]        [east, 30% depth up, south]
  fov: 50°, near: 1, far: 20000
  OrbitControls: minDistance=50, maxDistance=8000

Formation Layer Colors:
  avg_score > 0.6 OR label === 'productive' → #10b981 (green),  opacity 0.65
  avg_score > 0.35 OR label === 'marginal'  → #f59e0b (amber),  opacity 0.50
  otherwise (non-productive)                → #ef4444 (red),    opacity 0.35
```

### React Component Tree

```
App.jsx
├── Header.jsx
│     CUET Thesis badge, WellPath.AI logotype
│
├── StepIndicator  (inline in App.jsx)
│     Steps 1–4 with ✓ checkmarks for completed steps
│     Reads: activeStep from useWellStore()
│
├── ErrorBanner  (inline in App.jsx)
│     Dismissible error display
│     Reads: error, setError from useWellStore()
│
├── Sidebar.jsx
│     Step 1: "Load Synthetic Data" button + UploadZone.jsx
│     Step 2: Well log summary stats + "Run XGBoost" button
│     Step 3: Prediction counts + GA config sliders + "Run GA" button
│     Step 4: Optimization results stats + "Start Over" button
│     └── UploadZone.jsx  (drag-and-drop CSV, shown in Step 1 only)
│
└── MainPanel  (inline in App.jsx)
    ├── [Step 1] Landing screen with data column icons
    │
    ├── [Step 2] DataPreview.jsx
    │             First 10 rows tabular preview
    │             Columns: Depth, GR, Res, Density, NP, Sonic
    │           + WellLogChart.jsx
    │             Recharts ComposedChart (layout="vertical", reversed Y)
    │             • GR track (cyan, #06b6d4)
    │             • Resistivity track (orange, #fb923c)
    │             • Density track (purple, #c084fc)
    │             • Neutron Porosity track (green, #4ade80)
    │             Downsampling: every 4th point (DOWNSAMPLE=4)
    │
    ├── [Step 3] ProductivityChart.jsx
    │             Vertical bar chart: productivity_score vs depth
    │             Color-coded by zone_label (green/amber/red)
    │             Reference lines at 0.5 and 0.35 thresholds
    │             Downsampling: every 3rd point (DOWNSAMPLE=3)
    │           + FeatureImportance.jsx
    │             Horizontal bar chart, sorted descending
    │             Opacity gradient by rank (0.4–1.0 of geo-accent color)
    │
    └── [Step 4] Scene3D.jsx
                  React Three Fiber <Canvas>
                  camera: position [400, -(maxDepth*0.3), 600]
                  background: #0a0e1a (geo-dark)
                  │
                  ├── SceneLights (inline)
                  │     ambientLight intensity=0.4
                  │     directionalLight [500,500,500] intensity=1.2 (key)
                  │     directionalLight [-300,-800,-300] cyan (fill)
                  │     pointLight origin (rim)
                  │
                  ├── Stars (@react-three/drei)
                  │     radius=5000, count=2000, fade
                  │
                  ├── Grid (@react-three/drei)
                  │     800×800, cellSize=50, sectionSize=200
                  │
                  ├── FormationLayers.jsx
                  │     Reads: trajectory.formation_layers[]
                  │     One BoxGeometry mesh per layer
                  │     Phong material, transparent, color by score
                  │
                  ├── VerticalWell.jsx
                  │     Props: depthTop=0, depthBottom=maxDepth
                  │     CylinderGeometry(r=1, height, 8 segments)
                  │     Torus ring markers every 500m
                  │
                  ├── DepthAxis (inline Scene3D)
                  │     Tick boxes at 500m intervals
                  │     Vertical axis cylinder at x=220
                  │
                  ├── WellTrajectory.jsx
                  │     Reads: trajectory.trajectory[]
                  │     THREE.Vector3[]: (x, -z, y)
                  │     CatmullRomCurve3 (catmullrom, tension=0.5)
                  │     TubeGeometry (radius=3, segments=128, radialSegs=12)
                  │     meshPhongMaterial: cyan (#06b6d4), emissive glow
                  │     Tip sphere: radius=7, high emissiveIntensity
                  │     Origin sphere: radius=5, white
                  │
                  └── CameraControls.jsx
                        OrbitControls with:
                        enableDamping, dampingFactor=0.05
                        rotateSpeed=0.6, zoomSpeed=1.2, panSpeed=0.8
                        minDistance=50, maxDistance=8000
```

---

## 9. State Management (Zustand Store)

Zustand is a minimal, hook-based state management library. The entire application state lives in a single store defined in `wellStore.js`.

```
Store State Shape (useWellStore):
┌────────────────────────────────────────────────────────────────────┐
│  wellLog: {                                                         │
│    depths: float[]            // 1000m – 2000m (5m spacing, 200)  │
│    GR: float[]                // Gamma Ray — API units             │
│    Resistivity: float[]       // Deep resistivity — Ω·m            │
│    Density: float[]           // Bulk density — g/cc               │
│    NeutronPorosity: float[]   // Neutron porosity — fraction       │
│    Sonic: float[]             // Compressional DT — μs/ft          │
│  } | null                                                           │
│                                                                     │
│  predictions: {                                                     │
│    depths: float[]                                                  │
│    productivity_score: float[]  // P(class=1), range 0.0–1.0      │
│    zone_label: string[]         // "productive"/"marginal"/        │
│                                 // "non-productive"                │
│    feature_importance: {        // {GR: 0.xx, Resistivity: 0.xx,  │
│      GR, Resistivity, Density,  //  Density: 0.xx, ...}           │
│      NeutronPorosity, Sonic     //  sum ≈ 1.0                      │
│    }                                                                │
│    model_backend: "XGBoost"     // Always XGBoost
│  } | null                                                           │
│                                                                     │
│  trajectory: {                                                      │
│    trajectory: [{               // Array of survey stations         │
│      depth: float,              // Measured depth (MD)              │
│      x: float,                  // East offset (m)                  │
│      y: float,                  // North offset (m)                 │
│      z: float,                  // TVD (m, positive = deeper)       │
│      inclination: float,        // degrees                          │
│      azimuth: float,            // degrees                          │
│    }]                                                               │
│    fitness_score: float         // Final GA fitness value           │
│    productive_zone_exposure: float  // Mean productivity score      │
│    max_dogleg_severity: float   // Max DLS in °/30m                │
│    generation_history: float[]  // Best fitness per generation      │
│    formation_layers: [{         // Grouped formation intervals      │
│      depth_top: float,                                              │
│      depth_bottom: float,                                           │
│      label: string,             // productive/marginal/non-prod    │
│      avg_score: float,          // Mean productivity in interval   │
│    }]                                                               │
│  } | null                                                           │
│                                                                     │
│  activeStep: 1 | 2 | 3 | 4     // Current workflow step           │
│  loading: {                                                         │
│    upload: boolean,             // CSV upload / synthetic fetch     │
│    predict: boolean,            // XGBoost prediction running       │
│    optimize: boolean,           // GA optimization running          │
│  }                                                                  │
│  error: string | null           // Last error message              │
└────────────────────────────────────────────────────────────────────┘

State Transition Diagram:
─────────────────────────
  Step 1 ──[setWellLog(data)]──────────────────► Step 2
           (clears predictions, trajectory)

  Step 2 ──[setPredictions(data)]──────────────► Step 3
           (clears trajectory)

  Step 3 ──[setTrajectory(data)]───────────────► Step 4

  Any    ──[reset()]───────────────────────────► Step 1
           (nulls wellLog, predictions, trajectory)

  Any    ──[setError(msg)]─────────────────────► error banner shown
  Any    ──[setError(null)]────────────────────► error banner hidden
  Any    ──[setLoading(key, bool)]─────────────► spinner shown/hidden
```

---

## 10. Synthetic Data Generation

The synthetic data generator creates a physically plausible well log without requiring real field data. It is implemented in `ml/synthetic_data.py`.

```
Synthetic Well Log Generation — generate_synthetic_well_log()
──────────────────────────────────────────────────────────────────────
Depth Range: 1000 m – 2000 m  (np.linspace, 200 points, 5m spacing)
Formation Layers: random.randint(6, 8) layers per call
Layer Boundaries: random.sample(range(10, 190), n_layers−1), sorted

Lithology Property Models:
┌──────────────┬───────────────┬─────────────────┬────────────────┬──────────────┬────────────────┐
│  Lithology   │   GR (API)    │  Resistivity    │  Density       │  NPHI        │  Sonic         │
│              │               │    (Ω·m)        │  (g/cc)        │  (fraction)  │  (μs/ft)       │
├──────────────┼───────────────┼─────────────────┼────────────────┼──────────────┼────────────────┤
│ Sandstone    │  U[20, 45]    │   U[20, 80]     │ U[2.20, 2.35] │ U[0.15,0.25] │  U[55, 65]     │
│ Shale        │  U[75, 120]   │    U[2, 8]      │ U[2.40, 2.60] │ U[0.25,0.40] │  U[75, 95]     │
│ Limestone    │  U[15, 30]    │  U[50, 200]     │ U[2.50, 2.70] │ U[0.05,0.15] │  U[45, 55]     │
└──────────────┴───────────────┴─────────────────┴────────────────┴──────────────┴────────────────┘

U[a, b] = numpy uniform random draw from [a, b]

Noise Model (added after layer assignment):
  σ_GR   = 0.02 × (45 − 20)   = 0.50 API
  σ_Rt   = 0.02 × (80 − 2)    = 1.56 Ω·m
  σ_Den  = 0.02 × (2.70−2.20) = 0.01 g/cc
  σ_NPHI = 0.02 × (0.40−0.05) = 0.007 fraction
  σ_DT   = 0.02 × (95 − 45)   = 1.00 μs/ft

Post-noise physical clipping:
  GR          : [5.0, 200.0]   API
  Resistivity : [0.5, 300.0]   Ω·m
  Density     : [1.8, 3.0]     g/cc
  NeutronPorosity: [0.0, 0.60] fraction
  Sonic       : [40.0, 120.0]  μs/ft
```

Each call uses `numpy.random.default_rng(seed=None)` — a new random seed — so each synthetic data load produces a different stratigraphy, exercising the full user workflow each time.

---

## 11. CSV Upload Format

### Accepted Column Names (Aliases)

The CSV parser resolves aliases case-insensitively after stripping whitespace. First-match-wins per column.

| Canonical Name | Accepted CSV Column Headers (any case) |
|---------------|----------------------------------------|
| `Depth` | `depth`, `md`, `measured_depth`, `tvd`, `dept` |
| `GR` | `gr`, `gamma_ray`, `gamma ray`, `gr_api` |
| `Resistivity` | `rt`, `resistivity`, `res`, `ild`, `deep_resistivity` |
| `Density` | `rhob`, `density`, `bulk_density`, `den` |
| `NeutronPorosity` | `nphi`, `neutron`, `neutron_porosity`, `cnl`, `porosity` |
| `Sonic` | `dt`, `sonic`, `dtco`, `travel_time`, `dtc` |

### Sample CSV Format

```csv
Depth,GR,RT,RHOB,NPHI,DT
1000.0,35.2,45.7,2.28,0.19,61.3
1005.0,38.1,42.3,2.31,0.18,62.1
1010.0,82.4,4.1,2.51,0.33,88.4
1015.0,91.2,3.8,2.55,0.35,91.2
1020.0,28.3,78.9,2.24,0.21,58.7
1025.0,22.1,95.4,2.27,0.22,57.4
...
2000.0,17.8,112.3,2.62,0.09,48.1
```

### Parsing Rules

1. All six columns must be present (any accepted alias).
2. Non-numeric values in any column are coerced to NaN and the entire row is dropped.
3. Rows are sorted by Depth ascending.
4. A `ValueError` is raised (→ HTTP 422) if zero valid rows remain after cleaning.

---

## 12. API Reference

### GET `/api/synthetic`

**Description:** Generate a fresh synthetic well log with random stratigraphy.

**Request:** None

**Response (200):**
```json
{
  "depths": [1000.0, 1005.0, ..., 2000.0],
  "GR": [35.2, 38.1, ...],
  "Resistivity": [45.7, 42.3, ...],
  "Density": [2.28, 2.31, ...],
  "NeutronPorosity": [0.19, 0.18, ...],
  "Sonic": [61.3, 62.1, ...]
}
```

**curl:**
```bash
curl http://localhost:8000/api/synthetic
```

---

### POST `/api/upload`

**Description:** Upload a CSV well log file, parse it, return canonical JSON.

**Request:** `multipart/form-data`, field name `file`, file extension `.csv`

**Response (200):** Same structure as `/api/synthetic` (6 arrays with canonical names).

**Errors:**
- `400`: File does not end in `.csv`
- `422`: Columns not found, or all rows invalid

**curl:**
```bash
curl -X POST http://localhost:8000/api/upload \
     -F "file=@/path/to/well_log.csv"
```

---

### POST `/api/predict`

**Description:** Train XGBoost on heuristic labels and return per-depth productivity predictions.

**Request (JSON):**
```json
{
  "depths": [1000.0, 1005.0, ...],
  "GR": [35.2, 38.1, ...],
  "Resistivity": [45.7, 42.3, ...],
  "Density": [2.28, 2.31, ...],
  "NeutronPorosity": [0.19, 0.18, ...],
  "Sonic": [61.3, 62.1, ...]
}
```

**Response (200):**
```json
{
  "depths": [1000.0, 1005.0, ...],
  "productivity_score": [0.82, 0.79, 0.04, ...],
  "zone_label": ["productive", "productive", "non-productive", ...],
  "feature_importance": {
    "GR": 0.31,
    "Resistivity": 0.42,
    "Density": 0.10,
    "NeutronPorosity": 0.12,
    "Sonic": 0.05
  },
  "model_backend": "XGBoost"
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/predict \
     -H "Content-Type: application/json" \
     -d @well_log.json
```

---

### POST `/api/optimize`

**Description:** Run DEAP genetic algorithm to optimize wellbore trajectory for maximum productive zone exposure.

**Request (JSON):**
```json
{
  "depths": [1000.0, 1005.0, ...],
  "productivity_score": [0.82, 0.79, ...],
  "zone_label": ["productive", "non-productive", ...],
  "feature_importance": {"GR": 0.31, ...},
  "waypoints": 8,
  "population": 50,
  "generations": 80,
  "dls_weight": 0.3
}
```
*All GA parameters are optional. Defaults: waypoints=8, population=50, generations=80, dls_weight=0.3*

**Response (200):**
```json
{
  "trajectory": [
    {"depth": 1000.0, "x": 0.0, "y": 0.0, "z": 1000.0, "inclination": 0.0, "azimuth": 0.0},
    {"depth": 1142.9, "x": 12.3, "y": 8.1, "z": 1141.2, "inclination": 23.5, "azimuth": 47.2},
    ...
  ],
  "fitness_score": 0.6831,
  "productive_zone_exposure": 0.7412,
  "max_dogleg_severity": 1.84,
  "generation_history": [0.41, 0.48, 0.53, ...],
  "formation_layers": [
    {"depth_top": 1000.0, "depth_bottom": 1180.0, "label": "productive", "avg_score": 0.78},
    {"depth_top": 1180.0, "depth_bottom": 1420.0, "label": "non-productive", "avg_score": 0.09},
    ...
  ]
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/optimize \
     -H "Content-Type: application/json" \
     -d @optimize_input.json
```

---

### GET `/health`

**Response:**
```json
{"status": "ok", "service": "WellPath.AI Backend"}
```

---

## 13. Running the Project

### Prerequisites

- Python 3.10 or 3.11
- Node.js 18+ and npm 9+
- (macOS) Homebrew: `brew install libomp` for XGBoost support

### Backend Setup

```bash
# 1. Navigate to backend directory
cd /path/to/WellPath.AI/backend

# 2. Create virtual environment
python3 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Backend will be available at: http://localhost:8000
# Interactive API docs (Swagger UI): http://localhost:8000/docs
# Alternative docs (ReDoc): http://localhost:8000/redoc
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd /path/to/WellPath.AI/frontend

# 2. Install npm dependencies
npm install

# 3. Start Vite development server
npm run dev

# Frontend will be available at: http://localhost:5173
# All /api/* requests are proxied to http://localhost:8000
```

### Production Build

```bash
# Build optimized frontend bundle
cd frontend
npm run build
# Output: frontend/dist/ (serve as static files)

# Run backend in production mode
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Verify Installation

```bash
# Check backend health
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"WellPath.AI Backend"}

# Test synthetic endpoint
curl http://localhost:8000/api/synthetic | python3 -m json.tool | head -20
```

### Known macOS Issue: XGBoost and libomp

XGBoost requires the OpenMP runtime (`libomp`). On macOS, use XGBoost 1.7.x (works without libomp) or install libomp via Homebrew for XGBoost 2.x+:

```bash
# Option A: Use XGBoost 1.7.x (no libomp needed)
pip install 'xgboost==1.7.6'

# Option B: Install libomp for XGBoost 2.x
brew install libomp
```

---

*End of Architecture Document — WellPath.AI v1.0*
*Generated: April 2026 | CUET Thesis 2025*
