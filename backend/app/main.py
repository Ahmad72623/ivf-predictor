# backend/app/main.py

from pathlib import Path
from typing import List, Dict, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator


# ---------- Paths & model loading ----------

BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
ARTIFACTS_DIR = BASE_DIR / "artifacts"
RF_MODEL_PATH = ARTIFACTS_DIR / "random_forest.joblib"
FEATURE_ORDER_PATH = ARTIFACTS_DIR / "feature_order.json"

rf_model = None
feature_order: Optional[List[str]] = None


def load_random_forest():
    global rf_model, feature_order

    if not RF_MODEL_PATH.exists():
        raise RuntimeError(f"Random Forest model not found at {RF_MODEL_PATH}")

    rf_model = joblib.load(RF_MODEL_PATH)

    # Try to load feature order if present (optional)
    if FEATURE_ORDER_PATH.exists():
        import json

        feature_order = json.loads(FEATURE_ORDER_PATH.read_text(encoding="utf-8"))
    else:
        feature_order = None

    # Sanity print in server logs
    n_features = getattr(rf_model, "n_features_in_", None)
    classes_ = getattr(rf_model, "classes_", None)
    print("=== Random Forest loaded ===")
    print("n_features_in_:", n_features)
    print("classes_:", classes_)


# ---------- Pydantic schemas ----------

class PredictRequest(BaseModel):
    features: List[float]
    return_proba: bool = True

    @field_validator("features")
    @classmethod
    def check_non_empty(cls, v: List[float]):
        if not v:
            raise ValueError("features list cannot be empty")
        return v


class PredictResponse(BaseModel):
    model: str
    predicted_class: int
    probabilities: Dict[str, float]
    confidence: float
    feature_order: Optional[List[str]] = None


# ---------- FastAPI app ----------

app = FastAPI(title="IVF Predictor – Random Forest Only")

# Allow your static frontend / future hosting to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    load_random_forest()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": rf_model is not None}


@app.get("/feature_order")
def get_feature_order():
    """
    Optional helper: returns the order of features the model expects.
    Useful for debugging / frontend display.
    """
    if feature_order is None:
        raise HTTPException(status_code=404, detail="feature_order.json not found")
    return {"feature_order": feature_order}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if rf_model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    # Convert to numpy, enforce correct number of features
    X = np.array(req.features, dtype=float).reshape(1, -1)

    expected_n = getattr(rf_model, "n_features_in_", None)
    if expected_n is not None and X.shape[1] != expected_n:
        raise HTTPException(
            status_code=400,
            detail=f"Model expects {expected_n} features, but got {X.shape[1]}",
        )

    # Prediction
    try:
        y_pred = int(rf_model.predict(X)[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    # Probabilities
    probs_dict: Dict[str, float] = {}
    confidence = 0.0

    if req.return_proba:
        try:
            probs = rf_model.predict_proba(X)[0]
            classes = rf_model.classes_
            for cls, p in zip(classes, probs):
                probs_dict[str(int(cls))] = float(p)
            confidence = float(max(probs)) if probs.size > 0 else 0.0
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"predict_proba failed: {e}")
    else:
        # If not returning probabilities, just mark the predicted class with prob=1.0
        probs_dict[str(y_pred)] = 1.0
        confidence = 1.0

    return PredictResponse(
        model="random_forest",
        predicted_class=y_pred,
        probabilities=probs_dict,
        confidence=confidence,
        feature_order=feature_order,
    )
