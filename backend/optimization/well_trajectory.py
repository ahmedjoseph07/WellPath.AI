import math
import numpy as np
from typing import List, Dict, Any


def minimum_curvature(
    md_array: List[float],
    inc_array: List[float],
    az_array: List[float],
    start_x: float = 0.0,
    start_y: float = 0.0,
    start_z: float = 0.0,
) -> List[Dict[str, Any]]:
    """
    Convert wellbore survey (MD, inclination, azimuth) to Cartesian (x, y, z/TVD)
    using the Minimum Curvature Method — industry standard.

    Parameters
    ----------
    md_array  : list[float]  Measured depth values (m)
    inc_array : list[float]  Inclination angles (degrees)
    az_array  : list[float]  Azimuth angles (degrees)
    start_x, start_y, start_z : float  Starting Cartesian position

    Returns
    -------
    list of dicts with keys: depth, x, y, z, inclination, azimuth
        z represents TVD (positive = deeper)
    """
    if len(md_array) != len(inc_array) or len(md_array) != len(az_array):
        raise ValueError("md_array, inc_array, and az_array must have the same length.")

    n = len(md_array)
    points = []

    x, y, z = start_x, start_y, start_z

    points.append({
        "depth": float(md_array[0]),
        "x": float(x),
        "y": float(y),
        "z": float(z),
        "inclination": float(inc_array[0]),
        "azimuth": float(az_array[0]),
    })

    for i in range(n - 1):
        md1, md2 = float(md_array[i]), float(md_array[i + 1])
        inc1_deg, inc2_deg = float(inc_array[i]), float(inc_array[i + 1])
        az1_deg, az2_deg = float(az_array[i]), float(az_array[i + 1])

        delta_md = md2 - md1

        inc1 = math.radians(inc1_deg)
        inc2 = math.radians(inc2_deg)
        az1 = math.radians(az1_deg)
        az2 = math.radians(az2_deg)

        # Dogleg angle (radians)
        cos_dl = (
            math.cos(inc2 - inc1)
            - math.sin(inc1) * math.sin(inc2) * (1.0 - math.cos(az2 - az1))
        )
        # Clamp to [-1, 1] to guard against floating-point rounding
        cos_dl = max(-1.0, min(1.0, cos_dl))
        dl = math.acos(cos_dl)

        # Ratio factor (RF)
        if abs(dl) < 1e-10:
            rf = 1.0
        else:
            rf = (2.0 / dl) * math.tan(dl / 2.0)

        half_dmd = delta_md / 2.0

        delta_x = half_dmd * (math.sin(inc1) * math.sin(az1) + math.sin(inc2) * math.sin(az2)) * rf
        delta_y = half_dmd * (math.sin(inc1) * math.cos(az1) + math.sin(inc2) * math.cos(az2)) * rf
        delta_z = half_dmd * (math.cos(inc1) + math.cos(inc2)) * rf  # TVD positive downward

        x += delta_x
        y += delta_y
        z += delta_z

        points.append({
            "depth": float(md2),
            "x": float(x),
            "y": float(y),
            "z": float(z),
            "inclination": float(inc2_deg),
            "azimuth": float(az2_deg),
        })

    return points


def compute_dogleg_severity(
    inc_array: List[float],
    az_array: List[float],
    md_array: List[float],
) -> List[float]:
    """
    Compute Dogleg Severity (DLS) in degrees per 30 m for each survey interval.

    Returns a list of length len(md_array)-1, one DLS value per interval.
    """
    dls_values = []
    n = len(md_array)

    for i in range(n - 1):
        md1, md2 = float(md_array[i]), float(md_array[i + 1])
        inc1 = math.radians(float(inc_array[i]))
        inc2 = math.radians(float(inc_array[i + 1]))
        az1 = math.radians(float(az_array[i]))
        az2 = math.radians(float(az_array[i + 1]))

        delta_md = md2 - md1
        if delta_md <= 0.0:
            dls_values.append(0.0)
            continue

        cos_dl = (
            math.cos(inc2 - inc1)
            - math.sin(inc1) * math.sin(inc2) * (1.0 - math.cos(az2 - az1))
        )
        cos_dl = max(-1.0, min(1.0, cos_dl))
        dl_rad = math.acos(cos_dl)
        dl_deg = math.degrees(dl_rad)

        # DLS in deg/30m
        dls = dl_deg / delta_md * 30.0
        dls_values.append(float(dls))

    return dls_values
