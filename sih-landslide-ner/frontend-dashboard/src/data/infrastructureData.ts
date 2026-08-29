import type { TransportSegment, StationNode } from '../types/landslide';

// Historical & High-Precision GIS coordinates for Dima Hasao (NER) Transport Lifelines

export const RAILWAY_SECTIONS: TransportSegment[] = [
  {
    id: 'rail-sec-1',
    name: 'Lumding – Langting Section',
    code: 'LMG-LGT-01',
    type: 'railway',
    description: 'Northern approach through rolling foothills and bamboo forest buffers.',
    lengthKm: 34.5,
    averageSlope: 14.2,
    maxSlope: 26.8,
    threatLevel: 'SAFE',
    vulnerablePointsCount: 12,
    maxNearbyProbability: 0.28,
    speedLimitKmh: 75,
    recommendedSpeedKmh: 70,
    advisory: 'Standard operations. Normal track patrol scheduled.',
    coordinates: [
      [25.750, 93.180],
      [25.710, 93.170],
      [25.660, 93.155],
      [25.620, 93.150], // Hatikhali
      [25.560, 93.140],
      [25.500, 93.130]  // Langting
    ]
  },
  {
    id: 'rail-sec-2',
    name: 'Langting – Maibang Valley Stretch',
    code: 'LGT-MBG-02',
    type: 'railway',
    description: 'Runs along the Mahur/Langting river basin with moderate slope cuts.',
    lengthKm: 28.0,
    averageSlope: 22.4,
    maxSlope: 35.1,
    threatLevel: 'WATCH',
    vulnerablePointsCount: 48,
    maxNearbyProbability: 0.52,
    speedLimitKmh: 60,
    recommendedSpeedKmh: 45,
    advisory: 'Caution advised. Monitor river gauge and slope inclinometers.',
    coordinates: [
      [25.500, 93.130], // Langting
      [25.460, 93.145], // Dihakho
      [25.410, 93.125], // Mupa
      [25.350, 93.150],
      [25.300, 93.160]  // Maibang
    ]
  },
  {
    id: 'rail-sec-3',
    name: 'Maibang – Daotuhaja Hill Cut Corridor',
    code: 'MBG-DTH-03',
    type: 'railway',
    description: 'Steep hill cuts with high soil clay percentage; prone to debris slides during prolonged rainfall.',
    lengthKm: 22.8,
    averageSlope: 32.7,
    maxSlope: 46.5,
    threatLevel: 'WARNING',
    vulnerablePointsCount: 112,
    maxNearbyProbability: 0.74,
    speedLimitKmh: 45,
    recommendedSpeedKmh: 30,
    advisory: 'Warning: Increased saturation detected. Restrict night goods trains.',
    coordinates: [
      [25.300, 93.160], // Maibang
      [25.280, 93.100],
      [25.260, 93.000], // Wadrengdisa
      [25.230, 92.940],
      [25.200, 92.880]  // Daotuhaja
    ]
  },
  {
    id: 'rail-sec-4',
    name: 'Daotuhaja – Mahur – New Haflong Hill Section',
    code: 'DTH-NHL-04',
    type: 'railway',
    description: 'High-risk mountain section traversing the Borail range. Ground zero of 2022 disaster.',
    lengthKm: 31.2,
    averageSlope: 38.6,
    maxSlope: 54.2,
    threatLevel: 'CRITICAL',
    vulnerablePointsCount: 235,
    maxNearbyProbability: 0.89,
    speedLimitKmh: 30,
    recommendedSpeedKmh: 20,
    advisory: 'CRITICAL ALERT: Severe slope destabilization risk. Dispatch continuous track patrol.',
    coordinates: [
      [25.200, 92.880], // Daotuhaja
      [25.190, 92.850], // Phiding
      [25.180, 92.810], // Mahur
      [25.170, 92.760], // Migrendisa
      [25.160, 92.700]  // New Haflong
    ]
  },
  {
    id: 'rail-sec-5',
    name: 'New Haflong – Jatinga Lampur – Harangajao',
    code: 'NHL-HJO-05',
    type: 'railway',
    description: 'Traverses Jatinga canyon with tunnels, viaducts, and fractured shale strata.',
    lengthKm: 26.4,
    averageSlope: 36.1,
    maxSlope: 51.0,
    threatLevel: 'CRITICAL',
    vulnerablePointsCount: 198,
    maxNearbyProbability: 0.86,
    speedLimitKmh: 30,
    recommendedSpeedKmh: 20,
    advisory: 'CRITICAL ALERT: High runoff and mudflow risk near viaduct piers.',
    coordinates: [
      [25.160, 92.700], // New Haflong
      [25.140, 92.705],
      [25.120, 92.710], // Jatinga Lampur
      [25.090, 92.695],
      [25.070, 92.680]  // New Harangajao
    ]
  },
  {
    id: 'rail-sec-6',
    name: 'Harangajao – Ditokcherra – Badarpur Link',
    code: 'HJO-BPR-06',
    type: 'railway',
    description: 'Southern mountain descent toward Barak Valley. High flood and toe-erosion vulnerability.',
    lengthKm: 29.0,
    averageSlope: 28.5,
    maxSlope: 42.0,
    threatLevel: 'WARNING',
    vulnerablePointsCount: 88,
    maxNearbyProbability: 0.69,
    speedLimitKmh: 45,
    recommendedSpeedKmh: 35,
    advisory: 'Warning: Flash flood watch for Ditokcherra bridge and track embankment.',
    coordinates: [
      [25.070, 92.680], // New Harangajao
      [25.060, 92.750], // Ditokcherra
      [25.040, 92.800], // Bandarkhal
      [25.020, 92.850], // Damcherra
      [24.980, 92.860]  // Chandranathpur / Badarpur approach
    ]
  }
];

export const HIGHWAY_SECTIONS: TransportSegment[] = [
  {
    id: 'hwy-nh27-north',
    name: 'NH-27 (Lanka – Maibang Corridor)',
    code: 'NH27-N',
    type: 'highway',
    description: 'Four-lane East-West corridor entry into northern Dima Hasao.',
    lengthKm: 42.0,
    averageSlope: 16.5,
    maxSlope: 28.0,
    threatLevel: 'SAFE',
    vulnerablePointsCount: 22,
    maxNearbyProbability: 0.32,
    speedLimitKmh: 80,
    recommendedSpeedKmh: 75,
    advisory: 'All lanes operational. Clear driving conditions.',
    coordinates: [
      [25.780, 92.950],
      [25.680, 93.020],
      [25.550, 93.100],
      [25.460, 93.150],
      [25.300, 93.160]  // Maibang
    ]
  },
  {
    id: 'hwy-nh27-central',
    name: 'NH-27 (Maibang – Mahur – Haflong Pass)',
    code: 'NH27-C',
    type: 'highway',
    description: 'High-altitude mountain highway section with steep cut-slopes and retaining walls.',
    lengthKm: 38.5,
    averageSlope: 34.2,
    maxSlope: 49.8,
    threatLevel: 'WARNING',
    vulnerablePointsCount: 164,
    maxNearbyProbability: 0.78,
    speedLimitKmh: 50,
    recommendedSpeedKmh: 35,
    advisory: 'Caution: Potential rockfall and single-lane blockages between Mahur and Haflong.',
    coordinates: [
      [25.300, 93.160], // Maibang
      [25.270, 93.050],
      [25.240, 92.920],
      [25.220, 92.830], // Mahur
      [25.180, 92.750], // Haflong
      [25.140, 92.730]  // Jatinga
    ]
  },
  {
    id: 'hwy-nh27-south',
    name: 'NH-27 (Jatinga – Harangajao – Silchar Link)',
    code: 'NH27-S',
    type: 'highway',
    description: 'Steep zigzag descent toward Barak Valley. Highly vulnerable to road subsidence.',
    lengthKm: 36.0,
    averageSlope: 37.8,
    maxSlope: 52.6,
    threatLevel: 'CRITICAL',
    vulnerablePointsCount: 210,
    maxNearbyProbability: 0.88,
    speedLimitKmh: 40,
    recommendedSpeedKmh: 25,
    advisory: 'CRITICAL: Heavy vehicle convoy restrictions recommended due to mudslide hazard.',
    coordinates: [
      [25.140, 92.730], // Jatinga
      [25.110, 92.700],
      [25.070, 92.680], // Harangajao
      [25.030, 92.720],
      [24.980, 92.780],
      [24.920, 92.800]  // Silchar entry
    ]
  },
  {
    id: 'hwy-sh20',
    name: 'SH-20 (Haflong – Umrangso Hill Highway)',
    code: 'SH20-W',
    type: 'state_highway',
    description: 'Lifeline connecting Haflong HQ with Kopili Hydel Project and cement industrial zone.',
    lengthKm: 48.0,
    averageSlope: 27.3,
    maxSlope: 43.1,
    threatLevel: 'WATCH',
    vulnerablePointsCount: 76,
    maxNearbyProbability: 0.58,
    speedLimitKmh: 50,
    recommendedSpeedKmh: 40,
    advisory: 'Watch: Minor surface slips reported along limestone escarpment.',
    coordinates: [
      [25.180, 92.750], // Haflong
      [25.260, 92.720],
      [25.350, 92.680],
      [25.440, 92.690],
      [25.510, 92.740]  // Umrangso
    ]
  }
];

export const CRITICAL_STATIONS: StationNode[] = [
  {
    id: 'st-haflong',
    name: 'Haflong Town (District HQ)',
    type: 'town',
    coordinates: [25.172, 92.746],
    elevationM: 680,
    vulnerabilityStatus: 'HIGH',
    notes: 'District headquarters with dense hillside settlements. Main administrative hub.'
  },
  {
    id: 'st-new-haflong',
    name: 'New Haflong Railway Station',
    type: 'railway_station',
    coordinates: [25.161, 92.702],
    elevationM: 520,
    vulnerabilityStatus: 'CRITICAL',
    notes: 'Strategic junction. Suffered complete track burial in 2022. Ground zero for slope protection.'
  },
  {
    id: 'st-jatinga',
    name: 'Jatinga Lampur Station & Pass',
    type: 'railway_station',
    coordinates: [25.121, 92.712],
    elevationM: 460,
    vulnerabilityStatus: 'CRITICAL',
    notes: 'Narrow mountain ridge with dense fog and high clay-shale saturation during monsoon.'
  },
  {
    id: 'st-mahur',
    name: 'Mahur Junction',
    type: 'railway_station',
    coordinates: [25.184, 92.812],
    elevationM: 580,
    vulnerabilityStatus: 'HIGH',
    notes: 'Steep approach cutting through high-angle slopes (>40°).'
  },
  {
    id: 'st-daotuhaja',
    name: 'Daotuhaja Station',
    type: 'railway_station',
    coordinates: [25.203, 92.881],
    elevationM: 410,
    vulnerabilityStatus: 'HIGH',
    notes: 'Known for high rainfall accumulation and lateral soil displacement.'
  },
  {
    id: 'st-maibang',
    name: 'Maibang Station & Heritage Town',
    type: 'town',
    coordinates: [25.302, 93.161],
    elevationM: 355,
    vulnerabilityStatus: 'MODERATE',
    notes: 'Sub-divisional town in river valley. Flood and runoff risk.'
  },
  {
    id: 'st-umrangso',
    name: 'Umrangso Industrial Area',
    type: 'town',
    coordinates: [25.512, 92.742],
    elevationM: 490,
    vulnerabilityStatus: 'MODERATE',
    notes: 'Kopili Hydel reservoir and cement manufacturing corridor.'
  },
  {
    id: 'st-harangajao',
    name: 'Harangajao Station',
    type: 'railway_station',
    coordinates: [25.068, 92.682],
    elevationM: 210,
    vulnerabilityStatus: 'HIGH',
    notes: 'Foot of the hill section. High water table and bank erosion.'
  },
  {
    id: 'st-ditokcherra',
    name: 'Ditokcherra Station',
    type: 'railway_station',
    coordinates: [25.059, 92.753],
    elevationM: 180,
    vulnerabilityStatus: 'CRITICAL',
    notes: 'High debris flow vulnerability. Washed out by torrential river flood in 2022.'
  }
];

export const HISTORICAL_LANDSLIDES = [
  {
    id: 'hist-1',
    name: '2022 New Haflong Station Disaster',
    year: 2022,
    coordinates: [25.161, 92.702] as [number, number],
    severity: 'CATASTROPHIC',
    description: 'Catastrophic debris flow buried station tracks, upended locomotives, and severed train services for over 2 months.'
  },
  {
    id: 'hist-2',
    name: 'Ditokcherra Railway Track Washout',
    year: 2022,
    coordinates: [25.059, 92.753] as [number, number],
    severity: 'SEVERE',
    description: 'Flash flood and landslide washed away foundation pillars and 500m of railway track.'
  },
  {
    id: 'hist-3',
    name: 'NH-27 Jatinga Ridge Subsidence',
    year: 2023,
    coordinates: [25.132, 92.721] as [number, number],
    severity: 'HIGH',
    description: 'Deep rotational slide caused 2-meter subsidence of national highway, cutting off Barak Valley supplies.'
  },
  {
    id: 'hist-4',
    name: 'Mahur Hill Cut Slide',
    year: 2021,
    coordinates: [25.192, 92.825] as [number, number],
    severity: 'MODERATE',
    description: 'Rockfall and mudflow blocked SH-20 and disrupted rail signaling cables.'
  }
];
