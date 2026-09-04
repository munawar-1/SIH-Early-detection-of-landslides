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
  Activity
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

  return (
    <div className="simulation-dashboard-page">
      {/* Top Banner Control Console */}
      <div className="sim-control-console">
        <div className="sim-console-top">
          <div className="sim-title-cluster">
            <div className="sim-live-badge">
              <Sparkles size={13} className="text-amber" />
              <span>SIH PITCH EVALUATION SUITE</span>
            </div>
            <div className="sim-headline">
              <h2>🌧️ Dima Hasao Monsoon Disaster Simulator</h2>
              <p>Isolated Sandbox: Benchmarked against the May 2022 &amp; June 2024 Barail Mountain Deluges</p>
            </div>
          </div>

          <div className="sim-telemetry-strip">
            <div className="telemetry-box red">
              <Flame size={16} />
              <div className="telemetry-data">
                <span className="val">{highRiskCount}</span>
                <span className="lbl">Red Alert Grid Hotspots</span>
              </div>
            </div>

            <div className="telemetry-box cyan">
              <Train size={16} />
              <div className="telemetry-data">
                <span className="val">{criticalRailCount} Sections</span>
                <span className="lbl">Rail Track Severance Risk</span>
              </div>
            </div>

            <div className="telemetry-box amber">
              <Navigation size={16} />
              <div className="telemetry-data">
                <span className="val">{criticalHighwayCount} Cuts</span>
                <span className="lbl">NH-27 Highway Closures</span>
              </div>
            </div>

            <button 
              className={`btn-sim-broadcast ${broadcastSent ? 'sent' : ''}`}
              onClick={handleDispatchSimulationAlert}
              title="Test Automated Cell Tower Broadcast to Dima Hasao"
              type="button"
            >
              <Send size={14} />
              <span>{broadcastSent ? '✅ Broadcast Sent (14,200 Mobiles)' : 'Dispatch Emergency Warning'}</span>
            </button>
          </div>
        </div>

        {/* Console Controls Grid */}
        <div className="sim-controls-grid">
          {/* Preset Scenarios */}
          <div className="sim-card scenario-picker">
            <label className="sim-card-label">
              <CloudRain size={13} /> 1. Monsoon Rainfall Benchmark
            </label>
            <div className="sim-scenario-btns">
              <button
                className={`sim-btn ${scenario === 'CLEAR_WEATHER' ? 'active green' : ''}`}
                onClick={() => handleScenarioSelect('CLEAR_WEATHER', 9)}
                type="button"
              >
                <Sun size={15} className="text-green" />
                <div className="btn-txt">
                  <span className="main">Dry Season (Clear)</span>
                  <span className="sub">&lt;10mm / Safe Baseline</span>
                </div>
              </button>

              <button
                className={`sim-btn ${scenario === 'MODERATE_MONSOON' ? 'active amber' : ''}`}
                onClick={() => handleScenarioSelect('MODERATE_MONSOON', 145)}
                type="button"
              >
                <CloudRain size={15} className="text-amber" />
                <div className="btn-txt">
                  <span className="main">Active Monsoon Surge</span>
                  <span className="sub">145mm / Mountain Saturated</span>
                </div>
              </button>

              <button
                className={`sim-btn ${scenario === 'DISASTER_CLOUDBURST' ? 'active red pulse-glow' : ''}`}
                onClick={() => handleScenarioSelect('DISASTER_CLOUDBURST', 310)}
                type="button"
              >
                <AlertOctagon size={15} className="text-red" />
                <div className="btn-txt">
                  <span className="main">May 2022 Cloudburst</span>
                  <span className="sub">310mm / Disaster Failure</span>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Infiltration Slider */}
          <div className="sim-card slider-card">
            <div className="slider-label-row">
              <label className="sim-card-label">
                <Sliders size={13} /> 2. 72h Infiltration:
              </label>
              <span className="rain-readout">{rainfallMm} mm</span>
            </div>
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
              className="sim-slider"
            />
            <div className="slider-markers">
              <span>Dry (10mm)</span>
              <span>Warning (120mm)</span>
              <span>Deluge (260mm)</span>
              <span>Disaster (400mm+)</span>
            </div>
          </div>

          {/* Hotspot Focus Teleports */}
          <div className="sim-card hotspots-card">
            <label className="sim-card-label">
              <MapPin size={13} /> 3. Fly to Hotspot
            </label>
            <div className="hotspot-btn-list">
              {DIMA_HASAO_HOTSPOTS.map(spot => (
                <button
                  key={spot.id}
                  className={`hotspot-tag ${activeHotspotId === spot.id ? 'selected' : ''}`}
                  onClick={() => handleHotspotClick(spot)}
                  type="button"
                >
                  <span className="dot" />
                  <span>{spot.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map & Intelligence Workspace */}
      <div className="sim-main-workspace">
        {/* Full Interactive Leaflet Simulation Canvas */}
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

        {/* Right Intelligence & Geotechnical Breakdown Panel */}
        <div className="sim-side-panel">
          <div className="panel-card diagnostic-box">
            <div className="panel-card-header">
              <Activity size={15} className="text-cyan" />
              <h4>Geotechnical Diagnostics (Borail Ridge)</h4>
            </div>
            <div className="metric-diag-row">
              <div className="diag-item">
                <span className="lbl">Pore Pressure ($u_w$)</span>
                <span className="val text-red">
                  {rainfallMm > 200 ? '28.4 kPa (Saturated)' : '11.2 kPa (Moderate)'}
                </span>
              </div>
              <div className="diag-item">
                <span className="lbl">Factor of Safety ($FOS$)</span>
                <span className="val text-red">
                  {rainfallMm > 200 ? '0.78 (Failure Imminent)' : '1.34 (Stable)'}
                </span>
              </div>
              <div className="diag-item">
                <span className="lbl">Soil Clay Content</span>
                <span className="val">32.4% (ISRIC SoilGrids)</span>
              </div>
              <div className="diag-item">
                <span className="lbl">Barail Slope Criticality</span>
                <span className="val">34.6° Steep Scarp</span>
              </div>
            </div>
          </div>

          <div className="panel-card corridors-alert-box">
            <div className="panel-card-header">
              <ShieldAlert size={15} className="text-red" />
              <h4>Simulated Critical Severance</h4>
            </div>
            <div className="corridor-alert-item">
              <Train size={14} className="text-red" />
              <div>
                <strong>Lumding–Badarpur Railway Line</strong>
                <p>Track foundation wash-away threat between Daotuhaja and New Haflong (Km 52).</p>
              </div>
            </div>
            <div className="corridor-alert-item">
              <Navigation size={14} className="text-amber" />
              <div>
                <strong>NH-27 Jatinga Mountain Pass</strong>
                <p>Debris flows and boulder falls blocking 4-lane East-West highway corridor.</p>
              </div>
            </div>
          </div>

          <div className="panel-card pitch-tip-box">
            <div className="panel-card-header">
              <Sparkles size={14} className="text-amber" />
              <h4>Evaluator Pitch Highlight</h4>
            </div>
            <p className="pitch-note">
              "Judges, during dry months, the live GIS stays green. But when intense monsoon cloudbursts strike Dima Hasao, our multi-parameter ML engine uses SRTM slope, ISRIC clay, and precipitation to forecast slope failures 72 hours before disaster strikes."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
