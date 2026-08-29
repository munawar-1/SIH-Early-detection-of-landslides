import React from 'react';
import type { GridPoint, TransportSegment, StationNode, FilterState } from '../types/landslide';
import { LandslideMap } from '../components/Map/LandslideMap';
import { TransportMonitor } from '../components/Infrastructure/TransportMonitor';
import { 
  Train, 
  Navigation, 
  ShieldAlert
} from 'lucide-react';

interface CorridorsPageProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  stations: StationNode[];
  filters: FilterState;
  onSelectTransport: (segment: TransportSegment) => void;
  selectedTransport: TransportSegment | null;
}

export const CorridorsPage: React.FC<CorridorsPageProps> = ({
  gridPoints,
  railways,
  highways,
  stations,
  filters,
  onSelectTransport,
  selectedTransport
}) => {
  const criticalRailways = railways.filter(r => r.threatLevel === 'CRITICAL' || r.threatLevel === 'WARNING');
  const criticalHighways = highways.filter(h => h.threatLevel === 'CRITICAL' || h.threatLevel === 'WARNING');

  return (
    <div className="corridors-page-container">
      {/* Page Header */}
      <div className="page-header-bar">
        <div className="header-info">
          <div className="icon-badge">
            <Train size={20} className="text-cyan" />
          </div>
          <div>
            <h2 className="page-title">Critical Transport Lifelines Monitor</h2>
            <p className="page-subtitle">
              Operational hazard scanner for Lumding–Badarpur Hill Section Railway and NH-27 Mountain Pass
            </p>
          </div>
        </div>

        <div className="header-stats-row">
          <div className="stat-badge danger">
            <ShieldAlert size={15} />
            <span><strong>{criticalRailways.length}</strong> Vulnerable Rail Stretches</span>
          </div>
          <div className="stat-badge warning">
            <Navigation size={15} />
            <span><strong>{criticalHighways.length}</strong> Highway Blockage Watches</span>
          </div>
        </div>
      </div>

      {/* Split-Screen Main Content */}
      <div className="corridors-split-layout">
        {/* Left Side: Dedicated Corridor Route Map */}
        <div className="corridor-map-panel">
          <div className="panel-top-banner">
            <span className="banner-title">Interactive Corridor Route Map</span>
            <span className="banner-desc">Click on any track stretch or highway link to inspect hazard metrics</span>
          </div>
          <div className="corridor-map-wrapper">
            <LandslideMap
              gridPoints={gridPoints}
              railways={railways}
              highways={highways}
              stations={stations}
              filters={{
                ...filters,
                showRailways: true,
                showHighways: true,
                showStations: true,
                showGridPoints: true
              }}
              onSelectTransport={onSelectTransport}
            />
          </div>
        </div>

        {/* Right Side: Detailed Corridor Threat Status Cards */}
        <div className="corridor-cards-panel">
          <TransportMonitor
            railways={railways}
            highways={highways}
            onSelectSegment={onSelectTransport}
            selectedSegmentId={selectedTransport?.id}
          />
        </div>
      </div>
    </div>
  );
};
