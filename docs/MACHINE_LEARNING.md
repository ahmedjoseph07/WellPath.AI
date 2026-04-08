# Machine Learning — XGBoost Zone Prediction

> **Thesis context:** WellPath.AI uses XGBoost to classify each depth interval as `productive`, `marginal`, or `non-productive`. This document covers gradient boosting theory, the XGBoost algorithm, the heuristic labelling strategy, and how the model fits into the overall pipeline.

---

## 1. Why Machine Learning for Log Interpretation?

Traditional petrophysical interpretation applies deterministic cutoffs (e.g., GR < 60 API → reservoir). This works for simple lithologies but fails when:

- Multiple logs give conflicting signals (e.g., high resistivity + high GR)
- Relationships between logs are non-linear
- The dataset is large and analyst time is limited
- Subtle patterns (cross-log interactions) carry predictive power

**Machine learning** can learn the multi-dimensional relationships between all five log curves simultaneously and assign a probability to each class — which is both more informative and more scalable than manual interpretation.

---

## 2. From Decision Trees to Gradient Boosting

### 2.1 Decision Tree (base concept)

A decision tree partitions the feature space into rectangular regions by applying threshold splits at each node:

```
         GR < 60?
        /        \
      YES         NO
    Rt > 15?    → Non-productive
   /        \
 YES         NO
Productive  Marginal
```

**Problem:** A single tree overfits to training data and is sensitive to small data changes.

### 2.2 Ensemble Methods

Instead of one tree, combine many:

| Method | How it combines trees |
|---|---|
| **Bagging (Random Forest)** | Parallel: train trees on random subsets, average predictions |
| **Boosting** | Sequential: each tree corrects the errors of the previous one |

**Boosting** is more powerful because it focuses learning on hard examples.

### 2.3 Gradient Boosting Machines (GBM)

Gradient boosting frames tree learning as **gradient descent in function space**.

**Objective:** Minimise a loss function $\mathcal{L}$ over all $N$ training samples:

$$\mathcal{L} = \sum_{i=1}^N l(y_i, \hat{y}_i)$$

For multi-class classification, $l$ is the **softmax cross-entropy loss**:

$$l(y_i, \hat{y}_i) = -\sum_{k=1}^K y_{ik} \log(\hat{p}_{ik})$$

where $K = 3$ (productive, marginal, non-productive).

**Additive model:** The prediction after $M$ trees is:

$$\hat{y}_i^{(M)} = \hat{y}_i^{(M-1)} + \eta \cdot f_M(\mathbf{x}_i)$$

where $\eta$ is the learning rate and $f_M$ is the $M$-th tree, trained to predict the **negative gradient** (pseudo-residuals) of the loss with respect to the current prediction.

---

## 3. XGBoost — eXtreme Gradient Boosting

XGBoost (Chen & Guestrin, 2016) extends GBM with:

1. **Regularised objective** — prevents overfitting via L1 (α) and L2 (λ) penalties on leaf weights
2. **Second-order Taylor expansion** — uses both gradient (first derivative) and Hessian (second derivative) for more precise tree building
3. **Column subsampling** — random feature subset at each split (like Random Forest's `max_features`)
4. **Histogram-based split finding** — bins continuous features into discrete buckets for fast computation (`tree_method='hist'`)
5. **Sparsity-aware splits** — handles missing values natively
6. **Parallel processing** — tree construction parallelised over features

### 3.1 XGBoost objective function

$$\mathcal{L}^{(t)} = \sum_{i=1}^N \left[ g_i f_t(\mathbf{x}_i) + \frac{1}{2} h_i f_t^2(\mathbf{x}_i) \right] + \Omega(f_t)$$

where:
- $g_i = \partial_{\hat{y}^{(t-1)}} l(y_i, \hat{y}^{(t-1)})$ — first-order gradient
- $h_i = \partial^2_{\hat{y}^{(t-1)}} l(y_i, \hat{y}^{(t-1)})$ — second-order Hessian
- $\Omega(f_t) = \gamma T + \frac{1}{2}\lambda \|w\|^2 + \alpha \|w\|_1$ — regularisation ($T$ = number of leaves, $w$ = leaf weights)

### 3.2 Optimal leaf weight

For a leaf $j$ containing sample set $I_j$, the optimal weight is:

$$w_j^* = -\frac{\sum_{i \in I_j} g_i}{\sum_{i \in I_j} h_i + \lambda}$$

### 3.3 Split gain criterion

A split at feature $k$ with threshold $s$ is accepted if its gain exceeds $\gamma$:

$$\text{Gain} = \frac{1}{2} \left[ \frac{G_L^2}{H_L + \lambda} + \frac{G_R^2}{H_R + \lambda} - \frac{(G_L+G_R)^2}{H_L+H_R+\lambda} \right] - \gamma$$

where $G = \sum g_i$, $H = \sum h_i$ for left (L) and right (R) child nodes.

---

## 4. WellPath.AI Model Configuration

```python
XGBClassifier(
    n_estimators    = 150,    # number of trees in ensemble
    max_depth       = 5,      # max tree depth (controls model complexity)
    learning_rate   = 0.08,   # η — shrinkage factor per tree
    subsample       = 0.8,    # row sampling per tree (reduces overfitting)
    colsample_bytree= 0.8,    # column sampling per tree
    min_child_weight= 3,      # min sum of Hessian in a leaf (regularisation)
    gamma           = 0.1,    # min gain required to make a split
    reg_alpha       = 0.1,    # L1 regularisation on leaf weights
    reg_lambda      = 1.0,    # L2 regularisation on leaf weights
    tree_method     = 'hist', # histogram-based: fast, macOS compatible
    device          = 'cpu',
    nthread         = 1,      # single-threaded: avoids libomp on macOS
    eval_metric     = 'mlogloss',
    random_state    = 42,
)
```

### Parameter rationale

| Parameter | Value | Why |
|---|---|---|
| `n_estimators=150` | 150 trees | More trees than default (100) for a small dataset that needs more signal |
| `max_depth=5` | 5 levels | Allows learning 2nd and 3rd-order feature interactions |
| `learning_rate=0.08` | Slow | Slower learning = better generalisation with 150 trees |
| `subsample=0.8` | 80% rows | Stochastic gradient boosting — reduces overfitting and variance |
| `colsample_bytree=0.8` | 80% cols | Forces the model to use different subsets of logs each tree |
| `gamma=0.1` | Small penalty | Prunes trees that don't improve prediction by at least 0.1 |

---

## 5. The Labelling Problem — No Ground Truth

**The challenge:** Supervised learning requires labelled training data (e.g., "this interval is productive"). In real-world petroleum exploration, ground truth comes from **production tests** — which are expensive and only available after wells are drilled. In a thesis context, we have no labels.

**Solution: Heuristic labelling (expert rules as pseudo-labels)**

We apply the same rules that a petrophysicist would use manually, converting them into a programmatic labelling function:

```python
def label_by_heuristics(df):
    # Rule 1: non-productive (default)
    labels = np.zeros(len(df))

    # Rule 2: marginal if moderate resistivity and low-ish GR
    marginal = (Rt > 8) & (GR < 80)
    labels[marginal] = 2

    # Rule 3: productive if clean, resistive, and porous
    productive = (Rt > 15) & (GR < 60) & (NPHI > 0.12)
    labels[productive] = 1

    return labels
```

**Why this approach is valid for a thesis:**
1. The rules encode **established petrophysical knowledge**, not arbitrary thresholds
2. XGBoost learns the **non-linear interactions** between features that simple rules miss
3. The model can generalise to intervals where the rules are borderline — the model's probability output is more nuanced than the binary rule
4. This is analogous to **knowledge distillation** — compressing expert knowledge into a learnable model

**Limitation acknowledged in thesis:**
> The pseudo-label quality constrains model accuracy. Production test validation would be required before any commercial deployment. The thesis demonstrates the methodology, not a validated production predictor.

---

## 6. Feature Engineering — StandardScaler

Before feeding to XGBoost, all features are normalised with `StandardScaler`:

$$x'_i = \frac{x_i - \mu}{\sigma}$$

where $\mu$ and $\sigma$ are the mean and standard deviation of each feature column.

**Why normalise for XGBoost?**

Technically, tree-based models are scale-invariant (splits are based on rank order, not magnitude). However, normalisation is applied here because:

1. The downstream GA uses interpolated feature values — consistent scale helps
2. It matches industry practice for multi-log petrophysical analysis
3. Makes feature importances more directly comparable

---

## 7. Multi-Class Classification Setup

The three classes are encoded as integers:

| Class | Label | Meaning |
|---|---|---|
| `0` | Non-productive | GR-dominated shale or tight rock |
| `1` | Productive | Clean, resistive, porous — target reservoir |
| `2` | Marginal | Borderline — might produce under favourable conditions |

**XGBoost multi-class:** Uses `softmax` objective (one-vs-all probability for each class). The **productivity score** shown in WellPath.AI is $P(\text{class} = 1)$ — the probability of being in the productive class.

### Class imbalance handling

In typical well log data, productive intervals are rare (high N/G is the exception). WellPath.AI addresses this by:

1. **Augmenting missing classes:** If any of the three classes has zero samples (possible in short intervals), synthetic representative rows are appended to ensure the classifier can be initialised for all three classes.
2. The augmentation uses the first data row as a prototype — it affects only the classifier's initialization, not its generalization on real data.

---

## 8. Feature Importance

XGBoost computes feature importance as the **mean decrease in impurity** weighted by the number of samples each feature splits. More precisely, `feature_importances_` uses the "gain" metric by default — the average gain of splits that use each feature.

Typical importance ranking in WellPath.AI (varies with dataset):

1. **Resistivity** — strongest hydrocarbon indicator
2. **GR** — lithology discriminator
3. **NeutronPorosity** — confirms porosity
4. **Density** — crossplot complement to neutron
5. **Sonic** — weakest separator in clastic settings

The feature importance bar chart in the UI allows visual verification that the model learned geologically reasonable patterns.

---

## 9. Training and Prediction Pipeline

```
Input: well_log_dict {depths, GR, Resistivity, Density, NeutronPorosity, Sonic}
       ↓
1. Build DataFrame
       ↓
2. StandardScaler (fit + transform) → X_scaled
       ↓
3. Heuristic labelling → y_labels (0/1/2)
       ↓
4. Class augmentation (if any class absent) → X_aug, y_aug
       ↓
5. XGBClassifier.fit(X_aug, y_aug)   ← trains from scratch per request
       ↓
6. XGBClassifier.predict_proba(X_original) → probability matrix (N × 3)
       ↓
7. Extract P(productive) column → productivity_score [N]
       ↓
8. XGBClassifier.predict(X_original) → zone_label [N]
       ↓
9. feature_importances_ → dict {feature: importance}
       ↓
Output: {depths, productivity_score, zone_label, feature_importance, model_backend}
```

**Note on in-request training:** The model is retrained on every prediction request. This is intentional — the model is calibrated to the uploaded well's log characteristics. There is no pre-trained model to store because every well has different baseline log values. This is sometimes called **transductive learning**.

---

## 10. Model Validation Considerations

For a thesis defense, be prepared to discuss these points:

### What we can show:
- **Internal consistency:** High-GR intervals get `non-productive`, low-GR + high-Rt get `productive` — the model learns the rules
- **Feature importance alignment:** Resistivity and GR dominate importance, as expected petrophysically
- **Smooth probability curves:** The probability score varies continuously with log character, not just binary jumps

### What we cannot show (and why):
- **Production test validation:** No real production data available
- **Cross-well generalisation:** Only one dataset used — model is recalibrated per well anyway
- **Uncertainty quantification:** XGBoost point estimates; Bayesian approaches would be better for full uncertainty

### Defense answer template:
> "The model uses heuristic rules derived from published petrophysical cutoffs as pseudo-labels. This is a methodology demonstration — the value lies in the integrated workflow: automated log classification feeding a trajectory optimizer. In a commercial deployment, actual production test data or core analysis would replace the heuristic labels, which would only improve model accuracy."

---

## 11. XGBoost vs Alternatives

| Method | Pros | Cons | Why not used |
|---|---|---|---|
| **Logistic Regression** | Simple, interpretable | Cannot capture non-linear interactions | Too simple for log crossplot relationships |
| **Random Forest** | Good generalisation | No boosting, needs more trees | XGBoost achieves similar accuracy with fewer trees |
| **SVM** | Strong for small data | Kernel choice is critical, slow training | Less interpretable, slower |
| **Neural Network (MLP)** | Learns complex patterns | Needs much more data, black box | Overkill for 200 data points; harder to explain |
| **XGBoost** ✓ | Fast, regularised, feature importance, works on small data | Requires label engineering | Best fit for structured tabular log data |

XGBoost has consistently been the **top-performing algorithm on structured tabular data** in Kaggle competitions and applied ML benchmarks (Shwartz-Ziv & Armon, 2022).
