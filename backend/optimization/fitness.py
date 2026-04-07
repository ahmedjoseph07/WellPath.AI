import numpy as np
from typing import List, Dict, Any


MAX_DLS = 3.0  # deg/30m — reference maximum for normalisation


def compute_fitness(
    trajectory_points: List[Dict[str, Any]],
    productivity_scores: List[float],
    depths: List[float],
    dls_weight: float = 0.3,
) -> float:
    """
    Compute the fitness of a wellbore trajectory.

    Fitness = productive_exposure - dls_weight * normalized_dls_penalty

    Parameters
    ----------
    trajectory_points   : list of dicts with keys depth, x, y, z, inclination, azimuth
                          (output of minimum_curvature)
    productivity_scores : list of float — per-depth probability of being productive
    depths              : list of float — depth values corresponding to productivity_scores
    dls_weight          : float — weight applied to the DLS penalty term

    Returns
    -------
    fitness : float (higher is better)
    """
    depths_arr = np.asarray(depths, dtype=float)
    scores_arr = np.asarray(productivity_scores, dtype=float)

    # --- Productive exposure ---
    # Interpolate productivity score at each trajectory z-depth
    traj_z = np.array([pt["z"] for pt in trajectory_points], dtype=float)
    interp_scores = np.interp(traj_z, depths_arr, scores_arr)
    productive_exposure = float(np.mean(interp_scores))

    # --- DLS penalty ---
    # Compute dogleg severity between consecutive trajectory points
    if len(trajectory_points) < 2:
        dls_penalty = 0.0
    else:
        from optimization.well_trajectory import compute_dogleg_severity

        inc_arr = [pt["inclination"] for pt in trajectory_points]
        az_arr = [pt["azimuth"] for pt in trajectory_points]
        md_arr = [pt["depth"] for pt in trajectory_points]

        dls_list = compute_dogleg_severity(inc_arr, az_arr, md_arr)
        mean_dls = float(np.mean(dls_list)) if dls_list else 0.0
        # Normalise by the reference maximum
        dls_penalty = min(mean_dls / MAX_DLS, 1.0)

    fitness = productive_exposure - dls_weight * dls_penalty
    return fitness
