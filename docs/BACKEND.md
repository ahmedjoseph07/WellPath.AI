# WellPath.AI — Backend Module Documentation

**Author:** Joseph Ahmed (Student ID: 2007007)
**Module:** Backend (Python / FastAPI)
**Path:** `WellPath.AI/backend/`

---

## Table of Contents

1. [main.py — Application Entry Point](#1-mainpy--application-entry-point)
2. [API Routes](#2-api-routes)
   - [routes/synthetic.py](#21-routessyntheticpy)
   - [routes/upload.py](#22-routesuploadpy)
   - [routes/predict.py](#23-routespredictpy)
   - [routes/optimize.py](#24-routesoptimizepy)
3. [ML Modules](#3-ml-modules)
   - [ml/synthetic_data.py](#31-mlsynthetic_datapy)
   - [ml/preprocessor.py](#32-mlpreprocessorpy)
   - [ml/xgboost_model.py](#33-mlxgboost_modelpy)
4. [Optimization Modules](#4-optimization-modules)
   - [optimization/well_trajectory.py](#41-optimizationwell_trajectorypy)
   - [optimization/fitness.py](#42-optimizationfitnesspy)
   - [optimization/genetic_algorithm.py](#43-optimizationgenetic_algorithmpy)
5. [Utils Modules](#5-utils-modules)
   - [utils/csv_parser.py](#51-utilscsv_parserpy)

---

## 1. `main.py` — Application Entry Point

### Purpose

Constructs the FastAPI application instance, configures Cross-Origin Resource Sharing (CORS), registers the four API routers, and exposes a health check endpoint.

### Key Attributes

| Attribute | Value |
|-----------|-------|
| `title` | "WellPath.AI API" |
| `description` | "AI-driven wellbore trajectory optimization backend" |
| `version` | "1.0.0" |
| CORS origins | `["*"]` (all origins — thesis prototype) |
| CORS methods | `["*"]` |
| CORS headers | `["*"]` |

### Router Registration

```python
app.include_router(synthetic.router, prefix="/api")
app.include_router(upload.router,    prefix="/api")
app.include_router(predict.router,   prefix="/api")
app.include_router(optimize.router,  prefix="/api")
```

All routes are mounted under the `/api` prefix. The Vite development server proxies all `/api/*` requests to `http://localhost:8000`.

### Health Check

```python
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "WellPath.AI Backend"}
```

Used to verify backend availability. Returns immediately without triggering any ML or data operations.

### Running

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag enables hot-reload on code changes. Remove it for production deployments.

---

## 2. API Routes

### 2.1 `routes/synthetic.py`

#### Purpose

Thin route handler for synthetic well log generation. Delegates entirely to the ML layer.

#### Endpoint

```
GET /api/synthetic
```

#### Handler

```python
@router.get("/synthetic")
def get_synthetic_data():
    data = generate_synthetic_well_log()
    return data
```

No request body, no parameters. FastAPI automatically serializes the returned Python dict to JSON.

#### Response

Six parallel arrays of 200 floats each:
- `depths`: 1000.0 to 2000.0 in 5.0m steps
- `GR`, `Resistivity`, `Density`, `NeutronPorosity`, `Sonic`: formation log values

#### Error Behavior

This endpoint does not raise HTTP errors under normal operation. If `generate_synthetic_well_log()` raises an unexpected exception, FastAPI returns HTTP 500 automatically.

---

### 2.2 `routes/upload.py`

#### Purpose

Accepts a multipart CSV file upload, delegates parsing to `csv_parser.py`, and returns the parsed well log as JSON arrays.

#### Endpoint

```
POST /api/upload
Content-Type: multipart/form-data
```

#### Handler

```python
@router.post("/upload")
async def upload_well_log(file: UploadFile = File(...)):
```

Note the `async` keyword — file reading uses `await file.read()` to avoid blocking the event loop.

#### Processing Steps

1. Validate `.csv` extension → HTTP 400 if not CSV
2. Read raw bytes: `contents = await file.read()`
3. Decode UTF-8 with `errors="replace"` (handles BOM characters gracefully)
4. Wrap in `io.StringIO` and pass to `parse_well_log_csv()`
5. Convert DataFrame to JSON: `{col: df[col].tolist() for col in df.columns}`

#### Error Responses

| HTTP Code | Condition |
|-----------|-----------|
| 400 | `file.filename` does not end with `.csv` |
| 422 | `parse_well_log_csv()` raises `ValueError` (missing columns, all rows NaN, etc.) |

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `UploadFile` | Multipart form field named `file` |

---

### 2.3 `routes/predict.py`

#### Purpose

Accepts well log data as JSON, runs the XGBoost productivity classification pipeline, and returns per-depth predictions.

#### Endpoint

```
POST /api/predict
Content-Type: application/json
```

#### Pydantic Request Model

```python
class WellLogInput(BaseModel):
    depths: List[float]
    GR: List[float]
    Resistivity: List[float]
    Density: List[float]
    NeutronPorosity: List[float]
    Sonic: List[float]
```

Pydantic v2 validates all fields are present and all values are numeric. An invalid request returns HTTP 422 automatically before reaching the handler.

#### Handler

```python
@router.post("/predict")
def predict_productivity(well_log: WellLogInput):
    well_log_dict = well_log.model_dump()
    result = predict_zones(well_log_dict)
    return result
```

Note: synchronous handler (no `async`) since `predict_zones()` is CPU-bound Python.

#### Error Responses

| HTTP Code | Condition |
|-----------|-----------|
| 422 | Pydantic validation failure (missing field, wrong type) |
| 500 | Exception inside `predict_zones()` (e.g., XGBoost internal error) |

---

### 2.4 `routes/optimize.py`

#### Purpose

Accepts prediction data plus optional GA configuration and runs the genetic algorithm trajectory optimizer.

#### Endpoint

```
POST /api/optimize
Content-Type: application/json
```

#### Pydantic Request Model

```python
class OptimizeInput(BaseModel):
    depths: List[float]
    productivity_score: List[float]
    zone_label: List[str]
    feature_importance: dict
    # Optional GA configuration
    waypoints: Optional[int] = 8
    population: Optional[int] = 50
    generations: Optional[int] = 80
    dls_weight: Optional[float] = 0.3
```

The `zone_label` and `feature_importance` fields are accepted from the `/predict` response but not used directly in the GA computation — only `depths` and `productivity_score` drive the optimization.

#### Handler

```python
@router.post("/optimize")
def optimize_trajectory(payload: OptimizeInput):
    result = run_ga_optimization(
        depths=payload.depths,
        productivity_scores=payload.productivity_score,
        n_waypoints=payload.waypoints,
        population=payload.population,
        generations=payload.generations,
        dls_weight=payload.dls_weight,
    )
    return result
```

#### Runtime

With default parameters (population=50, generations=80, waypoints=8), the GA runs approximately 50 + 50×80 = 4,050 fitness evaluations. Each evaluation involves `minimum_curvature()` for 8 stations plus `compute_fitness()`. Typical runtime: 2–10 seconds depending on hardware.

#### Error Responses

| HTTP Code | Condition |
|-----------|-----------|
| 422 | Pydantic validation failure |
| 500 | Exception inside `run_ga_optimization()` |

---

## 3. ML Modules

### 3.1 `ml/synthetic_data.py`

#### Purpose

Generates physically plausible synthetic well log data without requiring field data. Produces formation layers of sandstone, shale, and limestone with realistic petrophysical properties and correlated Gaussian noise.

#### Key Function

```python
def generate_synthetic_well_log() -> Dict[str, List[float]]:
```

**Parameters:** None

**Returns:**
```python
{
    "depths": List[float],          # 200 values: 1000.0 to 2000.0 (5m spacing)
    "GR": List[float],              # Gamma Ray — API units
    "Resistivity": List[float],     # Deep resistivity — Ω·m
    "Density": List[float],         # Bulk density — g/cc
    "NeutronPorosity": List[float], # Neutron porosity — fraction
    "Sonic": List[float],           # Compressional DT — μs/ft
}
```

#### Algorithm

```
1. Create depth array: np.linspace(1000.0, 2000.0, 200)

2. Determine number of layers: random.randint(6, 8)

3. Generate layer boundaries:
   random.sample(range(10, 190), n_layers−1) → sorted list of indices
   → produces n_layers intervals of unequal width

4. For each layer:
   a. Randomly select formation type: "sandstone", "shale", or "limestone"
   b. Draw uniform random values for each log curve from formation template
   c. Fill corresponding array slice

5. Add Gaussian noise (σ = 2% of log range) to all curves

6. Clip to physical limits per curve
```

#### Formation Templates

```python
formation_templates = {
    "sandstone": {
        "GR":             (20.0, 45.0),
        "Resistivity":    (20.0, 80.0),
        "Density":        (2.20, 2.35),
        "NeutronPorosity":(0.15, 0.25),
        "Sonic":          (55.0, 65.0),
    },
    "shale": {
        "GR":             (75.0, 120.0),
        "Resistivity":    (2.0,  8.0),
        "Density":        (2.40, 2.60),
        "NeutronPorosity":(0.25, 0.40),
        "Sonic":          (75.0, 95.0),
    },
    "limestone": {
        "GR":             (15.0, 30.0),
        "Resistivity":    (50.0, 200.0),
        "Density":        (2.50, 2.70),
        "NeutronPorosity":(0.05, 0.15),
        "Sonic":          (45.0, 55.0),
    },
}
```

#### Example Usage

```python
from ml.synthetic_data import generate_synthetic_well_log
data = generate_synthetic_well_log()
print(len(data["depths"]))  # 200
print(data["depths"][0])    # 1000.0
print(data["depths"][-1])   # 2000.0
```

---

### 3.2 `ml/preprocessor.py`

#### Purpose

Two-function module providing data normalization and heuristic labeling for the ML pipeline.

#### Constants

```python
LOG_COLUMNS = ["GR", "Resistivity", "Density", "NeutronPorosity", "Sonic"]
```

Used throughout the codebase as the canonical ordered feature list.

#### Function: `normalize_features`

```python
def normalize_features(df: pd.DataFrame) -> Tuple[np.ndarray, StandardScaler]:
```

**Parameters:**
- `df`: DataFrame with columns matching `LOG_COLUMNS`

**Returns:**
- `X_scaled`: `np.ndarray` of shape `(n_samples, 5)` — z-score normalized
- `scaler`: Fitted `StandardScaler` instance (not used downstream, returned for inspection)

**Algorithm:**
```
X_scaled[i, j] = (X[i, j] − mean_j) / std_j

Where mean_j and std_j are computed from the input data itself (fit_transform).
This is inductive normalization — the same data used for training and prediction
within a single request. No separate train/test normalization gap.
```

**Why StandardScaler?**
XGBoost is tree-based and theoretically scale-invariant. However, normalization is applied as a best practice and ensures consistent behavior if the model is swapped for a distance-based method. It also makes the fit-predict cycle entirely self-contained per API request.

#### Function: `label_by_heuristics`

```python
def label_by_heuristics(df: pd.DataFrame) -> np.ndarray:
```

**Parameters:**
- `df`: DataFrame with `Resistivity`, `GR`, `NeutronPorosity` columns

**Returns:**
- `labels`: `np.ndarray` of int, shape `(n_samples,)`, values in {0, 1, 2}

**Algorithm:**
```python
labels = np.zeros(len(df), dtype=int)           # default: non-productive (0)
marginal_mask = (res > 8) & (gr < 80)
labels[marginal_mask] = 2                        # override: marginal (2)
productive_mask = (res > 15) & (gr < 60) & (nphi > 0.12)
labels[productive_mask] = 1                      # override: productive (1)
```

The productive mask is applied after the marginal mask. Any depth point meeting productive criteria is labeled productive regardless of marginal classification, since `productive_mask ⊆ marginal_mask` in most cases (Rt > 15 implies Rt > 8; GR < 60 implies GR < 80).

**Label Meaning:**
- `0` = Non-productive (shale or tight rock)
- `1` = Productive (reservoir with hydrocarbon indicators)
- `2` = Marginal (intermediate quality)

---

### 3.3 `ml/xgboost_model.py`

#### Purpose

Trains a gradient boosting classifier on heuristically labeled well log data and returns per-depth productivity predictions, zone labels, and feature importances.

#### Module-level Logic

```python
try:
    from xgboost import XGBClassifier
    _USE_XGBOOST = True
except Exception:
    from sklearn.ensemble import HistGradientBoostingClassifier
    _USE_XGBOOST = False

LABEL_MAP = {1: "productive", 2: "marginal", 0: "non-productive"}
```

The import-time fallback ensures the backend starts correctly on macOS without `libomp`. `HistGradientBoostingClassifier` is scikit-learn's native histogram-based gradient boosting implementation, similar in spirit to LightGBM.

#### Function: `_build_model`

```python
def _build_model():
```

Returns either `XGBClassifier` or `HistGradientBoostingClassifier` with identical hyperparameters:

| Hyperparameter | Value |
|---------------|-------|
| n_estimators / max_iter | 100 |
| max_depth | 4 |
| learning_rate | 0.1 |
| random_state | 42 |

#### Function: `predict_zones`

```python
def predict_zones(well_log_dict: Dict[str, Any]) -> Dict[str, Any]:
```

**Parameters:**
- `well_log_dict`: Dict with keys `depths`, `GR`, `Resistivity`, `Density`, `NeutronPorosity`, `Sonic`

**Returns:**
```python
{
    "depths": List[float],
    "productivity_score": List[float],  # P(class=1), range [0, 1]
    "zone_label": List[str],            # "productive"/"marginal"/"non-productive"
    "feature_importance": Dict[str, float],
    "model_backend": str,               # "XGBoost" or "HistGradientBoosting (sklearn)"
}
```

**Full Algorithm:**

```
1. Build DataFrame from dict

2. normalize_features(df) → X_scaled (for training)

3. label_by_heuristics(df) → labels

4. Class augmentation check:
   If any class in {0, 1, 2} is absent from labels:
     Append one dummy row per missing class (copy of first row)
     This prevents single-class training errors

5. model = _build_model()
   model.fit(X_scaled_augmented, labels_augmented)

6. Re-normalize original (non-augmented) data:
   X_orig, _ = normalize_features(df)  ← second independent normalization
   proba = model.predict_proba(X_orig)   shape: (200, 3)

7. Locate productive class column:
   class_list = list(model.classes_)    e.g., [0, 1, 2]
   productive_col = class_list.index(1)
   productivity_score = proba[:, productive_col]

8. predicted_labels = model.predict(X_orig)
   zone_label = [LABEL_MAP[lbl] for lbl in predicted_labels]

9. Feature importances:
   XGBoost:  model.feature_importances_  (gain-based)
   HGB:      model.feature_importances_ or std-based approximation

10. Return result dict
```

**Note on Double Normalization:**
`normalize_features()` is called twice — once for training (augmented), once for prediction (original). Each call creates a new `StandardScaler` fitted on the respective data. Since the augmented rows are copies of real data, the normalization statistics are essentially identical, but calling it separately ensures the prediction uses the correct statistics for the non-augmented data.

---

## 4. Optimization Modules

### 4.1 `optimization/well_trajectory.py`

#### Purpose

Implements the Minimum Curvature Method for converting directional survey station data (MD, Inc, Az) into 3D Cartesian coordinates (x, y, z/TVD). Also computes Dogleg Severity.

#### Function: `minimum_curvature`

```python
def minimum_curvature(
    md_array: List[float],
    inc_array: List[float],
    az_array: List[float],
    start_x: float = 0.0,
    start_y: float = 0.0,
    start_z: float = 0.0,
) -> List[Dict[str, Any]]:
```

**Parameters:**

| Parameter | Type | Unit | Description |
|-----------|------|------|-------------|
| `md_array` | List[float] | metres | Measured depth at each station |
| `inc_array` | List[float] | degrees | Inclination (0° = vertical, 90° = horizontal) |
| `az_array` | List[float] | degrees | Azimuth (0°/360° = North, 90° = East) |
| `start_x` | float | metres | Initial East position |
| `start_y` | float | metres | Initial North position |
| `start_z` | float | metres | Initial TVD (set to start_depth in GA) |

**Returns:**
List of dicts, one per station:
```python
{
    "depth":       float,  # Measured depth (MD)
    "x":           float,  # East offset from start
    "y":           float,  # North offset from start
    "z":           float,  # True Vertical Depth (positive = deeper)
    "inclination": float,  # degrees
    "azimuth":     float,  # degrees
}
```

**Core Mathematics:**

For each pair of consecutive stations (i, i+1):

```
inc1 = radians(inc_array[i]),   az1 = radians(az_array[i])
inc2 = radians(inc_array[i+1]), az2 = radians(az_array[i+1])

cos_dl = cos(inc2 − inc1) − sin(inc1)·sin(inc2)·(1 − cos(az2 − az1))
cos_dl = clamp(cos_dl, −1, 1)   # numerical safety
dl     = acos(cos_dl)            # dogleg angle in radians

if |dl| < 1e-10:  rf = 1.0      # straight section
else:             rf = (2/dl) · tan(dl/2)

Δx = (ΔMD/2) · [sin(inc1)·sin(az1) + sin(inc2)·sin(az2)] · rf
Δy = (ΔMD/2) · [sin(inc1)·cos(az1) + sin(inc2)·cos(az2)] · rf
Δz = (ΔMD/2) · [cos(inc1) + cos(inc2)] · rf
```

**Error Handling:**
- Raises `ValueError` if `md_array`, `inc_array`, `az_array` have different lengths.
- `cos_dl` is clamped to `[-1, 1]` before `acos()` to prevent domain errors from floating-point rounding.

**Example Usage:**

```python
from optimization.well_trajectory import minimum_curvature

md  = [1000.0, 1142.9, 1285.7, 1428.6, 1571.4, 1714.3, 1857.1, 2000.0]
inc = [0.0, 20.0, 35.0, 45.0, 50.0, 48.0, 42.0, 38.0]
az  = [0.0, 45.0, 60.0, 75.0, 80.0, 78.0, 72.0, 65.0]

trajectory = minimum_curvature(md, inc, az, start_z=1000.0)
print(trajectory[-1])
# {'depth': 2000.0, 'x': 245.3, 'y': 178.1, 'z': 1897.4,
#  'inclination': 38.0, 'azimuth': 65.0}
```

#### Function: `compute_dogleg_severity`

```python
def compute_dogleg_severity(
    inc_array: List[float],
    az_array: List[float],
    md_array: List[float],
) -> List[float]:
```

**Parameters:** Same arrays as survey data.

**Returns:** List of DLS values in °/30m, length = `len(md_array) − 1`.

**Formula:**
```
dl_rad = acos(clamp(cos_dl, −1, 1))
dl_deg = degrees(dl_rad)
DLS    = (dl_deg / ΔMD) × 30    [°/30m]
```

The `× 30` normalization converts per-metre dogleg to the industry-standard per-30m unit. Industry typical limit: 3°/30m.

---

### 4.2 `optimization/fitness.py`

#### Purpose

Computes the scalar fitness value of a wellbore trajectory for use in the genetic algorithm. Balances productive zone exposure against mechanical complexity (dogleg severity).

#### Constants

```python
MAX_DLS = 3.0  # deg/30m — reference maximum for normalisation
```

#### Function: `compute_fitness`

```python
def compute_fitness(
    trajectory_points: List[Dict[str, Any]],
    productivity_scores: List[float],
    depths: List[float],
    dls_weight: float = 0.3,
) -> float:
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `trajectory_points` | List[Dict] | Output of `minimum_curvature()` |
| `productivity_scores` | List[float] | Per-depth XGBoost productivity probabilities |
| `depths` | List[float] | Depth axis for `productivity_scores` |
| `dls_weight` | float | Penalty weight for DLS term (default 0.3) |

**Returns:** `float` — fitness value (higher is better, typical range 0–1)

**Algorithm:**

```
Step 1: Productive Exposure
  traj_z = [pt["z"] for pt in trajectory_points]
  interp_scores = np.interp(traj_z, depths_arr, scores_arr)
  productive_exposure = mean(interp_scores)

  np.interp() linearly interpolates the productivity curve at each
  trajectory z-depth. If a trajectory point falls outside the depth
  range, it clips to the nearest boundary value.

Step 2: DLS Penalty
  inc_arr = [pt["inclination"] for each pt]
  az_arr  = [pt["azimuth"]    for each pt]
  md_arr  = [pt["depth"]      for each pt]

  dls_list = compute_dogleg_severity(inc_arr, az_arr, md_arr)
  mean_dls = mean(dls_list)
  dls_penalty = min(mean_dls / MAX_DLS, 1.0)   # clamp to [0,1]

Step 3: Combined Fitness
  fitness = productive_exposure − dls_weight × dls_penalty
```

**Interpretation:**
- A trajectory that stays entirely in productive zones (score=1.0) with zero doglegs achieves `fitness = 1.0 − 0 = 1.0`.
- A trajectory through poor zones (score=0.1) with high doglegs (DLS=3°/30m → penalty=1.0) achieves `fitness = 0.1 − 0.3 = −0.2`.
- The default `dls_weight=0.3` means the penalty can reduce fitness by at most 0.3, preventing the optimizer from accepting trajectories with unacceptable doglegs.

**Example Usage:**

```python
from optimization.fitness import compute_fitness
from optimization.well_trajectory import minimum_curvature

traj = minimum_curvature(md, inc, az, start_z=1000.0)
scores = [0.8] * 100 + [0.1] * 100  # productive top half, poor bottom half
depths = [1000.0 + i*5 for i in range(200)]

f = compute_fitness(traj, scores, depths, dls_weight=0.3)
print(f"Fitness: {f:.4f}")
```

---

### 4.3 `optimization/genetic_algorithm.py`

#### Purpose

Implements the DEAP-based genetic algorithm for wellbore trajectory optimization. Encodes directional drilling survey parameters as real-valued chromosomes, evolves a population to maximize the fitness function, and returns the decoded best trajectory with associated statistics.

#### DEAP Setup (Module Level)

```python
creator.create("FitnessMax", base.Fitness, weights=(1.0,))
creator.create("Individual", list, fitness=creator.FitnessMax)
```

Wrapped in `try/except` to handle Python module hot-reload (DEAP raises if types are re-registered in the same process).

#### Function: `_build_md_array`

```python
def _build_md_array(n_waypoints: int, start_depth: float, end_depth: float) -> List[float]:
```

Creates evenly-spaced measured depth stations using `np.linspace`. The MD array is deterministic — only inclination and azimuth genes are evolved.

#### Function: `_decode_individual`

```python
def _decode_individual(
    individual: List[float],
    n_waypoints: int,
    start_depth: float,
    end_depth: float,
) -> tuple:  # (md_array, inc_array, az_array)
```

Converts the flat chromosome `[inc₁, az₁, inc₂, az₂, ...]` into three parallel arrays. Prepends `[0.0]` to both `inc_array` and `az_array` for the fixed vertical surface station.

**Chromosome structure:**
```
Gene index: 0     1    2     3    4     5    ...  2k     2k+1
Meaning:    inc₁  az₁  inc₂  az₂  inc₃  az₃  ...  incₖ₊₁  azₖ₊₁
```

#### Function: `_evaluate_individual`

```python
def _evaluate_individual(
    individual, depths, productivity_scores,
    n_waypoints, start_depth, end_depth, dls_weight
) -> tuple:  # (fitness_value,)
```

DEAP evaluation functions must return a tuple. Decodes the chromosome, runs `minimum_curvature()`, runs `compute_fitness()`, returns `(fitness_val,)`.

#### Function: `_build_formation_layers`

```python
def _build_formation_layers(
    depths: List[float],
    productivity_scores: List[float],
    min_layer_thickness: float = 30.0,
) -> List[Dict[str, Any]]:
```

**Algorithm:**

```
1. Convert productivity_scores to numpy array

2. Smooth scores with rolling mean:
   window = max(1, len(scores) // 20)   [~5% of depth range]
   smooth_scores = np.convolve(scores, ones(window)/window, "same")
   (Reduces noise-driven label flickering at layer boundaries)

3. Classify each depth point:
   score ≥ 0.50 → "productive"
   score ≥ 0.25 → "marginal"
   otherwise    → "non-productive"

4. First pass: group consecutive same-label depths into raw_layers:
   [{depth_top, depth_bottom, label, avg_score}]

5. Second pass: merge thin layers (thickness < 30m):
   If a layer is too thin:
     - Absorb into the previous layer (extend depth_bottom)
     - If it's the first layer, absorb into the next (shrink depth_top)
   Average the scores of merged layers
   Repeat until no more thin layers exist (convergence)
```

**Returns:** List of layer dicts for the 3D visualization:
```python
[
    {"depth_top": 1000.0, "depth_bottom": 1250.0, "label": "productive", "avg_score": 0.76},
    {"depth_top": 1250.0, "depth_bottom": 1580.0, "label": "non-productive", "avg_score": 0.08},
    ...
]
```

#### Function: `run_ga_optimization`

```python
def run_ga_optimization(
    depths: List[float],
    productivity_scores: List[float],
    n_waypoints: int = 8,
    population: int = 50,
    generations: int = 80,
    dls_weight: float = 0.3,
    start_depth: Optional[float] = None,
    end_depth: Optional[float] = None,
) -> Dict[str, Any]:
```

**Parameters:**

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `n_waypoints` | 8 | 4–12 | Number of survey stations (UI slider) |
| `population` | 50 | — | GA population size |
| `generations` | 80 | 50–200 | Evolution iterations (UI slider) |
| `dls_weight` | 0.3 | 0–1 | DLS penalty weight in fitness |
| `start_depth` | min(depths) | — | Kick-off measured depth |
| `end_depth` | max(depths) | — | Target measured depth |

**Returns:**
```python
{
    "trajectory": List[Dict],        # per-station survey data (from min. curvature)
    "fitness_score": float,          # best individual's fitness
    "productive_zone_exposure": float,  # raw mean productivity score (no DLS penalty)
    "max_dogleg_severity": float,    # maximum DLS in °/30m across all intervals
    "generation_history": List[float],  # best fitness value per generation
    "formation_layers": List[Dict],  # grouped formation intervals for 3D rendering
}
```

**GA Configuration (DEAP toolbox):**

```python
toolbox.register("mate",    tools.cxSimulatedBinaryBounded,
                 low=lower_bounds, up=upper_bounds, eta=20.0)
toolbox.register("mutate",  tools.mutPolynomialBounded,
                 low=lower_bounds, up=upper_bounds, eta=20.0, indpb=0.2)
toolbox.register("select",  tools.selTournament, tournsize=3)
```

Bounds per gene pair:
- Inclination gene: `[0.0, 85.0]`
- Azimuth gene: `[0.0, 360.0]`

**Evolution Loop:**

```python
# Evaluate initial population
fitnesses = list(map(toolbox.evaluate, pop))
for ind, fit in zip(pop, fitnesses): ind.fitness.values = fit

for gen in range(generations):
    offspring = toolbox.select(pop, len(pop))      # tournament selection
    offspring = [toolbox.clone(o) for o in offspring]

    # SBX crossover with probability 0.7
    for child1, child2 in zip(offspring[::2], offspring[1::2]):
        if random.random() < 0.7:
            toolbox.mate(child1, child2)
            del child1.fitness.values, child2.fitness.values

    # Polynomial mutation with probability 0.2
    for mutant in offspring:
        if random.random() < 0.2:
            toolbox.mutate(mutant)
            del mutant.fitness.values

    # Evaluate only invalid (modified) individuals
    invalid = [ind for ind in offspring if not ind.fitness.valid]
    fitnesses = map(toolbox.evaluate, invalid)
    for ind, fit in zip(invalid, fitnesses): ind.fitness.values = fit

    pop[:] = offspring                             # generational replacement
    generation_history.append(max(ind.fitness.values[0] for ind in pop))
```

**Post-optimization:**

```python
best_ind = tools.selBest(pop, 1)[0]
md, inc, az = _decode_individual(best_ind, n_waypoints, start_depth, end_depth)
best_traj = minimum_curvature(md, inc, az, start_z=start_depth)
dls_list = compute_dogleg_severity(inc_arr, az_arr, md_arr)
max_dls = max(dls_list)
interp_scores = np.interp(traj_z, depths_arr, scores_arr)
productive_exposure = mean(interp_scores)
formation_layers = _build_formation_layers(depths, productivity_scores)
```

---

## 5. Utils Modules

### 5.1 `utils/csv_parser.py`

#### Purpose

Robustly parses well log CSV files with flexible column name handling. Resolves common industry aliases (e.g., `RT` → `Resistivity`, `RHOB` → `Density`) and returns a clean, validated DataFrame.

#### Constants

```python
COLUMN_ALIASES = {
    "Depth":            ["depth", "md", "measured_depth", "tvd", "dept"],
    "GR":               ["gr", "gamma_ray", "gamma ray", "gr_api"],
    "Resistivity":      ["rt", "resistivity", "res", "ild", "deep_resistivity"],
    "Density":          ["rhob", "density", "bulk_density", "den"],
    "NeutronPorosity":  ["nphi", "neutron", "neutron_porosity", "cnl", "porosity"],
    "Sonic":            ["dt", "sonic", "dtco", "travel_time", "dtc"],
}

REQUIRED_CANONICAL = ["Depth", "GR", "Resistivity", "Density", "NeutronPorosity", "Sonic"]
```

#### Function: `_build_alias_map`

```python
def _build_alias_map(columns) -> Dict[str, str]:
```

**Parameters:** `columns` — list of column names from the uploaded CSV header

**Returns:** Dict mapping `actual_column_name` → `canonical_name`

**Algorithm:**
```
For each actual_col in columns:
  lower_col = actual_col.strip().lower()
  For each (canonical, aliases) in COLUMN_ALIASES.items():
    If lower_col in aliases:
      alias_map[actual_col] = canonical
      break   (first match wins)
```

#### Function: `parse_well_log_csv`

```python
def parse_well_log_csv(source: Union[str, io.StringIO]) -> pd.DataFrame:
```

**Parameters:**
- `source`: File path string or `io.StringIO` with CSV content

**Returns:** `pd.DataFrame` with columns `Depth, GR, Resistivity, Density, NeutronPorosity, Sonic`, all `float64`, sorted ascending by Depth, no NaN rows.

**Raises:** `ValueError` with a descriptive message if:
- CSV cannot be read (malformed format)
- File is empty
- Any required column is unrecognized
- Zero valid numeric rows remain after NaN cleaning

**Full Processing Pipeline:**

```
1. pd.read_csv(source)
   → Raises ValueError if parse fails

2. Strip whitespace from all column headers
   df.columns = [c.strip() for c in df.columns]

3. Build alias map
   alias_map = _build_alias_map(df.columns)

4. Check all 6 required columns are found
   missing = REQUIRED_CANONICAL − set(alias_map.values())
   If missing: raise ValueError with friendly alias hints

5. Rename to canonical names
   df = df.rename(columns=alias_map)[REQUIRED_CANONICAL]

6. Coerce all values to float
   df[col] = pd.to_numeric(df[col], errors="coerce")
   (Non-numeric values → NaN)

7. Drop rows with any NaN
   df = df.dropna()
   If len(df) == 0: raise ValueError

8. Sort by Depth ascending
   df = df.sort_values("Depth").reset_index(drop=True)
```

**Example Usage:**

```python
from utils.csv_parser import parse_well_log_csv
import io

csv_text = """Depth,GR,RT,RHOB,NPHI,DT
1000,35.2,45.7,2.28,0.19,61.3
1005,38.1,42.3,2.31,0.18,62.1
"""
df = parse_well_log_csv(io.StringIO(csv_text))
print(df.columns.tolist())
# ['Depth', 'GR', 'Resistivity', 'Density', 'NeutronPorosity', 'Sonic']
print(df.dtypes)
# All float64
```

---

*End of Backend Documentation — WellPath.AI v1.0*
