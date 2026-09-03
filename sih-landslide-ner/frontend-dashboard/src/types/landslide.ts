export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface GridPoint {
  id: number;
  district: string;
  latitude: number;
  longitude: number;
  elevation: number;
  slope: number;
  clayPercent: number;
  rainDay1: number;
  rainDay2: number;
  rainDay3: number;
  probability: number;
  riskLevel: RiskLevel;
  lastUpdated?: string;
}

export type ForecastHorizon = '24h' | '48h' | '72h';

export type BaseMapType = 'dark' | 'satellite' | 'topo' | 'osm';

export interface TransportSegment {
  id: string;
  name: string;
  type: 'railway' | 'highway' | 'state_highway';
  code: string;
  description: string;
  coordinates: [number, number][]; // [lat, lon]
  lengthKm: number;
  // Computed dynamic risk metrics
  averageSlope: number;
  maxSlope: number;
  threatLevel: 'SAFE' | 'WATCH' | 'WARNING' | 'CRITICAL';
  vulnerablePointsCount: number;
  maxNearbyProbability: number;
  advisory: string;
  speedLimitKmh?: number;
  recommendedSpeedKmh?: number;
}

export interface HighwayMicroSegment extends TransportSegment {
  highwayCode: string;
  segmentKm: number;
  kmStart: number;
  kmEnd: number;
  isAtRisk: boolean;
  riskReasons: string[];
}


export interface StationNode {
  id: string;
  name: string;
  type: 'railway_station' | 'town' | 'critical_infrastructure';
  coordinates: [number, number]; // [lat, lon]
  elevationM: number;
  vulnerabilityStatus: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  notes: string;
}

export interface FilterState {
  minRiskLevel: 'ALL' | 'MODERATE_HIGH' | 'HIGH_ONLY';
  minSlope: number;
  minRainfall: number;
  forecastHorizon: ForecastHorizon;
  showHeatmap: boolean;
  showGridPoints: boolean;
  showRailways: boolean;
  showHighways: boolean;
  showStations: boolean;
  showHistoricalIncidents: boolean;
  baseMap: BaseMapType;
}

export interface SummaryStatsData {
  totalPoints: number;
  monitoredAreaSqKm: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  averageSlope: number;
  maxProbability: number;
  peakRainfall: number;
  criticalRailwayKm: number;
  criticalHighwayKm: number;
}
