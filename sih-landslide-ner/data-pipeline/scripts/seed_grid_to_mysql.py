"""
Standalone script to seed the Dima Hasao regional static grid directly into MySQL.
"""
import os
import pandas as pd
# pyrefly: ignore [missing-import]
import mysql.connector

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_PATH = os.path.join(BASE_DIR, "data-pipeline", "processed", "Dima-Hasao_grid.csv")

DB_CONFIG = {
    'user': 'root',
    'password': 'monu2007',  # Matches application.properties
    'host': 'localhost',
    'port': 3306,
    'database': 'landslide_db'
}

def seed_database():
    if not os.path.exists(CSV_PATH):
        print(f"❌ Grid file not found at {CSV_PATH}")
        return

    print(f"Reading {CSV_PATH}...")
    df = pd.read_csv(CSV_PATH)
    print(f"Found {len(df)} grid points.")

    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("Connected to MySQL successfully.")

        # Ensure table exists with compatible schema if not yet created by Hibernate
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS grid_points (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                district VARCHAR(100) NOT NULL DEFAULT 'Dima Hasao',
                latitude DOUBLE NOT NULL,
                longitude DOUBLE NOT NULL,
                elevation DOUBLE,
                slope DOUBLE NOT NULL,
                clay_percent DOUBLE NOT NULL,
                rain_day1 DOUBLE DEFAULT 0.0,
                rain_day2 DOUBLE DEFAULT 0.0,
                rain_day3 DOUBLE DEFAULT 0.0,
                probability DOUBLE DEFAULT 0.0,
                risk_level VARCHAR(50) DEFAULT 'LOW',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_lat_lon (latitude, longitude),
                INDEX idx_district (district),
                INDEX idx_risk_level (risk_level)
            ) ENGINE=InnoDB;
        """)

        cursor.execute("SELECT COUNT(*) FROM grid_points;")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"Table already contains {count} records. Truncating to re-seed fresh...")
            cursor.execute("TRUNCATE TABLE grid_points;")

        insert_sql = """
            INSERT INTO grid_points (district, latitude, longitude, elevation, slope, clay_percent, risk_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        records = [
            (
                "Dima Hasao",
                row['latitude'],
                row['longitude'],
                row['elevation'],
                row['slope'],
                row['clay_percentage'],
                "LOW"
            )
            for _, row in df.iterrows()
        ]

        batch_size = 1000
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            cursor.executemany(insert_sql, batch)
            conn.commit()
            print(f"Inserted {min(i + batch_size, len(records))}/{len(records)} records...")

        print("✅ Direct MySQL seeding completed successfully!")
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error during database seeding: {e}")
        print("Tip: You can also simply run the Spring Boot backend, and it will automatically seed the database on startup via DataSeeder.java.")

if __name__ == "__main__":
    seed_database()
