import os
import pandas as pd
import requests
from datetime import timedelta
from tqdm import tqdm
import time

# Bulletproof paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INPUT_CSV = os.path.join(BASE_DIR, "processed", "ner_landslides_with_soil.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "processed", "ner_landslides_final.csv")

def get_antecedent_weather(lat, lon, date_str):
    """Fetches historical rainfall for the 7 days leading up to the landslide."""
    try:
        # Parse the date (handles formats like "04/11/2007 12:00:00 AM" or "2007-04-11")
        event_date = pd.to_datetime(date_str).date()
        start_date = event_date - timedelta(days=7)
        
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": event_date.strftime("%Y-%m-%d"),
            "daily": ["precipitation_sum"],
            "timezone": "Asia/Kolkata"
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "daily" in data and "precipitation_sum" in data["daily"]:
                precip = data["daily"]["precipitation_sum"]
                # Replace None with 0.0 for dry days
                precip = [p if p is not None else 0.0 for p in precip]
                
                # precip array has 8 days (7 days prior + event day)
                if len(precip) == 8:
                    return {
                        "rain_event_day_mm": precip[7],
                        "rain_3d_sum_mm": sum(precip[5:8]),
                        "rain_7d_sum_mm": sum(precip[0:8])
                    }
    except Exception as e:
        pass
        
    # If API fails or date is too old (before 1940), return safe defaults
    return {"rain_event_day_mm": 0.0, "rain_3d_sum_mm": 0.0, "rain_7d_sum_mm": 0.0}

def main():
    print("="*50)
    print(f"👀 Looking for input file at:\n{INPUT_CSV}")
    print("="*50)
    
    if not os.path.exists(INPUT_CSV):
        print(f"\n[❌ ERROR] File not found! Wait for 03_extract_soil.py to finish first.")
        return

    print(f"[✅ SUCCESS] Found soil data! Fetching historical weather...")
    df = pd.read_csv(INPUT_CSV)
    
    # Drop rows without a valid date
    df = df.dropna(subset=['event_date'])
    
    rain_1d, rain_3d, rain_7d = [], [], []
    
    for _, row in tqdm(df.iterrows(), total=len(df), desc="Extracting Weather"):
        weather = get_antecedent_weather(row['latitude'], row['longitude'], row['event_date'])
        
        rain_1d.append(weather["rain_event_day_mm"])
        rain_3d.append(weather["rain_3d_sum_mm"])
        rain_7d.append(weather["rain_7d_sum_mm"])
        
        # Free API rate limit protection
        time.sleep(0.5)
        
    df['rain_event_day_mm'] = rain_1d
    df['rain_3d_sum_mm'] = rain_3d
    df['rain_7d_sum_mm'] = rain_7d
    
    df.to_csv(OUTPUT_CSV, index=False)
    print("\n[🎉 SUCCESS] Weather Extraction Complete!")
    print(f"Final ML dataset saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()