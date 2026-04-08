# Backend — WellPath.AI

FastAPI application that handles CSV ingestion, XGBoost zone prediction, and Genetic Algorithm trajectory optimization.

## Running

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive API docs available at `http://localhost:8000/docs`.

### macOS: XGBoost + OpenMP

XGBoost requires the OpenMP runtime (`libomp`). If you get an `XGBoostError`:

```bash
# Option A: Install via Homebrew
brew install libomp

# Option B: Use XGBoost 1.7.x (works without libomp)
pip install 'xgboost==1.7.6'
```

## Directory Layout

```
backend/
├── main.py                   # FastAPI app, CORS, router registration
├── requirements.txt
├── api/routes/
│   ├── upload.py             # POST /api/upload   — CSV ingestion
│   ├── predict.py            # POST /api/predict  — XGBoost inference
│   ├── optimize.py           # POST /api/optimize — Genetic Algorithm
│   └── synthetic.py          # GET  /api/synthetic — demo data
├── ml/
│   ├── xgboost_model.py      # XGBoost training + prediction pipeline
│   ├── preprocessor.py       # StandardScaler normalization + heuristic labels
│   └── synthetic_data.py     # Deterministic synthetic well log generator (seed: 2007007)
├── optimization/
│   ├── genetic_algorithm.py  # DEAP-based GA (SBX crossover, polynomial mutation)
│   ├── fitness.py            # Fitness = zone exposure - DLS penalty
│   └── well_trajectory.py    # Minimum Curvature Method (inclination/azimuth -> XYZ)
└── utils/
    └── csv_parser.py         # CSV reading, alias resolution, validation
```

## API Endpoints

### `POST /api/upload`
Accepts a multipart CSV file. Returns parsed well log as JSON arrays.

**Response shape:**
```json
{
  "depths": [1000.0, 1010.0, ...],
  "GR": [25.0, 30.0, ...],
  "Resistivity": [50.0, 55.0, ...],
  "Density": [2.3, 2.4, ...],
  "NeutronPorosity": [0.18, 0.19, ...],
  "Sonic": [58.0, 57.0, ...]
}
```

Errors: `400` if not a CSV, `422` if required columns are missing or no numeric rows remain.

---

### `POST /api/predict`
Runs XGBoost on the well log. The model is trained fresh on each request using heuristic labels (transductive learning — calibrated to each well's log characteristics).

**Request body:**
```json
{
  "depths": [...], "GR": [...], "Resistivity": [...],
  "Density": [...], "NeutronPorosity": [...], "Sonic": [...]
}
```

**Response:**
```json
{
  "depths": [...],
  "productivity_score": [...],
  "zone_label": ["productive", "marginal", "non-productive", ...],
  "feature_importance": {"GR": 0.21, "Resistivity": 0.35, ...},
  "model_backend": "XGBoost"
}
```

---

### `POST /api/optimize`
Runs the Genetic Algorithm to find the optimal well trajectory through productive zones.

**Request body** (prediction response + optional GA config):
```json
{
  "depths": [...],
  "productivity_score": [...],
  "zone_label": [...],
  "feature_importance": {...},
  "waypoints": 8,
  "population": 50,
  "generations": 100,
  "dls_weight": 0.3
}
```

**Response:**
```json
{
  "trajectory": [
    {"x": 0.0, "y": 0.0, "z": 1000.0, "depth": 1000.0, "inclination": 0.0, "azimuth": 0.0},
    {"x": 12.5, "y": 45.3, "z": 1142.8, "depth": 1142.8, "inclination": 15.2, "azimuth": 45.0},
    ...
  ],
  "fitness_score": 0.87,
  "productive_zone_exposure": 0.72,
  "max_dogleg_severity": 2.1,
  "generation_history": [0.45, 0.52, ...],
  "formation_layers": [
    {"depth_top": 1000, "depth_bottom": 1050, "label": "productive", "avg_score": 0.9},
    ...
  ]
}
```

Each trajectory point contains:
- `depth` — Measured Depth (m)
- `inclination` — Deviation from vertical (degrees)
- `azimuth` — Compass bearing (degrees)
- `z` — True Vertical Depth (m)
- `y` — Northing displacement (m)
- `x` — Easting displacement (m)

---

### `GET /api/synthetic`
Returns a deterministic synthetic well log (seed: 2007007) for demo/testing. Same shape as upload response.

---

## ML Pipeline

### XGBoost Model (`xgboost_model.py`)

Uses real XGBoost (no sklearn fallback):

```python
XGBClassifier(
    n_estimators=150, max_depth=5, learning_rate=0.08,
    subsample=0.8, colsample_bytree=0.8, min_child_weight=3,
    gamma=0.1, reg_alpha=0.1, reg_lambda=1.0,
    eval_metric="mlogloss", tree_method="hist",
    device="cpu", nthread=1, random_state=42,
)
```

### Heuristic Labelling (`preprocessor.py`)
Since no production test data exists, labels are generated from petrophysical cutoffs:
- **Productive (1):** Rt > 15 AND GR < 60 AND NPHI > 0.12
- **Marginal (2):** Rt > 8 AND GR < 80 (but not productive)
- **Non-productive (0):** Everything else

Features are normalized with `StandardScaler` before training. `productivity_score` = P(class = productive).

### Synthetic Data (`synthetic_data.py`)
Generates a deterministic well log using fixed seed `2007007` (student ID). Produces consistent formations across runs — the GA trajectory varies (stochastic by design), but the input data does not.

## Optimization

### Genetic Algorithm (`genetic_algorithm.py`)
- DEAP framework with `eaSimple` strategy
- Individual = list of `2 x (waypoints - 1)` floats (inclination + azimuth per waypoint)
- Inclination bounded: [0, 85 degrees], Azimuth: [0, 360 degrees]
- Crossover: Simulated Binary Bounded (SBX, eta=20, prob=0.7)
- Mutation: Polynomial Bounded (eta=20, prob=0.2 per gene)
- Selection: Tournament (size=3)

### Fitness Function (`fitness.py`)
```
fitness = productive_zone_exposure - dls_weight x max_dogleg_severity_penalty
```

### Trajectory Geometry (`well_trajectory.py`)
Uses the **Minimum Curvature Method** (industry standard) for converting (MD, inclination, azimuth) into 3D Cartesian coordinates (Northing, Easting, TVD).

---

See also: [docs/MACHINE_LEARNING.md](../docs/MACHINE_LEARNING.md) | [docs/GENETIC_ALGORITHM.md](../docs/GENETIC_ALGORITHM.md) | [docs/DIRECTIONAL_DRILLING.md](../docs/DIRECTIONAL_DRILLING.md)
