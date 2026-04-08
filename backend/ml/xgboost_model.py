import numpy as np
import pandas as pd
from typing import Dict, Any

from ml.preprocessor import normalize_features, label_by_heuristics, LOG_COLUMNS
from xgboost import XGBClassifier

# Mapping from integer label to human-readable string
LABEL_MAP = {1: "productive", 2: "marginal", 0: "non-productive"}


def _build_model():
    return XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        eval_metric="mlogloss",
        random_state=42,
        verbosity=0,
        tree_method="hist",   # histogram-based: fast, memory-efficient
        device="cpu",         # explicit CPU — avoids GPU/CUDA lookup overhead
        nthread=1,            # single-thread: resolves libomp/OpenMP issue on macOS
    )


def predict_zones(well_log_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Train a gradient boosting classifier on heuristically labelled well log data,
    then predict per-depth productivity scores and zone labels.

    Uses XGBoost when available (requires libomp on macOS), otherwise falls back
    to scikit-learn's HistGradientBoostingClassifier.

    Parameters
    ----------
    well_log_dict : dict
        Must contain keys: depths, GR, Resistivity, Density, NeutronPorosity, Sonic

    Returns
    -------
    dict with keys:
        depths              : list[float]
        productivity_score  : list[float]  — probability of class "productive" (label=1)
        zone_label          : list[str]    — "productive" / "marginal" / "non-productive"
        feature_importance  : dict         — {feature_name: importance_value}
        model_backend       : str          — "XGBoost" or "HistGradientBoosting (sklearn)"
    """
    df = pd.DataFrame({
        "Depth": well_log_dict["depths"],
        "GR": well_log_dict["GR"],
        "Resistivity": well_log_dict["Resistivity"],
        "Density": well_log_dict["Density"],
        "NeutronPorosity": well_log_dict["NeutronPorosity"],
        "Sonic": well_log_dict["Sonic"],
    })

    X_scaled, _ = normalize_features(df)
    labels = label_by_heuristics(df)

    # Ensure all three classes are represented so the classifier initialises correctly.
    present_classes = set(np.unique(labels))
    all_classes = {0, 1, 2}
    missing = all_classes - present_classes
    if missing:
        X_aug_list = [X_scaled]
        y_aug_list = [labels]
        for cls in missing:
            ref_row = X_scaled[0:1].copy()
            X_aug_list.append(ref_row)
            y_aug_list.append(np.array([cls]))
        X_scaled = np.vstack(X_aug_list)
        labels = np.concatenate(y_aug_list)

    model = _build_model()
    model.fit(X_scaled, labels)

    # Predict on the original (non-augmented) data
    X_orig, _ = normalize_features(df)
    proba = model.predict_proba(X_orig)  # shape (n, 3)

    # Locate the column corresponding to class 1 ("productive")
    class_list = list(model.classes_)
    productive_col = class_list.index(1) if 1 in class_list else 0
    productivity_score = proba[:, productive_col]

    predicted_labels = model.predict(X_orig)
    zone_label = [LABEL_MAP.get(int(lbl), "non-productive") for lbl in predicted_labels]

    feature_importance = {
        name: float(imp) for name, imp in zip(LOG_COLUMNS, model.feature_importances_)
    }

    return {
        "depths": [float(d) for d in well_log_dict["depths"]],
        "productivity_score": productivity_score.tolist(),
        "zone_label": zone_label,
        "feature_importance": feature_importance,
        "model_backend": "XGBoost",
    }
