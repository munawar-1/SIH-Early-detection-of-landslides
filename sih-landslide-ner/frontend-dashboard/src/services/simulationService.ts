import type { GridPoint } from '../types/landslide';

export type SimulationScenario = 'CLEAR_WEATHER' | 'MODERATE_MONSOON' | 'DISASTER_CLOUDBURST' | 'CUSTOM';

export interface HotspotPreset {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  zoom: number;
  infrastructure: 'railway' | 'highway' | 'settlement';
}

export const DIMA_HASAO_HOTSPOTS: HotspotPreset[] = [
  {
    id: 'jatinga_ridge',
    name: 'Jatinga Ridge (NH-27 Pass)',
    description: 'Critical mountain pass on NH-27 East-West corridor, chronic slope failure zone.',
    lat: 25.180,
    lng: 92.760,
    zoom: 13,
    infrastructure: 'highway'
  },
  {
    id: 'new_haflong',
    name: 'New Haflong Railway Station',
    description: 'Submerged and derailed in May 2022 disaster; Borail hill cutting vulnerable to mudslides.',
    lat: 25.172,
    lng: 92.835,
    zoom: 14,
    infrastructure: 'railway'
  },
  {
    id: 'harangajao_valley',
    name: 'Harangajao Valley Corridor',
    description: 'Deep gorge between Jatinga and Barak Valley; multiple active debris slide funnels.',
    lat: 25.080,
    lng: 92.840,
    zoom: 13,
    infrastructure: 'highway'
  },
  {
    id: 'ditokcherra_section',
    name: 'Ditokcherra Hill Track',
    description: 'Severed railway bridge and track foundation wash-away zone along Jatinga River.',
    lat: 25.045,
    lng: 92.865,
    zoom: 14,
    infrastructure: 'railway'
  },
  {
    id: 'mahur_hill',
    name: 'Mahur Hill Pass',
    description: 'High-elevation summit sector; intense antecedent rainfall accumulation and rockfall risk.',
    lat: 25.320,
    lng: 93.120,
    zoom: 13,
    infrastructure: 'settlement'
  }
];

/**
 * Recalculates geotechnical & hydrological risk for all Dima Hasao grid points
 * using real physical relationships:
 * - Orographic enhancement: higher elevations & windward Borail mountain slopes get more rain.
 * - Pore water pressure saturation: Sin(Slope) * (Rain_7d_API * Clay%) / (Bulk_Density * (1 + Sand%))
 * - Factor of Safety breakdown on slopes > 22° under extreme infiltration.
 */
export function applyDimaHasaoMonsoonSimulation(
  basePoints: GridPoint[],
  scenario: SimulationScenario,
  customRainfallMm: number = 180
): GridPoint[] {
  let baseRain1 = 12.0;
  let baseRain2 = 24.0;
  let baseRain3 = 18.0;

  if (scenario === 'CLEAR_WEATHER') {
    // Dry / Post-monsoon clear weather (current real-time condition)
    baseRain1 = 2.0;
    baseRain2 = 4.0;
    baseRain3 = 3.0;
  } else if (scenario === 'MODERATE_MONSOON') {
    // Normal active monsoon week (120 - 160 mm 3-day sum)
    baseRain1 = 38.0;
    baseRain2 = 58.0;
    baseRain3 = 45.0;
  } else if (scenario === 'DISASTER_CLOUDBURST') {
    // Historic May 2022 / June 2024 Dima Hasao deluge benchmark (260 - 360 mm 3-day sum)
    baseRain1 = 78.0;
    baseRain2 = 135.0;
    baseRain3 = 95.0;
  } else if (scenario === 'CUSTOM') {
    // Custom slider: customRainfallMm represents approximate 3-day accumulated rainfall
    const total = Math.max(5, customRainfallMm);
    baseRain1 = total * 0.26;
    baseRain2 = total * 0.44;
    baseRain3 = total * 0.30;
  }

  // Epicenter of localized cloudburst cell (Historic Jatinga - Haflong - Harangajao Borail fault line)
  const epicenterLat = 25.14;
  const epicenterLng = 92.81;

  return basePoints.map((p) => {
    // 1. Spatial Storm Cell: Realistic Gaussian rainfall falloff (cloudburst concentrates along Barail mountain crest)
    const dLat = (p.latitude - epicenterLat);
    const dLng = (p.longitude - epicenterLng);
    const distSq = dLat * dLat + dLng * dLng;

    // Radius of heavy storm cell is ~14 km; ambient mountain infiltration across Dima Hasao
    const stormCellFactor = Math.exp(-distSq / (2 * 0.12 * 0.12));
    const ambientRatio = scenario === 'CLEAR_WEATHER' ? 0.80 : 0.45;
    const ambientRain1 = Math.max(2.0, baseRain1 * ambientRatio);
    const ambientRain2 = Math.max(3.0, baseRain2 * ambientRatio);
    const ambientRain3 = Math.max(2.0, baseRain3 * ambientRatio);

    // Peak localized cloudburst rain added along storm track
    const rainDay1 = Math.round((ambientRain1 + (baseRain1 - ambientRain1) * stormCellFactor) * 10) / 10;
    const rainDay2 = Math.round((ambientRain2 + (baseRain2 - ambientRain2) * stormCellFactor) * 10) / 10;
    const rainDay3 = Math.round((ambientRain3 + (baseRain3 - ambientRain3) * stormCellFactor) * 10) / 10;

    // 7-day Antecedent Precipitation Index (API)
    const rain3dSum = rainDay1 + rainDay2 + rainDay3;
    const rain7dApi = rainDay1 + (rainDay2 + rainDay3) * 0.85 + ambientRain2 * 0.40;

    const slopeDeg = typeof p.slope === 'number' ? p.slope : 15.0;
    const slopeRad = (slopeDeg * Math.PI) / 180.0;
    const clay = typeof p.clayPercent === 'number' ? p.clayPercent : 26.0;
    const sand = typeof p.sandPercent === 'number' ? p.sandPercent : 35.0;
    const bulkDensity = typeof p.bulkDensity === 'number' ? p.bulkDensity : 1.18;

    // Geotechnical pore water pressure index (u_w)
    const porePressureIndex = (Math.sin(slopeRad) * (rain7dApi * clay)) / (100.0 * bulkDensity * (1.0 + sand / 100.0));

    // 2. Continuous Geotechnical S-Curve Model
    let probability = 0.05;

    if (scenario === 'CLEAR_WEATHER') {
      // In dry weather, slopes are stable; even steep slopes have low probability (< 25%)
      probability = Math.min(0.25, Math.max(0.01, (slopeDeg / 90.0) * 0.20));
    } else {
      // Physical pore-pressure and gravity shear escalation under monsoon infiltration
      const criticalBonus = slopeDeg >= 34.0 ? 0.38 : (slopeDeg >= 22.0 ? 0.22 : (slopeDeg >= 15.0 ? 0.08 : 0.0));
      const stormBonus = rain3dSum >= 240.0 ? 0.22 : (rain3dSum >= 120.0 ? 0.12 : (rain3dSum >= 60.0 ? 0.05 : 0.0));
      const baseProb = 1.0 / (1.0 + Math.exp(-0.22 * (porePressureIndex - 10.0)));
      probability = Math.min(0.96, Math.max(0.02, baseProb * 0.55 + criticalBonus + stormBonus));

      // Valleys, plateaus, gentle hills (< 12°) remain stable
      if (slopeDeg < 12.0) {
        probability = Math.min(0.18, Math.max(0.01, (slopeDeg / 20.0) * 0.12));
      }
    }

    probability = Math.round(probability * 1000) / 1000;
    const riskLevel: 'HIGH' | 'MODERATE' | 'LOW' = 
      probability >= 0.70 ? 'HIGH' : (probability >= 0.40 ? 'MODERATE' : 'LOW');

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
}
