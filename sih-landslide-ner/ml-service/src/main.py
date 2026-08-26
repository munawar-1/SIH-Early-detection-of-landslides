import os
import joblib
import pandas as pd
import numpy as np

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(title="Landslide Early Warning API", version="2.0")

# Setup bulletproof path to the saved model
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_PATH = os.path.join(BASE_DIR, "ml-service", "models", "rf_landslide_model.pkl")

# Load the trained artifact globally when the server starts
model = None
features_list = None

if os.path.exists(MODEL_PATH):
    artifact = joblib.load(MODEL_PATH)
    # Support both old raw models (for backwards compatibility if needed) and new dict artifacts
    if isinstance(artifact, dict):
        model = artifact['model']
        features_list = artifact['features']
    else:
        model = artifact
        # Fallback to the old features if it's the old model
        features_list = [
            'latitude', 'longitude', 'slope', 'clay_percent',
            'rain_day_minus_3_mm', 'rain_day_minus_2_mm',
            'rain_day_minus_1_mm', 'rain_event_day_mm'
        ]

# Define the exact inputs the API expects to receive based on the new Early-Warning design
# We DO NOT include rain_event_day_mm (to avoid data leakage) or lat/lon.
class LandslideFeatures(BaseModel):
    slope: float
    clay_percent: float
    rain_day_minus_3_mm: float
    rain_day_minus_2_mm: float
    rain_day_minus_1_mm: float

@app.get("/")
def health_check():
    """Simple endpoint to verify the server is running."""
    return {
        "status": "Active", 
        "model_loaded": model is not None,
        "features_expected": features_list
    }

@app.post("/predict")
def predict_risk(features: LandslideFeatures):
    """Takes in JSON data, feeds it to the AI, and returns the risk."""
    if model is None or features_list is None:
        raise HTTPException(status_code=500, detail="Model artifact not fully loaded on server.")
    
    # Safely convert incoming JSON into a dict
    incoming_data = features.dict()
    
    # Create the DataFrame EXACTLY matching the required features order.
    # This prevents dictionary-ordering bugs.
    try:
        input_data = pd.DataFrame([{f: incoming_data[f] for f in features_list}])
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required feature: {e}")
    
    # Get the prediction
    prediction = model.predict(input_data)[0]
    
    # Safely extract the probability of Class 1 (Landslide)
    # We find the exact index of class 1 in model.classes_
    try:
        class_1_index = np.where(model.classes_ == 1)[0][0]
        risk_probability = model.predict_proba(input_data)[0][class_1_index]
    except IndexError:
        # Fallback if class 1 is somehow missing from classes_
        risk_probability = 0.0
    
    # Define Risk Levels based on Probability Thresholds
    if risk_probability >= 0.70:
        risk_level = "HIGH"
    elif risk_probability >= 0.40:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"
        
    return {
        "prediction": int(prediction),
        "landslide_probability": float(risk_probability),
        "risk_level": risk_level,
        "prediction_horizon": "next 24 hours"
    }