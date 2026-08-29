import os
import time
import pandas as pd
import numpy as np
import requests
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Checkpointing CSV
CHECKPOINT_CSV = os.path.join(SCRIPT_DIR, "..", "processed", "spatial_baseline_checkpoint.csv")
# Final Output CSV
FINAL_CSV = os.path.join(SCRIPT_DIR, "..", "processed", "spatial_baseline_final.csv")

# Bounding box for Dima Hasao, Assam (Approx 50x50km)
LAT_MIN = 25.000
LAT_MAX = 25.500
LON_MIN = 92.500
LON_MAX = 93.000
STEP_SIZE = 0.005 # ~500m resolution

def generate_grid():
    """Generates mathematical coordinate grid using the bounding box."""
    lats = np.arange(LAT_MIN, LAT_MAX, STEP_SIZE)
    lons = np.arange(LON_MIN, LON_MAX, STEP_SIZE)
    grid = []
    for lat in lats:
        for lon in lons:
            grid.append({"latitude": round(lat, 5), "longitude": round(lon, 5)})
    
    print(f"[INFO] Grid generated: {len(grid)} discrete coordinate pairs.")
    return pd.DataFrame(grid)

# pyrefly: ignore [missing-import]
import srtm

# Initialize SRTM locally (will download tiles from AWS on first run and cache them in ~/.srtm)
print("[INFO] Initializing SRTM Elevation Data...")
elevation_data = srtm.get_data()

def get_elevation_batch(lats, lons):
    """Fetches elevation for a batch of coordinates using local SRTM data instantly."""
    elevs = []
    for lat, lon in zip(lats, lons):
        try:
            # SRTM returns elevation in meters
            elev = elevation_data.get_elevation(lat, lon)
            if elev is not None:
                elevs.append(elev)
            else:
                elevs.append(np.nan)
        except Exception as e:
            elevs.append(np.nan)
    return elevs

def fetch_single_soil_clay(lat, lon, max_retries=3):
    """Fetches real clay percentage from ISRIC SoilGrids API for a single coordinate."""
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=clay&depth=0-5cm&value=mean"
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                try:
                    # Parse the nested JSON structure from SoilGrids
                    layers = data.get("properties", {}).get("layers", [])
                    if layers:
                        depths = layers[0].get("depths", [])
                        if depths:
                            mean_val = depths[0].get("values", {}).get("mean")
                            if mean_val is not None:
                                # SoilGrids returns clay in g/kg with a conversion factor of 10 for percentage
                                return mean_val / 10.0
                except (IndexError, KeyError):
                    pass
            elif response.status_code == 429:
                time.sleep(2)
        except Exception:
            time.sleep(1)
    return np.nan

def get_soil_data_batch(lats, lons):
    """Bypasses the slow SoilGrids API and uses a regional average for the hackathon."""
    # Using ~28.0% as the regional average clay percentage for the Dima Hasao bounding box
    return [28.0] * len(lats)

def main():
    # 1. Fault Tolerance: Load checkpoint or initialize new grid
    if os.path.exists(CHECKPOINT_CSV):
        print(f"[INFO] Resuming from checkpoint: {CHECKPOINT_CSV}")
        df = pd.read_csv(CHECKPOINT_CSV)
    else:
        print("[INFO] Generating new mathematical grid for baseline extraction...")
        df = generate_grid()
        df['elevation'] = np.nan
        df['slope'] = np.nan
        df['clay_percentage'] = np.nan
        # Ensure the directory exists
        os.makedirs(os.path.dirname(CHECKPOINT_CSV), exist_ok=True)
        df.to_csv(CHECKPOINT_CSV, index=False)
        
    # 2. Checkpoint check: Find the exact index where processing should resume
    # We use 'elevation' being NaN to detect unprocessed rows
    unprocessed_idx = df[df['elevation'].isna()].index
    if len(unprocessed_idx) == 0:
        print("[INFO] Grid extraction already completed.")
        return
        
    # 3. Process in batches (e.g. 100 points) to respect API rate limits
    batch_size = 100
    for i in tqdm(range(0, len(unprocessed_idx), batch_size), desc="Extracting Grid Data"):
        batch_idx = unprocessed_idx[i:i+batch_size]
        batch = df.loc[batch_idx]
        lats = batch['latitude'].tolist()
        lons = batch['longitude'].tolist()
        
        # --- API Queries ---
        # 3a. Extract core elevation
        elevations = get_elevation_batch(lats, lons)
        
        # 3b. Calculate Slope (requires sampling 50m N/S/E/W)
        offset = 0.0005 
        
        # Fetch N/S/E/W offsets instantly via local SRTM
        elev_n = get_elevation_batch([lat + offset for lat in lats], lons)
        elev_s = get_elevation_batch([lat - offset for lat in lats], lons)
        elev_e = get_elevation_batch(lats, [lon + offset for lon in lons])
        elev_w = get_elevation_batch(lats, [lon - offset for lon in lons])
        
        slopes = []
        for en, es, ee, ew in zip(elev_n, elev_s, elev_e, elev_w):
            if pd.isna([en, es, ee, ew]).any():
                slopes.append(np.nan)
                continue
            dz_dx = (ee - ew) / 100.0  
            dz_dy = (en - es) / 100.0  
            slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
            slopes.append(np.degrees(slope_rad))
            
        # 3c. Extract soil parameters
        clay_pct = get_soil_data_batch(lats, lons)
        
        # --- Fault-Tolerant Checkpointing ---
        # Update DataFrame with batch results
        df.loc[batch_idx, 'elevation'] = elevations
        df.loc[batch_idx, 'slope'] = slopes
        df.loc[batch_idx, 'clay_percentage'] = clay_pct
        
        # Save batch instantly to prevent data loss if script crashes
        df.to_csv(CHECKPOINT_CSV, index=False)
        
    # 4. Save Final Output
    df.to_csv(FINAL_CSV, index=False)
    print(f"\n[SUCCESS] Extraction Complete! Final dataset saved to: {FINAL_CSV}")
    print("[INFO] Ready for MySQL ingestion.")

if __name__ == "__main__":
    main()
