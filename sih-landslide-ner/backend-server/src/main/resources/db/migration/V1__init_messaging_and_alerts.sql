-- V1__init_messaging_and_alerts.sql
-- PostGIS Extension and Alerting Schema for NER-Landslide GIS

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Risk Zones Table (Geospatial Grid & Polygons with PostGIS geography)
CREATE TABLE IF NOT EXISTS risk_zones (
    id BIGSERIAL PRIMARY KEY,
    district VARCHAR(100) NOT NULL DEFAULT 'Dima Hasao',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION,
    slope DOUBLE PRECISION NOT NULL,
    clay_percent DOUBLE PRECISION NOT NULL,
    rain_day1 DOUBLE PRECISION DEFAULT 0.0,
    rain_day2 DOUBLE PRECISION DEFAULT 0.0,
    rain_day3 DOUBLE PRECISION DEFAULT 0.0,
    probability DOUBLE PRECISION DEFAULT 0.0,
    risk_level VARCHAR(50) DEFAULT 'LOW',
    geom geography(Point, 4326),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_zones_geom ON risk_zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_risk_zones_risk_level ON risk_zones (risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_zones_lat_lon ON risk_zones (latitude, longitude);

-- 2. Citizen Mobile Users Table
CREATE TABLE IF NOT EXISTS users_mobile (
    id BIGSERIAL PRIMARY KEY,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    firebase_uid VARCHAR(128),
    district VARCHAR(100) DEFAULT 'Dima Hasao',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_known_location geography(Point, 4326),
    last_location_at TIMESTAMP,
    location_consent BOOLEAN NOT NULL DEFAULT TRUE,
    fcm_token TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON users_mobile (mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_mobile_firebase_uid ON users_mobile (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_mobile_location ON users_mobile USING GIST (last_known_location);

-- 3. Local Authority Contacts Table
CREATE TABLE IF NOT EXISTS authority_contacts (
    id BIGSERIAL PRIMARY KEY,
    district VARCHAR(100) NOT NULL,
    role VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_authority_contacts_district ON authority_contacts (district);

-- 4. Alert Dispatch and Cooldown Log Table
CREATE TABLE IF NOT EXISTS alert_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NULL REFERENCES users_mobile(id) ON DELETE SET NULL,
    authority_contact_id BIGINT NULL REFERENCES authority_contacts(id) ON DELETE SET NULL,
    risk_zone_id BIGINT NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'PUSH', 'SMS'
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cooldown_expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_log_user_zone ON alert_log (user_id, risk_zone_id, cooldown_expires_at);
CREATE INDEX IF NOT EXISTS idx_alert_log_auth_zone ON alert_log (authority_contact_id, risk_zone_id, cooldown_expires_at);
CREATE INDEX IF NOT EXISTS idx_alert_log_sent_at ON alert_log (sent_at DESC);
