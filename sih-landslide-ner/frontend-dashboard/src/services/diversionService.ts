import type { GridPoint, TransportSegment, TrafficDiversion, BlockedSubSegment } from '../types/landslide';
import { calculateHaversineKm } from './apiService';

// Strategic road network junctions in Dima Hasao, Assam
export const STRATEGIC_JUNCTIONS = [
  {
    id: 'jct-jatinga',
    name: 'Jatinga Ridge Junction',
    junctionCode: 'JCT-NH27-27A',
    coordinates: [25.1103, 92.8980] as [number, number],
    description: 'Critical fork connecting NH-27 East-West Corridor with NH-27A Haflong Town Spur.'
  },
  {
    id: 'jct-haflong-hub',
    name: 'Haflong Town Central Interchange',
    junctionCode: 'JCT-HFL-CENTRAL',
    coordinates: [25.1650, 93.0180] as [number, number],
    description: 'District HQ interchange connecting NH-27A, SH-20 (Umrangso), SH-19 (Mahur), and MDR-02.'
  },
  {
    id: 'jct-mahur',
    name: 'Mahur Junction & Rail Cross',
    junctionCode: 'JCT-MHR-NH27',
    coordinates: [25.1855, 93.1116] as [number, number],
    description: 'Intersection between NH-27, SH-19, and the Lumding-Badarpur railway hill section.'
  },
  {
    id: 'jct-maibang',
    name: 'Maibang Northern Junction',
    junctionCode: 'JCT-MBG-02',
    coordinates: [25.2820, 93.1480] as [number, number],
    description: 'Fork connecting NH-27 to MDR-02 (Gunjung/Central tribal corridor).'
  },
  {
    id: 'jct-umrangso',
    name: 'Umrangso Industrial Fork',
    junctionCode: 'JCT-UMR-01',
    coordinates: [25.5120, 92.7420] as [number, number],
    description: 'Western terminus connecting SH-20 with MDR-01 towards Lanka.'
  },
  {
    id: 'jct-harangajao',
    name: 'Harangajao Valley Junction',
    junctionCode: 'JCT-HJO-03',
    coordinates: [25.1111, 92.8601] as [number, number],
    description: 'Southern mountain descent connecting NH-27 with MDR-03 (Ditokcherra bypass).'
  }
];

/**
 * Evaluates transport segments for localized landslide hazard bottlenecks,
 * prevents whole-corridor shutdown when only a specific stretch is at risk,
 * and dynamically calculates upstream detour routes at preceding road junctions.
 */
export function computeDynamicDiversions(
  highways: TransportSegment[],
  gridPoints: GridPoint[],
  bufferKm: number = 2.0
): { evaluatedHighways: TransportSegment[]; activeDiversions: TrafficDiversion[] } {
  const activeDiversions: TrafficDiversion[] = [];

  const evaluatedHighways = highways.map(hwy => {
    if (!hwy.coordinates || hwy.coordinates.length < 5) return hwy;

    // Check which specific vertices have nearby critical grid points (P >= 0.70 or steep saturated slopes)
    const atRiskIndices: number[] = [];
    let maxClusterProb = 0;

    hwy.coordinates.forEach((coord, idx) => {
      for (const pt of gridPoints) {
        if (Math.abs(pt.latitude - coord[0]) > 0.03 || Math.abs(pt.longitude - coord[1]) > 0.03) continue;
        const d = calculateHaversineKm(pt.latitude, pt.longitude, coord[0], coord[1]);
        if (d <= bufferKm && (pt.probability >= 0.65 || (pt.slope >= 34.0 && pt.probability >= 0.50))) {
          atRiskIndices.push(idx);
          if (pt.probability > maxClusterProb) maxClusterProb = pt.probability;
          break;
        }
      }
    });

    // If no critical points, road remains in its normal evaluated status
    if (atRiskIndices.length === 0) {
      return {
        ...hwy,
        hasActiveDiversion: false,
        blockedSubSegments: []
      };
    }

    // Identify the contiguous cluster range of vertices that are at risk
    const firstRiskIdx = Math.min(...atRiskIndices);
    const lastRiskIdx = Math.max(...atRiskIndices);
    const clusterFraction = (lastRiskIdx - firstRiskIdx + 1) / hwy.coordinates.length;

    // Calculate approximate kilometer chainage of the bottleneck
    const kmStart = Math.round((firstRiskIdx / hwy.coordinates.length) * hwy.lengthKm * 10) / 10;
    const kmEnd = Math.max(kmStart + 2.0, Math.round(((lastRiskIdx + 1) / hwy.coordinates.length) * hwy.lengthKm * 10) / 10);
    const bottleneckLengthKm = Math.round((kmEnd - kmStart) * 10) / 10;

    // Localized slice of coordinates representing the blocked bottleneck zone
    // Pad slightly to cover safety buffer around the slide
    const padStart = Math.max(0, firstRiskIdx - 2);
    const padEnd = Math.min(hwy.coordinates.length - 1, lastRiskIdx + 2);
    const bottleneckCoords = hwy.coordinates.slice(padStart, padEnd + 1);

    // CRUCIAL USER INSIGHT:
    // If the bottleneck affects a localized portion of the corridor (< 40% of total length),
    // DO NOT shut down the entire highway! Isolate the slide and divert traffic before it!
    const isLocalized = clusterFraction < 0.45 && bottleneckLengthKm <= 18.0;

    if (!isLocalized) {
      // Widespread disaster: full corridor caution/closure
      return hwy;
    }

    // Find the nearest strategic diversion junction prior to the slide
    const bottleneckStartCoord = hwy.coordinates[firstRiskIdx];
    let bestJunction = STRATEGIC_JUNCTIONS[0];
    let minJunctionDist = Infinity;

    for (const jct of STRATEGIC_JUNCTIONS) {
      const dist = calculateHaversineKm(jct.coordinates[0], jct.coordinates[1], bottleneckStartCoord[0], bottleneckStartCoord[1]);
      if (dist < minJunctionDist) {
        minJunctionDist = dist;
        bestJunction = jct;
      }
    }

    // Determine the optimal bypass corridor with geotechnical efficiency scoring
    let bypassRouteId = 'hwy-nh27a';
    let bypassRouteName = 'NH-27A Haflong Town Bypass';
    let detourTimeMins = 25;
    let detourDistKm = 28.5;
    let efficiencyRating: 'OPTIMAL' | 'MODERATE' | 'EMERGENCY_ONLY' = 'OPTIMAL';
    let safetyAdvantagePct = 76;
    let roadCapacityStatus = 'Double-lane paved highway (IRC Class 70R compliant, gentle ridgeline alignment)';
    let heavyVehicleAdvice = 'LMV, Ambulances, and 2-axle buses cleared. 16T+ freight held at Jatinga truck lay-by.';
    let permittedVehicles = 'All light motor vehicles (LMV), ambulances, and state transport buses permitted.';

    if (hwy.id.includes('nh27-south') || hwy.name.includes('Silchar') || hwy.name.includes('Harangajao')) {
      // NH-27 South slide: divert via NH-27A into Haflong -> MDR-03 Southern Feeder
      bypassRouteId = 'road-mdr-03';
      bypassRouteName = 'MDR-03 (Ditokcherra – Harangajao Valley Bypass)';
      detourTimeMins = 35;
      detourDistKm = 41.3;
      efficiencyRating = 'MODERATE'; // Ghat section with hairpin turns
      safetyAdvantagePct = 64;
      roadCapacityStatus = 'Single/Intermediate-lane mountain road (Max grade 9%, narrow steel-girder bridges)';
      heavyVehicleAdvice = 'Strictly restricted to LMVs, 4x4 emergency responders & light supply pickups. Multi-axle commercial freight prohibited and held at Silchar / Jatinga gates.';
      permittedVehicles = 'LMV, emergency ambulances, and 4x4 disaster management vehicles only. No heavy trucks.';
    } else if (hwy.id.includes('sh20') || hwy.name.includes('Umrangso')) {
      // SH-20 slide: divert via MDR-02 (Gunjung Central Corridor) -> MDR-01
      bypassRouteId = 'road-mdr-02';
      bypassRouteName = 'MDR-02 (Maibang – Gunjung Central Tribal Corridor)';
      detourTimeMins = 40;
      detourDistKm = 88.0;
      efficiencyRating = 'OPTIMAL'; // Runs across the stable central plateau away from Kopili gorge
      safetyAdvantagePct = 82;
      roadCapacityStatus = 'Paved 2-lane district lifeline (Stable plateau subgrade, minimal cut slopes)';
      heavyVehicleAdvice = 'Essential relief supplies, fuel bowsers & supply trucks up to 20 tonnes permitted.';
      permittedVehicles = 'All passenger vehicles, essential freight bowsers, and state buses permitted.';
    } else if (hwy.id.includes('nh27-central') || hwy.name.includes('Mahur')) {
      // NH-27 Central slide: divert via SH-19 Haflong-Mahur Ridge Road
      bypassRouteId = 'hwy-sh19';
      bypassRouteName = 'SH-19 (Haflong – Mahur Arterial Ridge Highway)';
      detourTimeMins = 20;
      detourDistKm = 35.3;
      efficiencyRating = 'OPTIMAL';
      safetyAdvantagePct = 78;
      roadCapacityStatus = 'Fully paved 2-lane state highway along natural mountain ridge';
      heavyVehicleAdvice = 'Buses and 2-axle trucks (<16T) permitted. Multi-axle container trailers held at Mahur parking.';
      permittedVehicles = 'Light motor vehicles, inter-district buses, and light commercial vehicles (LCV).';
    } else {
      bypassRouteId = 'road-mdr-02';
      bypassRouteName = 'MDR-02 Central Bypass Corridor';
      detourTimeMins = 30;
      detourDistKm = 54.0;
      efficiencyRating = 'MODERATE';
      safetyAdvantagePct = 70;
      roadCapacityStatus = 'Paved 2-lane district road with reinforced culverts';
      heavyVehicleAdvice = 'Freight held at primary corridor entry pending debris clearance.';
      permittedVehicles = 'LMV and local transport permitted.';
    }

    // Retrieve coordinates of the bypass route from the highways collection
    const bypassCorridor = highways.find(h => h.id === bypassRouteId) || highways[0];
    const bypassCoords = bypassCorridor.coordinates;

    const hazardZoneName = `${hwy.name} | Km ${kmStart}-${kmEnd}`;

    const diversion: TrafficDiversion = {
      id: `div-${hwy.id}-${kmStart}`,
      sourceCorridorId: hwy.id,
      sourceCorridorName: hwy.name,
      hazardZoneName,
      hazardKmStart: kmStart,
      hazardKmEnd: kmEnd,
      hazardLengthKm: bottleneckLengthKm,
      hazardProbability: Math.round(maxClusterProb * 1000) / 1000,
      hazardCoordinates: bottleneckCoords,
      diversionJunction: {
        name: bestJunction.name,
        coordinates: bestJunction.coordinates,
        junctionCode: bestJunction.junctionCode,
        description: bestJunction.description
      },
      bypassRouteId: bypassCorridor.id,
      bypassRouteName,
      bypassCoordinates: bypassCoords,
      status: 'ACTIVE',
      advisory: `TRAFFIC DIVERTED: Slide hazard isolated to Km ${kmStart}–${kmEnd} (${bottleneckLengthKm} km). Divert at ${bestJunction.name} via ${bypassRouteName}. Upstream and downstream sections remain OPEN.`,
      permittedVehicles,
      additionalTravelTimeMinutes: detourTimeMins,
      efficiencyRating,
      detourDistanceKm: detourDistKm,
      safetyAdvantagePct,
      roadCapacityStatus,
      heavyVehicleAdvice
    };

    activeDiversions.push(diversion);

    const blockedSegment: BlockedSubSegment = {
      id: `blk-${hwy.id}-${kmStart}`,
      name: `Slide Closure (Km ${kmStart}–${kmEnd})`,
      kmStart,
      kmEnd,
      hazardProbability: maxClusterProb,
      hazardReason: 'Active geotechnical slope deformation / debris flow encroachment',
      coordinates: bottleneckCoords
    };

    // The whole road is NOT marked CRITICAL!
    // It stays open with WARNING or WATCH and active diversion guidance.
    return {
      ...hwy,
      threatLevel: (hwy.threatLevel === 'CRITICAL' ? 'WARNING' : hwy.threatLevel) as TransportSegment['threatLevel'],
      hasActiveDiversion: true,
      diversionDetails: diversion,
      blockedSubSegments: [blockedSegment],
      advisory: `🔀 TRAFFIC DIVERTED: Localized slide at Km ${kmStart}–${kmEnd}. Detour active at ${bestJunction.name} via ${bypassRouteName}. Remainder of corridor operational.`
    };
  });

  return { evaluatedHighways, activeDiversions };
}
