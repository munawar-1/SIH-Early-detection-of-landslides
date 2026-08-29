import type { GridPoint, SummaryStatsData, TransportSegment } from '../types/landslide';
import { isPointInDimaHasao } from '../data/dimaHasaoBoundary';

const API_BASE_URL = 'http://localhost:8080/api/predictions';

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

      // Distance to the Borail Mountain Ridge axis (running SW from 25.08,92.65 to NE 25.35,93.15)
      // Vector projection distance from line:
      const t = Math.max(0, Math.min(1, ((lat - 25.05) * 0.3 + (lon - 92.60) * 0.5) / 0.34));
      const projLat = 25.05 + t * 0.30;
      const projLon = 92.60 + t * 0.50;
      const distFromRidge = Math.sqrt(Math.pow(lat - projLat, 2) + Math.pow(lon - projLon, 2));

      // Elevation: Higher near the central Borail ridge (up to 1,350m near Haflong/Jatinga), lower in valleys (200m)
      const ridgeProximity = Math.max(0, 1 - distFromRidge / 0.28);
      const elevation = Math.round(220 + ridgeProximity * 850 + Math.sin(lat * 40) * 120 + pseudoNoise * 80);

      // Slope: Borail escarpments have steep slopes (28° - 56°), while river valleys have lower slopes (6° - 18°)
      let slope = Math.round((8 + ridgeProximity * 36 + Math.cos(lon * 50) * 8 + pseudoNoise * 10) * 10) / 10;
      slope = Math.max(4.0, Math.min(62.0, slope));

      // Clay percentage: 22% - 42% (typical Dima Hasao acidic clay-loam / shale soil)
      const clayPercent = Math.round((24 + Math.sin(lat * 30 + lon * 25) * 10 + pseudoNoise * 8) * 10) / 10;

      // 3-Day Forecast Rainfall (mm) - High monsoon saturation over South Borail & Jatinga windward slope
      const orographicRain = ridgeProximity * 28;
      const rainDay1 = Math.round((22 + orographicRain + Math.sin(lat * 15) * 12 + pseudoNoise * 8) * 10) / 10;
      const rainDay2 = Math.round((30 + orographicRain * 1.3 + Math.cos(lon * 18) * 15 + pseudoNoise * 10) * 10) / 10;
      const rainDay3 = Math.round((14 + orographicRain * 0.7 + Math.sin(lon * 22) * 10 + pseudoNoise * 6) * 10) / 10;

      // ML Random Forest probability proxy formula:
      // Feature weights: Slope (45%), Cumulative Rainfall Saturation (40%), Clay Content (15%)
      const slopeFactor = Math.pow(Math.max(0, slope - 12) / 42, 1.25);
      const total3DayRain = rainDay1 * 0.5 + rainDay2 * 0.35 + rainDay3 * 0.15;
      const rainFactor = Math.min(1.0, Math.pow(Math.max(0, total3DayRain - 15) / 55, 1.1));
      const clayFactor = Math.min(1.0, clayPercent / 42);

      let rawProb = (slopeFactor * 0.46) + (rainFactor * 0.40) + (clayFactor * 0.14);
      rawProb = Math.min(0.96, Math.max(0.04, rawProb + (pseudoNoise * 0.08 - 0.04)));
      const probability = Math.round(rawProb * 1000) / 1000;

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

/**
 * Fetch all grid point predictions from Spring Boot backend (http://localhost:8080)
 */
export async function fetchGridPredictions(): Promise<{ data: GridPoint[]; isFallback: boolean }> {
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
      return { data, isFallback: false };
    }
    throw new Error('Empty response from backend');
  } catch (error) {
    console.info('ℹ️ Spring Boot ML backend is not running on :8080. Using simulated Dima Hasao GIS baseline.');
    return { data: generateFallbackGridData(), isFallback: true };
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
      message: 'Backend server (:8080) is offline. Recalculating using local GIS simulation.',
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
