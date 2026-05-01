"""
service.py — VoyageurAI ML prediction microservice

A small Flask app that loads the trained model and serves predictions over HTTP.
Runs on port 5001 alongside the Node backend (port 5000) and React frontend
(port 5173). The Node backend calls this via http://localhost:5001 to validate
Gemini's cost estimates and to surface "travelers like you spent PKR X" stats.

To start:
    python service.py

To test:
    curl -X POST http://localhost:5001/predict \
         -H "Content-Type: application/json" \
         -d '{"distance_km": 605, "duration_days": 7, "traveler_age": 30, "group_size": 4, "region": "Gilgit-Baltistan", "traveler_gender": "Male", "traveler_nationality": "Pakistani", "trip_type": "Family", "accommodation_type": "Mid", "transportation_type": "Road (Hiace)", "season": "Summer"}'

Endpoints:
    GET  /health           — liveness check
    GET  /meta             — model metadata (R², MAE, training date, categories)
    POST /predict          — single-trip cost prediction
    POST /predict/batch    — multiple predictions in one call
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request

HERE = Path(__file__).parent
MODEL_PATH = HERE / "model.pkl"
META_PATH = HERE / "model_meta.json"

# ─── Load model + metadata at startup ───────────────────────────────────────
# Loading happens once at boot. Each /predict call reuses the in-memory model
# — sklearn pipelines are thread-safe for inference, so Flask's default
# threaded worker pool handles concurrent requests fine.
if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model not found at {MODEL_PATH}. Run `python train.py` first."
    )
if not META_PATH.exists():
    raise FileNotFoundError(
        f"Metadata not found at {META_PATH}. Run `python train.py` first."
    )

model = joblib.load(MODEL_PATH)
meta = json.loads(META_PATH.read_text())

print(f"[service] Loaded model trained {meta['trained_at']}")
print(f"[service] Algorithm: {meta['winning_model']}")
print(f"[service] R²={meta['metrics']['r2']:.4f}, MAE=PKR {meta['metrics']['mae']:,.0f}")

app = Flask(__name__)


# Map JSON-friendly snake_case keys (what the Node backend sends) to the
# CSV-style column names the trained model expects. This decoupling means we
# can change column names in the CSV without breaking the API contract.
KEY_MAP = {
    "distance_km": "Distance (km)",
    "duration_days": "Duration (days)",
    "traveler_age": "Traveler age",
    "group_size": "Group size",
    "region": "Region",
    "traveler_gender": "Traveler gender",
    "traveler_nationality": "Traveler nationality",
    "trip_type": "Trip type",
    "accommodation_type": "Accommodation type",
    "transportation_type": "Transportation type",
    "season": "Season",
}

REQUIRED_KEYS = list(KEY_MAP.keys())


def _to_dataframe(payload: dict) -> pd.DataFrame:
    """Convert one API payload (snake_case JSON) to a single-row DataFrame
    with the column names the model was trained on."""
    missing = [k for k in REQUIRED_KEYS if k not in payload]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")
    row = {KEY_MAP[k]: payload[k] for k in REQUIRED_KEYS}
    return pd.DataFrame([row])


def _predict_with_range(df: pd.DataFrame) -> dict:
    """Run prediction and also compute a sensible range around the point
    estimate using the model's RMSE on test data (~PKR 44k). The range
    represents one standard deviation of expected error — useful to display
    as "PKR 80k–120k" rather than a single number."""
    point_estimate = float(model.predict(df)[0])
    rmse = float(meta["metrics"]["rmse"])
    return {
        "predicted_cost_pkr": round(point_estimate),
        "low_pkr": max(0, round(point_estimate - rmse)),
        "high_pkr": round(point_estimate + rmse),
        "rmse_pkr": round(rmse),
        "currency": "PKR",
    }


# ─── Routes ─────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    """Cheap liveness check so the Node backend can detect if the ML service
    is running before issuing real prediction calls."""
    return jsonify(
        {
            "status": "ok",
            "service": "voyageur-ml",
            "model_loaded": True,
            "trained_at": meta["trained_at"],
        }
    )


@app.get("/meta")
def metadata():
    """Returns model performance metrics + the list of valid categories
    for each categorical feature. The admin analytics tab consumes this to
    render the "Model quality" panel and the trip creator can use the
    category lists to populate dropdowns consistently."""
    return jsonify(meta)


@app.post("/predict")
def predict():
    """Predict total trip cost in PKR for a single trip.

    Expected JSON body — see KEY_MAP above for full list of required keys.

    Returns:
        { predicted_cost_pkr, low_pkr, high_pkr, rmse_pkr, currency }
    """
    try:
        payload = request.get_json(silent=True) or {}
        df = _to_dataframe(payload)
        result = _predict_with_range(df)
        return jsonify({"success": True, "prediction": result})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        # Don't leak stack traces in HTTP responses — log instead.
        app.logger.exception("Prediction failed")
        return jsonify({"success": False, "error": "Internal prediction error"}), 500


@app.post("/predict/batch")
def predict_batch():
    """Predict for multiple trips in one call. Used by the admin analytics
    tab to back-fill predictions for historical trips when generating the
    'predicted vs actual' chart."""
    try:
        payload = request.get_json(silent=True) or {}
        trips = payload.get("trips", [])
        if not isinstance(trips, list) or len(trips) == 0:
            return jsonify({"success": False, "error": "Body must contain non-empty 'trips' array"}), 400
        if len(trips) > 1000:
            return jsonify({"success": False, "error": "Maximum 1000 trips per batch"}), 400

        rows = []
        for t in trips:
            missing = [k for k in REQUIRED_KEYS if k not in t]
            if missing:
                return jsonify({"success": False, "error": f"Trip missing fields: {missing}"}), 400
            rows.append({KEY_MAP[k]: t[k] for k in REQUIRED_KEYS})

        df = pd.DataFrame(rows)
        preds = model.predict(df)
        rmse = float(meta["metrics"]["rmse"])

        results = [
            {
                "predicted_cost_pkr": round(float(p)),
                "low_pkr": max(0, round(float(p) - rmse)),
                "high_pkr": round(float(p) + rmse),
            }
            for p in preds
        ]
        return jsonify({"success": True, "predictions": results, "count": len(results)})
    except Exception:
        app.logger.exception("Batch prediction failed")
        return jsonify({"success": False, "error": "Internal prediction error"}), 500


if __name__ == "__main__":
    # debug=False keeps the model loaded once. host=0.0.0.0 is fine for local
    # dev; Node backend calls localhost:5001.
    app.run(host="127.0.0.1", port=5001, debug=False)