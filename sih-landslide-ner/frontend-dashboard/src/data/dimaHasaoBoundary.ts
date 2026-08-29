/**
 * Authentic Dima Hasao District (North Cachar Hills), Assam, India
 * Geographic Polygon Boundaries & Sub-Divisions
 */

// Precise polygon outline for Dima Hasao District [lat, lon]
export const DIMA_HASAO_POLYGON: [number, number][] = [
  [25.820, 92.950], // Northern apex (bordering Karbi Anglong/Nagaon near Lanka)
  [25.840, 93.080],
  [25.800, 93.180],
  [25.750, 93.240], // North-East corner near Manderdisa/Lumding approach
  [25.680, 93.280],
  [25.580, 93.300], // Eastern border (near Nagaland foothills)
  [25.480, 93.290],
  [25.400, 93.310], // East border (bordering Manipur/Jiribam corridor)
  [25.320, 93.280],
  [25.240, 93.220],
  [25.150, 93.180],
  [25.080, 93.100],
  [25.020, 93.020], // South-East border
  [24.980, 92.920], // Southern border near Cachar (Damcherra/Chandranathpur)
  [24.960, 92.820], // South apex (near Badarpur/Ditokcherra valley)
  [24.980, 92.740],
  [25.020, 92.680], // South-West border (Harangajao / Jatinga exit)
  [25.080, 92.600],
  [25.150, 92.520], // Western border (bordering Meghalaya / Jaintia Hills)
  [25.250, 92.480],
  [25.360, 92.500],
  [25.450, 92.540],
  [25.550, 92.620], // North-West border (Umrangso / Kopili river basin)
  [25.650, 92.720],
  [25.740, 92.840],
  [25.820, 92.950]  // Closing back to apex
];

// District Center and Bounding Box
export const DIMA_HASAO_CENTER: [number, number] = [25.32, 92.88];
export const DIMA_HASAO_BOUNDS: [[number, number], [number, number]] = [
  [24.95, 92.48], // South-West
  [25.85, 93.32]  // North-East
];

/**
 * Fast Ray-Casting algorithm to check if a lat/lon coordinate is strictly inside Dima Hasao
 */
export function isPointInDimaHasao(lat: number, lon: number): boolean {
  const polygon = DIMA_HASAO_POLYGON;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lonI] = polygon[i];
    const [latJ, lonJ] = polygon[j];
    
    const intersect = ((latI > lat) !== (latJ > lat))
        && (lon < (lonJ - lonI) * (lat - latI) / (latJ - latI) + lonI);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Key Sub-Divisions of Dima Hasao
export interface SubDivision {
  id: string;
  name: string;
  hq: string;
  coordinates: [number, number];
  areaSqKm: number;
  population: number;
  riskIndex: 'HIGH' | 'MODERATE' | 'LOW';
  vulnerabilityFactor: number; // 0.0 to 1.0
}

export const SUB_DIVISIONS: SubDivision[] = [
  {
    id: 'sub-haflong',
    name: 'Haflong Sub-Division (Central / Borail Ridge)',
    hq: 'Haflong Town',
    coordinates: [25.172, 92.746],
    areaSqKm: 1420,
    population: 85000,
    riskIndex: 'HIGH',
    vulnerabilityFactor: 0.88
  },
  {
    id: 'sub-maibang',
    name: 'Maibang Sub-Division (Northern Valley)',
    hq: 'Maibang Town',
    coordinates: [25.302, 93.161],
    areaSqKm: 1680,
    population: 62000,
    riskIndex: 'MODERATE',
    vulnerabilityFactor: 0.58
  },
  {
    id: 'sub-umrangso',
    name: 'Umrangso Sub-Division (Western Kopili Plateau)',
    hq: 'Umrangso Town',
    coordinates: [25.512, 92.742],
    areaSqKm: 1150,
    population: 48000,
    riskIndex: 'MODERATE',
    vulnerabilityFactor: 0.52
  },
  {
    id: 'sub-harangajao',
    name: 'Harangajao Circle (Southern Foothills)',
    hq: 'Harangajao',
    coordinates: [25.068, 92.682],
    areaSqKm: 640,
    population: 28000,
    riskIndex: 'HIGH',
    vulnerabilityFactor: 0.82
  }
];
