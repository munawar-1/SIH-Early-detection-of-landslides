import React from 'react';
import type { FilterState, BaseMapType, ForecastHorizon } from '../../types/landslide';
import { 
  Layers, 
  Clock, 
  Sliders, 
  RefreshCw, 
  Map as MapIcon, 
  Train, 
  Navigation, 
  Landmark, 
  History, 
  Flame,
  ChevronLeft
} from 'lucide-react';

interface LayerControlsProps {
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onRefreshPipeline: () => void;
  isRefreshing: boolean;
  isBackendConnected: boolean;
  onClose?: () => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  filters,
  onFilterChange,
  onRefreshPipeline,
  isRefreshing,
  isBackendConnected,
  onClose
}) => {
  const baseMapOptions: { type: BaseMapType; label: string; icon: string }[] = [
    { type: 'dark', label: 'Dark Command', icon: '🌑' },
    { type: 'satellite', label: 'ESRI Satellite', icon: '🛰️' },
    { type: 'topo', label: 'Topographic DEM', icon: '⛰️' },
    { type: 'osm', label: 'Street Map', icon: '🗺️' }
  ];

  const horizonOptions: { type: ForecastHorizon; label: string; desc: string }[] = [
    { type: '24h', label: '24 Hours', desc: 'Day 1 Saturation' },
    { type: '48h', label: '48 Hours', desc: 'Day 1+2 Cumulative' },
    { type: '72h', label: '72 Hours', desc: '3-Day Full Horizon' }
  ];

  return (
    <div className="layer-controls-container">
      <div className="controls-header">
        <div className="title-row">
          <Layers size={18} className="text-cyan" />
          <h3 className="section-title">GIS Layers &amp; Filters</h3>
        </div>

        {onClose && (
          <button 
            className="btn-hide-controls-panel"
            onClick={onClose}
            title="Hide GIS Controls Panel"
            aria-label="Hide Controls"
            type="button"
          >
            <span>Hide Controls</span>
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      <div className="pipeline-trigger-row">
        <button 
          className={`btn-refresh-pipeline full-width ${isRefreshing ? 'loading' : ''}`}
          onClick={onRefreshPipeline}
          disabled={isRefreshing}
          title="Fetch latest Open-Meteo rainfall and run ML batch prediction"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Computing AI Model...' : 'Trigger Live Assessment'}</span>
        </button>
      </div>

      {/* Backend Status Indicator */}
      <div className={`backend-pill ${isBackendConnected ? 'online' : 'cached'}`}>
        <span className="pulse-dot" />
        <span>{isBackendConnected ? 'Live MySQL & ML Microservice Connected' : 'Running on High-Resolution Spatial Baseline'}</span>
      </div>

      {/* 1. Temporal Horizon Selector */}
      <div className="control-section">
        <label className="section-label">
          <Clock size={14} /> Forecast Horizon (Rainfall Saturation)
        </label>
        <div className="horizon-btn-group">
          {horizonOptions.map(h => (
            <button
              key={h.type}
              className={`horizon-btn ${filters.forecastHorizon === h.type ? 'active' : ''}`}
              onClick={() => onFilterChange({ forecastHorizon: h.type })}
            >
              <span className="h-title">{h.label}</span>
              <span className="h-desc">{h.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Basemap Selector */}
      <div className="control-section">
        <label className="section-label">
          <MapIcon size={14} /> Basemap Imagery
        </label>
        <div className="basemap-grid">
          {baseMapOptions.map(b => (
            <button
              key={b.type}
              className={`basemap-btn ${filters.baseMap === b.type ? 'active' : ''}`}
              onClick={() => onFilterChange({ baseMap: b.type })}
            >
              <span className="b-icon">{b.icon}</span>
              <span className="b-label">{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. GIS Vector Layer Toggles */}
      <div className="control-section">
        <label className="section-label">
          <Sliders size={14} /> Active Spatial Layers
        </label>

        <div className="toggle-list">
          <label className="toggle-item">
            <input
              type="checkbox"
              checked={filters.showRailways}
              onChange={e => onFilterChange({ showRailways: e.target.checked })}
            />
            <span className="toggle-custom" />
            <Train size={15} className="text-amber" />
            <span className="toggle-label">Lumding–Badarpur Railway Line</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={filters.showHighways}
              onChange={e => onFilterChange({ showHighways: e.target.checked })}
            />
            <span className="toggle-custom" />
            <Navigation size={15} className="text-cyan" />
            <span className="toggle-label">Road Networks (NH, SH & Connecting Roads)</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={filters.showGridPoints}
              onChange={e => onFilterChange({ showGridPoints: e.target.checked })}
            />
            <span className="toggle-custom" />
            <Flame size={15} className="text-red" />
            <span className="toggle-label">10,000 Terrain Grid Points (Risk Gradients)</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={filters.showStations}
              onChange={e => onFilterChange({ showStations: e.target.checked })}
            />
            <span className="toggle-custom" />
            <Landmark size={15} className="text-blue" />
            <span className="toggle-label">Key Stations & Administrative Towns</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              checked={filters.showHistoricalIncidents}
              onChange={e => onFilterChange({ showHistoricalIncidents: e.target.checked })}
            />
            <span className="toggle-custom" />
            <History size={15} className="text-purple" />
            <span className="toggle-label">Historical 2022 Disaster Ground Zeros</span>
          </label>
        </div>
      </div>

      {/* 4. Threshold Sliders */}
      <div className="control-section">
        <label className="section-label">Hazard Filter Thresholds</label>

        {/* Risk Level filter */}
        <div className="filter-slider-group">
          <div className="slider-header">
            <span>Risk Filter</span>
            <span className="slider-val">{filters.minRiskLevel}</span>
          </div>
          <div className="risk-filter-buttons">
            <button
              className={`risk-btn ${filters.minRiskLevel === 'ALL' ? 'active' : ''}`}
              onClick={() => onFilterChange({ minRiskLevel: 'ALL' })}
            >
              All
            </button>
            <button
              className={`risk-btn ${filters.minRiskLevel === 'MODERATE_HIGH' ? 'active' : ''}`}
              onClick={() => onFilterChange({ minRiskLevel: 'MODERATE_HIGH' })}
            >
              Mod + High
            </button>
            <button
              className={`risk-btn ${filters.minRiskLevel === 'HIGH_ONLY' ? 'active text-red' : ''}`}
              onClick={() => onFilterChange({ minRiskLevel: 'HIGH_ONLY' })}
            >
              High Only
            </button>
          </div>
        </div>

        {/* Min Slope Slider */}
        <div className="filter-slider-group">
          <div className="slider-header">
            <span>Min Terrain Slope</span>
            <span className="slider-val text-cyan">{filters.minSlope}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="45"
            step="5"
            value={filters.minSlope}
            onChange={e => onFilterChange({ minSlope: Number(e.target.value) })}
            className="gis-range-slider"
          />
        </div>

        {/* Min Rain Slider */}
        <div className="filter-slider-group">
          <div className="slider-header">
            <span>Min Rainfall Threshold</span>
            <span className="slider-val text-blue">{filters.minRainfall} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={filters.minRainfall}
            onChange={e => onFilterChange({ minRainfall: Number(e.target.value) })}
            className="gis-range-slider"
          />
        </div>
      </div>
    </div>
  );
};
