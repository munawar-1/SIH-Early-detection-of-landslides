import os
import time
import joblib
import pandas as pd
import numpy as np

from fastapi import FastAPI, HTTPException, Response, status, Query
from typing import List, Optional
from pydantic import BaseModel, Field

from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(title="Landslide Early Warning API - High-Precision Geotechnical Engine", version="3.0")

# Externalize CORS Origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env == "*":
    origins = ["*"]
else:
    origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup path to the calibrated model artifact
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "models"))
FALLBACK_WORKSPACE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "ml-service", "models"))

ENV_MODEL_PATH = os.getenv("MODEL_PATH")
if ENV_MODEL_PATH and os.path.exists(ENV_MODEL_PATH):
    MODEL_PATH = ENV_MODEL_PATH
elif os.path.exists(os.path.join(DEFAULT_MODEL_DIR, "xgb_landslide_model.pkl")):
    MODEL_PATH = os.path.join(DEFAULT_MODEL_DIR, "xgb_landslide_model.pkl")
else:
    MODEL_PATH = os.path.join(FALLBACK_WORKSPACE_DIR, "xgb_landslide_model.pkl")

LEGACY_MODEL_PATH = os.path.join(DEFAULT_MODEL_DIR, "rf_landslide_model.pkl")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")

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
    else:
        print(f"⚠️ Model artifact not found at {target_path}")

load_artifact()

grid_df = None

def load_grid_dataset():
    global grid_df
    candidate_paths = [
        os.path.join(CURRENT_DIR, "..", "data", "Dima-Hasao_grid.csv"),
        os.path.join(CURRENT_DIR, "..", "..", "backend-server", "src", "main", "resources", "data", "Dima-Hasao_grid.csv")
    ]
    for path in candidate_paths:
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            try:
                grid_df = pd.read_csv(abs_path)
                print(f"✅ Loaded {len(grid_df)} GIS terrain grid points from {abs_path}")
                return
            except Exception as e:
                print(f"⚠️ Error reading grid dataset from {abs_path}: {e}")
    print("⚠️ Grid dataset file not found in default locations.")

load_grid_dataset()

class CoordinatePredictionRequest(BaseModel):
    latitude: float = Field(..., description="Latitude in decimal degrees (e.g. 25.100)")
    longitude: float = Field(..., description="Longitude in decimal degrees (e.g. 92.750)")
    rain_day_minus_1_mm: Optional[float] = Field(None, description="Recent 24h rainfall (mm)")
    rain_3d_sum_mm: Optional[float] = Field(None, description="Recent 3-day cumulative rainfall (mm)")
    location_name: Optional[str] = Field(None, description="Descriptive location name")

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
def root_info():
    return {
        "status": "Active",
        "service": "NER Landslide ML Geotechnical Engine",
        "version": "3.0",
        "model_loaded": model is not None,
        "features_expected": features_list,
        "validation_metrics": metrics_info
    }

@app.get("/health")
def health_endpoint(response: Response):
    if model is None:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "UNHEALTHY",
            "model_loaded": False,
            "error": "ML model artifact not loaded"
        }
    return {
        "status": "HEALTHY",
        "model_loaded": True,
        "features_count": len(features_list) if features_list else 0,
        "version": "3.0"
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

# =============================================================================
# DYNAMIC COORDINATE ML RISK PREDICTION ENDPOINTS
# =============================================================================

@app.post("/predict-coordinate")
def predict_coordinate_risk_post(req: CoordinatePredictionRequest):
    return process_coordinate_risk(
        lat=req.latitude,
        lng=req.longitude,
        rain_day_minus_1_mm=req.rain_day_minus_1_mm,
        rain_3d_sum_mm=req.rain_3d_sum_mm,
        location_name=req.location_name
    )

@app.get("/predict-coordinate")
def predict_coordinate_risk_get(
    latitude: float = Query(..., description="Latitude in decimal degrees"),
    longitude: float = Query(..., description="Longitude in decimal degrees"),
    location_name: Optional[str] = Query(None, description="Location name"),
    rain_day_minus_1_mm: Optional[float] = Query(None),
    rain_3d_sum_mm: Optional[float] = Query(None)
):
    return process_coordinate_risk(
        lat=latitude,
        lng=longitude,
        rain_day_minus_1_mm=rain_day_minus_1_mm,
        rain_3d_sum_mm=rain_3d_sum_mm,
        location_name=location_name
    )

def process_coordinate_risk(
    lat: float,
    lng: float,
    rain_day_minus_1_mm: Optional[float] = None,
    rain_3d_sum_mm: Optional[float] = None,
    location_name: Optional[str] = None
):
    if model is None or features_list is None:
        raise HTTPException(status_code=500, detail="ML model artifact not loaded.")
        
    is_inside_region = (24.0 <= lat <= 26.5) and (91.5 <= lng <= 94.0)
    min_dist_km = 999.0
    
    if grid_df is not None and not grid_df.empty:
        # Vectorized Euclidean distance calculation
        dists = np.hypot(grid_df['latitude'] - lat, grid_df['longitude'] - lng)
        nearest_idx = dists.idxmin()
        min_dist_deg = dists[nearest_idx]
        min_dist_km = float(min_dist_deg) * 111.0
        nearest_row = grid_df.loc[nearest_idx]
        
        if min_dist_km <= 45.0:
            slope = float(nearest_row.get('slope', 15.0))
            elevation = float(nearest_row.get('elevation', 500.0))
            aspect = float(nearest_row.get('aspect', 180.0))
            clay = float(nearest_row.get('clay_percent', nearest_row.get('clay_percentage', 32.0)))
            sand = float(nearest_row.get('sand_percent', 34.0))
            silt = float(nearest_row.get('silt_percent', 34.0))
            bulk_density = float(nearest_row.get('bulk_density', 1.18))
        else:
            slope = 2.0
            elevation = 150.0
            aspect = 180.0
            clay = 28.0
            sand = 36.0
            silt = 36.0
            bulk_density = 1.25
    else:
        slope = 28.0 if is_inside_region else 2.0
        elevation = 650.0 if is_inside_region else 150.0
        aspect = 145.0
        clay = 32.0
        sand = 30.0
        silt = 38.0
        bulk_density = 1.26

    r1 = rain_day_minus_1_mm if rain_day_minus_1_mm is not None else (25.0 if (is_inside_region or min_dist_km <= 45.0) else 5.0)
    r3d = rain_3d_sum_mm if rain_3d_sum_mm is not None else (r1 * 2.8)
    
    features = LandslideFeatures(
        slope=slope,
        elevation=elevation,
        aspect=aspect,
        clay_percent=clay,
        sand_percent=sand,
        silt_percent=silt,
        bulk_density=bulk_density,
        rain_day_minus_1_mm=r1,
        rain_3d_sum_mm=r3d
    )
    
    pred_res = predict_risk(features)
    prob = pred_res["landslide_probability"]
    risk_level = pred_res["risk_level"]
    
    # If the coordinate is far out in safe low-gradient plains
    if not is_inside_region and min_dist_km > 50.0:
        prob = 0.02
        risk_level = "SAFE"
        pred_res["primary_hazard_driver"] = "Low-Gradient Valley / Stable Plains"
        
    is_risk = (risk_level in ["CRITICAL", "HIGH"]) or (prob >= 0.40)
    
    loc_label = location_name if location_name else f"Sector ({lat:.3f}°N, {lng:.3f}°E)"
    
    if risk_level == "CRITICAL":
        advisory = f"🚨 CRITICAL LANDSLIDE DANGER: Extreme destabilization hazard ({prob*100:.1f}%) detected near {loc_label}."
        action = "IMMEDIATE EVACUATION: Move away from steep slopes, hill cuttings, and stream beds."
    elif risk_level == "HIGH":
        advisory = f"⚠️ HIGH RISK: Saturated steep terrain ({prob*100:.1f}%) near {loc_label}. Potential localized slope failure."
        action = "Prepare emergency go-bag, avoid vulnerable cuttings, and monitor official bulletins."
    elif risk_level == "MODERATE":
        advisory = f"⚠️ MODERATE ADVISORY: Moderate slope gradient at {loc_label}. Watch for drainage blockage."
        action = "Maintain seasonal vigilance; avoid parking under exposed cuts during heavy rains."
    else:
        advisory = f"🛡️ SAFE AREA: No active landslide threat at {loc_label}. Stable terrain conditions."
        action = "No emergency action required. Continuous monitoring active."
        
    return {
        "status": "SUCCESS",
        "latitude": round(lat, 5),
        "longitude": round(lng, 5),
        "district": "Dima Hasao" if is_inside_region else "Plains / Lowland",
        "location_name": loc_label,
        "nearest_grid_distance_m": round(min_dist_km * 1000.0, 1),
        "landslide_probability": round(prob, 4),
        "risk_level": risk_level,
        "in_risk_zone": is_risk,
        "primary_hazard_driver": pred_res.get("primary_hazard_driver", "Stable Slope & Soil Drainage"),
        "geotechnical_metrics": pred_res.get("geotechnical_metrics", {}),
        "advisory": advisory,
        "action_required": action,
        "evaluated_by": "FastAPI Geotechnical ML Microservice (Calibrated XGBoost Engine)",
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }

# Real-time Broadcast State Hub for Dual Alert Routing (Simulator vs Live Monitoring)
latest_simulator_broadcast = {}
latest_live_broadcast = {}
latest_broadcast = {}

# =============================================================================
# 1. MONSOON DISASTER SIMULATOR ENDPOINTS ("Dispatch Emergency Message")
# =============================================================================

@app.post("/api/alerts/simulator-dispatch")
@app.post("/api/alerts/simulator/dispatch")
def trigger_simulator_dispatch(payload: dict):
    global latest_simulator_broadcast
    import time
    latest_simulator_broadcast = {
        **payload,
        "source": "SIMULATOR",
        "active": True,
        "broadcast_id": int(time.time() * 1000),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    return {
        "status": "SUCCESS",
        "source": "SIMULATOR",
        "broadcast_id": latest_simulator_broadcast["broadcast_id"],
        "message": "Monsoon simulator emergency message dispatched to Demo phones."
    }

@app.get("/api/alerts/simulator/active")
@app.get("/api/alerts/active-simulator-broadcast")
def get_active_simulator_alert():
    global latest_simulator_broadcast
    import time
    if latest_simulator_broadcast and latest_simulator_broadcast.get("active"):
        if time.time() * 1000 - latest_simulator_broadcast.get("broadcast_id", 0) < 900000:
            return latest_simulator_broadcast
    return {"active": False}

@app.post("/api/alerts/simulator/dismiss")
@app.post("/api/alerts/dismiss-simulator-broadcast")
def dismiss_simulator_alert():
    global latest_simulator_broadcast
    latest_simulator_broadcast = {"active": False}
    return {"status": "DISMISSED", "source": "SIMULATOR"}

# =============================================================================
# 2. LIVE MONITORING DASHBOARD ENDPOINTS ("Broadcast SMS Alert")
# =============================================================================

@app.post("/api/alerts/live-broadcast")
@app.post("/api/alerts/live/broadcast")
def trigger_live_broadcast(payload: dict):
    global latest_live_broadcast
    import time
    latest_live_broadcast = {
        **payload,
        "source": "LIVE_MONITORING",
        "active": True,
        "broadcast_id": int(time.time() * 1000),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    return {
        "status": "SUCCESS",
        "source": "LIVE_MONITORING",
        "broadcast_id": latest_live_broadcast["broadcast_id"],
        "message": "Real-time monitoring emergency alert broadcasted to Live phones."
    }

@app.get("/api/alerts/live/active")
@app.get("/api/alerts/active-live-broadcast")
def get_active_live_alert():
    global latest_live_broadcast
    import time
    if latest_live_broadcast and latest_live_broadcast.get("active"):
        if time.time() * 1000 - latest_live_broadcast.get("broadcast_id", 0) < 900000:
            return latest_live_broadcast
    return {"active": False}

@app.post("/api/alerts/live/dismiss")
@app.post("/api/alerts/dismiss-live-broadcast")
def dismiss_live_alert():
    global latest_live_broadcast
    latest_live_broadcast = {"active": False}
    return {"status": "DISMISSED", "source": "LIVE_MONITORING"}

# =============================================================================
# 3. BACKWARD COMPATIBILITY ENDPOINTS
# =============================================================================

@app.post("/api/alerts/broadcast")
def trigger_broadcast(payload: dict):
    source = payload.get("source", "LIVE_MONITORING")
    if source == "SIMULATOR":
        return trigger_simulator_dispatch(payload)
    return trigger_live_broadcast(payload)

@app.get("/api/alerts/active-broadcast")
def get_active_broadcast(source: str = None):
    if source == "SIMULATOR":
        return get_active_simulator_alert()
    elif source == "LIVE_MONITORING":
        return get_active_live_alert()
    
    live = get_active_live_alert()
    if live.get("active"):
        return live
    sim = get_active_simulator_alert()
    if sim.get("active"):
        return sim
    return {"active": False}

@app.post("/api/alerts/dismiss-broadcast")
def dismiss_broadcast(source: str = None):
    if source == "SIMULATOR":
        dismiss_simulator_alert()
    elif source == "LIVE_MONITORING":
        dismiss_live_alert()
    else:
        dismiss_simulator_alert()
        dismiss_live_alert()
    return {"status": "DISMISSED"}