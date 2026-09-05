import React, { useState, useEffect } from 'react';
import type { TransportSegment } from '../../types/landslide';
import { FoldText } from '../Text/FoldText';
import { 
  Train, 
  Navigation, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Gauge, 
  TrendingUp, 
  ChevronRight, 
  Download,
  Flame
} from 'lucide-react';

interface TransportMonitorProps {
  railways: TransportSegment[];
  highways: TransportSegment[];
  onSelectSegment: (segment: TransportSegment) => void;
  onInspectSegment?: (segment: TransportSegment) => void;
  selectedSegmentId?: string;
  mapSelectedSegmentId?: string | null;
  onClearMapSelected?: () => void;
  activeCategory?: 'all' | 'railways' | 'highways' | 'state_highways' | 'connecting_roads';
  onCategoryChange?: (category: 'all' | 'railways' | 'highways' | 'state_highways' | 'connecting_roads') => void;
}

export const TransportMonitor: React.FC<TransportMonitorProps> = ({
  railways,
  highways,
  onSelectSegment,
  onInspectSegment,
  selectedSegmentId,
  mapSelectedSegmentId,
  onClearMapSelected,
  activeCategory,
  onCategoryChange
}) => {
  const [internalTab, setInternalTab] = useState<'all' | 'railways' | 'highways' | 'state_highways' | 'connecting_roads'>('all');
  const currentCategory = activeCategory ?? internalTab;

  const handleTabChange = (cat: 'all' | 'railways' | 'highways' | 'state_highways' | 'connecting_roads') => {
    if (onCategoryChange) {
      onCategoryChange(cat);
    } else {
      setInternalTab(cat);
    }
  };

  // ONLY scroll when intentionally triggered by a user clicking a route on the map
  useEffect(() => {
    if (!mapSelectedSegmentId) return;

    const el = document.getElementById(`corridor-card-${mapSelectedSegmentId}`);
    const scrollParent = el?.closest('.corridor-cards-panel') as HTMLElement | null;
    if (el && scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // Only scroll the cards container if the card is not already in view
      if (elRect.top < parentRect.top || elRect.bottom > parentRect.bottom) {
        const offset = el.offsetTop - scrollParent.offsetTop;
        scrollParent.scrollTo({
          top: Math.max(0, offset - 10),
          behavior: 'smooth'
        });
      }
    }

    if (onClearMapSelected) {
      onClearMapSelected();
    }
  }, [mapSelectedSegmentId, onClearMapSelected]);

  const getThreatBadge = (level: TransportSegment['threatLevel']) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="threat-badge critical"><Flame size={13} /> CRITICAL DANGER</span>;
      case 'WARNING':
        return <span className="threat-badge warning"><AlertTriangle size={13} /> WARNING</span>;
      case 'WATCH':
        return <span className="threat-badge watch"><ShieldAlert size={13} /> WATCH</span>;
      case 'SAFE':
      default:
        return <span className="threat-badge safe"><CheckCircle2 size={13} /> SAFE</span>;
    }
  };

  const nationalHighways = highways.filter(h => h.type === 'highway');
  const stateHighways = highways.filter(h => h.type === 'state_highway');
  const connectingRoads = highways.filter(h => h.type === 'connecting_road');

  const filteredSegments = (
    currentCategory === 'railways' ? railways :
    currentCategory === 'highways' ? nationalHighways :
    currentCategory === 'state_highways' ? stateHighways :
    currentCategory === 'connecting_roads' ? connectingRoads :
    [...railways, ...highways]
  ).sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, WATCH: 2, SAFE: 3 };
    return order[a.threatLevel] - order[b.threatLevel];
  });

  const criticalCount = [...railways, ...highways].filter(s => s.threatLevel === 'CRITICAL').length;
  const warningCount = [...railways, ...highways].filter(s => s.threatLevel === 'WARNING').length;

  const handleExportBulletin = () => {
    const lines = [
      '=========================================================================',
      '  DIMA HASAO DISASTER MANAGEMENT - TRANSPORT CORRIDOR HAZARD BULLETIN',
      `  Generated: ${new Date().toLocaleString('en-IN')}`,
      '=========================================================================\n',
      '-- RAILWAY HILL SECTION (LUMDING - BADARPUR) --'
    ];

    railways.forEach(r => {
      lines.push(`[${r.threatLevel}] ${r.name} (${r.code})`);
      lines.push(`   Max Proximity Risk: ${(r.maxNearbyProbability * 100).toFixed(1)}% | Avg Slope: ${r.averageSlope}°`);
      lines.push(`   Speed Restriction: ${r.recommendedSpeedKmh} km/h (Normal: ${r.speedLimitKmh} km/h)`);
      lines.push(`   Advisory: ${r.advisory}\n`);
    });

    lines.push('-- NATIONAL HIGHWAYS (NH-27 / NH-27A) --');
    nationalHighways.forEach(h => {
      lines.push(`[${h.threatLevel}] ${h.name} (${h.code})`);
      lines.push(`   Max Proximity Risk: ${(h.maxNearbyProbability * 100).toFixed(1)}% | High Risk Points Near: ${h.vulnerablePointsCount}`);
      lines.push(`   Advisory: ${h.advisory}\n`);
    });

    lines.push('-- STATE HIGHWAYS (SH-20 / SH-19) --');
    stateHighways.forEach(h => {
      lines.push(`[${h.threatLevel}] ${h.name} (${h.code})`);
      lines.push(`   Max Proximity Risk: ${(h.maxNearbyProbability * 100).toFixed(1)}% | High Risk Points Near: ${h.vulnerablePointsCount}`);
      lines.push(`   Advisory: ${h.advisory}\n`);
    });

    lines.push('-- MAIN CONNECTING ROADS (MDR LIFELINES) --');
    connectingRoads.forEach(h => {
      lines.push(`[${h.threatLevel}] ${h.name} (${h.code})`);
      lines.push(`   Max Proximity Risk: ${(h.maxNearbyProbability * 100).toFixed(1)}% | High Risk Points Near: ${h.vulnerablePointsCount}`);
      lines.push(`   Advisory: ${h.advisory}\n`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dima_hasao_transport_hazard_bulletin_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className="transport-monitor-container">
      <div className="transport-header">
        <div className="title-row">
          <div className="icon-badge">
            <Train size={18} className="text-cyan" />
          </div>
          <div>
            <FoldText
              text="Critical Corridors Live Monitor"
              as="h3"
              className="section-title"
              splitBy="char"
              hinge="top"
              trigger="mount"
              duration={0.65}
              stagger={0.045}
              ease="power3.out"
              perspective={700}
              creaseShading={0.55}
            />
            <p className="section-subtitle">Real-time Lumding–Badarpur Railway &amp; NH-27 Hazard Scanner</p>
          </div>
        </div>

        <button 
          className="btn-export-bulletin" 
          onClick={handleExportBulletin}
          title="Download operational hazard bulletin for NFR &amp; ASDMA"
        >
          <Download size={14} /> Export Bulletin
        </button>
      </div>

      {/* Emergency Status Banner */}
      <div className="emergency-banner">
        <div className="banner-item danger">
          <span className="count">{criticalCount}</span>
          <span className="label">Critical Corridors</span>
        </div>
        <div className="banner-item warning">
          <span className="count">{warningCount}</span>
          <span className="label">High Watch Routes</span>
        </div>
        <div className="banner-item speed">
          <Gauge size={18} className="speed-icon" />
          <span className="label">Speed Restricted Zones Active</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="transport-tabs">
        <button 
          className={`tab-btn ${currentCategory === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All Routes ({railways.length + highways.length})
        </button>
        <button 
          className={`tab-btn ${currentCategory === 'railways' ? 'active' : ''}`}
          onClick={() => handleTabChange('railways')}
        >
          <Train size={14} /> Railways ({railways.length})
        </button>
        <button 
          className={`tab-btn ${currentCategory === 'highways' ? 'active' : ''}`}
          onClick={() => handleTabChange('highways')}
        >
          <Navigation size={14} /> National Highways ({nationalHighways.length})
        </button>
        <button 
          className={`tab-btn ${currentCategory === 'state_highways' ? 'active' : ''}`}
          onClick={() => handleTabChange('state_highways')}
        >
          <Navigation size={14} /> State Highways ({stateHighways.length})
        </button>
        <button 
          className={`tab-btn ${currentCategory === 'connecting_roads' ? 'active' : ''}`}
          onClick={() => handleTabChange('connecting_roads')}
        >
          <Navigation size={14} /> Connecting Roads ({connectingRoads.length})
        </button>
      </div>

      {/* Corridor Cards List */}
      <div className="corridor-list">
        {filteredSegments.map(seg => {
          const isSelected = selectedSegmentId === seg.id;
          const isRail = seg.type === 'railway';
          const isStateHwy = seg.type === 'state_highway';
          const isConnectingRoad = seg.type === 'connecting_road';

          let tagClass = 'hwy';
          let tagLabel = 'NATIONAL HIGHWAY';
          let TagIcon = Navigation;

          if (isRail) {
            tagClass = 'rail';
            tagLabel = 'RAILWAY';
            TagIcon = Train;
          } else if (isStateHwy) {
            tagClass = 'state-hwy';
            tagLabel = 'STATE HIGHWAY';
            TagIcon = Navigation;
          } else if (isConnectingRoad) {
            tagClass = 'connecting-road';
            tagLabel = 'CONNECTING ROAD';
            TagIcon = Navigation;
          }

          return (
            <div 
              key={seg.id} 
              id={`corridor-card-${seg.id}`}
              className={`corridor-card card-spotlight ${isRail ? 'is-railway railway' : 'is-highway highway'} ${seg.threatLevel.toLowerCase()} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectSegment(seg)}
              onMouseMove={handleSpotlightMove}
            >
              <div className="card-top">
                <div className="route-identity">
                  <span className={`type-tag ${tagClass}`}>
                    <TagIcon size={12} />
                    {tagLabel}
                  </span>
                  <span className="route-code">{seg.code}</span>
                </div>
                {getThreatBadge(seg.threatLevel)}
              </div>

              <h4 className="route-name">{seg.name}</h4>
              <p className="route-desc">{seg.description}</p>

              {/* Dynamic Metrics Row */}
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="m-label">Proximity Risk</span>
                  <span className={`m-val ${seg.maxNearbyProbability >= 0.7 ? 'text-red' : (seg.maxNearbyProbability >= 0.4 ? 'text-amber' : 'text-green')}`}>
                    {Math.round(seg.maxNearbyProbability * 100)}%
                  </span>
                </div>
                <div className="metric-box">
                  <span className="m-label">Length</span>
                  <span className="m-val">{seg.lengthKm} km</span>
                </div>
                <div className="metric-box">
                  <span className="m-label">Max Slope</span>
                  <span className="m-val text-cyan">{seg.maxSlope}°</span>
                </div>
                <div className="metric-box">
                  <span className="m-label">Speed Limit</span>
                  <span className="m-val text-purple">
                    {seg.recommendedSpeedKmh} <span className="unit">/ {seg.speedLimitKmh} km/h</span>
                  </span>
                </div>
              </div>

              {/* Action Advisory Box */}
              <div className="advisory-box">
                {seg.threatLevel === 'SAFE' ? (
                  <CheckCircle2 size={14} className="adv-icon" />
                ) : seg.threatLevel === 'CRITICAL' ? (
                  <Flame size={14} className="adv-icon" />
                ) : (
                  <AlertTriangle size={14} className="adv-icon" />
                )}
                <span className="adv-text">{seg.advisory}</span>
              </div>

              {/* Dynamic Localized Diversion Box */}
              {seg.hasActiveDiversion && seg.diversionDetails && (
                <div className="diversion-card-callout">
                  <div className="diversion-callout-header">
                    <span className="div-icon">🔀</span>
                    <span className="div-title">LOCALIZED HAZARD ISOLATION &amp; DETOUR</span>
                    <span className={`div-efficiency-badge ${seg.diversionDetails.efficiencyRating?.toLowerCase() || 'optimal'}`}>
                      {seg.diversionDetails.efficiencyRating === 'OPTIMAL' ? '🟢 OPTIMAL DETOUR' : (seg.diversionDetails.efficiencyRating === 'MODERATE' ? '🟡 MODERATE (GHAT)' : '🔴 EMERGENCY ONLY')}
                    </span>
                  </div>
                  <div className="diversion-callout-body">
                    <div className="div-row">
                      <span className="div-lbl">⛔ Blocked Zone:</span>
                      <span className="div-val text-red">Km {seg.diversionDetails.hazardKmStart}–{seg.diversionDetails.hazardKmEnd} ({seg.diversionDetails.hazardLengthKm} km)</span>
                    </div>
                    <div className="div-row">
                      <span className="div-lbl">🔀 Divert At:</span>
                      <span className="div-val text-cyan">{seg.diversionDetails.diversionJunction.name}</span>
                    </div>
                    <div className="div-row">
                      <span className="div-lbl">🛡️ Detour Via:</span>
                      <span className="div-val text-amber">{seg.diversionDetails.bypassRouteName}</span>
                    </div>
                    <div className="div-row">
                      <span className="div-lbl">⏱️ Travel Penalty:</span>
                      <span className="div-val text-green">
                        +{seg.diversionDetails.additionalTravelTimeMinutes} mins ({seg.diversionDetails.detourDistanceKm} km) • <strong>{seg.diversionDetails.safetyAdvantagePct}% lower slide risk</strong>
                      </span>
                    </div>
                    {seg.diversionDetails.roadCapacityStatus && (
                      <div className="div-row">
                        <span className="div-lbl">🛣️ Road Class:</span>
                        <span className="div-val text-purple">{seg.diversionDetails.roadCapacityStatus}</span>
                      </div>
                    )}
                    {seg.diversionDetails.heavyVehicleAdvice && (
                      <div className="div-row warning-note">
                        <span className="div-lbl">🚛 Freight Rule:</span>
                        <span className="div-val">{seg.diversionDetails.heavyVehicleAdvice}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card-footer">
                <span className="threat-points-tag">
                  <TrendingUp size={12} /> {seg.vulnerablePointsCount} high-risk terrain grid points within 2km
                </span>
                <span 
                  className="inspect-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInspectSegment) {
                      onInspectSegment(seg);
                    } else {
                      onSelectSegment(seg);
                    }
                  }}
                  title={`Inspect detailed geotechnical metrics for ${seg.name}`}
                >
                  Inspect <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
