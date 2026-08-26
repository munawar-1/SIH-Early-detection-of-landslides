import os
import pandas as pd

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_CSV = os.path.join(SCRIPT_DIR, "..", "raw", "Global_Landslide_Catalog_Export_rows.csv")
OUTPUT_CSV = os.path.join(SCRIPT_DIR, "..", "processed", "ner_landslides_raw.csv")

# NER (North Eastern Region of India) geographical and administrative filters
NER_STATES = [
    'Assam', 'Arunachal Pradesh', 'Arunāchal Pradesh',
    'Manipur', 'Meghalaya', 'Meghālaya',
    'Mizoram', 'Nagaland', 'Nāgāland',
    'Sikkim', 'Tripura'
]

# NER bounding box: Lat ~21.5°N - 29.8°N, Lon ~87.5°E - 97.5°E
NER_BBOX = {
    'min_lat': 21.5,
    'max_lat': 29.8,
    'min_lon': 87.5,
    'max_lon': 97.5
}

def filter_ner_events(raw_file_path: str, output_file_path: str, include_border_bbox: bool = True):
    print(f"[INFO] Loading raw dataset from: {raw_file_path}")
    df = pd.read_csv(raw_file_path)
    print(f"[INFO] Total global records in raw catalog: {len(df)}")
    
    # Ensure coordinates are numeric and valid
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
    df = df.dropna(subset=['latitude', 'longitude'])
    
    # Filter 1: By NER State name in India
    state_mask = (df['country_name'] == 'India') & (df['admin_division_name'].isin(NER_STATES))
    
    # Filter 2: By NER geographic bounding box in India / NER Region
    bbox_mask = (
        (df['latitude'] >= NER_BBOX['min_lat']) &
        (df['latitude'] <= NER_BBOX['max_lat']) &
        (df['longitude'] >= NER_BBOX['min_lon']) &
        (df['longitude'] <= NER_BBOX['max_lon'])
    )
    
    if include_border_bbox:
        # Includes NER states plus India landslide events occurring within NER bounding box (e.g. Darjeeling/Kalimpong hill region)
        ner_df = df[state_mask | ((df['country_name'] == 'India') & bbox_mask)].copy()
    else:
        ner_df = df[state_mask].copy()
    
    # Standardize event_id -> id
    if 'event_id' in ner_df.columns:
        ner_df['id'] = ner_df['event_id']
    
    # Parse and standardize event_date to YYYY-MM-DD
    if 'event_date' in ner_df.columns:
        ner_df['event_date_formatted'] = pd.to_datetime(ner_df['event_date'], format='mixed', errors='coerce').dt.strftime('%Y-%m-%d')
    
    # Sort chronologically or by ID
    ner_df = ner_df.sort_values(by='id').reset_index(drop=True)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)
    ner_df.to_csv(output_file_path, index=False)
    
    print(f"\n[SUCCESS] Filtered {len(ner_df)} landslide events for the North-Eastern Region (NER)!")
    print(f"[SUCCESS] Saved to: {output_file_path}")
    print("\n--- Breakdown by Admin Division / State ---")
    print(ner_df['admin_division_name'].value_counts())
    print("\n--- Preview of Filtered Data ---")
    preview_cols = [c for c in ['id', 'event_date_formatted', 'admin_division_name', 'latitude', 'longitude', 'landslide_category', 'landslide_trigger'] if c in ner_df.columns]
    print(ner_df[preview_cols].head(10))

if __name__ == "__main__":
    filter_ner_events(RAW_CSV, OUTPUT_CSV)
