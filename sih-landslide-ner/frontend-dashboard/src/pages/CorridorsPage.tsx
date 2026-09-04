import React, { useState, useEffect, useRef } from 'react';
import type { GridPoint, TransportSegment, StationNode, FilterState, HighwayMicroSegment } from '../types/landslide';
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
  // Shared active corridor category passed to both TransportMonitor and LandslideMap
  const [activeCategory, setActiveCategory] = useState<'all' | 'railways' | 'highways'>('all');
  
  // Active selected corridor state for synchronized highlighting and camera tracking
  const [selectedCorridor, setSelectedCorridor] = useState<TransportSegment | null>(
    (selectedTransport as TransportSegment) || (railways.length > 0 ? railways[0] : null)
  );

  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Guarantee that initial navigation to /corridors always starts at the top-left (scrollTop = 0, scrollLeft = 0)
  useEffect(() => {
    if (pageContainerRef.current) {
      pageContainerRef.current.scrollTop = 0;
      pageContainerRef.current.scrollLeft = 0;
    }
    const mainViewport = document.querySelector('.main-content-viewport');
    if (mainViewport) {
      mainViewport.scrollTop = 0;
      mainViewport.scrollLeft = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, []);

  // Sync if selectedTransport is updated externally
  useEffect(() => {
    if (selectedTransport && 'type' in selectedTransport) {
      setSelectedCorridor(selectedTransport as TransportSegment);
    }
  }, [selectedTransport]);

  const criticalRailways = railways.filter(r => r.threatLevel === 'CRITICAL' || r.threatLevel === 'WARNING');
  const criticalHighways = highways.filter(h => h.threatLevel === 'CRITICAL' || h.threatLevel === 'WARNING');

  // Track segment ID that was explicitly selected by intentional user interaction on the map
  const [mapSelectedSegmentId, setMapSelectedSegmentId] = useState<string | null>(null);

  const handleSelectCorridor = (seg: TransportSegment) => {
    setSelectedCorridor(seg);
    setMapSelectedSegmentId(null);
  };

  const handleSelectFromMap = (seg: TransportSegment) => {
    setSelectedCorridor(seg);
    setMapSelectedSegmentId(seg.id);
  };

  const handleInspectCorridor = (seg: TransportSegment) => {
    setSelectedCorridor(seg);
    onSelectTransport(seg);
  };

  return (
    <div ref={pageContainerRef} className="corridors-page-container">
      {/* Page Header with Operational Summary Metrics */}
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

      {/* Split-Screen Main Content: Map on Left (approx 58-60%), Corridor Monitor on Right (approx 40-42%) */}
      <div className="corridors-split-layout">
        {/* Left Side: Dedicated Interactive Corridor Route Map */}
        <div className="corridor-map-panel">
          <div className="panel-top-banner">
            <div className="banner-left">
              <span className="banner-title">Interactive Corridor Route Map</span>
              <span className="banner-desc">
                {selectedCorridor 
                  ? `Active: ${selectedCorridor.name} (${selectedCorridor.code}) • ${(selectedCorridor.maxNearbyProbability * 100).toFixed(0)}% Proximity Risk` 
                  : 'Click on any track stretch or highway link to inspect hazard metrics'}
              </span>
            </div>
            {selectedCorridor && (
              <button 
                className="btn-inspect-banner"
                onClick={() => handleInspectCorridor(selectedCorridor)}
                title="Inspect detailed geotechnical specs and speed restrictions"
              >
                Inspect Details →
              </button>
            )}
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
                showRailways: activeCategory === 'all' || activeCategory === 'railways',
                showHighways: activeCategory === 'all' || activeCategory === 'highways',
                showStations: true,
                showGridPoints: true
              }}
              transportCategory={activeCategory}
              selectedTransport={selectedCorridor}
              onSelectTransport={seg => {
                handleSelectFromMap(seg as TransportSegment);
              }}
            />
          </div>
        </div>

        {/* Right Side: Detailed Corridor Threat Status Cards */}
        <div className="corridor-cards-panel">
          <TransportMonitor
            railways={railways}
            highways={highways}
            onSelectSegment={handleSelectCorridor}
            onInspectSegment={handleInspectCorridor}
            selectedSegmentId={selectedCorridor?.id}
            mapSelectedSegmentId={mapSelectedSegmentId}
            onClearMapSelected={() => setMapSelectedSegmentId(null)}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>
      </div>
    </div>
  );
};
