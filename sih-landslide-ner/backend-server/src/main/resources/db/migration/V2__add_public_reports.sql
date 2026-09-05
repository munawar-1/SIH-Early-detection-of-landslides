-- V2__add_public_reports.sql
-- Schema migration for Geo-Tagged Public Citizen Observation Reports

CREATE TABLE IF NOT EXISTS public_reports (
    id BIGSERIAL PRIMARY KEY,
    media_url VARCHAR(500) NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- 'PHOTO', 'VIDEO'
    category VARCHAR(50) NOT NULL,   -- 'Crack', 'Slope Movement', 'Blocked Road', 'Other'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_name VARCHAR(255),
    description TEXT,
    uploader_phone VARCHAR(30),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_public_reports_created_at ON public_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_reports_verified ON public_reports (verified);
CREATE INDEX IF NOT EXISTS idx_public_reports_category ON public_reports (category);
CREATE INDEX IF NOT EXISTS idx_public_reports_lat_lon ON public_reports (latitude, longitude);
