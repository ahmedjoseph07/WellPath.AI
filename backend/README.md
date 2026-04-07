# Backend — WellPath.AI

FastAPI application that handles CSV ingestion, XGBoost zone prediction, and Genetic Algorithm trajectory optimization.

## Running

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive API docs available at `http://localhost:8000/docs`.

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
│   ├── xgboost_model.py      # Model training + prediction pipeline
│   ├── preprocessor.py       # StandardScaler normalization + heuristic labels
│   └── synthetic_data.py     # Synthetic well log generator
├── optimization/
│   ├── genetic_algorithm.py  # DEAP-based GA (population, crossover, mutation)
│   ├── fitness.py            # Fitness = zone exposure − DLS penalty
│   └── well_trajectory.py    # Minimum curvature method (inclination/azimuth → XYZ)
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
  "NeutronPorosity": [18.0, 19.0, ...],
  "Sonic": [58.0, 57.0, ...]
}
```

Errors: `400` if not a CSV, `422` if required columns are missing or no numeric rows remain.

---

### `POST /api/predict`
Runs XGBoost on the well log. The model is trained fresh on each request using heuristic labels (no pre-trained weights needed).

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

> **Fallback:** On macOS without `libomp`, XGBoost import fails silently and the backend automatically uses `sklearn.HistGradientBoostingClassifier` instead — same algorithm family, no action needed.

---

### `POST /api/optimize`
Runs the Genetic Algorithm to find the optimal well trajectory through productive zones.

**Request body** (all fields from predict response + optional GA config):
```json
{
  "depths": [...],
  "productivity_score": [...],
  "zone_label": [...],
  "feature_importance": {...},
  "waypoints": 8,
  "population": 50,
  "generations": 80,
  "dls_weight": 0.3
}
```

**Response:**
```json
{
  "trajectory": [{"x": 0, "y": 0, "z": 1000, "depth": 1000, "inclination": 0, "azimuth": 0}, ...],
  "fitness_score": 0.87,
  "productive_zone_exposure": 0.72,
  "max_dogleg_severity": 2.1,
  "generation_history": [0.45, 0.52, ...],
  "formation_layers": [{"depth_top": 1000, "depth_bottom": 1050, "label": "productive", "score": 0.9}, ...]
}
```

---

### `GET /api/synthetic`
Returns a synthetic well log for demo/testing purposes. Same shape as the upload response.

## ML Pipeline

### Heuristic Labelling (`preprocessor.py`)
Since no pre-labeled training data exists, labels are generated from the well log values:
- **Productive (1):** Low GR < 75 API, High Resistivity > 20 Ω·m, moderate density
- **Marginal (2):** Intermediate values
- **Non-productive (0):** High GR > 100 API or very low resistivity

### XGBoost Model (`xgboost_model.py`)
- Features: GR, Resistivity, Density, NeutronPorosity, Sonic (StandardScaler normalized)
- Trained in-request (100 estimators, max_depth=4, lr=0.1)
- `productivity_score` = predicted probability of class "productive"
- If any of the 3 classes are absent in the data, synthetic rows are appended to prevent classifier initialization errors

## Optimization

### Genetic Algorithm (`genetic_algorithm.py`)
- Uses DEAP with `eaSimple` strategy
- Individual = list of `waypoints × 2` floats (inclination + azimuth per waypoint)
- Inclination clamped 0–90°, azimuth 0–360°
- Crossover: blend crossover (cxBlend, α=0.3)
- Mutation: Gaussian (σ=5°, indpb=0.2)
- Selection: tournament (k=3)

### Fitness Function (`fitness.py`)
```
fitness = productive_zone_exposure − dls_weight × max_dogleg_severity_penalty
```

### Trajectory Geometry (`well_trajectory.py`)
Uses the **Minimum Curvature Method** — industry standard for converting (MD, inclination, azimuth) into 3D Cartesian coordinates.
