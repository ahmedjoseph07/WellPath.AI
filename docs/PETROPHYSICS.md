# Petrophysics — Well Log Interpretation

> **Thesis context:** WellPath.AI ingests six well log curves (GR, Resistivity, Density, NeutronPorosity, Sonic) as features for the XGBoost zone-classification model. This document explains what each log measures, why it matters, and how the values map to formation productivity.

---

## 1. What Is Well Logging?

Well logging is the practice of **recording physical measurements along the depth of a borehole** to characterise the subsurface formations. A sensor (logging tool) is lowered on a wireline or Logging-While-Drilling (LWD) string; as it travels up (or down) the hole it continuously records a response that reflects the rock and fluid properties at each depth.

The output is a **well log** — a strip-chart of measurement vs depth. A complete suite of logs allows a petrophysicist to answer four key questions:

| Question | Answer from logs |
|---|---|
| What is the lithology? | GR, Resistivity, Density |
| What is the porosity? | Density, Neutron Porosity, Sonic |
| What fluid fills the pore space? | Resistivity, Neutron-Density crossplot |
| Is the interval economically producible? | Integration of all above |

---

## 2. Gamma Ray (GR)

### Physical principle
Naturally occurring radioactive materials (NORM) — primarily potassium (⁴⁰K), uranium (²³⁸U), and thorium (²³²Th) — emit gamma radiation. Shales are clay-rich, and clays concentrate potassium; carbonates and clean sandstones are relatively clay-free. The GR tool detects gamma-ray counts per second and converts them to **API units**.

### Reading the log

| GR (API) | Interpretation |
|---|---|
| < 30 | Clean sandstone or carbonate (reservoir candidate) |
| 30 – 60 | Slightly shaly sandstone |
| 60 – 80 | Shaly sand or siltstone |
| > 80 | Shale (seal / non-reservoir) |
| > 120 | Pure shale or organic-rich shale |

### Shale volume (Vsh) calculation

$$V_{sh} = \frac{GR_{log} - GR_{clean}}{GR_{shale} - GR_{clean}}$$

where $GR_{clean}$ is the minimum GR (clean sand baseline) and $GR_{shale}$ is the maximum GR (pure shale baseline).

### Role in WellPath.AI
Low GR indicates clean reservoir rock. In the heuristic labelling scheme, **GR < 60 API** is a necessary (but not sufficient) condition for the `productive` label.

---

## 3. Resistivity (RT — Deep Resistivity)

### Physical principle
The deep resistivity tool (Induction Log or Laterolog) passes an alternating current into the formation and measures its **resistance to current flow** in ohm-metres (Ω·m). Rock matrix is almost always resistive; the fluid in pores determines the bulk measurement:

- **Formation water (brine):** conductive → low resistivity (1–10 Ω·m)
- **Hydrocarbons (oil/gas):** resistive → high resistivity (> 20 Ω·m)
- **Tight rock (no porosity):** highly resistive (> 500 Ω·m)

### Reading the log

| Resistivity (Ω·m) | Interpretation |
|---|---|
| 1 – 5 | Brine-saturated, water zone |
| 5 – 15 | Transition / partially hydrocarbon saturated |
| 15 – 100 | Likely hydrocarbon bearing |
| > 100 | High saturation hydrocarbons or tight rock |

### Water saturation (Archie's equation)
The fundamental relationship between resistivity and water saturation:

$$S_w = \left(\frac{a \cdot R_w}{\phi^m \cdot R_t}\right)^{1/n}$$

where:
- $S_w$ = water saturation (fraction)
- $R_w$ = formation water resistivity
- $R_t$ = true formation resistivity
- $\phi$ = porosity
- $a, m, n$ = Archie cementation exponents (typically $a=1$, $m=2$, $n=2$)

Hydrocarbon saturation: $S_{hc} = 1 - S_w$

### Role in WellPath.AI
Resistivity is the **strongest indicator of hydrocarbon presence**. The heuristic rule requires **Rt > 15 Ω·m** for `productive` and **Rt > 8 Ω·m** for `marginal`. It is consistently the highest-importance feature in the XGBoost model.

---

## 4. Bulk Density (RHOB)

### Physical principle
A gamma-ray source emits photons into the formation; a detector measures the backscattered count rate. Compton scattering is proportional to electron density, which closely tracks bulk density. Output is in **g/cm³** (or g/cc).

### Reading the log

| RHOB (g/cc) | Interpretation |
|---|---|
| 1.8 – 2.0 | Very porous formation or gas-bearing |
| 2.1 – 2.35 | Porous sandstone (good reservoir) |
| 2.35 – 2.55 | Moderately porous or shaly |
| 2.55 – 2.71 | Tight sandstone or limestone |
| 2.71 | Dense limestone (matrix density) |
| > 2.75 | Anhydrite or very tight rock |

### Density porosity

$$\phi_D = \frac{\rho_{ma} - \rho_b}{\rho_{ma} - \rho_f}$$

where $\rho_{ma}$ = matrix density (sandstone: 2.65, limestone: 2.71, dolomite: 2.87 g/cc) and $\rho_f$ = fluid density (water: 1.0, oil: 0.85, gas: ~0.1 g/cc).

### Role in WellPath.AI
Density is used as a porosity proxy and gas indicator (gas causes density to drop). Low density with low GR and high resistivity is the classic signature of a gas reservoir.

---

## 5. Neutron Porosity (NPHI)

### Physical principle
A neutron source bombards the formation with fast neutrons. Hydrogen atoms (abundant in pore fluids) slow them down. A detector measures the epithermal or thermal neutron count — more hydrogen (more fluid) = lower count = higher apparent porosity. Output is in **porosity units (pu)** or fraction.

### Reading the log

| NPHI (fraction) | Interpretation |
|---|---|
| < 0.05 | Very tight or gas-bearing |
| 0.05 – 0.15 | Low to moderate porosity |
| 0.15 – 0.25 | Good reservoir porosity |
| 0.25 – 0.40 | High porosity or shaly |
| > 0.40 | Shale or unconsolidated |

### Gas crossover effect
Gas has very low hydrogen index. In a gas reservoir, density porosity is **too high** (gas is lighter than expected fluid) and neutron porosity is **too low** (few hydrogen atoms). On a crossplot they diverge — this "crossover" is a direct gas indicator.

### Role in WellPath.AI
The heuristic rule requires **NPHI > 0.12** for `productive`, confirming meaningful porosity. Combined with low GR and high resistivity, NPHI confirms both reservoir quality and saturation.

---

## 6. Sonic (DT — Compressional Slowness)

### Physical principle
The sonic tool measures the time a compressional P-wave takes to travel one foot of formation — **interval transit time (ΔT)**, in **μs/ft**. Slower wave travel (higher ΔT) indicates higher porosity or softer rock.

### Reading the log

| DT (μs/ft) | Interpretation |
|---|---|
| 43 – 50 | Dolomite / very tight carbonate |
| 50 – 60 | Limestone / tight sandstone |
| 60 – 70 | Moderately porous sandstone |
| 70 – 90 | Porous sandstone / some shale |
| 90 – 120 | Shale or unconsolidated sand |

### Sonic porosity (Wyllie time-average equation)

$$\phi_S = \frac{\Delta t_{log} - \Delta t_{ma}}{\Delta t_f - \Delta t_{ma}}$$

where $\Delta t_{ma}$ = matrix slowness (sandstone: 55.5 μs/ft) and $\Delta t_f$ = fluid slowness (~189 μs/ft).

### Role in WellPath.AI
Sonic complements density for porosity estimates and helps distinguish lithologies. It also serves as an independent signal for the XGBoost classifier, particularly in carbonate vs clastic discrimination.

---

## 7. Multi-Log Integration — Zone Classification

A single log is never sufficient for reservoir characterisation. The real diagnostic power comes from reading all logs simultaneously:

| Formation type | GR | Rt | RHOB | NPHI | DT |
|---|---|---|---|---|---|
| Clean sandstone (productive) | Low | High | 2.2–2.35 | 0.15–0.25 | 60–70 |
| Gas sandstone | Low | Very high | < 2.2 | < 0.1 (crossover) | High |
| Shale (non-productive) | High | Low | 2.4–2.6 | > 0.30 | > 80 |
| Tight carbonate | Low | Very high | 2.65–2.71 | Low | 50–55 |
| Water sand | Low | Low | 2.2–2.35 | 0.15–0.25 | 60–70 |

### WellPath.AI heuristic labelling rules

```
productive       : Rt > 15  AND  GR < 60   AND  NPHI > 0.12
marginal         : Rt > 8   AND  GR < 80   (but not productive)
non-productive   : everything else
```

These thresholds are based on published petrophysical cutoffs for clastic reservoirs in the GOM / Middle East analogue. They serve as **pseudo-labels** for the supervised XGBoost training step.

---

## 8. Depth and Sampling

Well logs are recorded at a regular depth interval, typically **0.1–0.5 ft (0.03–0.15 m)**. WellPath.AI uses a synthetic dataset with **5 m sampling** over a 1000 m interval (200 data points). Real datasets commonly have 0.1 m or 0.5 m sampling and cover 1000–5000 m of section.

### Depth reference systems

| Term | Definition |
|---|---|
| **KB** | Kelly Bushing — zero-depth datum on the rig floor |
| **MD** | Measured Depth — actual distance along wellbore from KB |
| **TVD** | True Vertical Depth — vertical component of MD |
| **TVDSS** | TVD Sub-Sea — TVD minus the KB elevation above sea level |

WellPath.AI uses TVD as the vertical axis in the 3D visualization. For a vertical well, MD = TVD.

---

## 9. Uncertainty in Log-Based Reservoir Characterization

| Source of uncertainty | Impact |
|---|---|
| Invasion of drilling mud | Resistivity reads flushed zone, not virgin formation |
| Borehole rugosity | Density and caliper affected by washouts |
| Shale laminations | Thin beds below log resolution appear averaged |
| Fluid type ambiguity | Oil and brine can appear similar on resistivity |
| No core calibration | WellPath.AI uses heuristic rules, not calibrated data |

This is why WellPath.AI's predictions are described as **probabilistic productivity scores** rather than definitive reserve estimates. The XGBoost model outputs a probability in [0, 1] for the `productive` class — not a binary decision.

---

## 10. Key Petrophysics Vocabulary for Defense

| Term | Definition |
|---|---|
| **Pay zone** | Interval that meets economic cutoffs for production |
| **Net pay** | Total thickness of productive intervals |
| **Gross pay** | Total thickness of reservoir (including non-pay) |
| **N/G ratio** | Net-to-gross — fraction of gross reservoir that is pay |
| **Porosity (φ)** | Fraction of rock volume that is void space |
| **Permeability (k)** | Ability of fluid to flow through rock (md or Darcy) |
| **Saturation (Sw)** | Fraction of pore space occupied by water |
| **Archie's law** | Empirical equation relating resistivity to water saturation |
| **Cutoff** | Threshold value below which a zone is not counted as pay |
| **Petrophysicist** | Engineer who interprets well logs for reservoir description |
