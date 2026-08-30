import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
INPUT_CSV = os.path.join(BASE_DIR, "processed", "ner_landslides_final.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "processed", "ml_training_dataset_advanced.csv")

def generate_advanced_dataset():
    print(f"Loading base historical landslide records from {INPUT_CSV}...")
    df_raw = pd.read_csv(INPUT_CSV)
    print(f"Loaded {len(df_raw)} raw historical events across North-East India.")

    records = []

    # Flat valley coordinates across Brahmaputra & Barak river basins for flood/rain negative samples
    flat_valley_pool = [
        (26.1445, 91.7362, 55.0, 1.8, 22.0, 48.0, 30.0, 1.35), # Guwahati plains
        (26.7509, 92.7926, 48.0, 1.4, 21.0, 52.0, 27.0, 1.38), # Tezpur plains
        (27.4728, 94.9120, 108.0, 1.9, 23.5, 45.0, 31.5, 1.32), # Dibrugarh basin
        (24.8333, 92.7789, 25.0, 1.2, 24.0, 42.0, 34.0, 1.40), # Silchar Barak valley
        (26.3212, 91.0065, 42.0, 1.5, 20.5, 50.0, 29.5, 1.36), # Barpeta floodplain
        (26.0207, 89.9744, 38.0, 1.6, 22.5, 47.0, 30.5, 1.37), # Dhubri floodplain
        (26.5413, 88.7196, 75.0, 2.1, 23.0, 46.0, 31.0, 1.34), # Jalpaiguri duars
    ]

    for idx, row in df_raw.iterrows():
        event_id = str(row.get('id', idx))
        lat = float(row.get('latitude', 25.5))
        lon = float(row.get('longitude', 92.5))
        
        # Physical terrain and soil variables with safe defaults
        elevation = float(row.get('elevation', 850.0))
        slope = float(row.get('slope', 38.0))
        aspect = float(row.get('aspect', 145.0))
        clay = float(row.get('clay_percent', 34.0))
        sand = float(row.get('sand_percent', 28.0))
        silt = float(row.get('silt_percent', 38.0))
        bulk_density = float(row.get('bulk_density', 1.25))

        # Precipitation metrics
        rain_day_1 = float(row.get('rain_event_day_mm', 45.0))
        rain_3d = float(row.get('rain_3d_sum_mm', 95.0))
        rain_7d = float(row.get('rain_7d_sum_mm', 185.0))

        # Trigonometric aspect transforms (continuous compass cycle)
        aspect_sin = np.sin(np.radians(aspect))
        aspect_cos = np.cos(np.radians(aspect))

        # 7-day Antecedent Precipitation Index (API_7 with 0.84 exponential moisture decay)
        rain_7d_api = rain_day_1 + (rain_3d - rain_day_1) * 0.84 + (rain_7d - rain_3d) * (0.84**3)

        # Geotechnical Hydro-Mechanical Destabilization Index
        # Combines driving shear stress (sin(slope)) with pore pressure head (rain_7d_api * clay) and drainage dissipation (1 + sand%)
        slope_rad = np.radians(slope)
        pore_pressure_index = (np.sin(slope_rad) * (rain_7d_api * clay)) / (100.0 * max(0.8, bulk_density) * (1.0 + sand / 100.0))

        # ==========================================================
        # 1. POSITIVE SAMPLE: Real Landslide Event (Target = 1)
        # Critical slope instability under severe antecedent triggering rainfall
        # ==========================================================
        records.append({
            'sample_id': f"{event_id}_pos",
            'cluster_group': event_id,
            'sample_type': 'real_landslide_event',
            'latitude': lat,
            'longitude': lon,
            'slope': slope,
            'elevation': elevation,
            'aspect_sin': round(aspect_sin, 4),
            'aspect_cos': round(aspect_cos, 4),
            'clay_percent': round(clay, 2),
            'sand_percent': round(sand, 2),
            'silt_percent': round(silt, 2),
            'bulk_density': round(bulk_density, 3),
            'rain_day_minus_1_mm': round(rain_day_1, 2),
            'rain_3d_sum_mm': round(rain_3d, 2),
            'rain_7d_api_mm': round(rain_7d_api, 2),
            'pore_pressure_index': round(pore_pressure_index, 4),
            'target': 1
        })

        # ==========================================================
        # 2. NEGATIVE SAMPLE A: Normal/Moderate Monsoon Rain on Stable Hill Slopes (Target = 0)
        # Teaches the model: Standard hill slopes (20°-38°) remain STABLE during routine seasonal rain (15-60mm).
        # ==========================================================
        mod_rain_1 = float(np.random.uniform(8.0, 28.0))
        mod_rain_3d = mod_rain_1 + float(np.random.uniform(10.0, 35.0))
        mod_rain_7d = mod_rain_1 + (mod_rain_3d - mod_rain_1) * 0.84 + float(np.random.uniform(15.0, 30.0)) * (0.84**3)
        mod_pore_pressure = (np.sin(slope_rad) * (mod_rain_7d * clay)) / (100.0 * max(0.8, bulk_density) * (1.0 + sand / 100.0))

        records.append({
            'sample_id': f"{event_id}_monsoon_stable",
            'cluster_group': event_id,
            'sample_type': 'normal_monsoon_stable_slope',
            'latitude': lat + float(np.random.uniform(-0.02, 0.02)),
            'longitude': lon + float(np.random.uniform(-0.02, 0.02)),
            'slope': slope,
            'elevation': elevation,
            'aspect_sin': round(aspect_sin, 4),
            'aspect_cos': round(aspect_cos, 4),
            'clay_percent': round(clay, 2),
            'sand_percent': round(sand, 2),
            'silt_percent': round(silt, 2),
            'bulk_density': round(bulk_density, 3),
            'rain_day_minus_1_mm': round(mod_rain_1, 2),
            'rain_3d_sum_mm': round(mod_rain_3d, 2),
            'rain_7d_api_mm': round(mod_rain_7d, 2),
            'pore_pressure_index': round(mod_pore_pressure, 4),
            'target': 0
        })

        # ==========================================================
        # 3. NEGATIVE SAMPLE B: Dry Season on Steep Slopes (Target = 0)
        # Teaches the model: Steep slope alone without moisture does not fail.
        # ==========================================================
        dry_rain_1 = max(0.0, float(np.random.uniform(0.0, 3.0)))
        dry_rain_3d = max(0.0, dry_rain_1 + float(np.random.uniform(0.0, 5.0)))
        dry_rain_7d_api = max(0.0, dry_rain_3d + float(np.random.uniform(0.0, 6.0)))
        dry_pore_pressure = (np.sin(slope_rad) * (dry_rain_7d_api * clay)) / (100.0 * max(0.8, bulk_density) * (1.0 + sand / 100.0))

        records.append({
            'sample_id': f"{event_id}_dry",
            'cluster_group': event_id,
            'sample_type': 'dry_season_steep_slope',
            'latitude': lat,
            'longitude': lon,
            'slope': slope,
            'elevation': elevation,
            'aspect_sin': round(aspect_sin, 4),
            'aspect_cos': round(aspect_cos, 4),
            'clay_percent': round(clay, 2),
            'sand_percent': round(sand, 2),
            'silt_percent': round(silt, 2),
            'bulk_density': round(bulk_density, 3),
            'rain_day_minus_1_mm': round(dry_rain_1, 2),
            'rain_3d_sum_mm': round(dry_rain_3d, 2),
            'rain_7d_api_mm': round(dry_rain_7d_api, 2),
            'pore_pressure_index': round(dry_pore_pressure, 4),
            'target': 0
        })

        # ==========================================================
        # 4. NEGATIVE SAMPLE C: Heavy Monsoon on Flat Valley Plains (Target = 0)
        # Teaches the model: Heavy rainfall on flat ground causes inundation, not landslides.
        # ==========================================================
        flat_val = flat_valley_pool[idx % len(flat_valley_pool)]
        f_lat, f_lon, f_elev, f_slope, f_clay, f_sand, f_silt, f_bd = flat_val
        f_aspect_sin = round(float(np.sin(np.radians(np.random.uniform(0, 360)))), 4)
        f_aspect_cos = round(float(np.cos(np.radians(np.random.uniform(0, 360)))), 4)
        f_slope_rad = np.radians(f_slope)

        flat_rain_1 = rain_day_1 * float(np.random.uniform(0.85, 1.25))
        flat_rain_3d = rain_3d * float(np.random.uniform(0.9, 1.3))
        flat_rain_7d_api = rain_7d_api * float(np.random.uniform(0.9, 1.25))
        flat_pore_pressure = (np.sin(f_slope_rad) * (flat_rain_7d_api * f_clay)) / (100.0 * f_bd * (1.0 + f_sand / 100.0))

        records.append({
            'sample_id': f"{event_id}_flat",
            'cluster_group': event_id,
            'sample_type': 'monsoon_flat_floodplain',
            'latitude': f_lat,
            'longitude': f_lon,
            'slope': round(f_slope, 2),
            'elevation': round(f_elev, 1),
            'aspect_sin': f_aspect_sin,
            'aspect_cos': f_aspect_cos,
            'clay_percent': round(f_clay, 2),
            'sand_percent': round(f_sand, 2),
            'silt_percent': round(f_silt, 2),
            'bulk_density': round(f_bd, 3),
            'rain_day_minus_1_mm': round(flat_rain_1, 2),
            'rain_3d_sum_mm': round(flat_rain_3d, 2),
            'rain_7d_api_mm': round(flat_rain_7d_api, 2),
            'pore_pressure_index': round(flat_pore_pressure, 4),
            'target': 0
        })

        # ==========================================================
        # 5. NEGATIVE SAMPLE D: Permeable Sandy Slopes (Target = 0)
        # Teaches the model: Permeable coarse soils drain moisture rapidly.
        # ==========================================================
        g_slope = float(np.random.uniform(12.0, 26.0))
        g_elev = float(np.random.uniform(250.0, 750.0))
        g_sand = float(np.random.uniform(50.0, 68.0))
        g_clay = float(np.random.uniform(10.0, 18.0))
        g_silt = 100.0 - (g_sand + g_clay)
        g_bd = 1.32
        g_slope_rad = np.radians(g_slope)
        g_rain_1 = rain_day_1 * 0.70
        g_rain_3d = rain_3d * 0.75
        g_rain_7d_api = rain_7d_api * 0.72
        g_pore_pressure = (np.sin(g_slope_rad) * (g_rain_7d_api * g_clay)) / (100.0 * g_bd * (1.0 + g_sand / 100.0))

        records.append({
            'sample_id': f"{event_id}_permeable",
            'cluster_group': event_id,
            'sample_type': 'permeable_slope',
            'latitude': lat + float(np.random.uniform(-0.04, 0.04)),
            'longitude': lon + float(np.random.uniform(-0.04, 0.04)),
            'slope': round(g_slope, 2),
            'elevation': round(g_elev, 1),
            'aspect_sin': round(aspect_sin, 4),
            'aspect_cos': round(aspect_cos, 4),
            'clay_percent': round(g_clay, 2),
            'sand_percent': round(g_sand, 2),
            'silt_percent': round(g_silt, 2),
            'bulk_density': round(g_bd, 3),
            'rain_day_minus_1_mm': round(g_rain_1, 2),
            'rain_3d_sum_mm': round(g_rain_3d, 2),
            'rain_7d_api_mm': round(g_rain_7d_api, 2),
            'pore_pressure_index': round(g_pore_pressure, 4),
            'target': 0
        })

    df_out = pd.DataFrame(records)
    df_out.to_csv(OUTPUT_CSV, index=False)
    print(f"\n✅ Advanced Geotechnical Dataset saved to {OUTPUT_CSV}")
    print(f"Total samples: {len(df_out)} across {df_out['cluster_group'].nunique()} unique event clusters.")
    print("Class Balance:")
    print(df_out['target'].value_counts())

if __name__ == "__main__":
    generate_advanced_dataset()
