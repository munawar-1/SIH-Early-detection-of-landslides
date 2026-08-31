import type { GridPoint, SummaryStatsData, TransportSegment } from '../types/landslide';
import { isPointInDimaHasao } from '../data/dimaHasaoBoundary';

const BACKEND_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const API_BASE_URL = `${BACKEND_BASE}/api/predictions`;

/**
 * Generates synthetic Dima Hasao grid dataset strictly clipped within the authentic district boundary polygon.
 * Bounds: Lat 24.95° to 25.85° N, Lon 92.48° to 93.32° E
 */
/**
 * Generates realistic Dima Hasao baseline grid dataset strictly clipped within the authentic district boundary polygon.
 * Spatially modeled along the Borail Mountain Range topography (Haflong, Jatinga, Mahur, Harangajao).
 * Resolution: ~1km spatial sampling (~1,400 points within district perimeter).
 */
export function generateFallbackGridData(): GridPoint[] {
  const points: GridPoint[] = [];
  let idCounter = 1;

  // Spatial sampling (0.010° step ~1.1km resolution)
  const latMin = 24.95, latMax = 25.85, latStep = 0.010;
  const lonMin = 92.48, lonMax = 93.32, lonStep = 0.010;

  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lon = lonMin; lon <= lonMax; lon += lonStep) {
      // Strictly clip: only include points that fall INSIDE the authentic Dima Hasao district polygon
      if (!isPointInDimaHasao(lat, lon)) {
        continue;
      }

      // Deterministic pseudo-random seed based on coordinate hash to prevent flickering on refresh
      const coordSeed = Math.sin(lat * 123.45 + lon * 678.9) * 10000;
      const pseudoNoise = coordSeed - Math.floor(coordSeed);
      const noise2 = Math.sin(lat * 43.17 - lon * 81.33) * 0.5 + 0.5;

      // Authentic Geological Mountain Systems of Dima Hasao:
      // 1. Central Borail Ridge & Jatinga/Haflong Escarpment (Steepest ghat zone)
      const borailDist = Math.hypot(lat - 25.18, (lon - 92.76) * 1.3);
      // 2. Harangajao / Ditokcherra southern fault scarp (Active railway cutting slide zone)
      const harangajaoDist = Math.hypot(lat - 25.08, (lon - 92.84) * 1.5);
      // 3. Eastern Mahur / Asalu mountain spurs
      const mahurDist = Math.hypot(lat - 25.32, (lon - 93.12) * 1.2);

      // Natural mountain ridge influence with realistic falloff
      const ridgeInfluence = 
        Math.exp(-Math.pow(borailDist / 0.15, 2)) * 0.92 +
        Math.exp(-Math.pow(harangajaoDist / 0.11, 2)) * 0.88 +
        Math.exp(-Math.pow(mahurDist / 0.14, 2)) * 0.65;

      // Major River Valleys & Low-Slope Flood Basins (Kopili Basin, Diyung Valley, Langting)
      const kopiliRiver = Math.abs((lat - 25.55) - (lon - 92.68) * 0.8);
      const diyungRiver = Math.abs((lat - 25.40) + (lon - 93.00) * 0.4 - 62.6);
      const valleyDamping = Math.min(1.0, Math.max(0.2, Math.min(kopiliRiver, diyungRiver) / 0.08));

      // Elevation: High peaks near Haflong/Borail (up to 1,420m), valleys at 180m - 350m
      const elevation = Math.round(
        180 + 
        ridgeInfluence * 1050 * valleyDamping + 
        (1 - (lat - 24.95) / 0.9) * 220 + 
        pseudoNoise * 60
      );

      // Slope: Borail escarpments have steep slopes (28° - 52°), while river valleys have lower slopes (3° - 14°)
      let slope = 5.5 + (ridgeInfluence * 40 * valleyDamping) + (noise2 * 10) - (1 - valleyDamping) * 7;
      slope = Math.max(2.5, Math.min(54.0, Math.round(slope * 10) / 10));

      // Clay percentage: 20% - 40% (typical Dima Hasao acidic clay-loam / shale soil)
      const clayPercent = Math.round((22 + Math.sin(lat * 20 + lon * 15) * 8 + pseudoNoise * 8) * 10) / 10;

      // 3-Day Forecast Rainfall (mm) - Orographic monsoon enhancement over South Borail & Jatinga windward slope
      const orographic = ridgeInfluence * 32;
      const rainDay1 = Math.round((14 + orographic + Math.sin(lat * 12) * 8 + pseudoNoise * 6) * 10) / 10;
      const rainDay2 = Math.round((18 + orographic * 1.25 + Math.cos(lon * 14) * 10 + pseudoNoise * 8) * 10) / 10;
      const rainDay3 = Math.round((10 + orographic * 0.65 + pseudoNoise * 5) * 10) / 10;

      // Geotechnical Hydro-Mechanical Destabilization Index Calculation
      // Real physics: Failure occurs when pore-water pressure overcomes internal friction (Mohr-Coulomb criterion)
      const slopeRad = (slope * Math.PI) / 180.0;
      const rain7dApi = rainDay1 + (rainDay2 + rainDay3) * 0.84 + 14.0 * 0.50;
      const sandPercent = Math.max(20.0, 100.0 - (clayPercent + 35.0));
      const porePressureIndex = (Math.sin(slopeRad) * (rain7dApi * clayPercent)) / (100.0 * 1.26 * (1.0 + sandPercent / 100.0));

      // Realistic Hazard Probability Curve:
      // Landslide failure requires extreme triggering combination: steep escarpment (slope > 32°) + high water saturation (PPI > 18.0)
      // Routine seasonal rain on normal hills is predominantly SAFE (Low Hazard, < 40%)
      const criticalGhatFactor = (ridgeInfluence > 0.65 && slope >= 30.0) ? 0.35 : 0.0;
      const baseProb = 1.0 / (1.0 + Math.exp(-0.32 * (porePressureIndex - 19.5)));
      const adjustedProb = Math.min(0.96, Math.max(0.02, baseProb * 0.75 + criticalGhatFactor + (pseudoNoise * 0.03 - 0.015)));
      const probability = Math.round(adjustedProb * 1000) / 1000;

      const riskLevel = probability >= 0.70 ? 'HIGH' : (probability >= 0.40 ? 'MODERATE' : 'LOW');

      points.push({
        id: idCounter++,
        district: 'Dima Hasao',
        latitude: Math.round(lat * 1000) / 1000,
        longitude: Math.round(lon * 1000) / 1000,
        elevation,
        slope,
        clayPercent,
        rainDay1,
        rainDay2,
        rainDay3,
        probability,
        riskLevel,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  return points;
}

import { saveGridPointsToCache, getCachedGridPoints } from './offlineStorageService';

/**
 * Fetch all grid point predictions from Spring Boot backend (http://localhost:8080)
 * Integrates offline resilience: caches live data into IndexedDB and falls back to IndexedDB if offline.
 */
export async function fetchGridPredictions(): Promise<{ data: GridPoint[]; isFallback: boolean; isOfflineCache?: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(API_BASE_URL, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: GridPoint[] = await response.json();
    if (data && Array.isArray(data) && data.length > 0) {
      console.log(`✅ Loaded ${data.length} live ML prediction grid points from Spring Boot backend.`);
      // Asynchronously cache to IndexedDB for offline access
      saveGridPointsToCache(data);
      return { data, isFallback: false, isOfflineCache: false };
    }
    throw new Error('Empty response from backend');
  } catch (error) {
    // Attempt offline retrieval from IndexedDB first
    try {
      const cached = await getCachedGridPoints();
      if (cached && cached.length > 0) {
        console.info(`📦 Loaded ${cached.length} grid points from local IndexedDB offline storage.`);
        return { data: cached, isFallback: true, isOfflineCache: true };
      }
    } catch (e) {
      console.warn('Could not read from IndexedDB, falling back to procedural GIS baseline.');
    }

    console.info('ℹ️ Using simulated Dima Hasao GIS baseline.');
    let fallback = generateFallbackGridData();
    // Try enriching with live Open-Meteo forecast asynchronously
    try {
      const livePoints = await fetchLiveOpenMeteoRainfall(fallback);
      if (livePoints && livePoints.length > 0) {
        fallback = livePoints;
      }
    } catch (e) {
      console.warn('Live Open-Meteo enrichment bypassed.');
    }
    saveGridPointsToCache(fallback);
    return { data: fallback, isFallback: true, isOfflineCache: false };
  }
}

/**
 * Fetch real-time Open-Meteo precipitation directly for Dima Hasao geospatial hubs
 */
export async function fetchLiveOpenMeteoRainfall(points: GridPoint[]): Promise<GridPoint[]> {
  try {
    const latSample = '25.18,25.08,25.32,25.52,25.28';
    const lonSample = '92.76,92.84,93.12,92.72,93.15';
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latSample}&longitude=${lonSample}&daily=precipitation_sum&forecast_days=3&timezone=auto`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return points;

    const weatherCenters = data.map((item: any, idx: number) => ({
      lat: [25.18, 25.08, 25.32, 25.52, 25.28][idx],
      lon: [92.76, 92.84, 93.12, 92.72, 93.15][idx],
      d1: item.daily?.precipitation_sum?.[0] ?? 12.0,
      d2: item.daily?.precipitation_sum?.[1] ?? 18.0,
      d3: item.daily?.precipitation_sum?.[2] ?? 10.0,
    }));

    return points.map(p => {
      let minDist = Infinity;
      let nearest = weatherCenters[0];
      for (const center of weatherCenters) {
        const d = Math.hypot(p.latitude - center.lat, p.longitude - center.lon);
        if (d < minDist) {
          minDist = d;
          nearest = center;
        }
      }
      const rainDay1 = Math.max(0, Math.round((nearest.d1 + (p.slope > 30 ? 2.5 : 0)) * 10) / 10);
      const rainDay2 = Math.max(0, Math.round((nearest.d2 + (p.slope > 30 ? 3.5 : 0)) * 10) / 10);
      const rainDay3 = Math.max(0, Math.round((nearest.d3 + (p.slope > 30 ? 1.8 : 0)) * 10) / 10);

      const slopeRad = (p.slope * Math.PI) / 180.0;
      const rain7dApi = rainDay1 + (rainDay2 + rainDay3) * 0.84 + 14.0 * 0.50;
      const sandPercent = Math.max(20.0, 100.0 - (p.clayPercent + 35.0));
      const porePressureIndex = (Math.sin(slopeRad) * (rain7dApi * p.clayPercent)) / (100.0 * 1.26 * (1.0 + sandPercent / 100.0));
      const criticalGhat = (p.slope >= 30.0) ? 0.30 : 0.0;
      const baseProb = 1.0 / (1.0 + Math.exp(-0.32 * (porePressureIndex - 19.5)));
      const adjustedProb = Math.min(0.96, Math.max(0.02, baseProb * 0.75 + criticalGhat));
      const probability = Math.round(adjustedProb * 1000) / 1000;
      const riskLevel: 'HIGH' | 'MODERATE' | 'LOW' = probability >= 0.70 ? 'HIGH' : (probability >= 0.40 ? 'MODERATE' : 'LOW');

      return {
        ...p,
        rainDay1,
        rainDay2,
        rainDay3,
        probability,
        riskLevel,
        lastUpdated: new Date().toISOString()
      };
    });
  } catch (err) {
    console.warn('Live Open-Meteo direct sync failed, preserving baseline:', err);
    return points;
  }
}

/**
 * Trigger backend early warning pipeline recalculation
 */
export async function triggerLivePipeline(): Promise<{ success: boolean; message: string; isLive: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const res = await response.json();
    return { success: true, message: res.message || 'Live assessment initiated on backend.', isLive: true };
  } catch (err: any) {
    return { 
      success: false, 
      message: 'Backend server (:8080) is offline. Recalculating using live Open-Meteo satellite feed & GIS simulation.',
      isLive: false 
    };
  }
}

/**
 * Calculate distance between two lat/lon points using Haversine formula in km
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Dynamically re-evaluate Transport Segments based on live GridPoints within buffer distance (1.5 km)
 */
export function evaluateTransportVulnerability(
  segments: TransportSegment[],
  gridPoints: GridPoint[],
  bufferKm: number = 2.0
): TransportSegment[] {
  return segments.map(seg => {
    let maxProb = 0;
    let highRiskNearCount = 0;
    let totalSlope = 0;
    let slopeCount = 0;
    let maxSlope = 0;

    for (const point of gridPoints) {
      // Find minimum distance to any point along the polyline
      let minDistance = Infinity;
      for (const [sLat, sLon] of seg.coordinates) {
        const d = calculateHaversineKm(point.latitude, point.longitude, sLat, sLon);
        if (d < minDistance) minDistance = d;
      }

      if (minDistance <= bufferKm) {
        if (point.probability > maxProb) maxProb = point.probability;
        if (point.riskLevel === 'HIGH') highRiskNearCount++;
        totalSlope += point.slope;
        slopeCount++;
        if (point.slope > maxSlope) maxSlope = point.slope;
      }
    }

    const avgSlope = slopeCount > 0 ? Math.round((totalSlope / slopeCount) * 10) / 10 : seg.averageSlope;

    let threatLevel: 'SAFE' | 'WATCH' | 'WARNING' | 'CRITICAL' = 'SAFE';
    let advisory = 'Normal operations. Standard track monitoring.';
    let recommendedSpeed = seg.speedLimitKmh || 60;

    if (maxProb >= 0.75 || highRiskNearCount >= 30) {
      threatLevel = 'CRITICAL';
      advisory = 'CRITICAL: Severe landslide threat nearby. Restrict speeds and deploy emergency patrols.';
      recommendedSpeed = Math.round((seg.speedLimitKmh || 60) * 0.4);
    } else if (maxProb >= 0.50 || highRiskNearCount >= 10) {
      threatLevel = 'WARNING';
      advisory = 'WARNING: Saturated slopes along corridor. Restrict night trains and monitor culverts.';
      recommendedSpeed = Math.round((seg.speedLimitKmh || 60) * 0.65);
    } else if (maxProb >= 0.35) {
      threatLevel = 'WATCH';
      advisory = 'WATCH: Moderate rainfall accumulation. Enhanced vigilance required.';
      recommendedSpeed = Math.round((seg.speedLimitKmh || 60) * 0.85);
    }

    return {
      ...seg,
      threatLevel,
      maxNearbyProbability: Math.round(maxProb * 1000) / 1000,
      vulnerablePointsCount: highRiskNearCount,
      averageSlope: avgSlope,
      maxSlope: maxSlope > 0 ? Math.round(maxSlope * 10) / 10 : seg.maxSlope,
      advisory,
      recommendedSpeedKmh: recommendedSpeed
    };
  });
}

/**
 * Compute high level summary statistics from grid points and transport segments
 */
export function computeSummaryStats(
  points: GridPoint[],
  railways: TransportSegment[],
  highways: TransportSegment[]
): SummaryStatsData {
  const highRisk = points.filter(p => p.riskLevel === 'HIGH').length;
  const modRisk = points.filter(p => p.riskLevel === 'MODERATE').length;
  const lowRisk = points.filter(p => p.riskLevel === 'LOW').length;

  const totalSlope = points.reduce((acc, p) => acc + p.slope, 0);
  const avgSlope = points.length > 0 ? Math.round((totalSlope / points.length) * 10) / 10 : 0;

  const maxProb = points.reduce((max, p) => p.probability > max ? p.probability : max, 0);
  const peakRain = points.reduce((max, p) => {
    const sum = p.rainDay1 + p.rainDay2 + p.rainDay3;
    return sum > max ? sum : max;
  }, 0);

  const criticalRail = railways
    .filter(r => r.threatLevel === 'CRITICAL' || r.threatLevel === 'WARNING')
    .reduce((acc, r) => acc + r.lengthKm, 0);

  const criticalHwy = highways
    .filter(h => h.threatLevel === 'CRITICAL' || h.threatLevel === 'WARNING')
    .reduce((acc, h) => acc + h.lengthKm, 0);

  return {
    totalPoints: points.length,
    monitoredAreaSqKm: Math.round(points.length * 0.5 * 10) / 10, // ~0.5 km² per grid cell
    highRiskCount: highRisk,
    moderateRiskCount: modRisk,
    lowRiskCount: lowRisk,
    averageSlope: avgSlope,
    maxProbability: Math.round(maxProb * 1000) / 1000,
    peakRainfall: Math.round(peakRain * 10) / 10,
    criticalRailwayKm: Math.round(criticalRail * 10) / 10,
    criticalHighwayKm: Math.round(criticalHwy * 10) / 10
  };
}
