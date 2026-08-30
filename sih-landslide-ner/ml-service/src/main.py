import os
import joblib
import pandas as pd
import numpy as np

from fastapi import FastAPI, HTTPException
from typing import List, Optional
from pydantic import BaseModel, Field

from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(title="Landslide Early Warning API - High-Precision Geotechnical Engine", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup path to the calibrated model artifact
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_PATH = os.path.join(BASE_DIR, "ml-service", "models", "xgb_landslide_model.pkl")
LEGACY_MODEL_PATH = os.path.join(BASE_DIR, "ml-service", "models", "rf_landslide_model.pkl")

model = None
features_list = None
metrics_info = None

def load_artifact():
    global model, features_list, metrics_info
    target_path = MODEL_PATH if os.path.exists(MODEL_PATH) else LEGACY_MODEL_PATH
    if os.path.exists(target_path):
        artifact = joblib.load(target_path)
        if isinstance(artifact, dict):
            model = artifact.get('model')
            features_list = artifact.get('features')
            metrics_info = artifact.get('metrics')
        else:
            model = artifact
            features_list = [
                'slope', 'elevation', 'aspect_sin', 'aspect_cos',
                'clay_percent', 'sand_percent', 'silt_percent', 'bulk_density',
                'rain_day_minus_1_mm', 'rain_3d_sum_mm', 'rain_7d_api_mm',
                'pore_pressure_index'
            ]
        print(f"✅ Loaded calibrated ML model with {len(features_list) if features_list else 0} features from {target_path}")

load_artifact()

# 12-Feature Geotechnical Input Schema (with smart physical defaults for backwards compatibility)
class LandslideFeatures(BaseModel):
    slope: float
    elevation: Optional[float] = 650.0
    aspect: Optional[float] = 145.0
    aspect_sin: Optional[float] = None
    aspect_cos: Optional[float] = None
    clay_percent: Optional[float] = 32.0
    sand_percent: Optional[float] = 30.0
    silt_percent: Optional[float] = 38.0
    bulk_density: Optional[float] = 1.26
    rain_day_minus_1_mm: Optional[float] = None
    rain_day_minus_2_mm: Optional[float] = None
    rain_day_minus_3_mm: Optional[float] = None
    rain_3d_sum_mm: Optional[float] = None
    rain_7d_api_mm: Optional[float] = None
    pore_pressure_index: Optional[float] = None

def transform_feature_dict(data: dict) -> dict:
    """Transforms raw incoming parameters into the exact 12-feature geotechnical tensor."""
    slope = float(data.get('slope', 0.0))
    elevation = float(data.get('elevation') or 650.0)
    
    # Aspect angle transforms
    aspect = float(data.get('aspect') or 145.0)
    aspect_sin = data.get('aspect_sin')
    aspect_cos = data.get('aspect_cos')
    if aspect_sin is None:
        aspect_sin = np.sin(np.radians(aspect))
    if aspect_cos is None:
        aspect_cos = np.cos(np.radians(aspect))
        
    clay = float(data.get('clay_percent') or 32.0)
    sand = float(data.get('sand_percent') or 30.0)
    silt = float(data.get('silt_percent') or (100.0 - (clay + sand)))
    bulk_density = float(data.get('bulk_density') or 1.26)
    
    # Rainfall parsing (supports both day-by-day and 3d sums)
    r1 = data.get('rain_day_minus_1_mm')
    r2 = data.get('rain_day_minus_2_mm')
    r3 = data.get('rain_day_minus_3_mm')
    r3d = data.get('rain_3d_sum_mm')
    
    if r1 is None:
        r1 = 15.0
    if r3d is None:
        if r2 is not None and r3 is not None:
            r3d = float(r1) + float(r2) + float(r3)
        else:
            r3d = float(r1) * 2.8
            
    r1 = float(r1)
    r3d = float(r3d)
    
    # 7-day API
    r7d_api = data.get('rain_7d_api_mm')
    if r7d_api is None:
        r7d_api = r1 + (r3d - r1) * 0.84 + (r3d * 0.65) * (0.84**3)
    r7d_api = float(r7d_api)
    
    # Geotechnical Hydro-Mechanical Destabilization Index
    ppi = data.get('pore_pressure_index')
    if ppi is None:
        slope_rad = np.radians(slope)
        ppi = (np.sin(slope_rad) * (r7d_api * clay)) / (100.0 * max(0.8, bulk_density) * (1.0 + sand / 100.0))
    ppi = float(ppi)
    
    return {
        'slope': slope,
        'elevation': elevation,
        'aspect_sin': float(aspect_sin),
        'aspect_cos': float(aspect_cos),
        'clay_percent': clay,
        'sand_percent': sand,
        'silt_percent': silt,
        'bulk_density': bulk_density,
        'rain_day_minus_1_mm': r1,
        'rain_3d_sum_mm': r3d,
        'rain_7d_api_mm': r7d_api,
        'pore_pressure_index': ppi
    }

@app.get("/")
def health_check():
    return {
        "status": "Active",
        "engine": "High-Precision Geotechnical Gradient Boosting Engine",
        "version": "3.0",
        "model_loaded": model is not None,
        "features_expected": features_list,
        "validation_metrics": metrics_info
    }

@app.post("/reload-model")
def reload_model_endpoint():
    load_artifact()
    if model is not None:
        return {"status": "success", "message": "Model reloaded successfully", "features": features_list}
    raise HTTPException(status_code=404, detail="Model file not found")

@app.post("/predict")
def predict_risk(features: LandslideFeatures):
    if model is None or features_list is None:
        raise HTTPException(status_code=500, detail="Model artifact not loaded.")
        
    transformed = transform_feature_dict(features.dict())
    input_df = pd.DataFrame([transformed])[features_list]
    
    try:
        class_1_index = np.where(model.classes_ == 1)[0][0]
        prob = float(model.predict_proba(input_df)[0][class_1_index])
    except Exception:
        prob = 0.0
        
    risk_level = "HIGH" if prob >= 0.70 else ("MODERATE" if prob >= 0.40 else "LOW")
    
    # Determine primary geotechnical risk factor
    primary_factor = "Stable Slope & Soil Drainage"
    if prob >= 0.40:
        if transformed['pore_pressure_index'] > 25.0:
            primary_factor = f"Critical Pore-Water Pressure ({transformed['pore_pressure_index']:.1f}) in Clay Horizon"
        elif transformed['rain_7d_api_mm'] > 120.0:
            primary_factor = f"Extreme 7-Day Cumulative Saturation ({transformed['rain_7d_api_mm']:.1f} mm)"
        elif transformed['slope'] > 35.0:
            primary_factor = f"Steep Escarpment Gravity Shear ({transformed['slope']:.1f}°)"
            
    return {
        "prediction": int(prob >= 0.45),
        "landslide_probability": round(prob, 4),
        "risk_level": risk_level,
        "primary_hazard_driver": primary_factor,
        "geotechnical_metrics": {
            "pore_pressure_index": round(transformed['pore_pressure_index'], 2),
            "rain_7d_api_mm": round(transformed['rain_7d_api_mm'], 1),
            "effective_slope": round(transformed['slope'], 1)
        },
        "prediction_horizon": "next 24 hours"
    }

@app.post("/predict-batch")
def predict_batch_risk(points: List[LandslideFeatures]):
    if model is None or features_list is None:
        raise HTTPException(status_code=500, detail="Model artifact not loaded.")
        
    if not points:
        return {"results": []}
        
    transformed_rows = [transform_feature_dict(p.dict()) for p in points]
    input_df = pd.DataFrame(transformed_rows)[features_list]
    
    try:
        class_1_index = np.where(model.classes_ == 1)[0][0]
        probs = model.predict_proba(input_df)[:, class_1_index]
        
        results = []
        for prob, row in zip(probs, transformed_rows):
            p_float = float(prob)
            rl = "HIGH" if p_float >= 0.70 else ("MODERATE" if p_float >= 0.40 else "LOW")
            results.append({
                "prediction": int(p_float >= 0.45),
                "landslide_probability": round(p_float, 4),
                "risk_level": rl,
                "pore_pressure_index": round(row['pore_pressure_index'], 2),
                "rain_7d_api_mm": round(row['rain_7d_api_mm'], 1),
                "prediction_horizon": "next 24 hours"
            })
    except Exception as e:
        results = []
        
    return {"results": results}

# Real-time Broadcast State Hub for Web -> Mobile Pitch Demo
latest_broadcast = {}

@app.post("/api/alerts/broadcast")
def trigger_broadcast(payload: dict):
    global latest_broadcast
    import time
    latest_broadcast = {
        **payload,
        "active": True,
        "broadcast_id": int(time.time() * 1000),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    return {"status": "SUCCESS", "message": "Emergency alert broadcasted to all citizen mobiles."}

@app.get("/api/alerts/active-broadcast")
def get_active_broadcast():
    global latest_broadcast
    import time
    if latest_broadcast and latest_broadcast.get("active"):
        # Valid for 15 minutes
        if time.time() * 1000 - latest_broadcast.get("broadcast_id", 0) < 900000:
            return latest_broadcast
    return {"active": False}

@app.post("/api/alerts/dismiss-broadcast")
def dismiss_broadcast():
    global latest_broadcast
    latest_broadcast = {"active": False}
    return {"status": "DISMISSED"}