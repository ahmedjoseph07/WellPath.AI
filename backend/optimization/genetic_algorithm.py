import random
import numpy as np
from typing import List, Dict, Any, Optional

from deap import base, creator, tools, algorithms

from optimization.well_trajectory import minimum_curvature, compute_dogleg_severity
from optimization.fitness import compute_fitness

# ---------------------------------------------------------------------------
# DEAP creator setup — wrapped to be safe on hot-reload
# ---------------------------------------------------------------------------
try:
    creator.create("FitnessMax", base.Fitness, weights=(1.0,))
except Exception:
    pass  # already registered

try:
    creator.create("Individual", list, fitness=creator.FitnessMax)
except Exception:
    pass  # already registered


def _build_md_array(n_waypoints: int, start_depth: float, end_depth: float) -> List[float]:
    """Evenly-spaced measured depth stations from start to end."""
    return list(np.linspace(start_depth, end_depth, n_waypoints))


def _decode_individual(
    individual: List[float],
    n_waypoints: int,
    start_depth: float,
    end_depth: float,
) -> tuple:
    """
    Decode a flat chromosome [inc_0, az_0, inc_1, az_1, ...] into
    (md_array, inc_array, az_array) with the first station forced vertical
    and evenly distributed MD stations.
    """
    md_array = _build_md_array(n_waypoints, start_depth, end_depth)

    inc_array = [0.0]  # first station: vertical
    az_array = [0.0]   # first station: north

    for k in range(n_waypoints - 1):
        inc_val = float(individual[2 * k])
        az_val = float(individual[2 * k + 1])
        inc_array.append(inc_val)
        az_array.append(az_val)

    return md_array, inc_array, az_array


def _evaluate_individual(
    individual: List[float],
    depths: List[float],
    productivity_scores: List[float],
    n_waypoints: int,
    start_depth: float,
    end_depth: float,
    dls_weight: float,
) -> tuple:
    """DEAP evaluation function — returns (fitness,) tuple."""
    md_array, inc_array, az_array = _decode_individual(
        individual, n_waypoints, start_depth, end_depth
    )

    # The wellbore starts at the surface (or kick-off) above start_depth
    # z in minimum_curvature represents TVD increase; initialise z at start_depth
    traj = minimum_curvature(
        md_array, inc_array, az_array,
        start_x=0.0, start_y=0.0, start_z=float(start_depth),
    )

    fitness_val = compute_fitness(traj, productivity_scores, depths, dls_weight)
    return (fitness_val,)


def _build_formation_layers(
    depths: List[float],
    productivity_scores: List[float],
    min_layer_thickness: float = 30.0,
) -> List[Dict[str, Any]]:
    """
    Classify depths into zones and group consecutive depths with the same label
    into layers. Thin layers (< min_layer_thickness) are merged into the
    adjacent dominant layer to keep the 3D scene readable.
    """
    scores = np.asarray(productivity_scores, dtype=float)

    # Smooth scores with a small window to reduce noise-driven label flickering.
    # Reflective padding avoids the zero-bias at start/end that erased early
    # productive bands when using mode="same" with implicit zero padding.
    window = max(1, len(scores) // 20)
    if window > 1:
        pad = window // 2
        padded = np.pad(scores, pad, mode="edge")
        kernel = np.ones(window) / window
        smooth_scores = np.convolve(padded, kernel, mode="valid")[: len(scores)]
    else:
        smooth_scores = scores

    labels = []
    for s in smooth_scores:
        if s >= 0.5:
            labels.append("productive")
        elif s >= 0.25:
            labels.append("marginal")
        else:
            labels.append("non-productive")

    if not labels:
        return []

    # First pass: group consecutive same-label depths
    raw_layers: List[Dict[str, Any]] = []
    current_label = labels[0]
    layer_start = depths[0]
    layer_scores = [scores[0]]

    for i in range(1, len(labels)):
        if labels[i] == current_label:
            layer_scores.append(scores[i])
        else:
            raw_layers.append({
                "depth_top": float(layer_start),
                "depth_bottom": float(depths[i - 1]),
                "label": current_label,
                "avg_score": float(np.mean(layer_scores)),
            })
            current_label = labels[i]
            layer_start = depths[i]
            layer_scores = [scores[i]]
    raw_layers.append({
        "depth_top": float(layer_start),
        "depth_bottom": float(depths[-1]),
        "label": current_label,
        "avg_score": float(np.mean(layer_scores)),
    })

    # Rank labels so a thin productive band carries its label into the merged
    # layer instead of being silently relabelled as marginal/non-productive.
    label_priority = {"productive": 2, "marginal": 1, "non-productive": 0}

    def _dominant_label(a: str, b: str) -> str:
        return a if label_priority[a] >= label_priority[b] else b

    # Second pass: merge thin layers into neighbours, preserving the most
    # informative label across the merge.
    merged = list(raw_layers)
    changed = True
    while changed:
        changed = False
        new_merged: List[Dict[str, Any]] = []
        i = 0
        while i < len(merged):
            layer = merged[i]
            thickness = layer["depth_bottom"] - layer["depth_top"]
            if thickness < min_layer_thickness and len(merged) > 1:
                if new_merged:
                    prev = new_merged[-1]
                    prev["depth_bottom"] = layer["depth_bottom"]
                    prev["avg_score"] = (prev["avg_score"] + layer["avg_score"]) / 2
                    prev["label"] = _dominant_label(prev["label"], layer["label"])
                elif i + 1 < len(merged):
                    nxt = merged[i + 1]
                    nxt["depth_top"] = layer["depth_top"]
                    nxt["avg_score"] = (nxt["avg_score"] + layer["avg_score"]) / 2
                    nxt["label"] = _dominant_label(nxt["label"], layer["label"])
                    i += 1
                changed = True
            else:
                new_merged.append(layer)
            i += 1
        merged = new_merged

    return merged


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
    """
    Run genetic algorithm to optimise wellbore trajectory for productive zone exposure.

    Parameters
    ----------
    depths              : list[float]  — depth axis for productivity scores
    productivity_scores : list[float]  — per-depth productivity probability
    n_waypoints         : int          — number of survey stations (default 8)
    population          : int          — GA population size (default 50)
    generations         : int          — number of GA generations (default 80)
    dls_weight          : float        — penalty weight for dogleg severity (default 0.3)
    start_depth         : float        — kick-off MD (default: min(depths))
    end_depth           : float        — target MD (default: max(depths))

    Returns
    -------
    dict with keys:
        trajectory              : list of {depth, x, y, z, inclination, azimuth}
        fitness_score           : float
        productive_zone_exposure: float
        max_dogleg_severity     : float
        generation_history      : list of float (best fitness per generation)
        formation_layers        : list of {depth_top, depth_bottom, label, avg_score}
    """
    if start_depth is None:
        start_depth = float(min(depths))
    if end_depth is None:
        end_depth = float(max(depths))

    # Each individual encodes (n_waypoints - 1) pairs of (inc, az),
    # because the first station is fixed as vertical (inc=0, az=0).
    n_genes = 2 * (n_waypoints - 1)

    inc_lo = [0.0] * (n_waypoints - 1)
    inc_hi = [85.0] * (n_waypoints - 1)
    az_lo = [0.0] * (n_waypoints - 1)
    az_hi = [360.0] * (n_waypoints - 1)

    lower_bounds = []
    upper_bounds = []
    for k in range(n_waypoints - 1):
        lower_bounds.extend([inc_lo[k], az_lo[k]])
        upper_bounds.extend([inc_hi[k], az_hi[k]])

    # -----------------------------------------------------------------------
    # DEAP toolbox
    # -----------------------------------------------------------------------
    toolbox = base.Toolbox()

    def random_gene(lo, hi):
        return random.uniform(lo, hi)

    def init_individual():
        genes = []
        for k in range(n_waypoints - 1):
            genes.append(random.uniform(0.0, 85.0))  # inclination
            genes.append(random.uniform(0.0, 360.0))  # azimuth
        return creator.Individual(genes)

    toolbox.register("individual", init_individual)
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)

    toolbox.register(
        "evaluate",
        _evaluate_individual,
        depths=depths,
        productivity_scores=productivity_scores,
        n_waypoints=n_waypoints,
        start_depth=start_depth,
        end_depth=end_depth,
        dls_weight=dls_weight,
    )

    toolbox.register(
        "mate",
        tools.cxSimulatedBinaryBounded,
        low=lower_bounds,
        up=upper_bounds,
        eta=20.0,
    )
    toolbox.register(
        "mutate",
        tools.mutPolynomialBounded,
        low=lower_bounds,
        up=upper_bounds,
        eta=20.0,
        indpb=0.2,
    )
    toolbox.register("select", tools.selTournament, tournsize=3)

    # -----------------------------------------------------------------------
    # Run evolution
    # -----------------------------------------------------------------------
    random.seed(None)
    pop = toolbox.population(n=population)

    # Evaluate initial population
    fitnesses = list(map(toolbox.evaluate, pop))
    for ind, fit in zip(pop, fitnesses):
        ind.fitness.values = fit

    generation_history: List[float] = []

    for gen in range(generations):
        # Selection
        offspring = toolbox.select(pop, len(pop))
        offspring = list(map(toolbox.clone, offspring))

        # Crossover
        for child1, child2 in zip(offspring[::2], offspring[1::2]):
            if random.random() < 0.7:
                toolbox.mate(child1, child2)
                del child1.fitness.values
                del child2.fitness.values

        # Mutation
        for mutant in offspring:
            if random.random() < 0.2:
                toolbox.mutate(mutant)
                del mutant.fitness.values

        # Evaluate invalid individuals
        invalid = [ind for ind in offspring if not ind.fitness.valid]
        fitnesses = list(map(toolbox.evaluate, invalid))
        for ind, fit in zip(invalid, fitnesses):
            ind.fitness.values = fit

        pop[:] = offspring

        best_fit = max(ind.fitness.values[0] for ind in pop)
        generation_history.append(float(best_fit))

    # -----------------------------------------------------------------------
    # Extract best individual
    # -----------------------------------------------------------------------
    best_ind = tools.selBest(pop, 1)[0]
    best_fitness = float(best_ind.fitness.values[0])

    md_array, inc_array, az_array = _decode_individual(
        best_ind, n_waypoints, start_depth, end_depth
    )

    best_traj = minimum_curvature(
        md_array, inc_array, az_array,
        start_x=0.0, start_y=0.0, start_z=float(start_depth),
    )

    # Compute summary statistics
    dls_list = compute_dogleg_severity(
        [pt["inclination"] for pt in best_traj],
        [pt["azimuth"] for pt in best_traj],
        [pt["depth"] for pt in best_traj],
    )
    max_dls = float(max(dls_list)) if dls_list else 0.0

    # Productive exposure (raw, without DLS penalty)
    traj_z = np.array([pt["z"] for pt in best_traj])
    depths_arr = np.asarray(depths)
    scores_arr = np.asarray(productivity_scores)
    interp_scores = np.interp(traj_z, depths_arr, scores_arr)
    productive_exposure = float(np.mean(interp_scores))

    formation_layers = _build_formation_layers(depths, productivity_scores)

    return {
        "trajectory": best_traj,
        "fitness_score": best_fitness,
        "productive_zone_exposure": productive_exposure,
        "max_dogleg_severity": max_dls,
        "generation_history": generation_history,
        "formation_layers": formation_layers,
    }
