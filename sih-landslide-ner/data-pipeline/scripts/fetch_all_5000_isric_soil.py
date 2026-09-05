import os
import sys
import ssl
import time
import json
import urllib.request
import urllib.error
import pandas as pd

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INPUT_CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "backend-server", "src", "main", "resources", "data", "Dima-Hasao_grid.csv"))
CHECKPOINT_CSV = os.path.join(BASE_DIR, "processed", "isric_checkpoint_5000.csv")
FINAL_BACKEND_CSV = INPUT_CSV
FINAL_ML_CSV = os.path.abspath(os.path.join(BASE_DIR, "..", "ml-service", "data", "Dima-Hasao_grid.csv"))
FINAL_FRONTEND_JSON = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend-dashboard", "src", "data", "realDimaHasaoGrid.json"))

# Bypass macOS missing CA bundle for Python (SSL: CERTIFICATE_VERIFY_FAILED)
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

def fetch_single_isric_soil(lat, lon, max_retries=5):
    """
    Fetches real-time 0-5cm soil properties (clay, sand, silt, bdod)
    from ISRIC SoilGrids v2.0 REST API sequentially with polite rate spacing.
    """
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=clay&property=sand&property=silt&property=bdod&depth=0-5cm"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SIH-Landslide/1.0",
        "Accept": "application/json"
    }
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    layers = data.get("properties", {}).get("layers", [])
                    extracted = {}
                    
                    for layer in layers:
                        name = layer.get("name")
                        d_factor = layer.get("unit_measure", {}).get("d_factor", 10 if name != 'bdod' else 100)
                        depths = layer.get("depths", [])
                        if not depths:
                            continue
                        values = depths[0].get("values", {})
                        raw_val = values.get("Q0.5") if "Q0.5" in values else values.get("mean")
                        if raw_val is not None:
                            extracted[name] = round(raw_val / float(d_factor), 2)
                            
                    clay = extracted.get("clay")
                    sand = extracted.get("sand")
                    silt = extracted.get("silt")
                    bdod = extracted.get("bdod")
                    
                    if clay is not None and sand is not None and silt is not None:
                        return {
                            "clay": clay,
                            "sand": sand,
                            "silt": silt,
                            "bdod": bdod if bdod is not None else 1.15,
                            "status": "OK"
                        }
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_sec = (attempt + 1) * 6
                print(f"      ⏳ [HTTP 429 Rate Limit] ({lat}, {lon}) waiting {wait_sec}s before retry {attempt+1}/{max_retries}...", flush=True)
                time.sleep(wait_sec)
            elif e.code == 503:
                print(f"      ⏳ [HTTP 503 Server Busy] ({lat}, {lon}) ISRIC temporary maintenance, waiting 15s before retry {attempt+1}/{max_retries}...", flush=True)
                time.sleep(15)
            else:
                print(f"      ⚠️ [HTTP {e.code}] ({lat}, {lon}) attempt {attempt+1}/{max_retries}: {e.reason}", flush=True)
                time.sleep(5)
        except Exception as e:
            print(f"      ⚠️ [Timeout / Network] ({lat}, {lon}) waiting 8s before retry {attempt+1}/{max_retries}: {e}", flush=True)
            time.sleep(8)
            
    return None

def main():
    print("=" * 75, flush=True)
    print("🌍 ISRIC SOILGRIDS v2.0 - BULK 5,000 GRID EXTRACTION PIPELINE (SEQUENTIAL)", flush=True)
    print("=" * 75, flush=True)
    
    os.makedirs(os.path.dirname(CHECKPOINT_CSV), exist_ok=True)
    
    # 1. Load data or resume from checkpoint
    if os.path.exists(CHECKPOINT_CSV):
        print(f"📂 Found existing checkpoint: {CHECKPOINT_CSV}", flush=True)
        df = pd.read_csv(CHECKPOINT_CSV)
    else:
        print(f"📂 Loading source grid from: {INPUT_CSV}", flush=True)
        df = pd.read_csv(INPUT_CSV)
        
    if 'isric_fetched' not in df.columns:
        df['isric_fetched'] = False
    else:
        # Convert boolean strings if read as object
        df['isric_fetched'] = df['isric_fetched'].astype(str).str.lower().isin(['true', '1'])
        
    total_rows = len(df)
    already_done = int(df['isric_fetched'].sum())
    remaining = total_rows - already_done
    
    print(f"📊 Total Grid Points: {total_rows}", flush=True)
    print(f"✅ Already Extracted (True): {already_done}", flush=True)
    print(f"⏳ Remaining to Extract: {remaining}", flush=True)
    print("=" * 75, flush=True)
    
    if remaining == 0:
        print("🎉 All points already extracted and up to date!", flush=True)
        export_final_datasets(df)
        return

    pending_indices = df[~df['isric_fetched']].index.tolist()
    
    start_time = time.time()
    points_done_this_session = 0
    unsaved_points = 0
    SAVE_EVERY_N_POINTS = 5
    
    for count, idx in enumerate(pending_indices, 1):
        lat = float(df.at[idx, 'latitude'])
        lon = float(df.at[idx, 'longitude'])
        
        result = fetch_single_isric_soil(lat, lon)
        
        if result and result.get("status") == "OK":
            df.at[idx, 'clay_percent'] = result["clay"]
            df.at[idx, 'clay_percentage'] = result["clay"]
            df.at[idx, 'sand_percent'] = result["sand"]
            df.at[idx, 'silt_percent'] = result["silt"]
            df.at[idx, 'bulk_density'] = result["bdod"]
            df.at[idx, 'isric_fetched'] = True
            points_done_this_session += 1
            unsaved_points += 1
            
            total_finished = already_done + points_done_this_session
            pct = (total_finished / total_rows) * 100
            print(f"[{total_finished}/{total_rows}] ({pct:.1f}%) ✅ Point {idx} ({lat}, {lon}) -> Clay: {result['clay']}%, Sand: {result['sand']}%, Silt: {result['silt']}% | isric_fetched=True", flush=True)
        else:
            print(f"[{already_done + points_done_this_session}/{total_rows}] ⚠️ Point {idx} ({lat}, {lon}) -> ISRIC query failed, keeping baseline", flush=True)
            
        # Save checkpoint every 5 points (or at the very end)
        if unsaved_points >= SAVE_EVERY_N_POINTS or count == len(pending_indices):
            df.to_csv(CHECKPOINT_CSV, index=False)
            unsaved_points = 0
            
            elapsed = time.time() - start_time
            rate = points_done_this_session / elapsed if elapsed > 0 else 0
            rem = len(pending_indices) - count
            eta_min = (rem / (rate * 60)) if rate > 0 else 0
            print(f"   💾 Checkpoint Saved to CSV! Extracted: {already_done + points_done_this_session}/{total_rows} | ETA: ~{eta_min:.0f} mins\n", flush=True)
            
        # Polite delay to strictly avoid HTTP 429 rate limit
        time.sleep(1.2)
        
    print("\n🎉 Bulk ISRIC Extraction Completed Successfully!", flush=True)
    export_final_datasets(df)

def export_final_datasets(df):
    clean_df = df.drop(columns=['isric_fetched'], errors='ignore')
    
    print("\n💾 Exporting to production datasets:", flush=True)
    clean_df.to_csv(FINAL_BACKEND_CSV, index=False)
    print(f"   ✅ Backend Grid CSV: {FINAL_BACKEND_CSV}", flush=True)
    
    if os.path.exists(FINAL_ML_CSV):
        clean_df.to_csv(FINAL_ML_CSV, index=False)
        print(f"   ✅ ML Service Grid CSV: {FINAL_ML_CSV}", flush=True)
        
    if os.path.exists(FINAL_FRONTEND_JSON):
        records = clean_df.to_dict(orient='records')
        with open(FINAL_FRONTEND_JSON, 'w') as f:
            json.dump(records, f)
        print(f"   ✅ Frontend Dashboard JSON: {FINAL_FRONTEND_JSON}", flush=True)

if __name__ == "__main__":
    main()
