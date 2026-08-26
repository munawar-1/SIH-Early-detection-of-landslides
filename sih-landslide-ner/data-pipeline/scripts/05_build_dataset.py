import os
import pandas as pd
import numpy as np

# Bulletproof paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INPUT_CSV = os.path.join(BASE_DIR, "processed", "ner_landslides_final.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "processed", "ml_training_dataset.csv")

def main():
    print("="*50)
    print(f"👀 Looking for input file at:\n{INPUT_CSV}")
    print("="*50)
    
    if not os.path.exists(INPUT_CSV):
        print(f"\n[❌ ERROR] File not found! Wait for 04_extract_weather.py to finish.")
        return

    # 1. Load Positive Samples (Actual Landslides)
    df_pos = pd.read_csv(INPUT_CSV)
    df_pos['target'] = 1  # 1 = Landslide occurred
    
    print(f"[INFO] Loaded {len(df_pos)} actual landslide events (Target = 1).")
    
    # 2. Generate Negative Samples (Target = 0)
    # We will create an equal number of safe scenarios to balance the dataset
    
    # Scenario A: Steep terrain, but NO rain (Dry season)
    df_neg_dry = df_pos.copy()
    df_neg_dry['target'] = 0
    # Set rainfall to random very low amounts (0 to 5 mm)
    df_neg_dry['rain_event_day_mm'] = np.random.uniform(0, 5, len(df_neg_dry))
    df_neg_dry['rain_3d_sum_mm'] = np.random.uniform(0, 10, len(df_neg_dry))
    df_neg_dry['rain_7d_sum_mm'] = np.random.uniform(0, 15, len(df_neg_dry))
    
    # Scenario B: Heavy rain, but FLAT terrain (Safe valleys/plains)
    df_neg_flat = df_pos.copy()
    df_neg_flat['target'] = 0
    # Set slope to very flat angles (0 to 5 degrees) and elevation lower
    df_neg_flat['slope'] = np.random.uniform(0, 5, len(df_neg_flat))
    df_neg_flat['elevation'] = df_neg_flat['elevation'] * 0.5 
    
    # 3. Combine everything into one master dataset
    df_final = pd.concat([df_pos, df_neg_dry, df_neg_flat], ignore_index=True)
    
    # Shuffle the dataset randomly so the AI doesn't memorize the order
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # 4. Select only the columns the Machine Learning model needs
    features = [
        'elevation', 'slope', 'aspect', 
        'clay_percent', 'sand_percent', 'silt_percent', 'bulk_density',
        'rain_event_day_mm', 'rain_3d_sum_mm', 'rain_7d_sum_mm', 
        'target'
    ]
    
    # Filter out any rows that might have missing data
    df_ml = df_final[features].dropna()
    
    # Save the final ML dataset
    df_ml.to_csv(OUTPUT_CSV, index=False)
    
    print(f"\n[🎉 SUCCESS] Machine Learning Dataset generated!")
    print(f"Total rows: {len(df_ml)} ({len(df_pos)} Danger / {len(df_neg_dry) + len(df_neg_flat)} Safe)")
    print(f"File saved to: {OUTPUT_CSV}")
    print("\nNext stop: Training the XGBoost Model!")

if __name__ == "__main__":
    main()