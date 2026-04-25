# WellPath.AI — Algorithm Deep-Dive Documentation

**Author:** Joseph Ahmed (Student ID: 2007007)
**Module:** Core Algorithms
**Algorithms Covered:** Gradient Boosting, Genetic Algorithm, Minimum Curvature Method

---

## Table of Contents

- [Part 1: XGBoost / Gradient Boosting Classification](#part-1-xgboost--gradient-boosting-classification)
- [Part 2: Genetic Algorithm for Well Path Optimization](#part-2-genetic-algorithm-for-well-path-optimization)
- [Part 3: Minimum Curvature Method](#part-3-minimum-curvature-method)

---

## Part 1: XGBoost / Gradient Boosting Classification

### 1.1 Gradient Boosting Theory

Gradient boosting is an ensemble machine learning technique that builds a strong predictive model by sequentially combining many weak learners (typically shallow decision trees). The final prediction is an additive model of the form:

```
F_M(x) = F_0(x) + Σ  α · h_m(x)
                 m=1..M

Where:
  F_0(x)  = initial constant prediction (log-odds for classification)
  h_m(x)  = m-th decision tree (weak learner)
  α       = learning rate (shrinkage parameter) = 0.08 in WellPath.AI
  M       = number of boosting rounds (n_estimators) = 150
```

**Key Idea:** At each boosting round, a new tree `h_m` is fit to the **negative gradient** (pseudo-residuals) of the loss function with respect to the current model's predictions. This is gradient descent in function space:

```
Residuals at step m:
  r_{im} = −∂L(y_i, F_{m−1}(x_i)) / ∂F_{m−1}(x_i)

For multi-class log loss:
  r_{im,k} = 1(y_i = k) − P(y_i = k | x_i)   [one-vs-all residuals]

Where P(y = k | x) = softmax(F_{m−1,k}(x))
```

**Visualization of the Ensemble:**

```
Training Data (200 depth points × 5 features)
             │
         F_0 = log(class proportions)   ← initial estimate
             │
      ┌──────▼──────┐
      │  Tree 1      │  Fit to pseudo-residuals from F_0
      │  max_depth=5 │  → h_1(x)
      └──────┬───────┘
             │  F_1 = F_0 + 0.08 · h_1
      ┌──────▼──────┐
      │  Tree 2      │  Fit to pseudo-residuals from F_1
      │  max_depth=5 │  → h_2(x)
      └──────┬───────┘
             │  F_2 = F_1 + 0.08 · h_2
            ...
      ┌──────▼──────┐
      │  Tree 150    │  Fit to pseudo-residuals from F_149
      │  max_depth=5 │  → h_150(x)
      └──────┬───────┘
             │
         F_150(x) = Σ α · h_m(x)
             │
         softmax(F_150(x)) → P(class=0), P(class=1), P(class=2)
             │
         productivity_score = P(class=1)   ["productive"]
```

### 1.2 Application to Well Log Classification

WellPath.AI casts formation evaluation as a **3-class classification problem**:

| Class | Label | Meaning |
|-------|-------|---------|
| 0 | Non-productive | Shale, tight rock, brine-saturated |
| 1 | Productive | Hydrocarbon-bearing reservoir rock |
| 2 | Marginal | Intermediate quality, uncertain |

Each depth sample is a feature vector:
```
x_i = [GR_i, Resistivity_i, Density_i, NeutronPorosity_i, Sonic_i]
     ∈ R^5
```

The model outputs:
```
[P(non-prod), P(productive), P(marginal)] = softmax(F_150(x_i))
```

The `productivity_score` used in the fitness function is `P(class=1)`, the probability of being productive. This continuous probability (0–1) is more informative than the discrete class label for optimization purposes — the GA can reward trajectories that spend more time in high-probability productive zones, even if no single depth point exceeds the 0.5 decision threshold.

**Why is supervised learning appropriate here?**

The heuristic labeling function acts as a "domain expert oracle" that assigns coarse class labels based on well-understood petrophysical rules. The gradient boosting classifier then:
1. Learns the non-linear boundaries between classes in 5D feature space
2. Produces calibrated probability estimates (not just class labels)
3. Generalizes the heuristic rules to intermediate cases that fall near the boundaries

In essence, XGBoost translates simple threshold-based rules into a probabilistic, smooth formation quality model.

### 1.3 Bias-Variance Tradeoff in This Context

The classical bias-variance tradeoff states:

```
Expected Test Error = Bias² + Variance + Irreducible Noise
```

In WellPath.AI's pipeline:

**Bias considerations:**
- Heuristic labels are imperfect (they encode simplified physics). The model is trained on noisy, rule-generated labels → unavoidable label noise.
- `max_depth=5` keeps each tree moderately shallow → controlled bias.
- `n_estimators=150` with `learning_rate=0.08` provides sufficient boosting rounds to reduce residual bias.

**Variance considerations:**
- 200 training samples is small relative to the feature space → risk of overfitting.
- `max_depth=5` plus `min_child_weight=3` and `gamma=0.1` limit tree complexity → controlled variance.
- The shrinkage `α=0.08` forces each tree to contribute only 8% of its prediction → regularization effect.
- `subsample=0.8` and `colsample_bytree=0.8` inject stochastic regularisation (row/column bagging).
- `reg_alpha=0.1` (L1) and `reg_lambda=1.0` (L2) penalise large leaf weights.
- Since train and test are the same data (inductive prediction on the training set), overfitting manifests as overconfident probability scores rather than generalization error in this closed-system application.

**Practical implication:**
The model memorizes the heuristic rules it was trained on, then applies them probabilistically. This is intentional — the goal is to convert discrete heuristic labels into smooth probability curves for the fitness function, not to generalize to unseen geological formations.

### 1.4 Hyperparameter Choices

| Hyperparameter | Value | Justification |
|---------------|-------|---------------|
| `n_estimators` | 150 | Sufficient boosting rounds for 200 samples with α=0.08 to reach low residual bias |
| `max_depth` | 5 | Each tree can capture up to 2⁵=32 leaf regions, enough to model 5-feature threshold interactions without overfitting |
| `learning_rate` | 0.08 | Conservative shrinkage; paired with 150 trees for stable convergence |
| `subsample` | 0.8 | Stochastic gradient boosting — row bagging improves generalisation |
| `colsample_bytree` | 0.8 | Column sub-sampling per tree — decorrelates trees, reduces variance |
| `min_child_weight` | 3 | Require ≥3 Hessian mass per leaf — prevents tiny specialised leaves |
| `gamma` | 0.1 | Minimum loss reduction required for a split — pruning hyperparameter |
| `reg_alpha` | 0.1 | L1 regularisation on leaf weights — encourages sparsity |
| `reg_lambda` | 1.0 | L2 regularisation on leaf weights — smooths predictions |
| `tree_method` | `hist` | Histogram-based split finder — fast and memory-efficient |
| `eval_metric` | `mlogloss` | Multi-class negative log-likelihood; proper scoring rule for probability calibration |
| `random_state` | 42 | Reproducible initialization for consistent debugging |

**Effect of learning_rate on convergence:**
```
learning_rate = 0.08:  steady, reliable convergence over 150 rounds (WellPath.AI)
learning_rate = 0.5:   faster convergence, risk of oscillation / overshoot
learning_rate = 0.01:  slow convergence, would need n_estimators ≈ 1500
```

### 1.5 Feature Importance Interpretation for Petroleum Engineers

XGBoost computes feature importance as the mean **gain** (improvement in the objective function) when a feature is used to split a node, averaged over all splits using that feature across all 150 trees.

**Expected importance ranking for well log data:**

```
┌──────────────────────┬──────────────┬──────────────────────────────────────────┐
│  Feature             │  Expected    │  Physical Reason                         │
│                      │  Importance  │                                          │
├──────────────────────┼──────────────┼──────────────────────────────────────────┤
│  Resistivity (RT)    │  High        │  Primary hydrocarbon indicator; sharp    │
│                      │  (~0.35–0.45)│  contrast between brine (low) and HC    │
│                      │              │  (high) makes it the most discriminative │
├──────────────────────┼──────────────┼──────────────────────────────────────────┤
│  Gamma Ray (GR)      │  Medium-High │  Lithology discriminator: shale (high   │
│                      │  (~0.25–0.35)│  GR) vs sand/limestone (low GR)         │
├──────────────────────┼──────────────┼──────────────────────────────────────────┤
│  Neutron Porosity    │  Medium      │  Directly in the productive class        │
│  (NPHI)              │  (~0.10–0.20)│  threshold (NPHI > 0.12); porosity is   │
│                      │              │  a prerequisite for production           │
├──────────────────────┼──────────────┼──────────────────────────────────────────┤
│  Density (RHOB)      │  Low-Medium  │  Secondary lithology indicator; helps   │
│                      │  (~0.05–0.15)│  distinguish limestone from sandstone,  │
│                      │              │  not in heuristic labels directly        │
├──────────────────────┼──────────────┼──────────────────────────────────────────┤
│  Sonic (DT)          │  Low         │  Travel time responds to porosity and   │
│                      │  (~0.05–0.10)│  lithology but overlaps with density    │
│                      │              │  information; least unique signal        │
└──────────────────────┴──────────────┴──────────────────────────────────────────┘
```

**Interpretation for drilling engineers:**
- If Resistivity dominates (>40%), the formation evaluation is primarily governed by fluid content — the optimizer will strongly favor zones with high resistivity.
- If GR dominates, lithology is the main driver — the optimizer favors sand-dominated formations over shale.
- Low Sonic importance suggests it provides redundant information captured by Density.

---

## Part 2: Genetic Algorithm for Well Path Optimization

### 2.1 Evolutionary Computation Fundamentals

Evolutionary computation algorithms are inspired by Darwinian natural selection. A population of candidate solutions evolves over generations through selection, recombination, and mutation to find high-quality solutions to optimization problems.

**Core Analogy:**

```
Biological Evolution          GA Optimization
──────────────────────────────────────────────────
Organism                   →  Candidate trajectory (individual)
Chromosome (DNA)           →  List of inclination/azimuth genes
Gene                       →  One angle value (inc_i or az_i)
Fitness (survival)         →  compute_fitness() return value
Reproduction               →  Crossover + Mutation
Natural selection          →  Tournament selection
Population                 →  Set of 50 candidate trajectories
Generation                 →  One evolution cycle (selection + variation)
```

**Why Evolutionary Computation for This Problem?**

The wellbore trajectory optimization problem has properties that make classical optimization methods (gradient descent, linear programming) inapplicable:

1. **Non-convexity:** The fitness landscape has many local optima. Small changes in one station's inclination propagate non-linearly to all downstream position calculations via the minimum curvature equations.

2. **No analytical gradient:** `compute_fitness()` involves `minimum_curvature()` which uses trigonometric functions and clamped `acos()`. While technically differentiable, computing analytical gradients is complex and brittle.

3. **Bounded variables:** Inclination ∈ [0°, 85°] and azimuth ∈ [0°, 360°] are hard bounds that standard gradient descent does not handle naturally.

4. **Stochastic fitness landscape:** Each new synthetic data load produces a different productivity profile, requiring the optimization to be re-run from scratch.

GAs handle all of these: they work without gradients, handle bounds natively (via bounded operators), and explore the landscape globally through population diversity.

### 2.2 The Geosteering Connection

Geosteering is the practice of directing a wellbore in real time to stay within or maximize exposure to a target formation during drilling. WellPath.AI implements **pre-drill trajectory planning** (not real-time geosteering), but encodes the same intent in the fitness function:

```
Fitness = mean productivity score along trajectory − DLS penalty
```

This directly expresses: "find the path that spends the most time in productive zones while remaining physically drillable." The DLS penalty encodes the drilling constraint that wellbores cannot change direction too rapidly without risking stuck pipe, equipment damage, or casing wear.

**Fitness as a Proxy for Geosteering Quality:**

```
Trajectory A (suboptimal):
  ────────────────────────────────────
  1000m │████████ productive (0.8)  │
        │                            │
  1500m │                            │ ← trajectory stays in this shale band
        │░░░░░░░░ non-productive     │
        │         (0.05)             │
  2000m │                            │
  ────────────────────────────────────
  E_prod ≈ 0.23   (mostly poor zone)

Trajectory B (optimized):
  ────────────────────────────────────
  1000m │████████ productive (0.8)  │ ← trajectory dips into this zone
        │          ╱                 │
  1500m │       ╱                    │
        │    ╱  deviates to avoid    │
  2000m │ ╱     non-productive       │
  ────────────────────────────────────
  E_prod ≈ 0.70   (GA found the deviation)
```

### 2.3 Chromosome Representation

The chromosome is a real-valued vector of length `2 × (n_waypoints − 1)`:

```
Chromosome [inc₁, az₁, inc₂, az₂, ..., inc_{N−1}, az_{N−1}]

Physical meaning: directional survey plan for a multi-section wellbore

Station 0 (surface): inc=0°, az=0° (fixed vertical — not encoded)
Station 1: inc₁ ∈ [0°, 85°], az₁ ∈ [0°, 360°]
Station 2: inc₂ ∈ [0°, 85°], az₂ ∈ [0°, 360°]
...
Station N−1: inc_{N−1} ∈ [0°, 85°], az_{N−1} ∈ [0°, 360°]

For N=8 (default): 14 genes total
  [inc₁, az₁, inc₂, az₂, inc₃, az₃, inc₄, az₄,
   inc₅, az₅, inc₆, az₆, inc₇, az₇]
```

**Design choices:**
- The surface station is fixed (vertical at kick-off). This reflects real drilling practice where the first sections are drilled vertically.
- MD stations are evenly spaced and not encoded in the chromosome — they are deterministic from start/end depths. This reduces the search space.
- Inclination bounded at 85° rather than 90° to avoid near-horizontal geometries that could create degenerate minimum curvature calculations.

### 2.4 SBX Crossover: Why Better Than Uniform Crossover

**Uniform Crossover** for real-valued parameters:
```
Parent A: [23.0, 45.0, 35.0, 70.0, ...]
Parent B: [40.0, 120.0, 15.0, 200.0, ...]

Random binary mask: [1, 0, 1, 0, ...]

Child C: [23.0, 120.0, 35.0, 200.0, ...]
Child D: [40.0, 45.0, 15.0, 70.0, ...]
```

Problem: Children inherit random combinations of parent genes. There is no "physical continuity" — a child could inherit 23° inclination from Parent A for Station 1 and 200° azimuth from Parent B for Station 2, with no spatial coherence between the two.

**Simulated Binary Crossover (SBX):**

SBX was designed to simulate the behavior of single-point crossover in binary-coded GAs for real-valued parameters. It produces children concentrated near the parents:

```
Given parents x₁ and x₂ (for one gene pair), SBX produces:
  c₁ = 0.5 · [(1 + β) · x₁ + (1 − β) · x₂]
  c₂ = 0.5 · [(1 − β) · x₁ + (1 + β) · x₂]

Where β is drawn from a distribution controlled by η (distribution index):
  P(β) ∝ (η+1)/2 · β^η   if β ≤ 1
  P(β) ∝ (η+1)/2 · β^{−η−2}  if β > 1

High η (=20 in WellPath.AI) → children close to parents
Low η (→ 0)               → children spread over the whole range
```

**Geometric interpretation:**
```
Low η:                    High η (=20):
  A───────────────B          A──C D──B
  ↑               ↑          ↑↑ ↑↑  ↑
  C               D          spread ≈ 5% of A–B distance
  (children spread                   (children near parents)
   far from parents)
```

**Why η=20 is appropriate:**

For well trajectory parameters, small perturbations are more physically meaningful than large jumps. A wellbore that gradually increases inclination from 20° to 25° between two consecutive stations is physically realistic. A sudden change from 20° to 75° would create an extremely sharp dogleg (high DLS) that would be penalized by the fitness function. SBX with high η ensures that crossover produces geometrically similar children, preserving the "building blocks" of good trajectory shapes.

### 2.5 Polynomial Mutation: Maintaining Diversity

Polynomial mutation perturbs a gene value by a small amount drawn from a polynomial distribution:

```
For a gene x with bounds [lo, hi] and parent value x_p:

  δ_q = min(x_p − lo, hi − x_p) / (hi − lo)   [normalized distance to nearest bound]

  If u < 0.5 (u uniform in [0,1]):
    δ = (2u + (1−2u)·(1−δ_q)^{η+1})^{1/(η+1)} − 1
  Else:
    δ = 1 − (2(1−u) + 2(u−0.5)·(1−δ_q)^{η+1})^{1/(η+1)}

  x_child = x_p + δ · (hi − lo)
  x_child = clamp(x_child, lo, hi)
```

**Effect of η=20:**
Most mutations are small perturbations (|δ| < 0.05 of range). Occasional larger mutations (|δ| ≈ 0.1–0.2) maintain diversity, preventing premature convergence to a single local optimum.

**Why `indpb=0.2` (per-gene probability)?**

With 14 genes (N=8 waypoints) and `indpb=0.2`, the expected number of genes mutated per individual is `14 × 0.2 = 2.8 genes`. This is a moderate mutation rate:
- Too high (`indpb` close to 1): mutation destroys good solutions (excessive disruption)
- Too low (`indpb` close to 0): insufficient exploration (population converges too fast)

### 2.6 Tournament Selection: Balancing Exploration vs Exploitation

Tournament selection works as follows:
1. Randomly sample `k=3` individuals from the population
2. Select the individual with the highest fitness
3. Repeat `population_size` times (with replacement) to form the offspring pool

```
Population of 50 individuals:
  Fitness: [0.41, 0.58, 0.73, 0.22, 0.65, 0.80, ...]
                                           ↑
  Tournament 1: sample {ind_3, ind_6, ind_42}
                fitness {0.22, 0.80, 0.51}
                winner: ind_6 (fitness 0.80) ← enters offspring pool

  Tournament 2: sample {ind_1, ind_6, ind_15}
                fitness {0.41, 0.80, 0.37}
                winner: ind_6 again ← high-fitness individuals win more often

  ... (50 tournaments total)
```

**Selection pressure of k=3:**

| Tournament size | Pressure | Effect |
|-----------------|----------|--------|
| k=2 (binary) | Low | High diversity, slow convergence |
| k=3 (WellPath.AI) | Moderate | Balanced exploration/exploitation |
| k=5+ | High | Rapid convergence, risk of premature convergence |

### 2.7 Convergence Analysis

The `generation_history` array records the best fitness in the population at each generation. A typical convergence profile:

```
Fitness
  1.0 │
      │                                          ╭────────────
  0.8 │                               ╭──────────╯
      │                    ╭──────────╯
  0.6 │          ╭─────────╯
      │   ╭──────╯
  0.4 │───╯
      │
  0.2 │
      └─────────────────────────────────────────────────────► Generation
      0     10    20    30    40    50    60    70    80

Phase 1 (gen 0–20):   Rapid improvement — population discovers basic
                       trajectory shapes that find productive zones.
Phase 2 (gen 20–50):  Moderate improvement — fine-tuning angles to
                       maximize exposure while managing DLS.
Phase 3 (gen 50–80):  Plateau — population converged near local/global
                       optimum. Small improvements from mutation only.
```

**Indicators of good convergence:**
- Smooth, monotonically non-decreasing curve
- Plateau reached before the last 20% of generations
- Final fitness > 0.5 for a dataset with productive zones present

**Indicators of convergence issues:**
- Jagged, non-monotonic curve: fitness is not consistently improving (rare with tournament selection, since `pop[:] = offspring` can lower fitness)
- Flat curve from generation 1: population never improved — possible bug or degenerate data
- Still rising at generation 80: insufficient generations; increase via the UI slider

### 2.8 Formation Layer Construction (Post-GA)

After the GA returns the best trajectory, `_build_formation_layers()` converts the per-depth `productivity_scores` into a coarse **layer model** for the 3D scene. Each layer is a single contiguous depth window labelled `productive | marginal | non-productive` with an `avg_score`. This is what `FormationLayers.jsx` renders as the colored slabs behind the trajectory.

**Algorithm:**

```
1. Smooth the score series with a moving-average kernel of window N/20
   using EDGE-PADDED convolution (mode="edge"). The reflective padding
   prevents the implicit zero bias at the start/end of the profile that
   would otherwise erase early productive bands.

2. Threshold each smoothed value:
        score >= 0.50  → productive
   0.25 ≤ score < 0.50 → marginal
        score <  0.25  → non-productive

3. First pass — group consecutive same-label samples into raw layers:
   {depth_top, depth_bottom, label, avg_score}

4. Second pass — merge layers thinner than min_layer_thickness=30 m
   into the previous (or next) layer. The merge resolves the resulting
   label conflict by DOMINANT-LABEL PRESERVATION:

       label_priority = {productive: 2, marginal: 1, non-productive: 0}
       merged.label = max(prev.label, layer.label, key=priority)

   Repeat until no further merges occur.
```

**Why edge padding + dominant-label merging?**

An earlier version used `np.convolve(scores, kernel, mode="same")`, which pads with implicit zeros at the boundaries. This dragged the smoothed value below the productive threshold for the first/last few samples — so a productive band sitting near the top of the well would be silently relabelled as marginal or non-productive in the rendered scene.

Worse, when a thin productive band (say 20 m) was merged into a thick marginal slab on either side, naïve merging took the *neighbour's* label, dropping the productive layer from the formation model entirely. The dominant-label rule fixes this — a thin productive layer keeps its `productive` label even after merging into thicker neighbours, because productive outranks marginal which outranks non-productive.

The combination of these two changes ensures that *every* productive zone present in the XGBoost output appears in the 3D scene as a green slab, regardless of its position in the depth window or its thickness relative to surrounding zones.

### 2.9 Population Replacement Strategy

WellPath.AI uses **generational replacement** (not elitism):

```python
pop[:] = offspring   # offspring completely replaces parent population
```

**Implication:** The best individual from generation g is not guaranteed to survive to generation g+1. However, `selTournament` tends to select high-fitness individuals, so good solutions typically persist through multiple generations.

**Trade-off vs elitism:** Elitism (explicitly preserving the top-k individuals) guarantees monotonically non-decreasing best fitness, at the cost of reduced population diversity. The current approach prioritizes exploration, which is appropriate given the moderate generation count of 80.

---

## Part 3: Minimum Curvature Method

### 3.1 Historical Context

The minimum curvature method (MCM) was formalized in the petroleum industry during the 1960s and standardized by the International Association of Directional Drilling and Companies (IADCO) and later referenced in API RP 11V9. Before MCM, simpler methods such as the Average Angle Method and the Radius of Curvature Method were used. MCM superseded these because it is more accurate for large dogleg angles and is consistent with the physical assumption that the wellbore follows the shortest arc (minimum curvature) between two survey stations.

### 3.2 Comparison of Survey Calculation Methods

| Method | Formula Type | Accuracy | Notes |
|--------|-------------|----------|-------|
| Tangential | Use start-station angles only | Poor (large error for high DLS) | Obsolete |
| Average Angle | Average of start and end station angles | Moderate | Simple; degenerates to MCM when DL≈0 |
| Balanced Tangential | Average of tangent vectors | Moderate | Better than tangential, worse than MCM |
| Radius of Curvature | Circular arc path | Good | Complex; less numerically stable |
| **Minimum Curvature** | **Arc with ratio factor** | **Best** | **Industry standard; used in WellPath.AI** |

### 3.3 Full Mathematical Derivation

**Setup:**

Two consecutive survey stations are known:
```
Station i:   MD = s₁,   Inc = θ₁,   Az = φ₁
Station i+1: MD = s₂,   Inc = θ₂,   Az = φ₂
```

All angles in radians for computation. ΔMD = s₂ − s₁.

**Step 1: Dogleg Angle**

The dogleg angle DL is the total spatial angle between the two tangent vectors at the two stations:

```
Tangent vector at station i:
  T₁ = [sin(θ₁)·sin(φ₁),  sin(θ₁)·cos(φ₁),  cos(θ₁)]
       [East component,    North component,    Up component]

Tangent vector at station i+1:
  T₂ = [sin(θ₂)·sin(φ₂),  sin(θ₂)·cos(φ₂),  cos(θ₂)]

Dot product T₁ · T₂ = cos(DL):
  cos(DL) = sin(θ₁)·sin(φ₁)·sin(θ₂)·sin(φ₂)
           + sin(θ₁)·cos(φ₁)·sin(θ₂)·cos(φ₂)
           + cos(θ₁)·cos(θ₂)

         = sin(θ₁)·sin(θ₂)·[sin(φ₁)·sin(φ₂) + cos(φ₁)·cos(φ₂)]
           + cos(θ₁)·cos(θ₂)

         = sin(θ₁)·sin(θ₂)·cos(φ₂ − φ₁)
           + cos(θ₁)·cos(θ₂)

Using trig identity cos(A−B) = cosA·cosB + sinA·sinB:
  cos(DL) = cos(θ₂ − θ₁) − sin(θ₁)·sin(θ₂)·(1 − cos(φ₂ − φ₁))

DL = acos(cos(DL))   [clamped to [−1, 1] for numerical safety]
```

This is exactly the formula implemented in `well_trajectory.py`.

**Step 2: Ratio Factor (RF)**

The Ratio Factor converts the straight-line average (Average Angle Method) to the arc length of the minimum-curvature path:

```
RF = arc_length / chord_length

For a circular arc of angle DL:
  chord_length = 2·sin(DL/2)
  arc_length   = DL

RF = DL / (2·sin(DL/2)) = 1/sinc(DL/2)  [unnormalized sinc]
   = (2/DL) · tan(DL/2)                  [equivalent form used in code]

Special cases:
  DL → 0:  RF → 1   (l'Hôpital's rule: DL/(2sin(DL/2)) → 1)
  DL = π:  RF → ∞   (U-turn; physically impossible in drilling)
```

**Physical meaning of RF:** For a straight section (DL=0), RF=1 and the method reduces to the average angle method. For a curved section, RF > 1, stretching the position increment to account for the arc path being longer than the chord.

**Step 3: Coordinate Increments**

```
Δx = (ΔMD/2) · [sin(θ₁)·sin(φ₁) + sin(θ₂)·sin(φ₂)] · RF
     ↑                                                  ↑
   half interval                average East            arc correction

Δy = (ΔMD/2) · [sin(θ₁)·cos(φ₁) + sin(θ₂)·cos(φ₂)] · RF
     (North)

Δz = (ΔMD/2) · [cos(θ₁) + cos(θ₂)] · RF
     (TVD, positive = deeper)
```

The brackets represent the sum of the unit tangent vector East/North/Up components at the two stations. Multiplying by ΔMD/2 gives the Average Angle approximation; multiplying by RF converts to the minimum-curvature arc.

**Step 4: Cumulative Position**

Starting from `(x₀, y₀, z₀) = (0, 0, start_depth)`:
```
x_{i+1} = x_i + Δx
y_{i+1} = y_i + Δy
z_{i+1} = z_i + Δz   (TVD; z increases downward)
```

### 3.4 Dogleg Severity Calculation

Dogleg severity (DLS) normalizes the dogleg angle to degrees per 30 metres of measured depth:

```
DLS = (DL_degrees / ΔMD) × 30     [°/30m]
```

**Physical interpretation:**
- DLS = 1 °/30m: Very gentle curve, suitable for all casing grades
- DLS = 3 °/30m: Moderate; industry standard planning limit for most wells
- DLS = 5–8 °/30m: Aggressive; requires engineering approval, limits tool selection
- DLS > 10 °/30m: Extreme; risk of stuck pipe, casing damage, fatigue failure

**WellPath.AI normalization:**

```python
MAX_DLS = 3.0   # deg/30m — reference limit

dls_penalty = min(mean_dls / MAX_DLS, 1.0)
```

When `mean_dls = MAX_DLS = 3.0`, penalty = 1.0 (maximum). With `dls_weight=0.3`, this reduces fitness by 0.3. Trajectories with mean DLS well below 3°/30m incur minimal penalty.

### 3.5 Connection to Physical Wellbore Geometry

**Well Trajectory Sections:**

A typical directional well has:
```
1. Vertical Section
   Inc = 0°, Az = 0°
   TVD increases, no horizontal displacement
   DLS ≈ 0 °/30m

2. Build Section (Kick-off to target inclination)
   Inc increases from 0° to target (e.g., 45°)
   Azimuth set toward target
   DLS = (Δinc / ΔMD) × 30

3. Hold Section (Tangent Section)
   Constant Inc and Az
   DLS = 0 °/30m
   Trajectory traces a straight line at the target inclination

4. Drop Section (optional, before horizontal target)
   Inc decreases back toward horizontal
   DLS = (Δinc / ΔMD) × 30

5. Horizontal / Lateral Section (for horizontal wells)
   Inc = 90°, constant Az
   DLS = 0 in lateral; high DLS at entry to horizontal
```

**WellPath.AI simplification:**
The GA generates arbitrary inclination/azimuth profiles — it does not enforce the structured build/hold/drop paradigm. This allows the algorithm to discover unconventional trajectories that maximize productive zone exposure. In practice, a drilling engineer would review the GA output and smooth it into a buildable well plan.

### 3.6 Numerical Accuracy and Edge Cases

**Floating-point clamping:**
```python
cos_dl = max(-1.0, min(1.0, cos_dl))
```

Without this clamp, floating-point arithmetic can produce `cos_dl = 1.0000000000000002` (slightly outside [-1, 1] due to precision), causing `math.acos()` to raise a `ValueError`. The clamp prevents this without affecting accuracy.

**Near-straight sections (DL ≈ 0):**
```python
if abs(dl) < 1e-10:
    rf = 1.0
```

When DL is extremely small, `(2/DL)·tan(DL/2)` suffers catastrophic cancellation. The threshold `1e-10` radians ≈ 0.00000001° — well below any physically meaningful dogleg angle. Setting RF=1.0 for this case is exact to machine precision.

**U-turn case (DL ≈ π):**

A dogleg angle of 180° (complete reversal of direction) is physically impossible to drill but could theoretically appear from random chromosome genes. In this case, `tan(π/2)` → ∞ and RF → ∞. The implementation does not explicitly guard against this; however, the bounded crossover and mutation operators prevent inclination from reaching combinations that produce DL = 180°, since inclination is bounded to [0°, 85°].

---

*End of Algorithm Documentation — WellPath.AI v1.1*
