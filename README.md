# WellPath.AI

AI-driven directional well path optimizer. Combines XGBoost zone prediction with a Genetic Algorithm trajectory optimizer, served through a FastAPI backend and a React + Three.js frontend.

## What It Does

1. **Upload** a CSV well log (GR, Resistivity, Density, NeutronPorosity, Sonic vs Depth)
2. **Predict** per-depth productivity scores using XGBoost trained on heuristic labels
3. **Optimize** a 3D wellbore trajectory using a Genetic Algorithm to maximize productive zone exposure while minimizing dogleg severity
4. **Visualize** the result in an interactive 3D scene with formation layers and the optimized well path

## Quick Start

**Backend** (Python 3.10+)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs → http://localhost:8000/docs
```

**Frontend** (Node 18+)
```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173
```

Both must run at the same time. Vite proxies all `/api/*` requests to `localhost:8000`.

## CSV Format

Upload any CSV with these columns (column names are case-insensitive; common aliases accepted):

| Required Column | Accepted Aliases |
|---|---|
| Depth | md, measured_depth, tvd, dept |
| GR | gamma_ray, gr_api |
| Resistivity | rt, res, ild, deep_resistivity |
| Density | rhob, bulk_density, den |
| NeutronPorosity | nphi, neutron, cnl, porosity |
| Sonic | dt, dtco, travel_time, dtc |

Example:
```csv
Depth,GR,RT,RHOB,NPHI,DT
1000,25,50,2.3,18,58
1010,30,55,2.4,19,57
```

## Repository Layout

```
WellPath.AI/
├── backend/              # FastAPI · XGBoost · Genetic Algorithm
│   ├── api/routes/       # Upload, predict, optimize, synthetic endpoints
│   ├── ml/               # XGBoost model, preprocessor, synthetic data
│   ├── optimization/     # DEAP GA, fitness function, trajectory geometry
│   ├── utils/            # CSV parser with alias resolution
│   └── README.md
├── frontend/             # React · Vite · Three.js · Recharts
│   ├── src/components/   # Upload, charts, 3D visualization, layout
│   ├── src/store/        # Zustand global state
│   ├── src/api/          # fetch wrappers for all endpoints
│   └── README.md
├── docs/                 # All technical documentation
│   ├── ARCHITECTURE.md   # System design, data flow, API contract
│   ├── ALGORITHMS.md     # XGBoost, Genetic Algorithm, Min Curvature Method
│   ├── BACKEND.md        # Backend module reference
│   ├── FRONTEND.md       # Frontend component reference
│   └── README.md         # Docs index
└── .github/              # Issue templates, PR template
```

Deep-dive docs → [docs/](docs/README.md) · Backend reference → [backend/README.md](backend/README.md) · Frontend reference → [frontend/README.md](frontend/README.md)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Three.js, Recharts, Zustand, Tailwind CSS |
| Backend | FastAPI, Uvicorn, Pydantic |
| Machine Learning | XGBoost (sklearn HGB fallback), scikit-learn, pandas, NumPy |
| Optimization | DEAP (genetic algorithm), SciPy |

## Thesis Context

**Author:** Joseph Ahmed (ID: 2007007), BSc Petroleum Engineering, CUET  
**Supervisor:** Aqif Hosain Khan  
**Topic:** AI-assisted directional well path optimization using gradient boosting classification and evolutionary computation
