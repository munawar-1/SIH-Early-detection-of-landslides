export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface GridPoint {
  id: number;
  district: string;
  latitude: number;
  longitude: number;
  elevation: number;
  slope: number;
  clayPercent: number;
  /** The following terrain/soil properties are sent with the point to the ML service. */
  aspect?: number;
  aspectSin?: number;
  aspectCos?: number;
  sandPercent?: number;
  siltPercent?: number;
  bulkDensity?: number;
  shearStressFactor?: number;
  rainDay1: number;
  rainDay2: number;
  rainDay3: number;
  probability: number;
  riskLevel: RiskLevel;
  lastUpdated?: string;
}

export type ForecastHorizon = '24h' | '48h' | '72h';

export type BaseMapType = 'dark' | 'satellite' | 'topo' | 'osm';

export interface BlockedSubSegment {
  id: string;
  name: string;
  kmStart: number;
  kmEnd: number;
  hazardProbability: number;
  hazardReason: string;
  coordinates: [number, number][];
}

export interface TrafficDiversion {
  id: string;
  sourceCorridorId: string;
  sourceCorridorName: string;
  hazardZoneName: string;
  hazardKmStart: number;
  hazardKmEnd: number;
  hazardLengthKm: number;
  hazardProbability: number;
  hazardCoordinates: [number, number][]; // Localized blocked stretch (pulsing red)
  diversionJunction: {
    name: string;
    coordinates: [number, number]; // [lat, lon]
    junctionCode: string;
    description: string;
  };
  bypassRouteId: string;
  bypassRouteName: string;
  bypassCoordinates: [number, number][]; // Alternative detour path
  status: 'ACTIVE' | 'STANDBY';
  advisory: string;
  permittedVehicles: string;
  additionalTravelTimeMinutes: number;
  efficiencyRating?: 'OPTIMAL' | 'MODERATE' | 'EMERGENCY_ONLY';
  detourDistanceKm?: number;
  safetyAdvantagePct?: number; // e.g. 78% lower risk than the blocked slide zone
  roadCapacityStatus?: string; // e.g. "Paved 2-lane ridge road, bridge load rating Class 70R"
  heavyVehicleAdvice?: string; // e.g. "Freight >16T staged at Lumding/Jatinga truck bays"
}

export interface TransportSegment {
  id: string;
  name: string;
  type: 'railway' | 'highway' | 'state_highway' | 'connecting_road';
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
  // Dynamic Diversion & Bottleneck Isolation
  hasActiveDiversion?: boolean;
  diversionDetails?: TrafficDiversion;
  blockedSubSegments?: BlockedSubSegment[];
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

export interface PublicReport {
  id: number;
  mediaUrl: string;
  mediaType: 'PHOTO' | 'VIDEO';
  category: 'Crack' | 'Slope Movement' | 'Blocked Road' | 'Other' | string;
  latitude: number;
  longitude: number;
  locationName?: string;
  description?: string;
  uploaderPhone?: string;
  verified: boolean;
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}
