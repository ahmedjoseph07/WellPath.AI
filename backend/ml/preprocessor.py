import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from typing import Tuple


LOG_COLUMNS = ["GR", "Resistivity", "Density", "NeutronPorosity", "Sonic"]


def normalize_features(df: pd.DataFrame) -> Tuple[np.ndarray, StandardScaler]:
    """
    Apply StandardScaler to the 5 well log columns.

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame containing columns GR, Resistivity, Density, NeutronPorosity, Sonic.

    Returns
    -------
    X_scaled : np.ndarray  shape (n_samples, 5)
    scaler   : fitted StandardScaler instance
    """
    scaler = StandardScaler()
    X = df[LOG_COLUMNS].values.astype(float)
    X_scaled = scaler.fit_transform(X)
    return X_scaled, scaler


def label_by_heuristics(df: pd.DataFrame) -> np.ndarray:
    """
    Label each depth point with a productivity class:
      1 (productive)     if Resistivity > 15 AND GR < 60 AND NeutronPorosity > 0.12
      2 (marginal)       if Resistivity > 8  AND GR < 80
      0 (non-productive) otherwise

    Parameters
    ----------
    df : pd.DataFrame
        DataFrame with canonical well log column names.

    Returns
    -------
    labels : np.ndarray of int, shape (n_samples,)
    """
    res = df["Resistivity"].values
    gr = df["GR"].values
    nphi = df["NeutronPorosity"].values

    labels = np.zeros(len(df), dtype=int)

    marginal_mask = (res > 8) & (gr < 80)
    labels[marginal_mask] = 2

    productive_mask = (res > 15) & (gr < 60) & (nphi > 0.12)
    labels[productive_mask] = 1

    return labels
