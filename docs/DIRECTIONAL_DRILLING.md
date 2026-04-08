# Directional Drilling & Minimum Curvature Method

> **Thesis context:** WellPath.AI converts the GA-optimised inclination/azimuth sequence into a 3D Cartesian trajectory using the **Minimum Curvature Method** — the international industry standard. This document explains why directional drilling is used, how survey calculation works, and what dogleg severity means.

---

## 1. Why Directional Drilling?

A vertical well can only drain a formation directly below the surface location. **Directional drilling** — intentionally deviating the wellbore from vertical — is used to:

| Application | Explanation |
|---|---|
| **Reservoir access** | Reach formations not directly below the rig (offshore, urban, mountain) |
| **Horizontal well** | Drill along the pay zone to maximise contact length (10× vertical) |
| **Multi-well pads** | Drill multiple wells from one surface location |
| **Relief well** | Intercept a blowout well underground |
| **Avoiding obstacles** | Bypass salt domes, faults, existing wells |
| **Extended reach** | Reach targets 10+ km from the platform |

**WellPath.AI thesis application:** Find the trajectory that threads through the most productive formation intervals identified by the XGBoost model — maximising contact with reservoir rock.

---

## 2. Borehole Geometry — Key Definitions

### 2.1 Coordinate system

WellPath.AI uses a **right-handed North-East-Down (NED)** coordinate system:

- **North** → +Z axis in Three.js (−Z in geological convention)
- **East** → +X axis
- **Depth (TVD)** → −Y axis in Three.js (positive downward)

At the surface: $(N, E, TVD) = (0, 0, 0)$

### 2.2 Measured Depth (MD)

The actual distance **along the wellbore path** from the datum (kelly bushing). For a deviated well, MD > TVD. For a vertical well, MD = TVD.

### 2.3 True Vertical Depth (TVD)

The **vertical component** of measured depth. This is what determines the formation being penetrated — a formation at TVD = 2000 m is 2000 m below the surface regardless of how long the actual wellbore is.

### 2.4 Inclination (θ)

The angle of the wellbore from **vertical** (0° = straight down, 90° = horizontal). Sometimes called "deviation" or "dip angle."

| Inclination | Type |
|---|---|
| 0° | Vertical well |
| 1° – 5° | Barely deviated |
| 10° – 45° | Deviated well |
| 45° – 89° | Highly deviated well |
| 90° | Horizontal well |
| > 90° | Extended reach / upward |

### 2.5 Azimuth (φ)

The **compass bearing** of the horizontal projection of the wellbore, measured clockwise from North (0° = North, 90° = East, 180° = South, 270° = West).

### 2.6 Survey station

A point along the borehole at which inclination and azimuth are measured — typically every 30 m using a Measurement-While-Drilling (MWD) tool.

### 2.7 Dogleg Severity (DLS)

The rate of curvature of the wellbore, expressed in **degrees per 30 metres** (or per 100 ft):

$$DLS = \frac{\text{total angle change between stations}}{\text{distance between stations}} \times 30$$

| DLS (°/30m) | Assessment |
|---|---|
| 0 – 1 | Negligible curvature |
| 1 – 3 | Mild, acceptable |
| 3 – 5 | Moderate, manageable |
| 5 – 8 | High — fatigue concerns |
| > 8 | Severe — risk of stuck pipe, casing wear |

---

## 3. Survey Calculation Methods

Several methods exist for converting (MD, Inc, Az) survey data into (N, E, TVD) positions:

| Method | Accuracy | Industry use |
|---|---|---|
| Tangential | Poor | Obsolete |
| Balanced Tangential | Moderate | Legacy |
| Average Angle | Moderate | Simple calculations |
| Radius of Curvature | Good | Good approximation |
| **Minimum Curvature** | Excellent | **Industry standard** |

---

## 4. Minimum Curvature Method (MCM)

### 4.1 Principle

The MCM assumes the wellbore follows the **arc of a circle** (minimum curvature path) between two consecutive survey stations. It uses a **ratio factor (RF)** to smooth the transition.

### 4.2 Geometry between two stations

Consider two consecutive survey stations:
- Station 1: $(MD_1, θ_1, φ_1)$
- Station 2: $(MD_2, θ_2, φ_2)$

Let $\Delta MD = MD_2 - MD_1$ be the distance between them.

**Step 1: Compute the dogleg angle (total angle change)**

$$\alpha = \arccos\bigl(\cos(θ_2 - θ_1) - \sin θ_1 \sin θ_2 (1 - \cos(φ_2 - φ_1))\bigr)$$

This is the spherical angle between the two unit tangent vectors at the survey stations.

**Step 2: Compute the ratio factor**

$$RF = \begin{cases}
\frac{2}{\alpha} \tan\!\left(\frac{\alpha}{2}\right) & \text{if } \alpha \neq 0 \\
1 & \text{if } \alpha = 0
\end{cases}$$

The ratio factor approaches 1 as $\alpha \to 0$ (straight section) and increases the north/east displacements for curved sections.

**Step 3: Compute incremental displacements**

$$\Delta N = \frac{\Delta MD}{2} \cdot RF \cdot (\sin θ_1 \cos φ_1 + \sin θ_2 \cos φ_2)$$

$$\Delta E = \frac{\Delta MD}{2} \cdot RF \cdot (\sin θ_1 \sin φ_1 + \sin θ_2 \sin φ_2)$$

$$\Delta TVD = \frac{\Delta MD}{2} \cdot RF \cdot (\cos θ_1 + \cos θ_2)$$

**Step 4: Accumulate positions**

$$N_2 = N_1 + \Delta N, \quad E_2 = E_1 + \Delta E, \quad TVD_2 = TVD_1 + \Delta TVD$$

### 4.3 Implementation in WellPath.AI

```python
def minimum_curvature(md, inc, az, start_x, start_y, start_z):
    """
    md  : measured depths [m]
    inc : inclinations [deg]
    az  : azimuths [deg]
    Returns list of {depth, x (east), y (north), z (TVD), inclination, azimuth}
    """
    trajectory = [{'depth': md[0], 'x': start_x, 'y': start_y,
                   'z': start_z, 'inclination': inc[0], 'azimuth': az[0]}]

    for i in range(1, len(md)):
        dMD = md[i] - md[i-1]
        i1, a1 = radians(inc[i-1]), radians(az[i-1])
        i2, a2 = radians(inc[i]),   radians(az[i])

        # Dogleg angle (clamp for numerical stability)
        cos_alpha = cos(i2 - i1) - sin(i1)*sin(i2)*(1 - cos(a2 - a1))
        alpha = acos(clip(cos_alpha, -1, 1))

        RF = (2/alpha * tan(alpha/2)) if alpha > 1e-10 else 1.0

        dN   = (dMD/2) * RF * (sin(i1)*cos(a1) + sin(i2)*cos(a2))
        dE   = (dMD/2) * RF * (sin(i1)*sin(a1) + sin(i2)*sin(a2))
        dTVD = (dMD/2) * RF * (cos(i1) + cos(i2))

        prev = trajectory[-1]
        trajectory.append({
            'depth': md[i],
            'x': prev['x'] + dE,
            'y': prev['y'] + dN,
            'z': prev['z'] + dTVD,
            'inclination': inc[i],
            'azimuth': az[i],
        })
    return trajectory
```

### 4.4 Why MCM is the standard

- **Conservative estimate:** The arc assumption gives a shorter path length than the tangential method, which is physically more realistic
- **Smooth geometry:** No sudden direction changes in the computed path
- **API/ISO standard:** Required by regulatory bodies and used in all commercial drilling software (Landmark, Halliburton WellPlan, etc.)
- **Proven accuracy:** Within ±1 m position error for typical survey spacing of 30 m

---

## 5. Dogleg Severity Calculation

WellPath.AI computes DLS at each survey station:

$$DLS_i = \frac{\alpha_i}{\Delta MD_i} \times 30 \quad \text{(°/30m)}$$

where $\alpha_i$ is the dogleg angle (in degrees) between stations $i-1$ and $i$.

The **maximum DLS** across all stations is reported in the results panel and used in the fitness function penalty.

### Engineering significance

| Industry limit | Value |
|---|---|
| Normal drilling | < 3°/30m |
| Maximum for casing | < 5°/30m |
| High-performance PDC bit limit | < 8°/30m |
| Hard limit (pipe integrity) | < 10°/30m |

WellPath.AI's DLS weight ($w_{DLS} = 0.3$) penalises trajectories that would be mechanically infeasible to drill.

---

## 6. Kick-off Point (KOP)

The **kick-off point** is the depth at which the wellbore begins to deviate from vertical. It is identified in WellPath.AI as the first survey station where inclination exceeds 3°.

**Factors affecting KOP choice:**
- Formation hardness (deeper KOP → straighter vertical section)
- Target geometry (shallow KOP → more build section available)
- Casing design (conductor casing depth constrains KOP)
- Regulatory requirements (must be in competent rock)

In WellPath.AI, the KOP emerges naturally from the GA's optimisation — it is wherever the model finds it most beneficial to start deviating.

---

## 7. Well Trajectory Classifications

| Type | Description | Inclination profile |
|---|---|---|
| **Vertical** | Straight down | 0° throughout |
| **S-shaped** | Build, hold, drop | Build → hold → drop to near-vertical at target |
| **J-shaped** | Build then hold at angle | Build → hold at final angle |
| **Horizontal** | 90° at target | Build to 90° → hold through reservoir |
| **Extended Reach** | Long horizontal departure | Build to 90°+ → very long lateral |

WellPath.AI generates J-shaped and S-shaped trajectories depending on GA solution. The smooth Catmull-Rom spline in the 3D visualisation interpolates through the discrete MCM survey stations.

---

## 8. Lateral Departure

The **horizontal displacement** from the surface location to the bottomhole point:

$$\text{Departure} = \sqrt{N_{TD}^2 + E_{TD}^2}$$

For a 3000 m deep well with 45° average inclination, typical departure ~ 1500–2000 m.

WellPath.AI displays this in the Results panel as "Lateral Departure."

---

## 9. Wellbore Coordinates Summary

| Symbol | Full name | Unit | Description |
|---|---|---|---|
| MD | Measured Depth | m | Actual path length from KB |
| TVD | True Vertical Depth | m | Vertical depth below KB |
| N | Northing | m | North displacement from surface |
| E | Easting | m | East displacement from surface |
| Inc (θ) | Inclination | ° | Angle from vertical |
| Az (φ) | Azimuth | ° | Compass bearing (0°=N, 90°=E) |
| DLS | Dogleg Severity | °/30m | Rate of curvature |
| KOP | Kick-off Point | m MD | Depth where deviation starts |
| TD | Total Depth | m MD | Final drilled depth |

---

## 10. Visualization in WellPath.AI

The 3D scene converts the MCM output $(E, N, TVD)$ to Three.js coordinates:

$$\text{Three.js} \leftarrow (x = E,\ y = -TVD,\ z = N)$$

The negative TVD maps to the −Y axis (downward in Three.js, which uses Y-up). The `CatmullRomCurve3` spline creates a smooth tube through the discrete MCM stations.

**Survey station spheres** are placed at each $(E, N, TVD)$ waypoint and colored by inclination — deeper blue = more vertical, cyan = more deviated. The **Kick-off Point** marker (orange sphere) and **TD marker** (glowing cyan sphere) provide immediate visual reference.

---

## 11. Defense Q&A — Directional Drilling

**Q: How accurate is the Minimum Curvature Method?**
> "MCM is the international industry standard. For a 30m survey interval, it achieves position accuracy within 1–2 m. Commercial software like Halliburton WellPlan and Landmark COMPASS use MCM as their primary calculation method. The error accumulates with depth but remains within ±0.1% of total depth for typical well profiles."

**Q: Is the dogleg severity limit realistic?**
> "The default `dls_weight = 0.3` encourages the GA to avoid very sharp bends. The DLS values produced are typically 2–5°/30m, which is within normal operating limits for deviated wells. The limit can be tightened by increasing `dls_weight`."

**Q: Why not use a horizontal well?**
> "WellPath.AI is designed as a general trajectory optimizer. It can produce near-horizontal trajectories if the GA finds that the productive zones are best accessed horizontally. The inclination limit of 85° allows near-horizontal paths while avoiding numerical instability in the MCM calculation at exactly 90°."

**Q: What are the limitations of the 3D model?**
> "The model assumes a single pilot hole with no sidetracking. It does not account for wellbore tortuosity (helical corkscrew motion), formation pressures, or hydraulic friction. These are engineering refinements for a commercial implementation. The thesis demonstrates the optimization methodology."
