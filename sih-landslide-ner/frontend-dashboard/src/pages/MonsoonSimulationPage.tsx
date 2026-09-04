import React, { useState, useMemo } from 'react';
import type { 
  GridPoint, 
  FilterState 
} from '../types/landslide';
import { LandslideMap } from '../components/Map/LandslideMap';
import { 
  RAILWAY_SECTIONS, 
  HIGHWAY_SECTIONS, 
  CRITICAL_STATIONS 
} from '../data/infrastructureData';
import { NH_SEGMENTS_RAW } from '../data/highwayData';
import { 
  evaluateTransportVulnerability, 
  evaluateHighwayMicroSegments 
} from '../services/apiService';
import { 
  type SimulationScenario, 
  type HotspotPreset, 
  DIMA_HASAO_HOTSPOTS, 
  applyDimaHasaoMonsoonSimulation 
} from '../services/simulationService';
import { 
  CloudRain, 
  AlertOctagon, 
  Sun, 
  Sliders, 
  MapPin, 
  Flame, 
  Train, 
  Navigation, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  Activity,
  CheckCircle2,
  Crosshair
} from 'lucide-react';
import './MonsoonSimulationPage.css';

interface MonsoonSimulationPageProps {
  baseGridPoints: GridPoint[];
  onNavigateToAlerts?: () => void;
  onSelectPoint?: (point: GridPoint) => void;
}

export const MonsoonSimulationPage: React.FC<MonsoonSimulationPageProps> = ({
  baseGridPoints,
  onNavigateToAlerts,
  onSelectPoint
}) => {
  // Simulation Scenario State
  const [scenario, setScenario] = useState<SimulationScenario>('DISASTER_CLOUDBURST');
  const [rainfallMm, setRainfallMm] = useState<number>(310);
  const [focusedHotspot, setFocusedHotspot] = useState<HotspotPreset | null>(null);
  const [activeHotspotId, setActiveHotspotId] = useState<string>('jatinga_ridge');
  const [broadcastSent, setBroadcastSent] = useState<boolean>(false);

  // Map Filter State for Simulation
  const [simFilters] = useState<FilterState>({
    minRiskLevel: 'ALL',
    minSlope: 0,
    minRainfall: 0,
    forecastHorizon: '72h',
    showHeatmap: true,
    showGridPoints: true,
    showRailways: true,
    showHighways: true,
    showStations: true,
    showHistoricalIncidents: true,
    baseMap: 'topo'
  });

  // 1. Calculate simulated points dynamically
  const simulatedPoints = useMemo(() => {
    if (!baseGridPoints || baseGridPoints.length === 0) return [];
    return applyDimaHasaoMonsoonSimulation(baseGridPoints, scenario, rainfallMm);
  }, [baseGridPoints, scenario, rainfallMm]);

  // 2. Evaluate simulated transport infrastructure
  const simulatedRailways = useMemo(() => {
    return evaluateTransportVulnerability(RAILWAY_SECTIONS, simulatedPoints);
  }, [simulatedPoints]);

  const simulatedHighways = useMemo(() => {
    return evaluateTransportVulnerability(HIGHWAY_SECTIONS, simulatedPoints);
  }, [simulatedPoints]);

  const simulatedMicroHighways = useMemo(() => {
    return evaluateHighwayMicroSegments(NH_SEGMENTS_RAW, simulatedPoints);
  }, [simulatedPoints]);

  // Telemetry counts
  const highRiskCount = simulatedPoints.filter(p => p.riskLevel === 'HIGH').length;
  const criticalRailCount = simulatedRailways.filter(r => r.threatLevel === 'CRITICAL').length;
  const criticalHighwayCount = simulatedMicroHighways.filter(h => h.threatLevel === 'CRITICAL').length;

  const handleScenarioSelect = (selectedScenario: SimulationScenario, defaultRain: number) => {
    setScenario(selectedScenario);
    setRainfallMm(defaultRain);
  };

  const handleHotspotClick = (spot: HotspotPreset) => {
    setActiveHotspotId(spot.id);
    setFocusedHotspot(spot);
  };

  const handleDispatchSimulationAlert = () => {
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 5000);
    if (onNavigateToAlerts) {
      setTimeout(() => onNavigateToAlerts(), 1200);
    }
  };

  const scenarioNameDisplay = useMemo(() => {
    if (scenario === 'DISASTER_CLOUDBURST') return 'May 2022 Cloudburst';
    if (scenario === 'MODERATE_MONSOON') return 'Active Monsoon';
    if (scenario === 'CLEAR_WEATHER') return 'Dry Season (Clear)';
    return 'Custom Infiltration';
  }, [scenario]);

  return (
    <div className="simulation-dashboard-page">
      {/* Background Ambience Isolated from Document Flow */}
      <div className="sim-ambient-bg">
        <div className="sim-ambient-orb orb-1" />
        <div className="sim-ambient-orb orb-2" />
      </div>

      {/* 1. Compact Header Command Bar */}
      <header className="sim-header-bar">
        <div className="sim-header-brand">
          <div className="sim-icon-box">
            <CloudRain size={18} className="text-cyan" />
          </div>
          <div className="sim-title-group">
            <div className="sim-title-row">
              <h2 className="sim-title">MONSOON SIMULATOR</h2>
              <span className="sim-pitch-badge">
                <Sparkles size={11} /> SIH Pitch
              </span>
            </div>
            <p className="sim-subtitle">
              Dima Hasao Disaster Simulation • May 2022 &amp; June 2024 Benchmark
            </p>
          </div>
        </div>

        {/* Live Simulation Status Element */}
        <div className="sim-status-strip">
          <span className="status-live-pulse" />
          <span className="status-label">SIMULATION ACTIVE:</span>
          <span className="status-scenario">{scenarioNameDisplay}</span>
          <span className="status-sep">•</span>
          <span className="status-val">{rainfallMm} mm Infiltration</span>
          <span className="status-sep">•</span>
          <span className="status-loc">Dima Hasao Sector</span>
        </div>

        {/* Telemetry Metric Badges & Emergency Action */}
        <div className="sim-header-actions">
          <div className="sim-metrics-cluster">
            <div className="sim-mini-badge red" title="Red Alert Landslide Hotspots">
              <Flame size={13} />
              <strong>{highRiskCount}</strong> Hotspots
            </div>
            <div className="sim-mini-badge blue" title="Rail Track Severance Risk">
              <Train size={13} />
              <strong>{criticalRailCount}</strong> Rail
            </div>
            <div className="sim-mini-badge amber" title="NH-27 Highway Closures">
              <Navigation size={13} />
              <strong>{criticalHighwayCount}</strong> Highway
            </div>
          </div>

          <button 
            className={`btn-sim-dispatch ${broadcastSent ? 'sent' : ''}`}
            onClick={handleDispatchSimulationAlert}
            title="Dispatch Automated Cell Broadcast to Dima Hasao Sector"
            type="button"
          >
            <Send size={13} />
            <span>{broadcastSent ? 'Broadcast Dispatched' : 'Dispatch Warning'}</span>
          </button>
        </div>
      </header>

      {/* 2. Compact Simulation Control Center */}
      <section className="sim-controls-strip">
        {/* Panel 1: Monsoon Rainfall Benchmark */}
        <div className="sim-panel benchmark-panel">
          <div className="panel-header-mini">
            <CloudRain size={13} />
            <span>1. Rainfall Benchmark</span>
          </div>
          <div className="benchmark-cards-grid">
            <button
              className={`benchmark-card ${scenario === 'CLEAR_WEATHER' ? 'selected green' : ''}`}
              onClick={() => handleScenarioSelect('CLEAR_WEATHER', 9)}
              type="button"
            >
              <Sun size={14} className="icon-green" />
              <div className="b-card-text">
                <span className="b-name">Dry Season</span>
                <span className="b-val">&lt;10mm • Safe Baseline</span>
              </div>
              {scenario === 'CLEAR_WEATHER' && <CheckCircle2 size={13} className="check-icon" />}
            </button>

            <button
              className={`benchmark-card ${scenario === 'MODERATE_MONSOON' ? 'selected amber' : ''}`}
              onClick={() => handleScenarioSelect('MODERATE_MONSOON', 145)}
              type="button"
            >
              <CloudRain size={14} className="icon-amber" />
              <div className="b-card-text">
                <span className="b-name">Active Monsoon</span>
                <span className="b-val">145mm • Saturated</span>
              </div>
              {scenario === 'MODERATE_MONSOON' && <CheckCircle2 size={13} className="check-icon" />}
            </button>

            <button
              className={`benchmark-card ${scenario === 'DISASTER_CLOUDBURST' ? 'selected red' : ''}`}
              onClick={() => handleScenarioSelect('DISASTER_CLOUDBURST', 310)}
              type="button"
            >
              <AlertOctagon size={14} className="icon-red" />
              <div className="b-card-text">
                <span className="b-name">May 2022 Cloudburst</span>
                <span className="b-val">310mm • Disaster Deluge</span>
              </div>
              {scenario === 'DISASTER_CLOUDBURST' && <CheckCircle2 size={13} className="check-icon" />}
            </button>
          </div>
        </div>

        {/* Panel 2: 72H Infiltration Slider */}
        <div className="sim-panel infiltration-panel">
          <div className="panel-header-mini">
            <Sliders size={13} />
            <span>2. 72H Infiltration</span>
            <span className="infiltration-badge">{rainfallMm} mm</span>
          </div>
          <div className="slider-wrapper-mini">
            <input 
              type="range" 
              min={10} 
              max={420} 
              step={10}
              value={rainfallMm}
              onChange={(e) => {
                setScenario('CUSTOM');
                setRainfallMm(Number(e.target.value));
              }}
              className="compact-sim-slider"
            />
            <div className="slider-threshold-labels">
              <span>Dry (10mm)</span>
              <span>Warning (120mm)</span>
              <span>Deluge (260mm)</span>
              <span>Disaster (400mm+)</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Fly to Hotspot */}
        <div className="sim-panel hotspot-panel">
          <div className="panel-header-mini">
            <MapPin size={13} />
            <span>3. Fly to Hotspot</span>
          </div>
          <div className="hotspot-chips-container">
            {DIMA_HASAO_HOTSPOTS.map(spot => (
              <button
                key={spot.id}
                className={`hotspot-chip ${activeHotspotId === spot.id ? 'active' : ''}`}
                onClick={() => handleHotspotClick(spot)}
                type="button"
              >
                <span className="chip-dot" />
                <span>{spot.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Main Workspace: Hero Interactive Map + Diagnostics & Severance */}
      <main className="sim-main-workspace">
        {/* Full Interactive Leaflet Simulation Canvas in Hero Frame */}
        <div className="sim-map-frame">
          <div className="sim-map-header-toolbar">
            <div className="map-toolbar-left">
              <div className="map-title-cluster">
                <span className="map-live-dot" />
                <span className="map-main-title">LIVE HAZARD MAP</span>
                <span className="map-sep">•</span>
                <span className="map-subtitle">Dima Hasao • Monsoon Simulation</span>
              </div>
            </div>

            <div className="map-toolbar-right">
              <span className="map-scenario-pill">
                {scenario === 'DISASTER_CLOUDBURST' ? 'May 2022 Benchmark (>300mm)' : `${rainfallMm}mm 72h Infiltration`}
              </span>
              <button 
                className="map-action-btn"
                onClick={() => {
                  if (DIMA_HASAO_HOTSPOTS.length > 0) {
                    handleHotspotClick(DIMA_HASAO_HOTSPOTS[0]);
                  }
                }}
                title="Fit to Dima Hasao Sector"
                type="button"
              >
                <Crosshair size={12} /> Fit Area
              </button>
            </div>
          </div>

          <div className="sim-map-canvas-wrap">
            <LandslideMap
              gridPoints={simulatedPoints}
              railways={simulatedRailways}
              highways={simulatedHighways}
              highwayMicroSegments={simulatedMicroHighways}
              stations={CRITICAL_STATIONS}
              filters={simFilters}
              onSelectPoint={onSelectPoint}
              focusedHotspot={focusedHotspot}
              isSimulationActive={true}
              simulationScenario={scenario}
            />
          </div>
        </div>

        {/* Right Diagnostics & Critical Severance Panel */}
        <aside className="sim-side-panel">
          {/* Diagnostics Card */}
          <div className="panel-card diagnostic-box">
            <div className="panel-card-header">
              <Activity size={15} className="text-cyan" />
              <h4>GEOTECHNICAL DIAGNOSTICS</h4>
              <span className="ridge-subtitle">Borail Ridge</span>
            </div>
            <div className="metric-diag-row">
              <div className="diag-item">
                <span className="lbl">Pore Pressure</span>
                <span className="val">{rainfallMm > 200 ? '28.4 kPa' : '11.2 kPa'}</span>
                <span className={`tag ${rainfallMm > 200 ? 'danger' : 'warning'}`}>
                  {rainfallMm > 200 ? 'Saturated' : 'Moderate'}
                </span>
              </div>
              <div className="diag-item">
                <span className="lbl">Safety Factor</span>
                <span className="val">{rainfallMm > 200 ? '0.78' : '1.34'}</span>
                <span className={`tag ${rainfallMm > 200 ? 'danger' : 'safe'}`}>
                  {rainfallMm > 200 ? 'Failure Risk' : 'Stable'}
                </span>
              </div>
              <div className="diag-item">
                <span className="lbl">Soil Clay</span>
                <span className="val">32.4%</span>
                <span className="tag neutral">ISRIC SoilGrids</span>
              </div>
              <div className="diag-item">
                <span className="lbl">Slope</span>
                <span className="val">34.6°</span>
                <span className="tag warning">Steep Scarp</span>
              </div>
            </div>
          </div>

          {/* Simulated Critical Severance Card */}
          <div className="panel-card corridors-alert-box">
            <div className="panel-card-header">
              <ShieldAlert size={15} className="text-red" />
              <h4>SIMULATED CRITICAL SEVERANCE</h4>
            </div>
            <div className="corridor-alert-item rail-severance">
              <Train size={15} className="text-red" />
              <div>
                <strong>Lumding–Badarpur Railway Line</strong>
                <p>Track foundation wash-away threat between Daotuhaja and New Haflong (Km 52).</p>
              </div>
            </div>
            <div className="corridor-alert-item hwy-severance">
              <Navigation size={15} className="text-amber" />
              <div>
                <strong>NH-27 Jatinga Mountain Pass</strong>
                <p>Debris flows and boulder falls blocking 4-lane East-West highway corridor.</p>
              </div>
            </div>
          </div>

          {/* Evaluator Pitch Highlight Card */}
          <div className="panel-card pitch-tip-box">
            <div className="panel-card-header">
              <Sparkles size={14} className="text-amber" />
              <h4>INSIGHT • WHY THIS MATTERS</h4>
            </div>
            <p className="pitch-note">
              "Judges, during dry months, the live GIS stays green. But when intense monsoon cloudbursts strike Dima Hasao, our multi-parameter ML engine uses SRTM slope, ISRIC clay, and precipitation to forecast slope failures 72 hours before disaster strikes."
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};
