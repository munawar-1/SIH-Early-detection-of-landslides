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
import { computeDynamicDiversions } from '../services/diversionService';
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
  onNavigateToAlerts: _onNavigateToAlerts,
  onSelectPoint
}) => {
  // Simulation Scenario State
  const [scenario, setScenario] = useState<SimulationScenario>('DISASTER_CLOUDBURST');
  const [rainfallMm, setRainfallMm] = useState<number>(310);
  const [focusedHotspot, setFocusedHotspot] = useState<HotspotPreset | null>(null);
  const [activeHotspotId, setActiveHotspotId] = useState<string>('jatinga_ridge');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
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

  const { evaluatedHighways: simulatedHighways, activeDiversions: simulatedDiversions } = useMemo(() => {
    const rawHighways = evaluateTransportVulnerability(HIGHWAY_SECTIONS, simulatedPoints);
    return computeDynamicDiversions(rawHighways, simulatedPoints);
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

  const handleDispatchEmergencyMessage = async () => {
    setIsDispatching(true);
    const backendBase = (import.meta.env.VITE_API_BASE_URL || 'https://ner-landslide-backend.onrender.com').replace(/\/$/, '');
    const mlBase = (import.meta.env.VITE_ML_API_BASE_URL || 'https://sih-early-detection-of-landslides.onrender.com').replace(/\/$/, '');

    const simulatorPayload = JSON.stringify({
      source: 'SIMULATOR',
      threatLevel: highRiskCount > 0 ? 'CRITICAL' : 'HIGH',
      district: 'Dima Hasao',
      targetLat: 25.18,
      targetLng: 92.76,
      targetRadiusKm: 50.0,
      title: '🚨 MONSOON DISASTER SIMULATOR ALERT',
      body: `[SIMULATOR DEMO TEST] Severe rainfall deluge simulation active (${rainfallMm}mm - ${scenario.replace(/_/g, ' ')}). High-risk slope instability simulated for Dima Hasao sector. Evacuate active hazard coordinates immediately.`,
      dispatchedBy: 'Monsoon Disaster Simulator (Isolated Demo Engine)',
      scenario,
      rainfallMm,
      timestamp: new Date().toISOString()
    });

    try {
      const endpoints = [
        `${backendBase}/api/alerts/simulator-dispatch`,
        `${mlBase}/api/alerts/simulator-dispatch`
      ];

      await Promise.allSettled(
        endpoints.map(url =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: simulatorPayload
          })
        )
      );
    } catch (err) {
      console.warn('Simulator dispatch error:', err);
    } finally {
      setIsDispatching(false);
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 5000);
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
            className={`btn-sim-dispatch ${broadcastSent ? 'sent' : ''} ${isDispatching ? 'sending' : ''}`}
            onClick={handleDispatchEmergencyMessage}
            disabled={isDispatching}
            title="Dispatch Automated Cell Broadcast to Dima Hasao Sector"
            type="button"
          >
            <Send size={13} className={isDispatching ? 'animate-fly' : ''} />
            <span>
              {isDispatching
                ? 'Dispatching...'
                : broadcastSent
                ? 'Broadcast Dispatched'
                : 'Dispatch Emergency Warning'}
            </span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Fixed Left Map + Independently Scrollable Right Panel */}
      <main className="sim-main-workspace">
        {/* Left Column: Fixed Interactive Map Panel (matching Corridors .corridor-map-panel) */}
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
                title="Fit and Recenter to Dima Hasao Sector"
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
              activeDiversions={simulatedDiversions}
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

        {/* Right Column: Single Independently Scrollable Panel containing all Controls + Information Cards */}
        <aside className="sim-side-panel">
          {/* Card 1: Monsoon Rainfall Benchmark (Vertical Stack) */}
          <div className="panel-card benchmark-box">
            <div className="panel-header-mini">
              <span className="panel-header-title">
                <CloudRain size={13} className="panel-title-icon" /> 1. RAINFALL BENCHMARK
              </span>
              <span className="panel-header-tag">Overview Scenarios</span>
            </div>
            <div className="benchmark-cards-vertical">
              <button
                className={`benchmark-card green-variant ${scenario === 'CLEAR_WEATHER' ? 'selected' : ''}`}
                onClick={() => handleScenarioSelect('CLEAR_WEATHER', 9)}
                type="button"
              >
                <div className="b-card-icon-wrap green">
                  <Sun size={15} />
                </div>
                <div className="b-card-text">
                  <span className="b-name">Dry Season</span>
                  <span className="b-val">&lt;10mm • Safe Baseline</span>
                </div>
                {scenario === 'CLEAR_WEATHER' && (
                  <div className="b-active-indicator green">
                    <CheckCircle2 size={13} />
                  </div>
                )}
              </button>

              <button
                className={`benchmark-card amber-variant ${scenario === 'MODERATE_MONSOON' ? 'selected' : ''}`}
                onClick={() => handleScenarioSelect('MODERATE_MONSOON', 145)}
                type="button"
              >
                <div className="b-card-icon-wrap amber">
                  <CloudRain size={15} />
                </div>
                <div className="b-card-text">
                  <span className="b-name">Active Monsoon</span>
                  <span className="b-val">145mm • Saturated</span>
                </div>
                {scenario === 'MODERATE_MONSOON' && (
                  <div className="b-active-indicator amber">
                    <CheckCircle2 size={13} />
                  </div>
                )}
              </button>

              <button
                className={`benchmark-card red-variant ${scenario === 'DISASTER_CLOUDBURST' ? 'selected' : ''}`}
                onClick={() => handleScenarioSelect('DISASTER_CLOUDBURST', 310)}
                type="button"
              >
                <div className="b-card-icon-wrap red">
                  <AlertOctagon size={15} />
                </div>
                <div className="b-card-text">
                  <span className="b-name">May 2022 Cloudburst</span>
                  <span className="b-val">310mm • Disaster Deluge</span>
                </div>
                {scenario === 'DISASTER_CLOUDBURST' && (
                  <div className="b-active-indicator red">
                    <CheckCircle2 size={13} />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: 72H Infiltration Slider */}
          <div className="panel-card infiltration-box">
            <div className="panel-header-mini">
              <span className="panel-header-title">
                <Sliders size={13} className="panel-title-icon" /> 2. 72H INFILTRATION
              </span>
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
                aria-label="72H Rainfall Infiltration Depth"
              />
              <div className="slider-threshold-labels">
                <span className="marker-safe">Dry (10mm)</span>
                <span className="marker-warn">Warning (120mm)</span>
                <span className="marker-deluge">Deluge (260mm)</span>
                <span className="marker-disaster">Disaster (400mm+)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Fly to Hotspot */}
          <div className="panel-card hotspot-box">
            <div className="panel-header-mini">
              <span className="panel-header-title">
                <MapPin size={13} className="panel-title-icon" /> 3. FLY TO HOTSPOT
              </span>
              <span className="hotspot-count-pill">{DIMA_HASAO_HOTSPOTS.length} Targets</span>
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

          {/* Card 4: Geotechnical Diagnostics (2x2 Grid) */}
          <div className="panel-card diagnostic-box">
            <div className="panel-card-header">
              <div className="header-icon-badge cyan">
                <Activity size={16} />
              </div>
              <div className="header-text-group">
                <h4>GEOTECHNICAL DIAGNOSTICS</h4>
                <span className="ridge-subtitle">Borail Mountain Range • Sensor Section 04</span>
              </div>
              <span className="active-breach-count">Telemetry Active</span>
            </div>

            <div className="metric-diag-row">
              <div className="diag-item">
                <span className="lbl">Pore Pressure (u<sub>w</sub>)</span>
                <span className="val">{rainfallMm > 200 ? '28.4 kPa' : '11.2 kPa'}</span>
                <span className={`tag ${rainfallMm > 200 ? 'danger' : 'warning'}`}>
                  {rainfallMm > 200 ? 'Saturated' : 'Moderate'}
                </span>
                <span className="diag-footnote">Piezometric hydrostatic head</span>
              </div>

              <div className="diag-item">
                <span className="lbl">Factor of Safety (FOS)</span>
                <span className="val">{rainfallMm > 200 ? '0.78' : '1.34'}</span>
                <span className={`tag ${rainfallMm > 200 ? 'danger' : 'safe'}`}>
                  {rainfallMm > 200 ? 'Failure Risk' : 'Stable'}
                </span>
                <span className="diag-footnote">Bishop limit equilibrium analysis</span>
              </div>

              <div className="diag-item">
                <span className="lbl">Soil Clay Content</span>
                <span className="val">32.4%</span>
                <span className="tag neutral">ISRIC SoilGrids</span>
                <span className="diag-footnote">High plasticity expandable clay</span>
              </div>

              <div className="diag-item">
                <span className="lbl">Slope Criticality</span>
                <span className="val">34.6°</span>
                <span className="tag warning">Steep Scarp</span>
                <span className="diag-footnote">NASA SRTM 30m digital terrain</span>
              </div>
            </div>
          </div>

          {/* Card 5: Simulated Critical Severance */}
          <div className="panel-card corridors-alert-box">
            <div className="panel-card-header">
              <div className="header-icon-badge red">
                <ShieldAlert size={16} />
              </div>
              <div className="header-text-group">
                <h4>SIMULATED CRITICAL SEVERANCE</h4>
                <span className="ridge-subtitle">Infrastructure Breach Forecast</span>
              </div>
              <span className="active-breach-count">2 Corridors Impacted</span>
            </div>

            <div className="severance-items-container">
              <div className="corridor-alert-item rail-severance">
                <div className="corridor-icon-badge red">
                  <Train size={16} />
                </div>
                <div className="corridor-alert-content">
                  <div className="corridor-title-row">
                    <strong>Lumding–Badarpur Railway Line</strong>
                    <span className="threat-pill critical">CRITICAL THREAT</span>
                  </div>
                  <p>
                    Track foundation wash-away threat between Daotuhaja and New Haflong (Km 52). Ballast subgrade liquefaction and slope subsidence detected.
                  </p>
                </div>
              </div>

              <div className="corridor-alert-item hwy-severance">
                <div className="corridor-icon-badge amber">
                  <Navigation size={16} />
                </div>
                <div className="corridor-alert-content">
                  <div className="corridor-title-row">
                    <strong>NH-27 Jatinga Mountain Pass</strong>
                    <span className="threat-pill warning">LOCALIZED DETOUR ACTIVE</span>
                  </div>
                  <p>
                    Slide blockage isolated to Km 12–16 (4 km). Pre-slide traffic rerouted at Jatinga Ridge Junction via NH-27A Haflong Town Bypass. Remainder of NH-27 corridor operational.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 6: Early Warning Advisory & Protocol */}
          <div className="panel-card protocol-box">
            <div className="panel-card-header">
              <div className="header-icon-badge amber">
                <Flame size={16} />
              </div>
              <div className="header-text-group">
                <h4>DISASTER RESPONSE &amp; CAUTION PROTOCOL</h4>
                <span className="ridge-subtitle">NFR Railway &amp; NHAI Advisory Guidelines</span>
              </div>
            </div>

            <div className="protocol-summary-grid">
              <div className="protocol-stat-pill">
                <span className="p-tag">RAIL SPEED LIMIT</span>
                <strong className="p-num">{rainfallMm > 200 ? '15 km/h' : '45 km/h'}</strong>
                <span className="p-sub">Caution order daotuhaja–haflong</span>
              </div>
              <div className="protocol-stat-pill">
                <span className="p-tag">HIGHWAY STATUS</span>
                <strong className="p-num">{rainfallMm > 200 ? 'RESTRICTED' : 'OPEN'}</strong>
                <span className="p-sub">NH-27 heavy vehicles hold</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
