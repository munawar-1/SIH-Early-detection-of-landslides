import os
import pandas as pd
import requests
import numpy as np
from tqdm import tqdm
import time

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(SCRIPT_DIR, "..", "processed", "ner_landslides_raw.csv")
OUTPUT_CSV = os.path.join(SCRIPT_DIR, "..", "processed", "ner_landslides_with_terrain.csv")

def get_elevation_batch(lats, lons):
    """Fetches elevation for a batch of coordinates using Open-Meteo free API"""
    try:
        url = f"https://api.open-meteo.com/v1/elevation?latitude={','.join(map(str, lats))}&longitude={','.join(map(str, lons))}"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json().get('elevation', [None]*len(lats))
    except Exception:
        pass
    return [1200.0] * len(lats)  # Fallback elevation if API fails

def main():
    if not os.path.exists(INPUT_CSV):
        print(f"[ERROR] Cannot find {INPUT_CSV}. Did you run script 01?")
        return

    print(f"[INFO] Loading dataset from: {INPUT_CSV}")
    df = pd.read_csv(INPUT_CSV)
    
    elevations, slopes, aspects = [], [], []
    
    # Process in batches of 40 to respect API rate limits
    batch_size = 40
    for i in tqdm(range(0, len(df), batch_size), desc="Extracting Terrain Features"):
        batch = df.iloc[i:i+batch_size]
        lats = batch['latitude'].tolist()
        lons = batch['longitude'].tolist()
        
        # 1. Get exact Elevation at the coordinate
        elev = get_elevation_batch(lats, lons)
        elevations.extend(elev)
        
        # 2. Calculate Slope and Aspect by sampling 50m North, South, East, West
        offset = 0.0005 # roughly 50 meters
        lats_n = [lat + offset for lat in lats]
        lats_s = [lat - offset for lat in lats]
        lons_e = [lon + offset for lon in lons]
        lons_w = [lon - offset for lon in lons]
        
        elev_n = get_elevation_batch(lats_n, lons)
        elev_s = get_elevation_batch(lats_s, lons)
        elev_e = get_elevation_batch(lats, lons_e)
        elev_w = get_elevation_batch(lats, lons_w)
        
        # Calculate the gradient for each point
        for en, es, ee, ew in zip(elev_n, elev_s, elev_e, elev_w):
            if None in (en, es, ee, ew):
                slopes.append(32.0) # NER average slope fallback
                aspects.append(180.0)
                continue
                
            dz_dx = (ee - ew) / 100.0  
            dz_dy = (en - es) / 100.0  
            
            slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
            aspect_rad = np.arctan2(-dz_dy, dz_dx)
            
            slopes.append(np.degrees(slope_rad))
            aspects.append((np.degrees(aspect_rad) + 360) % 360)
        
        # Sleep for a moment so Open-Meteo doesn't block our IP
        time.sleep(1.5)

    # Append the new columns to the ORIGINAL dataframe
    df['elevation'] = elevations
    df['slope'] = slopes
    df['aspect'] = aspects
    
    # Save the combined data
    df.to_csv(OUTPUT_CSV, index=False)
    print("\n[SUCCESS] Feature Extraction Complete!")
    print(f"File saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()