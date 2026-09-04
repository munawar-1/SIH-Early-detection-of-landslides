import React, { useState } from 'react';
import { 
  CloudRain, 
  AlertOctagon, 
  Sun, 
  Sliders, 
  MapPin, 
  Radio, 
  ChevronUp, 
  ChevronDown, 
  Flame, 
  Train, 
  Navigation,
  Send,
  Sparkles
} from 'lucide-react';
import { 
  type SimulationScenario, 
  DIMA_HASAO_HOTSPOTS, 
  type HotspotPreset 
} from '../../services/simulationService';
import './PitchSimulationBar.css';

interface PitchSimulationBarProps {
  scenario: SimulationScenario;
  customRainfallMm: number;
  onScenarioChange: (scenario: SimulationScenario, rainfall?: number) => void;
  onCustomRainfallChange: (rainfall: number) => void;
  onFlyToHotspot: (hotspot: HotspotPreset) => void;
  onNavigateToAlerts: () => void;
  highRiskCount: number;
  criticalRailwaysCount: number;
  criticalHighwaysCount: number;
  isSimulationActive: boolean;
  onToggleActive: (active: boolean) => void;
}

export const PitchSimulationBar: React.FC<PitchSimulationBarProps> = ({
  scenario,
  customRainfallMm,
  onScenarioChange,
  onCustomRainfallChange,
  onFlyToHotspot,
  onNavigateToAlerts,
  highRiskCount,
  criticalRailwaysCount,
  criticalHighwaysCount,
  isSimulationActive,
  onToggleActive
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);

  const handleHotspotClick = (hotspot: HotspotPreset) => {
    setActiveHotspotId(hotspot.id);
    onFlyToHotspot(hotspot);
  };

  const getRainfallDisplay = () => {
    if (scenario === 'CLEAR_WEATHER') return '9 mm';
    if (scenario === 'MODERATE_MONSOON') return '141 mm';
    if (scenario === 'DISASTER_CLOUDBURST') return '308 mm';
    return `${customRainfallMm} mm`;
  };

  return (
    <div className={`pitch-simulation-wrapper ${isSimulationActive ? 'active' : 'inactive'}`}>
      <div className="pitch-simulation-container">
        {/* Top Header Strip */}
        <div className="pitch-bar-header">
          <div className="pitch-badge-left">
            <div className="pitch-tag-glow">
              <Sparkles size={13} className="text-amber animate-spin-slow" />
              <span className="pitch-tag-text">SIH EVALUATION PITCH MODE</span>
            </div>
            <div className="pitch-title-desc">
              <span className="pitch-main-label">
                {isSimulationActive ? 'Dima Hasao Monsoon Simulation Engine' : 'Live Real-Time Satellite Feed (Clear)'}
              </span>
              <span className="pitch-sub-label">
                {isSimulationActive 
                  ? 'Real-time geotechnical pore-pressure & slope destabilization model' 
                  : 'Toggle to simulate intense monsoon deluge & railway severance for judges'}
              </span>
            </div>
          </div>

          <div className="pitch-header-actions">
            <button
              className={`pitch-master-toggle ${isSimulationActive ? 'engaged' : 'idle'}`}
              onClick={() => onToggleActive(!isSimulationActive)}
              title={isSimulationActive ? 'Deactivate Simulation & Return to Live Weather' : 'Activate Pitch Simulation Mode'}
              type="button"
            >
              <Radio size={14} className={isSimulationActive ? 'pulse-danger' : ''} />
              <span>{isSimulationActive ? 'Simulation ACTIVE' : 'Activate Pitch Mode'}</span>
            </button>

            <button
              className="pitch-expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse Simulation Bar' : 'Expand Simulation Bar'}
              type="button"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Expandable Controls Body */}
        {isExpanded && (
          <div className="pitch-bar-body">
            {/* 1. Scenario Quick Selectors */}
            <div className="pitch-control-group scenarios-group">
              <span className="control-group-title">
                <CloudRain size={13} /> Monsoon Deluge Scenarios:
              </span>
              <div className="scenario-buttons-row">
                <button
                  className={`scenario-btn ${scenario === 'CLEAR_WEATHER' && isSimulationActive ? 'selected safe' : ''}`}
                  onClick={() => {
                    onToggleActive(true);
                    onScenarioChange('CLEAR_WEATHER', 9);
                  }}
                  type="button"
                >
                  <Sun size={14} className="scenario-icon text-green" />
                  <div className="scenario-btn-text">
                    <span className="btn-name">Clear Weather</span>
                    <span className="btn-stat">&lt; 10 mm / Safe</span>
                  </div>
                </button>

                <button
                  className={`scenario-btn ${scenario === 'MODERATE_MONSOON' ? 'selected warning' : ''}`}
                  onClick={() => {
                    onToggleActive(true);
                    onScenarioChange('MODERATE_MONSOON', 140);
                  }}
                  type="button"
                >
                  <CloudRain size={14} className="scenario-icon text-amber" />
                  <div className="scenario-btn-text">
                    <span className="btn-name">Active Monsoon</span>
                    <span className="btn-stat">140 mm / Borail Surge</span>
                  </div>
                </button>

                <button
                  className={`scenario-btn ${scenario === 'DISASTER_CLOUDBURST' ? 'selected danger pulse-border' : ''}`}
                  onClick={() => {
                    onToggleActive(true);
                    onScenarioChange('DISASTER_CLOUDBURST', 280);
                  }}
                  type="button"
                >
                  <AlertOctagon size={14} className="scenario-icon text-red" />
                  <div className="scenario-btn-text">
                    <span className="btn-name">May 2022 Disaster</span>
                    <span className="btn-stat">300+ mm / Critical Failure</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Interactive Rainfall Infiltration Slider */}
            <div className="pitch-control-group slider-group">
              <div className="slider-header-row">
                <span className="control-group-title">
                  <Sliders size={13} /> 3-Day Infiltration:
                </span>
                <span className="slider-value-badge">
                  <strong>{getRainfallDisplay()}</strong>
                </span>
              </div>
              <div className="slider-track-wrap">
                <input
                  type="range"
                  min={10}
                  max={380}
                  step={10}
                  value={scenario === 'CUSTOM' ? customRainfallMm : (
                    scenario === 'CLEAR_WEATHER' ? 10 : (scenario === 'MODERATE_MONSOON' ? 140 : 300)
                  )}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onToggleActive(true);
                    onCustomRainfallChange(val);
                  }}
                  className="pitch-rain-slider"
                  title="Drag slider to demonstrate real-time ML risk reactivity to judges"
                />
                <div className="slider-tick-labels">
                  <span>10mm (Dry)</span>
                  <span>100mm (Warning)</span>
                  <span>200mm (Hazard)</span>
                  <span>350mm+ (Disaster)</span>
                </div>
              </div>
            </div>

            {/* 3. Dima Hasao Hotspot Quick Teleport */}
            <div className="pitch-control-group hotspots-group">
              <span className="control-group-title">
                <MapPin size={13} /> Hotspot Focus:
              </span>
              <div className="hotspots-pill-grid">
                {DIMA_HASAO_HOTSPOTS.map((spot) => (
                  <button
                    key={spot.id}
                    className={`hotspot-chip ${activeHotspotId === spot.id ? 'active' : ''}`}
                    onClick={() => handleHotspotClick(spot)}
                    title={spot.description}
                    type="button"
                  >
                    <span className="hotspot-dot" />
                    <span className="hotspot-name">{spot.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Live Pitch Telemetry & Instant Broadcast */}
            <div className="pitch-telemetry-group">
              <div className="telemetry-pill">
                <Flame size={13} className="text-red" />
                <div className="telemetry-info">
                  <span className="telemetry-num">{highRiskCount}</span>
                  <span className="telemetry-lbl">Red Alert Hotspots</span>
                </div>
              </div>

              <div className="telemetry-pill">
                <Train size={13} className="text-cyan" />
                <div className="telemetry-info">
                  <span className="telemetry-num">{criticalRailwaysCount}</span>
                  <span className="telemetry-lbl">Rail Severance</span>
                </div>
              </div>

              <div className="telemetry-pill">
                <Navigation size={13} className="text-amber" />
                <div className="telemetry-info">
                  <span className="telemetry-num">{criticalHighwaysCount}</span>
                  <span className="telemetry-lbl">NH-27 Cuts</span>
                </div>
              </div>

              <button
                className="btn-trigger-pitch-alert"
                onClick={onNavigateToAlerts}
                title="Open Emergency Alerts Hub with populated Dima Hasao cloudburst bulletin"
                type="button"
              >
                <Send size={13} />
                <span>Dispatch Broadcast</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
