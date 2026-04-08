# WellPath.AI — Documentation

All technical documentation for the WellPath.AI thesis project. Start with the [Architecture](ARCHITECTURE.md) for the big picture, then drill into whichever area you need.

---

## System Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Full system design: data flow, component diagram, API contract, deployment |
| [ALGORITHMS.md](ALGORITHMS.md) | Deep dive into XGBoost pipeline, Genetic Algorithm design, Minimum Curvature Method |
| [BACKEND.md](BACKEND.md) | FastAPI modules — routes, ML, optimization, utils with annotated code references |
| [FRONTEND.md](FRONTEND.md) | React component tree, Zustand store, Three.js scene graph, Recharts usage |

## Thesis Concept Documentation

These documents provide detailed theoretical explanations of each domain used in the thesis — suitable for defense preparation and academic reference.

| Document | Description |
|---|---|
| [PETROPHYSICS.md](PETROPHYSICS.md) | Well log interpretation — GR, Resistivity, Density, Neutron Porosity, Sonic. Physical principles, reading tables, porosity equations, Archie's law, heuristic labelling rules |
| [MACHINE_LEARNING.md](MACHINE_LEARNING.md) | From decision trees to XGBoost — gradient boosting theory, regularised objective, Taylor expansion, model configuration, training pipeline, validation considerations |
| [GENETIC_ALGORITHM.md](GENETIC_ALGORITHM.md) | Evolutionary optimization — chromosome encoding, fitness function, SBX crossover, polynomial mutation, tournament selection, convergence analysis, DEAP framework |
| [DIRECTIONAL_DRILLING.md](DIRECTIONAL_DRILLING.md) | Borehole geometry — Minimum Curvature Method equations, coordinate systems, dogleg severity, kick-off point, well classifications, Three.js coordinate mapping |
| [THESIS_DEFENSE_GUIDE.md](THESIS_DEFENSE_GUIDE.md) | Defense preparation — 8 anticipated committee Q&As with model answers, 20-minute presentation structure, key numbers, vocabulary cheat sheet, closing statement |

## Package-level READMEs

Each sub-package has its own README for quick orientation:

- [../backend/README.md](../backend/README.md) — API endpoints, ML pipeline, GA parameters, XGBoost configuration
- [../frontend/README.md](../frontend/README.md) — Component structure, state management, 3D visualization, navigation

## How to Read These Docs

**For thesis defense:** Start with [THESIS_DEFENSE_GUIDE.md](THESIS_DEFENSE_GUIDE.md), then read the four concept docs ([PETROPHYSICS](PETROPHYSICS.md) → [MACHINE_LEARNING](MACHINE_LEARNING.md) → [GENETIC_ALGORITHM](GENETIC_ALGORITHM.md) → [DIRECTIONAL_DRILLING](DIRECTIONAL_DRILLING.md)) for deeper understanding.

**For development:** Start with [ARCHITECTURE.md](ARCHITECTURE.md), then [BACKEND.md](BACKEND.md) and [FRONTEND.md](FRONTEND.md).

**For algorithm details:** [ALGORITHMS.md](ALGORITHMS.md) covers all three algorithms in a single document. The individual concept docs expand on each with full equations and defense-ready explanations.
