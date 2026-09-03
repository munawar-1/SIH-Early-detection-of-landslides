import type { HighwayMicroSegment } from '../types/landslide';

// Helper to generate some intermediate coordinates
const generateCoordinates = (start: [number, number], end: [number, number], count: number): [number, number][] => {
  const coords: [number, number][] = [start];
  for (let i = 1; i <= count; i++) {
    const lat = start[0] + (end[0] - start[0]) * (i / (count + 1));
    const lon = start[1] + (end[1] - start[1]) * (i / (count + 1));
    coords.push([lat, lon]);
  }
  coords.push(end);
  return coords;
};

// Base data for generating micro-segments
export const NATIONAL_HIGHWAY_REGISTRY = {
  'NH-27': { name: 'East-West Corridor', totalLengthKm: 116.5 },
  'NH-37': { name: 'Haflong - Lumding Spur', totalLengthKm: 42.0 },
  'NH-306': { name: 'Silchar - Manipur Link', totalLengthKm: 28.5 },
  'NH-27A': { name: 'Jatinga - Haflong Spur', totalLengthKm: 12.0 }
};

export const NH_SEGMENTS_RAW: Partial<HighwayMicroSegment>[] = [
  // NH-27 Segments (Lanka to Silchar via Maibang/Haflong/Jatinga)
  {
    id: 'nh27-seg-1', highwayCode: 'NH-27', name: 'NH-27 | Km 0-10 (Lanka Border)',
    kmStart: 0, kmEnd: 10, segmentKm: 0, lengthKm: 10,
    coordinates: generateCoordinates([25.780, 92.950], [25.730, 92.985], 2)
  },
  {
    id: 'nh27-seg-2', highwayCode: 'NH-27', name: 'NH-27 | Km 10-22',
    kmStart: 10, kmEnd: 22, segmentKm: 10, lengthKm: 12,
    coordinates: generateCoordinates([25.730, 92.985], [25.650, 93.040], 2)
  },
  {
    id: 'nh27-seg-3', highwayCode: 'NH-27', name: 'NH-27 | Km 22-35 (Maibang Approach)',
    kmStart: 22, kmEnd: 35, segmentKm: 22, lengthKm: 13,
    coordinates: generateCoordinates([25.650, 93.040], [25.400, 93.160], 3)
  },
  {
    id: 'nh27-seg-4', highwayCode: 'NH-27', name: 'NH-27 | Km 35-42 (Maibang)',
    kmStart: 35, kmEnd: 42, segmentKm: 35, lengthKm: 7,
    coordinates: generateCoordinates([25.400, 93.160], [25.300, 93.160], 1)
  },
  {
    id: 'nh27-seg-5', highwayCode: 'NH-27', name: 'NH-27 | Km 42-55',
    kmStart: 42, kmEnd: 55, segmentKm: 42, lengthKm: 13,
    coordinates: generateCoordinates([25.300, 93.160], [25.240, 92.920], 3)
  },
  {
    id: 'nh27-seg-6', highwayCode: 'NH-27', name: 'NH-27 | Km 55-65 (Mahur Pass)',
    kmStart: 55, kmEnd: 65, segmentKm: 55, lengthKm: 10,
    coordinates: generateCoordinates([25.240, 92.920], [25.200, 92.830], 2)
  },
  {
    id: 'nh27-seg-7', highwayCode: 'NH-27', name: 'NH-27 | Km 65-75 (Haflong By-pass)',
    kmStart: 65, kmEnd: 75, segmentKm: 65, lengthKm: 10,
    coordinates: generateCoordinates([25.200, 92.830], [25.160, 92.740], 2)
  },
  {
    id: 'nh27-seg-8', highwayCode: 'NH-27', name: 'NH-27 | Km 75-80 (Jatinga)',
    kmStart: 75, kmEnd: 80, segmentKm: 75, lengthKm: 5,
    coordinates: generateCoordinates([25.160, 92.740], [25.140, 92.730], 1)
  },
  {
    id: 'nh27-seg-9', highwayCode: 'NH-27', name: 'NH-27 | Km 80-92 (Harangajao Descent)',
    kmStart: 80, kmEnd: 92, segmentKm: 80, lengthKm: 12,
    coordinates: generateCoordinates([25.140, 92.730], [25.070, 92.680], 3)
  },
  {
    id: 'nh27-seg-10', highwayCode: 'NH-27', name: 'NH-27 | Km 92-105',
    kmStart: 92, kmEnd: 105, segmentKm: 92, lengthKm: 13,
    coordinates: generateCoordinates([25.070, 92.680], [24.980, 92.780], 3)
  },
  {
    id: 'nh27-seg-11', highwayCode: 'NH-27', name: 'NH-27 | Km 105-116.5 (Silchar Link)',
    kmStart: 105, kmEnd: 116.5, segmentKm: 105, lengthKm: 11.5,
    coordinates: generateCoordinates([24.980, 92.780], [24.920, 92.800], 2)
  },

  // NH-37 Segments
  {
    id: 'nh37-seg-1', highwayCode: 'NH-37', name: 'NH-37 | Km 0-15',
    kmStart: 0, kmEnd: 15, segmentKm: 0, lengthKm: 15,
    coordinates: generateCoordinates([25.180, 92.750], [25.300, 92.850], 3)
  },
  {
    id: 'nh37-seg-2', highwayCode: 'NH-37', name: 'NH-37 | Km 15-30',
    kmStart: 15, kmEnd: 30, segmentKm: 15, lengthKm: 15,
    coordinates: generateCoordinates([25.300, 92.850], [25.450, 92.950], 3)
  },
  {
    id: 'nh37-seg-3', highwayCode: 'NH-37', name: 'NH-37 | Km 30-42',
    kmStart: 30, kmEnd: 42, segmentKm: 30, lengthKm: 12,
    coordinates: generateCoordinates([25.450, 92.950], [25.550, 93.050], 2)
  },

  // NH-306 Segments
  {
    id: 'nh306-seg-1', highwayCode: 'NH-306', name: 'NH-306 | Km 0-14',
    kmStart: 0, kmEnd: 14, segmentKm: 0, lengthKm: 14,
    coordinates: generateCoordinates([25.030, 92.720], [24.950, 92.850], 2)
  },
  {
    id: 'nh306-seg-2', highwayCode: 'NH-306', name: 'NH-306 | Km 14-28.5',
    kmStart: 14, kmEnd: 28.5, segmentKm: 14, lengthKm: 14.5,
    coordinates: generateCoordinates([24.950, 92.850], [24.850, 92.900], 2)
  },

  // NH-27A Segments
  {
    id: 'nh27a-seg-1', highwayCode: 'NH-27A', name: 'NH-27A | Km 0-6',
    kmStart: 0, kmEnd: 6, segmentKm: 0, lengthKm: 6,
    coordinates: generateCoordinates([25.140, 92.730], [25.160, 92.740], 1)
  },
  {
    id: 'nh27a-seg-2', highwayCode: 'NH-27A', name: 'NH-27A | Km 6-12',
    kmStart: 6, kmEnd: 12, segmentKm: 6, lengthKm: 6,
    coordinates: generateCoordinates([25.160, 92.740], [25.172, 92.746], 1)
  }
];
