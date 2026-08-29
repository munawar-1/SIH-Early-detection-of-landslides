import React, { useState } from 'react';
import type { GridPoint, FilterState, TransportSegment, StationNode } from '../types/landslide';
import { LandslideMap } from '../components/Map/LandslideMap';
import { LayerControls } from '../components/Controls/LayerControls';
import { 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Clock, 
  Flame, 
  Radio
} from 'lucide-react';

interface MapPageProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  stations: StationNode[];
  filters: FilterState;
  onFilterChange: (updated: Partial<FilterState>) => void;
  onRefreshPipeline: () => void;
  isRefreshing: boolean;
  isBackendConnected: boolean;
  onSelectPoint: (point: GridPoint) => void;
  onSelectTransport: (segment: TransportSegment) => void;
  onSelectStation: (station: StationNode) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  gridPoints,
  railways,
  highways,
  stations,
  filters,
  onFilterChange,
  onRefreshPipeline,
  isRefreshing,
  isBackendConnected,
  onSelectPoint,
  onSelectTransport,
  onSelectStation
}) => {
  const [isLayerDrawerOpen, setIsLayerDrawerOpen] = useState<boolean>(true);

  return (
    <div className="map-page-container">
      {/* Fullscreen Map Viewport */}
      <div className="map-page-canvas">
        <LandslideMap
          gridPoints={gridPoints}
          railways={railways}
          highways={highways}
          stations={stations}
          filters={filters}
          onSelectPoint={onSelectPoint}
          onSelectTransport={onSelectTransport}
          onSelectStation={onSelectStation}
        />
      </div>

      {/* Collapsible Floating GIS Layer Panel */}
      <div className={`floating-layer-panel ${isLayerDrawerOpen ? 'open' : 'collapsed'}`}>
        <div className="panel-toggle-tab" onClick={() => setIsLayerDrawerOpen(!isLayerDrawerOpen)}>
          <Layers size={16} />
          <span>{isLayerDrawerOpen ? 'Hide Controls' : 'GIS Controls'}</span>
          {isLayerDrawerOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </div>

        {isLayerDrawerOpen && (
          <div className="panel-body">
            <LayerControls
              filters={filters}
              onFilterChange={onFilterChange}
              onRefreshPipeline={onRefreshPipeline}
              isRefreshing={isRefreshing}
              isBackendConnected={isBackendConnected}
            />
          </div>
        )}
      </div>

      {/* Floating Bottom Quick Status */}
      <div className="map-bottom-hud">
        <div className="hud-pill">
          <MapPin size={13} className="text-cyan" />
          <span>Dima Hasao District (Assam)</span>
        </div>
        <div className="hud-pill">
          <Clock size={13} className="text-blue" />
          <span>Forecast Horizon: <strong>{filters.forecastHorizon} Saturation</strong></span>
        </div>
        <div className="hud-pill">
          <Flame size={13} className="text-red" />
          <span><strong>{gridPoints.filter(p => p.riskLevel === 'HIGH').length}</strong> Red Alert Grid Cells</span>
        </div>
        <div className="hud-pill live">
          <Radio size={12} className="text-green animate-pulse" />
          <span>Real-time GIS Stream</span>
        </div>
      </div>
    </div>
  );
};
