import io
import pandas as pd
from typing import Union


# Mapping from canonical name to accepted aliases (all lowercase for matching)
COLUMN_ALIASES = {
    "Depth": ["depth", "md", "measured_depth", "tvd", "dept"],
    "GR": ["gr", "gamma_ray", "gamma ray", "gr_api"],
    "Resistivity": ["rt", "resistivity", "res", "ild", "deep_resistivity"],
    "Density": ["rhob", "density", "bulk_density", "den"],
    "NeutronPorosity": ["nphi", "neutron", "neutron_porosity", "cnl", "porosity"],
    "Sonic": ["dt", "sonic", "dtco", "travel_time", "dtc"],
}

REQUIRED_CANONICAL = ["Depth", "GR", "Resistivity", "Density", "NeutronPorosity", "Sonic"]


def _build_alias_map(columns):
    """
    Given the actual column names from the uploaded CSV, return a mapping
    {actual_column_name: canonical_name} for all recognised columns.
    """
    alias_map = {}
    for actual_col in columns:
        lower_col = actual_col.strip().lower()
        for canonical, aliases in COLUMN_ALIASES.items():
            if lower_col in aliases:
                alias_map[actual_col] = canonical
                break  # first match wins
    return alias_map


def parse_well_log_csv(source: Union[str, io.StringIO]) -> pd.DataFrame:
    """
    Parse a CSV well log file and return a clean DataFrame with canonical column names.

    Parameters
    ----------
    source : str path or StringIO object containing CSV data.

    Returns
    -------
    pd.DataFrame with columns: Depth, GR, Resistivity, Density, NeutronPorosity, Sonic
        — all as float64, sorted by Depth ascending, with NaN rows dropped.

    Raises
    ------
    ValueError if any required column cannot be matched.
    """
    try:
        df = pd.read_csv(source)
    except Exception as exc:
        raise ValueError(f"Failed to read CSV: {exc}") from exc

    if df.empty:
        raise ValueError("The uploaded CSV file is empty.")

    # Strip whitespace from column headers
    df.columns = [c.strip() for c in df.columns]

    alias_map = _build_alias_map(df.columns)

    # Check all required columns are present
    canonical_found = set(alias_map.values())
    missing = [col for col in REQUIRED_CANONICAL if col not in canonical_found]
    if missing:
        friendly_aliases = {
            col: COLUMN_ALIASES[col] for col in missing
        }
        msg_parts = [
            f"  '{col}' (accepted aliases: {aliases})"
            for col, aliases in friendly_aliases.items()
        ]
        raise ValueError(
            "The following required columns were not found in the CSV:\n"
            + "\n".join(msg_parts)
            + f"\n\nDetected columns: {list(df.columns)}"
        )

    # Rename to canonical names and select only recognised columns
    df = df.rename(columns=alias_map)
    df = df[REQUIRED_CANONICAL].copy()

    # Convert to float, coercing errors to NaN
    for col in REQUIRED_CANONICAL:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows where any value is NaN
    before = len(df)
    df = df.dropna()
    after = len(df)
    if after == 0:
        raise ValueError(
            "No valid numeric rows remain after parsing. "
            f"({before - after} rows had non-numeric values and were dropped.)"
        )

    df = df.sort_values("Depth").reset_index(drop=True)

    return df
