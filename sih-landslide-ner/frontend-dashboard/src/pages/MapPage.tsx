import React, { useState } from 'react';
import type { GridPoint, FilterState, TransportSegment, StationNode, HighwayMicroSegment } from '../types/landslide';
import { LandslideMap } from '../components/Map/LandslideMap';
import { LayerControls } from '../components/Controls/LayerControls';
import { 
  Layers, 
  ChevronRight, 
  MapPin, 
  Flame, 
  Radio
} from 'lucide-react';

interface MapPageProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  highwayMicroSegments?: HighwayMicroSegment[];
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
  highwayMicroSegments,
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
          highwayMicroSegments={highwayMicroSegments}
          stations={stations}
          filters={filters}
          onSelectPoint={onSelectPoint}
          onSelectTransport={onSelectTransport}
          onSelectStation={onSelectStation}
          isSimulationActive={false}
        />
      </div>

      {/* Floating Compact Show Controls Button (Visible ONLY when panel is hidden) */}
      {!isLayerDrawerOpen && (
        <button 
          className="gis-show-controls-btn"
          onClick={() => setIsLayerDrawerOpen(true)}
          title="Show GIS Controls &amp; Filters"
          aria-label="Show GIS Controls"
          type="button"
        >
          <Layers size={14} className="text-cyan" />
          <span>Show Controls</span>
          <ChevronRight size={14} />
        </button>
      )}

      {/* Anchored Left GIS Layer Controls Panel */}
      <div className={`gis-layers-sidebar ${isLayerDrawerOpen ? 'open' : 'closed'}`}>
        <div className="gis-layers-panel-card">
          <LayerControls
            filters={filters}
            onFilterChange={onFilterChange}
            onRefreshPipeline={onRefreshPipeline}
            isRefreshing={isRefreshing}
            isBackendConnected={isBackendConnected}
            onClose={() => setIsLayerDrawerOpen(false)}
          />
        </div>
      </div>

      {/* Floating Bottom Quick Status */}
      <div className="map-bottom-hud">
        <div className="hud-pill">
          <MapPin size={13} className="text-cyan" />
          <span>Dima Hasao District (Assam)</span>
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
