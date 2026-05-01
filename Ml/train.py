"""
train.py — VoyageurAI cost prediction model trainer

Run once (or whenever the dataset changes):
    python train.py

Outputs:
    model.pkl     — trained sklearn pipeline (preprocessor + gradient boost)
    model_meta.json — feature schema, performance metrics, training metadata
                      (used by the Flask service to validate inputs and by the
                      admin analytics tab to show model quality stats).

Trained on the curated Pakistan travel dataset (pakistan_travel_dataset.csv).
The model predicts total trip cost in PKR from:
    - Distance, Duration, Traveler age, Group size  (numeric)
    - Region, Gender, Nationality, Trip type,
      Accommodation tier, Transport type, Season    (categorical, one-hot)

Cost component columns (Accommodation cost, Transportation cost, Food cost,
Activities cost) are intentionally EXCLUDED from features — they are derivatives
of the target and including them would cause data leakage.
"""

import json
from pathlib import Path
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# ─── Configuration ──────────────────────────────────────────────────────────
HERE = Path(__file__).parent
DATA_PATH = HERE / "data" / "pakistan_travel_dataset.csv"
MODEL_PATH = HERE / "model.pkl"
META_PATH = HERE / "model_meta.json"

NUMERIC_FEATURES = ["Distance (km)", "Duration (days)", "Traveler age", "Group size"]
CATEGORICAL_FEATURES = [
    "Region",
    "Traveler gender",
    "Traveler nationality",
    "Trip type",
    "Accommodation type",
    "Transportation type",
    "Season",
]
TARGET = "Total cost"


def load_and_clean(path: Path) -> pd.DataFrame:
    """Load CSV. Fix the 3 known zero-distance rows by replacing with the
    median distance — these are data-entry artifacts, not real trips."""
    df = pd.read_csv(path)
    print(f"  Loaded {len(df):,} rows, {len(df.columns)} columns")

    # Sanity check: required columns present
    required = NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Fix zero-distance rows
    zero_dist = (df["Distance (km)"] == 0).sum()
    if zero_dist > 0:
        median_dist = int(df[df["Distance (km)"] > 0]["Distance (km)"].median())
        df.loc[df["Distance (km)"] == 0, "Distance (km)"] = median_dist
        print(f"  Fixed {zero_dist} zero-distance rows -> median {median_dist} km")

    # Drop rows with any missing values in required columns (defensive)
    before = len(df)
    df = df.dropna(subset=required)
    if len(df) < before:
        print(f"  Dropped {before - len(df)} rows with missing values")

    return df


def build_pipeline(model) -> Pipeline:
    """Compose preprocessor + model into a single sklearn Pipeline so we can
    save/load as one .pkl file. handle_unknown='ignore' means the deployed
    model survives if we encounter a new category at inference (e.g. a new
    region label) — it'll be encoded as all-zeros instead of crashing."""
    preprocessor = ColumnTransformer(
        [
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def evaluate(pipe: Pipeline, X_test, y_test, name: str) -> dict:
    """Compute MAE, RMSE, R² on test set."""
    pred = pipe.predict(X_test)
    metrics = {
        "mae": float(mean_absolute_error(y_test, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, pred))),
        "r2": float(r2_score(y_test, pred)),
    }
    print(
        f"  {name:25s}  MAE=PKR {metrics['mae']:>10,.0f}  "
        f"RMSE=PKR {metrics['rmse']:>10,.0f}  R²={metrics['r2']:.4f}"
    )
    return metrics


def main():
    print("=" * 70)
    print("VoyageurAI cost prediction model — training pipeline")
    print("=" * 70)

    # 1. Load
    print("\n[1/4] Loading dataset...")
    df = load_and_clean(DATA_PATH)

    # 2. Split
    print("\n[2/4] Splitting train/test (80/20)...")
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"  Train: {len(X_train):,} rows, Test: {len(X_test):,} rows")

    # 3. Train candidates and pick best
    print("\n[3/4] Training candidate models...")
    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(
            n_estimators=200, max_depth=None, random_state=42, n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=300, max_depth=4, learning_rate=0.05, random_state=42
        ),
    }

    results = {}
    for name, model in candidates.items():
        pipe = build_pipeline(model)
        pipe.fit(X_train, y_train)
        metrics = evaluate(pipe, X_test, y_test, name)
        results[name] = {"pipe": pipe, "metrics": metrics}

    # Pick winner by highest R² on held-out test
    best_name = max(results, key=lambda k: results[k]["metrics"]["r2"])
    best_pipe = results[best_name]["pipe"]
    best_metrics = results[best_name]["metrics"]
    print(f"\n  >>> Winner: {best_name}  (R² = {best_metrics['r2']:.4f})")

    # 4. Persist
    print("\n[4/4] Saving model + metadata...")
    joblib.dump(best_pipe, MODEL_PATH)
    print(f"  Model -> {MODEL_PATH}")

    # Pull the actual category lists the model has seen, so the API can validate
    # incoming requests and the admin panel can render dropdowns correctly.
    cat_encoder = best_pipe.named_steps["preprocessor"].named_transformers_["cat"]
    category_values = {
        col: list(map(str, cats)) for col, cats in zip(CATEGORICAL_FEATURES, cat_encoder.categories_)
    }

    meta = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "winning_model": best_name,
        "metrics": best_metrics,
        "all_metrics": {n: r["metrics"] for n, r in results.items()},
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "category_values": category_values,
        "target": TARGET,
        "currency": "PKR",
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"  Metadata -> {META_PATH}")

    print("\n" + "=" * 70)
    print(f"Done. R² = {best_metrics['r2']:.4f}, MAE = PKR {best_metrics['mae']:,.0f}")
    print("=" * 70)


if __name__ == "__main__":
    main()