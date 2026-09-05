import os
import json
import time
import math
import urllib.request
import urllib.error
import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_JSON = os.path.join(BASE_DIR, "processed", "isric_live_dimahasao_hubs.json")
BACKEND_CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "backend-server", "src", "main", "resources", "data", "Dima-Hasao_grid.csv"))
ML_CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "ml-service", "data", "Dima-Hasao_grid.csv"))
FRONTEND_JSON = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend-dashboard", "src", "data", "realDimaHasaoGrid.json"))

# Core Geospatial Hubs & Corridor Benchmark Points across Dima Hasao
DIMA_HASAO_HUBS = [
    {"name": "Haflong (District HQ)", "lat": 25.18, "lon": 92.76},
    {"name": "Harangajao (Valley Corridor)", "lat": 25.08, "lon": 92.84},
    {"name": "Jatinga (Ridge / Landslide Hotspot)", "lat": 25.12, "lon": 92.77},
    {"name": "Mahur (Central Uplands)", "lat": 25.32, "lon": 93.12},
    {"name": "Maibang (Historical Basin)", "lat": 25.28, "lon": 93.15},
    {"name": "Umrangso (Western Plateau)", "lat": 25.52, "lon": 92.72},
    {"name": "Langting (Northern Foothills)", "lat": 25.50, "lon": 93.13},
    {"name": "Diyungbra (North Border)", "lat": 25.75, "lon": 93.00},
    {"name": "Ditokcherra (Railway Sinking Zone)", "lat": 25.04, "lon": 92.80},
    {"name": "Daotuhaja (Mountain Spine)", "lat": 25.22, "lon": 93.00},
    {"name": "Dehangi (Central Slopes)", "lat": 25.42, "lon": 92.95},
    {"name": "Hatikhali (Northeast Forest)", "lat": 25.62, "lon": 93.15},
    {"name": "NH-27 Highway Corridor Benchmark", "lat": 25.03, "lon": 92.88}
]

def fetch_isric_point(lat, lon, max_retries=3):
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=clay&property=sand&property=silt&property=bdod&depth=0-5cm"
    headers = {"User-Agent": "SIH-Landslide-DataPipeline/1.0"}
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status == 200:
                    raw_data = json.loads(response.read().decode('utf-8'))
                    layers = raw_data.get("properties", {}).get("layers", [])
                    extracted = {}
                    uncertainties = {}
                    
                    for layer in layers:
                        name = layer.get("name")
                        d_factor = layer.get("unit_measure", {}).get("d_factor", 10 if name != 'bdod' else 100)
                        depths = layer.get("depths", [])
                        if not depths:
                            continue
                        values = depths[0].get("values", {})
                        raw_val = values.get("Q0.5") if "Q0.5" in values else values.get("mean")
                        unc = values.get("uncertainty")
                        
                        if raw_val is not None:
                            extracted[name] = round(raw_val / float(d_factor), 2)
                        if unc is not None:
                            uncertainties[name] = round(unc / float(d_factor), 2)
                            
                    return {
                        "clay": extracted.get("clay", 25.0),
                        "sand": extracted.get("sand", 35.0),
                        "silt": extracted.get("silt", 30.0),
                        "bdod": extracted.get("bdod", 1.15),
                        "uncertainties": uncertainties,
                        "status": "SUCCESS"
                    }
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"   ⏳ HTTP 429 Rate limited. Waiting 4s before retry {attempt + 1}/{max_retries}...")
                time.sleep(4)
            else:
                print(f"   ⚠️ HTTP Error {e.code}: {e.reason}")
                time.sleep(2)
        except Exception as e:
            print(f"   ⚠️ Connection error: {e}. Retrying...")
            time.sleep(2)
            
    return None

def interpolate_soil(lat, lon, live_hubs):
    """Inverse Distance Weighting (IDW) interpolation from live SoilGrids hubs."""
    weights = []
    for hub in live_hubs:
        d = math.hypot(lat - hub["lat"], (lon - hub["lon"]) * 1.1)
        if d < 0.001:
            return hub["clay"], hub["sand"], hub["silt"], hub["bdod"]
        weights.append(1.0 / (d ** 2))
    
    total_w = sum(weights)
    clay = sum(w * hub["clay"] for w, hub in zip(weights, live_hubs)) / total_w
    sand = sum(w * hub["sand"] for w, hub in zip(weights, live_hubs)) / total_w
    silt = sum(w * hub["silt"] for w, hub in zip(weights, live_hubs)) / total_w
    bdod = sum(w * hub["bdod"] for w, hub in zip(weights, live_hubs)) / total_w
    
    return round(clay, 1), round(sand, 1), round(silt, 1), round(bdod, 3)

def main():
    print("=" * 70)
    print("🌍 FETCHING LIVE ISRIC SOILGRIDS v2.0 DATA FOR DIMA HASAO")
    print("=" * 70)
    
    live_results = []
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    
    for i, hub in enumerate(DIMA_HASAO_HUBS):
        print(f"\n[{i+1}/{len(DIMA_HASAO_HUBS)}] Querying {hub['name']} ({hub['lat']}°N, {hub['lon']}°E)...")
        data = fetch_isric_point(hub['lat'], hub['lon'])
        
        if data:
            print(f"   ✅ Clay: {data['clay']}% | Sand: {data['sand']}% | Silt: {data['silt']}% | Bulk Density: {data['bdod']} g/cm³")
            entry = {
                "name": hub["name"],
                "lat": hub["lat"],
                "lon": hub["lon"],
                "clay": data["clay"],
                "sand": data["sand"],
                "silt": data["silt"],
                "bdod": data["bdod"],
                "uncertainties": data["uncertainties"]
            }
        else:
            print(f"   ⚠️ Falling back to default for {hub['name']}")
            entry = {
                "name": hub["name"],
                "lat": hub["lat"],
                "lon": hub["lon"],
                "clay": 28.5,
                "sand": 34.0,
                "silt": 37.5,
                "bdod": 1.18,
                "uncertainties": {}
            }
        live_results.append(entry)
        time.sleep(1.0) # Respectful delay between ISRIC API queries
        
    with open(OUTPUT_JSON, "w") as f:
        json.dump(live_results, f, indent=2)
    print(f"\n💾 Saved live ISRIC hub data to: {OUTPUT_JSON}")
    
    # Update Grid Datasets
    print("\n🔄 Updating GIS baseline grids with live ISRIC SoilGrids measurements...")
    if os.path.exists(BACKEND_CSV):
        df = pd.read_csv(BACKEND_CSV)
        clays, sands, silts, bds = [], [], [], []
        for _, row in df.iterrows():
            c, sa, si, bd = interpolate_soil(row['latitude'], row['longitude'], live_results)
            clays.append(c)
            sands.append(sa)
            silts.append(si)
            bds.append(bd)
            
        df['clay_percentage'] = clays
        df['clay_percent'] = clays
        df['sand_percent'] = sands
        df['silt_percent'] = silts
        df['bulk_density'] = bds
        
        df.to_csv(BACKEND_CSV, index=False)
        print(f"   ✅ Updated backend grid CSV: {BACKEND_CSV}")
        
        if os.path.exists(ML_CSV):
            df.to_csv(ML_CSV, index=False)
            print(f"   ✅ Updated ML service grid CSV: {ML_CSV}")
            
    if os.path.exists(FRONTEND_JSON):
        with open(FRONTEND_JSON, "r") as f:
            points = json.load(f)
            
        for p in points:
            c, sa, si, bd = interpolate_soil(p['latitude'], p['longitude'], live_results)
            p['clay_percentage'] = c
            p['clay_percent'] = c
            p['sand_percent'] = sa
            p['silt_percent'] = si
            p['bulk_density'] = bd
            
        with open(FRONTEND_JSON, "w") as f:
            json.dump(points, f)
        print(f"   ✅ Updated frontend dashboard grid JSON: {FRONTEND_JSON}")

    print("\n🎉 Live ISRIC Soil Extraction & Grid Recalibration Complete!")

if __name__ == "__main__":
    main()
