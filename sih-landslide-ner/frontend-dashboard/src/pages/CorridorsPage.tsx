import React from 'react';
import type { GridPoint, TransportSegment, StationNode, FilterState, HighwayMicroSegment } from '../types/landslide';
import { LandslideMap } from '../components/Map/LandslideMap';
import { TransportMonitor } from '../components/Infrastructure/TransportMonitor';
import { HighwayRiskPanel } from '../components/Infrastructure/HighwayRiskPanel';
import { 
  Train, 
  Navigation, 
  ShieldAlert
} from 'lucide-react';

interface CorridorsPageProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  highwayMicroSegments?: HighwayMicroSegment[];
  stations: StationNode[];
  filters: FilterState;
  onSelectTransport: (segment: TransportSegment | HighwayMicroSegment) => void;
  selectedTransport: TransportSegment | HighwayMicroSegment | null;
}

export const CorridorsPage: React.FC<CorridorsPageProps> = ({
  gridPoints,
  railways,
  highways,
  highwayMicroSegments,
  stations,
  filters,
  onSelectTransport,
  selectedTransport
}) => {
  const [activeTab, setActiveTab] = React.useState<'railways' | 'highways'>('railways');

  const criticalRailways = railways.filter(r => r.threatLevel === 'CRITICAL' || r.threatLevel === 'WARNING');
  const criticalHighways = (highwayMicroSegments || []).filter(h => h.isAtRisk && (h.threatLevel === 'CRITICAL' || h.threatLevel === 'WARNING'));

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
        <div style={{ width: '100%', display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            className={`tab-btn ${activeTab === 'railways' ? 'active' : ''}`}
            onClick={() => setActiveTab('railways')}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'railways' ? 'var(--accent)' : 'var(--bg-secondary)', color: activeTab === 'railways' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
          >
            <Train size={16} /> Railway & Core Network
          </button>
          <button 
            className={`tab-btn ${activeTab === 'highways' ? 'active' : ''}`}
            onClick={() => setActiveTab('highways')}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'highways' ? 'var(--accent)' : 'var(--bg-secondary)', color: activeTab === 'highways' ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
          >
            <Navigation size={16} /> National Highways 🛣️
          </button>
        </div>
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
              highwayMicroSegments={highwayMicroSegments}
              stations={stations}
              filters={{
                ...filters,
                showRailways: activeTab === 'railways',
                showHighways: true,
                showStations: true,
                showGridPoints: true
              }}
              onSelectTransport={onSelectTransport as any}
            />
          </div>
        </div>

        {/* Right Side: Detailed Corridor Threat Status Cards */}
        <div className="corridor-cards-panel">
          {activeTab === 'railways' ? (
            <TransportMonitor
              railways={railways}
              highways={highways}
              onSelectSegment={onSelectTransport as any}
              selectedSegmentId={selectedTransport?.id}
            />
          ) : (
            <HighwayRiskPanel
              highwaySegments={highwayMicroSegments || []}
              onSelectSegment={onSelectTransport as any}
              selectedSegmentId={selectedTransport?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};
