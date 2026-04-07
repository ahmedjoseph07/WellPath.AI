import numpy as np
import random
from typing import Dict, List


_FIXED_SEED = 2007007  # deterministic: same well log every call (Joseph Ahmed student ID)


def generate_synthetic_well_log() -> Dict[str, List[float]]:
    """
    Generate a deterministic synthetic well log dataset.

    Fixed seed ensures the same formation geometry and log values are returned
    on every call, so predictions and trajectories are reproducible when using
    the sample dataset.  Upload a real CSV to get different data.

    Creates 200 depth points from 1000m to 2000m (5m spacing) divided into
    7 fixed formation layers of sandstone, shale, or limestone.
    Correlated Gaussian noise (fixed) is added to each log curve.

    Returns a dict with keys: depths, GR, Resistivity, Density, NeutronPorosity, Sonic.
    """
    rng = np.random.default_rng(seed=_FIXED_SEED)
    py_rng = random.Random(_FIXED_SEED)   # separate seeded Python RNG

    depths = np.linspace(1000.0, 2000.0, 200)

    # Formation type definitions: (name, GR_range, Res_range, Den_range, NPHI_range, DT_range)
    formation_templates = {
        "sandstone": {
            "GR": (20.0, 45.0),
            "Resistivity": (20.0, 80.0),
            "Density": (2.20, 2.35),
            "NeutronPorosity": (0.15, 0.25),
            "Sonic": (55.0, 65.0),
        },
        "shale": {
            "GR": (75.0, 120.0),
            "Resistivity": (2.0, 8.0),
            "Density": (2.40, 2.60),
            "NeutronPorosity": (0.25, 0.40),
            "Sonic": (75.0, 95.0),
        },
        "limestone": {
            "GR": (15.0, 30.0),
            "Resistivity": (50.0, 200.0),
            "Density": (2.50, 2.70),
            "NeutronPorosity": (0.05, 0.15),
            "Sonic": (45.0, 55.0),
        },
    }

    formation_names = list(formation_templates.keys())
    n_layers = py_rng.randint(6, 8)

    # Create layer boundaries (sorted indices)
    boundary_indices = sorted(
        py_rng.sample(range(10, 190), n_layers - 1)
    )
    layer_starts = [0] + boundary_indices
    layer_ends = boundary_indices + [200]

    # Arrays to fill
    GR = np.zeros(200)
    Resistivity = np.zeros(200)
    Density = np.zeros(200)
    NeutronPorosity = np.zeros(200)
    Sonic = np.zeros(200)

    for start, end in zip(layer_starts, layer_ends):
        formation = py_rng.choice(formation_names)
        tmpl = formation_templates[formation]
        n = end - start

        GR[start:end] = rng.uniform(*tmpl["GR"], size=n)
        Resistivity[start:end] = rng.uniform(*tmpl["Resistivity"], size=n)
        Density[start:end] = rng.uniform(*tmpl["Density"], size=n)
        NeutronPorosity[start:end] = rng.uniform(*tmpl["NeutronPorosity"], size=n)
        Sonic[start:end] = rng.uniform(*tmpl["Sonic"], size=n)

    # Add correlated Gaussian noise scaled to ~2% of each curve's range
    noise_scale = 0.02
    GR += rng.normal(0, (45.0 - 20.0) * noise_scale, size=200)
    Resistivity += rng.normal(0, (80.0 - 2.0) * noise_scale, size=200)
    Density += rng.normal(0, (2.70 - 2.20) * noise_scale, size=200)
    NeutronPorosity += rng.normal(0, (0.40 - 0.05) * noise_scale, size=200)
    Sonic += rng.normal(0, (95.0 - 45.0) * noise_scale, size=200)

    # Clip to physically plausible ranges
    GR = np.clip(GR, 5.0, 200.0)
    Resistivity = np.clip(Resistivity, 0.5, 300.0)
    Density = np.clip(Density, 1.8, 3.0)
    NeutronPorosity = np.clip(NeutronPorosity, 0.0, 0.60)
    Sonic = np.clip(Sonic, 40.0, 120.0)

    return {
        "depths": depths.tolist(),
        "GR": GR.tolist(),
        "Resistivity": Resistivity.tolist(),
        "Density": Density.tolist(),
        "NeutronPorosity": NeutronPorosity.tolist(),
        "Sonic": Sonic.tolist(),
    }
