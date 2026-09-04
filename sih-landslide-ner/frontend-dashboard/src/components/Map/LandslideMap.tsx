import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GridPoint, FilterState, TransportSegment, StationNode, HighwayMicroSegment } from '../../types/landslide';
import { HISTORICAL_LANDSLIDES } from '../../data/infrastructureData';
import { DIMA_HASAO_POLYGON, DIMA_HASAO_BOUNDS, DIMA_HASAO_CENTER } from '../../data/dimaHasaoBoundary';
import { Crosshair, ZoomIn, ZoomOut, ChevronDown } from 'lucide-react';

// Fix standard Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LandslideMapProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  highwayMicroSegments?: HighwayMicroSegment[];
  stations: StationNode[];
  filters: FilterState;
  onSelectPoint?: (point: GridPoint) => void;
  onSelectTransport?: (segment: TransportSegment) => void;
  onSelectStation?: (station: StationNode) => void;
  focusedHotspot?: { lat: number; lng: number; zoom: number; name: string } | null;
  isSimulationActive?: boolean;
  simulationScenario?: string;
}

export const LandslideMap: React.FC<LandslideMapProps> = ({
  gridPoints,
  railways,
  highways,
  highwayMicroSegments,
  stations,
  filters,
  onSelectPoint,
  onSelectTransport,
  onSelectStation,
  focusedHotspot,
  isSimulationActive,
  simulationScenario
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const pointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const infrastructureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const canvasRendererRef = useRef<L.Canvas | null>(null);

  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Map on mount and fit directly to Dima Hasao
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DIMA_HASAO_CENTER,
      zoom: 10,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false
    });

    map.fitBounds(DIMA_HASAO_BOUNDS as L.LatLngBoundsExpression, {
      padding: [30, 30],
      maxZoom: 11
    });

    canvasRendererRef.current = L.canvas({ padding: 0.5 });
    heatmapLayerGroupRef.current = L.layerGroup().addTo(map);
    pointsLayerGroupRef.current = L.layerGroup().addTo(map);
    boundaryLayerGroupRef.current = L.layerGroup().addTo(map);
    infrastructureLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const onZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoomend', onZoomEnd);

    return () => {
      map.off('zoomend', onZoomEnd);
      heatmapLayerGroupRef.current?.clearLayers();
      pointsLayerGroupRef.current?.clearLayers();
      boundaryLayerGroupRef.current?.clearLayers();
      infrastructureLayerGroupRef.current?.clearLayers();
      map.remove();
      mapInstanceRef.current = null;
      canvasRendererRef.current = null;
    };
  }, []);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(DIMA_HASAO_BOUNDS as L.LatLngBoundsExpression, {
        padding: [30, 30],
        maxZoom: 11
      });
    }
  };

  // Fly to focused hotspot when selected in simulation bar
  useEffect(() => {
    if (focusedHotspot && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([focusedHotspot.lat, focusedHotspot.lng], focusedHotspot.zoom, {
        duration: 1.4
      });
    }
  }, [focusedHotspot]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // 2. Basemap Switcher
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = '';
    let attribution = '';
    let maxZoom = 19;

    switch (filters.baseMap) {
      case 'satellite':
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = '&copy; Esri, Maxar, Earthstar Geographics';
        break;
      case 'topo':
        url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        attribution = 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap';
        maxZoom = 17;
        break;
      case 'osm':
        url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenStreetMap contributors';
        break;
      case 'dark':
      default:
        url = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
        attribution = '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
        maxZoom = 16;
        break;
    }

    tileLayerRef.current = L.tileLayer(url, { attribution, maxZoom }).addTo(map);
  }, [filters.baseMap]);

  // 3. Highlight Dima Hasao District with Glowing Border
  useEffect(() => {
    const map = mapInstanceRef.current;
    const boundaryGroup = boundaryLayerGroupRef.current;
    if (!map || !boundaryGroup) return;

    boundaryGroup.clearLayers();

    // Outer boundary line
    const outerGlow = L.polygon(DIMA_HASAO_POLYGON, {
      color: 'rgba(30, 43, 24, 0.2)',
      weight: 6,
      fill: false,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round'
    });

    // Sharp clean district perimeter line
    const mainBoundary = L.polygon(DIMA_HASAO_POLYGON, {
      color: '#1E2B18',
      weight: 2.5,
      fill: false,
      opacity: 0.85,
      dashArray: '8, 6'
    });

    mainBoundary.bindTooltip(`
      <div class="district-badge-tooltip">
        <strong>📍 DIMA HASAO DISTRICT BOUNDARY</strong><br/>
        <span>Area: 4,888 km² | Elevation: 180m - 1,450m</span>
      </div>
    `, { sticky: true, className: 'gis-custom-tooltip' });

    boundaryGroup.addLayer(outerGlow);
    boundaryGroup.addLayer(mainBoundary);
  }, []);

  // 4. Render Grid Points & Smooth Heatmap Layer using Canvas Renderer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const pointsGroup = pointsLayerGroupRef.current;
    const heatmapGroup = heatmapLayerGroupRef.current;
    if (!map || !pointsGroup || !heatmapGroup) return;

    // Completely clear existing markers before repopulating
    pointsGroup.clearLayers();
    heatmapGroup.clearLayers();

    if (!filters.showGridPoints && !filters.showHeatmap) return;

    const filteredPoints = gridPoints.filter(p => {
      if (filters.minRiskLevel === 'HIGH_ONLY' && p.riskLevel !== 'HIGH') return false;
      if (filters.minRiskLevel === 'MODERATE_HIGH' && p.riskLevel === 'LOW') return false;
      if (p.slope < filters.minSlope) return false;

      const rainVal = filters.forecastHorizon === '24h' ? p.rainDay1 :
                     (filters.forecastHorizon === '48h' ? (p.rainDay1 + p.rainDay2) :
                     (p.rainDay1 + p.rainDay2 + p.rainDay3));
      if (rainVal < filters.minRainfall) return false;

      return true;
    });

    // Reuse persistent canvas renderer
    const canvasRenderer = canvasRendererRef.current || L.canvas({ padding: 0.5 });
    const zoom = currentZoom || map.getZoom() || 10;

    // Zoom-adaptive sizing calculation for crisp, professional GIS rendering
    let lowRadius = 2.0;
    let modRadius = 3.2;
    let highRadius = 4.8;
    let lowOpacity = 0.65;
    let modOpacity = 0.85;
    let highOpacity = 0.95;

    if (zoom >= 13) {
      lowRadius = 4.0;
      modRadius = 5.5;
      highRadius = 7.0;
      lowOpacity = 0.80;
      modOpacity = 0.90;
      highOpacity = 0.98;
    } else if (zoom >= 11) {
      lowRadius = 2.6;
      modRadius = 4.0;
      highRadius = 5.2;
      lowOpacity = 0.70;
      modOpacity = 0.88;
      highOpacity = 0.95;
    }

    // A. RENDER HAZARD DENSITY GLOW (Only on Moderate & High Hazard Zones)
    if (filters.showHeatmap) {
      const heatRadius = zoom >= 12 ? 22 : (zoom >= 10 ? 14 : 9);
      filteredPoints.forEach(p => {
        // Only render soft glow for actual hazard zones to avoid blocking the map
        if (p.probability < 0.40) return;

        let glowColor = 'rgba(245, 158, 11, 0.22)'; // Amber warning glow
        if (p.probability >= 0.70) {
          glowColor = 'rgba(239, 68, 68, 0.35)'; // Crimson alert glow
        }

        const heatDot = L.circleMarker([p.latitude, p.longitude], {
          renderer: canvasRenderer,
          radius: heatRadius,
          fillColor: glowColor,
          fillOpacity: 1.0,
          stroke: false,
          interactive: false
        });
        heatmapGroup.addLayer(heatDot);
      });
    }

    // B. RENDER INTERACTIVE MICRO-GRID NODES (if enabled)
    if (filters.showGridPoints) {
      filteredPoints.forEach(p => {
        let fillColor = '#10b981'; // Emerald Green (Clean & Safe)
        let strokeColor = '#059669';
        let radius = lowRadius;
        let fillOpacity = lowOpacity;
        let weight = 0.4;

        if (p.probability >= 0.70) {
          fillColor = '#ef4444'; // Bright Red / Crimson Hazard
          strokeColor = '#ffffff';
          radius = highRadius;
          fillOpacity = highOpacity;
          weight = 1.2;
        } else if (p.probability >= 0.40) {
          fillColor = '#f59e0b'; // Amber Warning
          strokeColor = '#ffffff';
          radius = modRadius;
          fillOpacity = modOpacity;
          weight = 0.8;
        }

        const marker = L.circleMarker([p.latitude, p.longitude], {
          renderer: canvasRenderer,
          radius,
          fillColor,
          fillOpacity,
          color: strokeColor,
          weight
        });

        marker.on('click', () => {
          if (onSelectPoint) onSelectPoint(p);
        });

        const rainSum = (p.rainDay1 + p.rainDay2 + p.rainDay3).toFixed(1);
        const slopeFmt = typeof p.slope === 'number' ? p.slope.toFixed(1) : p.slope;
        const elevFmt = typeof p.elevation === 'number' ? Math.round(p.elevation) : p.elevation;
        const probPct = Math.round(p.probability * 100);

        marker.bindTooltip(`
          <div class="gis-interactive-tooltip">
            <div class="tooltip-header">
              <span class="tooltip-badge ${p.riskLevel.toLowerCase()}">
                ${p.riskLevel === 'HIGH' ? '🔴 HIGH HAZARD' : (p.riskLevel === 'MODERATE' ? '🟡 MODERATE' : '🟢 SAFE SLOPE')}
              </span>
              <span class="tooltip-id">#${p.id}</span>
            </div>
            
            <div class="tooltip-meter-row">
              <div class="meter-bar-track">
                <div class="meter-bar-fill ${p.riskLevel.toLowerCase()}" style="width: ${probPct}%"></div>
              </div>
              <span class="meter-pct">${probPct}% AI Risk</span>
            </div>

            <div class="tooltip-metrics-grid">
              <div class="tooltip-metric">
                <span class="metric-lbl">Slope</span>
                <span class="metric-val"><b>${slopeFmt}°</b></span>
              </div>
              <div class="tooltip-metric">
                <span class="metric-lbl">Elevation</span>
                <span class="metric-val"><b>${elevFmt}m</b></span>
              </div>
              <div class="tooltip-metric">
                <span class="metric-lbl">Clay</span>
                <span class="metric-val"><b>${p.clayPercent.toFixed(1)}%</b></span>
              </div>
              <div class="tooltip-metric">
                <span class="metric-lbl">3-Day Rain</span>
                <span class="metric-val"><b>${rainSum} mm</b></span>
              </div>
            </div>
            <div class="tooltip-hint">Click node for deep geotechnical diagnostics</div>
          </div>
        `, { 
          className: 'gis-custom-tooltip-card',
          direction: 'top',
          offset: [0, -6],
          opacity: 1.0
        });

        pointsGroup.addLayer(marker);
      });
    }

  }, [gridPoints, filters, currentZoom, onSelectPoint]);

  // 5. Render Railway Lines, Highways, Stations, and Incidents
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = infrastructureLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // A. RAILWAYS (Lumding–Badarpur Hill Section)
    if (filters.showRailways) {
      railways.forEach(rail => {
        let railColor = '#3b82f6';
        let railGlow = 'rgba(59, 130, 246, 0.3)';

        if (rail.threatLevel === 'CRITICAL') {
          railColor = '#ef4444';
          railGlow = 'rgba(239, 68, 68, 0.6)';
        } else if (rail.threatLevel === 'WARNING') {
          railColor = '#f59e0b';
          railGlow = 'rgba(245, 158, 11, 0.5)';
        } else if (rail.threatLevel === 'WATCH') {
          railColor = '#eab308';
          railGlow = 'rgba(234, 179, 8, 0.4)';
        }

        const glowLine = L.polyline(rail.coordinates, {
          color: railGlow,
          weight: rail.threatLevel === 'CRITICAL' ? 12 : 8,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round'
        });

        const baseTrack = L.polyline(rail.coordinates, {
          color: '#1E2B18',
          weight: 6,
          opacity: 0.95
        });

        const trackPattern = L.polyline(rail.coordinates, {
          color: railColor,
          weight: 4,
          dashArray: '8, 8',
          opacity: 1.0
        });

        trackPattern.on('click', () => {
          if (onSelectTransport) onSelectTransport(rail);
        });

        trackPattern.bindTooltip(`
          <div class="gis-tooltip">
            <strong style="color:${railColor}">🚂 ${rail.name}</strong><br/>
            <span>Threat Level: <b>${rail.threatLevel}</b></span><br/>
            <span>Max Proximity Risk: <b>${Math.round(rail.maxNearbyProbability * 100)}%</b></span>
          </div>
        `, { sticky: true, className: 'gis-custom-tooltip' });

        group.addLayer(glowLine);
        group.addLayer(baseTrack);
        group.addLayer(trackPattern);
      });
    }

    // B. HIGHWAYS (NH-27, SH-20)
    if (filters.showHighways) {
      highways.forEach(hwy => {
        let hwyColor = '#10b981';
        if (hwy.threatLevel === 'CRITICAL') hwyColor = '#dc2626';
        else if (hwy.threatLevel === 'WARNING') hwyColor = '#ea580c';
        else if (hwy.threatLevel === 'WATCH') hwyColor = '#ca8a04';

        const glow = L.polyline(hwy.coordinates, {
          color: hwyColor,
          weight: 10,
          opacity: 0.35
        });

        const hwyLine = L.polyline(hwy.coordinates, {
          color: hwyColor,
          weight: 4.5,
          opacity: 0.95
        });

        hwyLine.on('click', () => {
          if (onSelectTransport) onSelectTransport(hwy);
        });

        hwyLine.bindTooltip(`
          <div class="gis-tooltip">
            <strong style="color:${hwyColor}">🛣️ ${hwy.name}</strong><br/>
            <span>Threat: <b>${hwy.threatLevel}</b> | Length: <b>${hwy.lengthKm} km</b></span>
          </div>
        `, { sticky: true, className: 'gis-custom-tooltip' });

        group.addLayer(glow);
        group.addLayer(hwyLine);
      });
    }

    // C. NATIONAL HIGHWAY MICRO-SEGMENTS (At-Risk Alerts)
    if (filters.showHighways && highwayMicroSegments) {
      highwayMicroSegments.forEach(seg => {
        // Draw baseline faintly for all micro segments if we want, or just draw the at-risk ones.
        // We will just draw the at-risk ones to minimize clutter, as per the plan.
        if (!seg.isAtRisk) return;

        let segColor = '#eab308'; // WATCH
        let glowColor = 'rgba(234, 179, 8, 0.4)';
        
        if (seg.threatLevel === 'CRITICAL') {
          segColor = '#ef4444';
          glowColor = 'rgba(239, 68, 68, 0.6)';
        } else if (seg.threatLevel === 'WARNING') {
          segColor = '#f97316';
          glowColor = 'rgba(249, 115, 22, 0.5)';
        }

        const glowLine = L.polyline(seg.coordinates, {
          color: glowColor,
          weight: seg.threatLevel === 'CRITICAL' ? 14 : 10,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
          className: seg.threatLevel === 'CRITICAL' ? 'pulse-danger-line' : ''
        });

        const coreLine = L.polyline(seg.coordinates, {
          color: segColor,
          weight: 4,
          opacity: 1.0,
          dashArray: seg.threatLevel === 'CRITICAL' ? '6, 6' : undefined
        });

        coreLine.on('click', () => {
          if (onSelectTransport) onSelectTransport(seg);
        });

        coreLine.bindTooltip(`
          <div class="gis-tooltip">
            <strong style="color:${segColor}">🛣️ ${seg.highwayCode} | Km ${seg.kmStart}-${seg.kmEnd}</strong><br/>
            <span>Threat Level: <b>${seg.threatLevel}</b></span><br/>
            <span>Max Proximity Risk: <b>${Math.round(seg.maxNearbyProbability * 100)}%</b></span>
          </div>
        `, { sticky: true, className: 'gis-custom-tooltip' });

        group.addLayer(glowLine);
        group.addLayer(coreLine);
      });
    }

    // D. STATIONS
    if (filters.showStations) {
      stations.forEach(st => {
        const isCritical = st.vulnerabilityStatus === 'CRITICAL';
        const isHigh = st.vulnerabilityStatus === 'HIGH';
        const iconBg = isCritical ? '#ef4444' : (isHigh ? '#f59e0b' : '#3b82f6');
        const iconSymbol = st.type === 'railway_station' ? '🚉' : '🏛️';

        const customIcon = L.divIcon({
          className: 'custom-gis-station-marker',
          html: `
            <div class="station-marker-pin ${isCritical ? 'pulse-danger' : ''}" style="background-color: ${iconBg}">
              <span class="station-icon">${iconSymbol}</span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const marker = L.marker(st.coordinates, { icon: customIcon });

        marker.on('click', () => {
          if (onSelectStation) onSelectStation(st);
        });

        marker.bindTooltip(`
          <div class="gis-tooltip">
            <strong>${iconSymbol} ${st.name}</strong><br/>
            <span>Elevation: <b>${st.elevationM} m</b></span><br/>
            <span>Vulnerability: <b style="color:${iconBg}">${st.vulnerabilityStatus}</b></span>
          </div>
        `, { direction: 'top', offset: [0, -10], className: 'gis-custom-tooltip' });

        group.addLayer(marker);
      });
    }

    // D. HISTORICAL INCIDENTS
    if (filters.showHistoricalIncidents) {
      HISTORICAL_LANDSLIDES.forEach(hist => {
        const histIcon = L.divIcon({
          className: 'custom-gis-hist-marker',
          html: `<div class="hist-marker-pin"><span>⚠️</span></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker(hist.coordinates, { icon: histIcon });

        marker.bindPopup(`
          <div class="gis-popup-content">
            <h4 style="color:#dc2626; margin:0 0 6px 0;">⚠️ ${hist.name} (${hist.year})</h4>
            <p style="font-size:12px; margin:0 0 6px 0; color:#455A3F;">${hist.description}</p>
            <span class="badge danger" style="font-size:10px; background:#fee2e2; color:#dc2626; padding:2px 8px; border-radius:9999px;">HISTORICAL DISASTER SITE</span>
          </div>
        `);

        group.addLayer(marker);
      });
    }

  }, [railways, highways, stations, filters, onSelectTransport, onSelectStation]);

  return (
    <div className="gis-map-wrapper">
      <div ref={mapContainerRef} className="gis-map-canvas" />

      {/* Floating Map Navigation Controls */}
      <div className="map-custom-controls">
        <button className="map-control-btn" onClick={handleRecenter} title="Recenter Dima Hasao District">
          <Crosshair size={16} />
        </button>
        <button className="map-control-btn" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button className="map-control-btn" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
      </div>

      {/* Simulation Mode Floating Watermark / HUD Badge */}
      {isSimulationActive && (
        <div className="map-simulation-watermark">
          <span className="watermark-dot pulse-red" />
          <div className="watermark-text">
            <span className="watermark-title">🌧️ MONSOON PITCH SIMULATION ACTIVE</span>
            <span className="watermark-sub">{simulationScenario === 'DISASTER_CLOUDBURST' ? 'May 2022 Disaster Benchmark (>300mm)' : 'Borail Range Infiltration Surge'} • Saturated Slope Failure</span>
          </div>
        </div>
      )}

      {/* Floating Map HUD Legend */}
      <div className={`gis-map-legend ${isLegendOpen ? 'expanded' : 'collapsed'}`}>
        <button
          className="legend-header-btn"
          onClick={() => setIsLegendOpen(prev => !prev)}
          aria-expanded={isLegendOpen}
          aria-label="Toggle hazard legend"
          type="button"
        >
          <span className="legend-title">Dima Hasao Hazard Legend</span>
          <ChevronDown 
            size={15} 
            className={`legend-chevron-icon ${isLegendOpen ? 'open' : 'closed'}`} 
          />
        </button>

        <div className="legend-body-collapse">
          <div className="legend-row">
            <span className="dot dot-high"></span>
            <span>High Landslide Risk (&gt;70%)</span>
          </div>
          <div className="legend-row">
            <span className="dot dot-mod"></span>
            <span>Moderate Risk (40% - 70%)</span>
          </div>
          <div className="legend-row">
            <span className="dot dot-low"></span>
            <span>Low Hazard (&lt;40%)</span>
          </div>
          <div className="legend-divider" />
          <div className="legend-row">
            <span className="line-sample line-district"></span>
            <span>Dima Hasao District Boundary</span>
          </div>
          <div className="legend-row">
            <span className="line-sample line-rail-danger"></span>
            <span>Lumding–Badarpur Railway Line</span>
          </div>
          <div className="legend-row">
            <span className="line-sample line-hwy-warn"></span>
            <span>NH-27 Mountain Pass</span>
          </div>
        </div>
      </div>
    </div>
  );
};
