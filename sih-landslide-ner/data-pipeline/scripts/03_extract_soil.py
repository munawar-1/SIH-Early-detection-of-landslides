import os
import pandas as pd
import requests
from tqdm import tqdm
import time

# Bulletproof paths (forces absolute path resolution from the script's location)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INPUT_CSV = os.path.join(BASE_DIR, "processed", "ner_landslides_with_terrain.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "processed", "ner_landslides_with_soil.csv")

def get_soil_properties(lat, lon):
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}"
    fallback = {"clay_percent": 25.0, "sand_percent": 45.0, "silt_percent": 30.0, "bulk_density": 1.2}
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            layers = data.get('properties', {}).get('layers', [])
            if not layers:
                return fallback
                
            def get_val(name):
                for layer in layers:
                    if layer['name'] == name:
                        divisor = 100 if name == 'bdod' else 10
                        try:
                            return layer['depths'][0]['values']['mean'] / divisor
                        except:
                            return None
                return None
            
            clay = get_val("clay")
            sand = get_val("sand")
            silt = get_val("silt")
            bdod = get_val("bdod")
            
            return {
                "clay_percent": clay if clay is not None else fallback["clay_percent"],
                "sand_percent": sand if sand is not None else fallback["sand_percent"],
                "silt_percent": silt if silt is not None else fallback["silt_percent"],
                "bulk_density": bdod if bdod is not None else fallback["bulk_density"]
            }
    except Exception:
        pass
        
    return fallback

def main():
    print("="*50)
    print(f"👀 Looking for input file at:\n{INPUT_CSV}")
    print("="*50)
    
    if not os.path.exists(INPUT_CSV):
        print(f"\n[❌ ERROR] File not found!")
        print("Please make sure you are running 'python3 scripts/03_extract_soil.py' from the data-pipeline folder.")
        return

    print(f"[✅ SUCCESS] Found input file! Loading data...")
    df = pd.read_csv(INPUT_CSV)
    
    print(f"[INFO] Fetching soil data for {len(df)} locations (This will take ~4 minutes)...")
    
    clay_list, sand_list, silt_list, bd_list = [], [], [], []
    
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Extracting Soil"):
        soil = get_soil_properties(row['latitude'], row['longitude'])
        clay_list.append(soil["clay_percent"])
        sand_list.append(soil["sand_percent"])
        silt_list.append(soil["silt_percent"])
        bd_list.append(soil["bulk_density"])
        time.sleep(0.5)
        
    df['clay_percent'] = clay_list
    df['sand_percent'] = sand_list
    df['silt_percent'] = silt_list
    df['bulk_density'] = bd_list
    
    df.to_csv(OUTPUT_CSV, index=False)
    print("\n[🎉 SUCCESS] Soil Extraction Complete!")
    print(f"File saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()