import React from 'react';
import type { HighwayMicroSegment } from '../../types/landslide';
import { FoldText } from '../Text/FoldText';
import { 
  Navigation, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  MapPin,
  Flame,
  ChevronRight
} from 'lucide-react';

interface HighwayRiskPanelProps {
  highwaySegments: HighwayMicroSegment[];
  onSelectSegment: (segment: HighwayMicroSegment) => void;
  selectedSegmentId?: string;
}

export const HighwayRiskPanel: React.FC<HighwayRiskPanelProps> = ({
  highwaySegments,
  onSelectSegment,
  selectedSegmentId
}) => {
  // Only show at-risk segments
  const atRiskSegments = highwaySegments.filter(seg => seg.isAtRisk)
    .sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, WATCH: 2, SAFE: 3 };
      return order[a.threatLevel] - order[b.threatLevel];
    });

  const criticalCount = atRiskSegments.filter(s => s.threatLevel === 'CRITICAL').length;
  const warningCount = atRiskSegments.filter(s => s.threatLevel === 'WARNING').length;
  const watchCount = atRiskSegments.filter(s => s.threatLevel === 'WATCH').length;

  const getThreatBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="threat-badge critical"><Flame size={13} /> CRITICAL DANGER</span>;
      case 'WARNING':
        return <span className="threat-badge warning"><AlertTriangle size={13} /> WARNING</span>;
      case 'WATCH':
        return <span className="threat-badge watch"><ShieldAlert size={13} /> WATCH</span>;
      default:
        return <span className="threat-badge safe"><CheckCircle2 size={13} /> SAFE</span>;
    }
  };

  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className="transport-monitor-container highway-risk-panel">
      <div className="transport-header">
        <div className="title-row">
          <div className="icon-badge">
            <Navigation size={18} className="text-cyan" />
          </div>
          <div>
            <FoldText
              text="National Highways Risk Alert"
              as="h3"
              className="section-title"
              splitBy="char"
              trigger="mount"
              duration={0.65}
              stagger={0.045}
            />
            <p className="section-subtitle">Real-time micro-segment monitoring for NH-27, NH-37, NH-306, NH-27A</p>
          </div>
        </div>
      </div>

      {atRiskSegments.length === 0 ? (
        <div className="zero-state-container">
          <CheckCircle2 size={48} className="text-green" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.8 }} />
          <h4 style={{ textAlign: 'center', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All National Highways Clear</h4>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No active risk alerts across the Dima Hasao highway network.
          </p>
        </div>
      ) : (
        <>
          <div className="emergency-banner" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="banner-item danger" style={{ justifyContent: 'center' }}>
              <span className="count">{criticalCount}</span>
              <span className="label">Critical</span>
            </div>
            <div className="banner-item warning" style={{ justifyContent: 'center' }}>
              <span className="count">{warningCount}</span>
              <span className="label">Warning</span>
            </div>
            <div className="banner-item watch" style={{ justifyContent: 'center' }}>
              <span className="count">{watchCount}</span>
              <span className="label">Watch</span>
            </div>
          </div>

          <div className="corridor-list" style={{ marginTop: '1.5rem' }}>
            {atRiskSegments.map(seg => {
              const isSelected = selectedSegmentId === seg.id;
              
              return (
                <div 
                  key={seg.id} 
                  className={`corridor-card card-spotlight ${seg.threatLevel.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectSegment(seg)}
                  onMouseMove={handleSpotlightMove}
                >
                  <div className="card-top">
                    <div className="route-identity">
                      <span className="type-tag hwy">
                        <Navigation size={12} />
                        {seg.highwayCode}
                      </span>
                      <span className="route-code">Km {seg.kmStart}-{seg.kmEnd}</span>
                    </div>
                    {getThreatBadge(seg.threatLevel)}
                  </div>

                  <h4 className="route-name">{seg.name}</h4>

                  <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="metric-box">
                      <span className="m-label">Proximity Risk</span>
                      <span className={`m-val ${seg.maxNearbyProbability >= 0.7 ? 'text-red' : (seg.maxNearbyProbability >= 0.55 ? 'text-amber' : 'text-green')}`}>
                        {Math.round(seg.maxNearbyProbability * 100)}%
                      </span>
                    </div>
                    <div className="metric-box">
                      <span className="m-label">Vulnerable Grid Nodes</span>
                      <span className="m-val">{seg.vulnerablePointsCount} near segment</span>
                    </div>
                  </div>

                  {seg.riskReasons && seg.riskReasons.length > 0 && (
                    <div className="risk-reasons" style={{ marginTop: '0.8rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Risk Factors:</span>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {seg.riskReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="advisory-box" style={{ marginTop: '0.8rem' }}>
                    <AlertTriangle size={14} className="adv-icon" />
                    <span className="adv-text">{seg.advisory}</span>
                  </div>

                  <div className="card-footer">
                    <span className="threat-points-tag">
                      <MapPin size={12} /> Length: {seg.lengthKm} km
                    </span>
                    <span className="inspect-link">
                      Inspect Map <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
