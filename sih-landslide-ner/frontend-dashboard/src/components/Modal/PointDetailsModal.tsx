import React from 'react';
import type { GridPoint, TransportSegment, StationNode } from '../../types/landslide';
import { 
  X, 
  MapPin, 
  Mountain, 
  Layers, 
  CloudRain, 
  ShieldAlert, 
  Train, 
  Navigation,
  Gauge,
  AlertCircle
} from 'lucide-react';

interface PointDetailsModalProps {
  point?: GridPoint | null;
  segment?: TransportSegment | null;
  station?: StationNode | null;
  onClose: () => void;
}

export const PointDetailsModal: React.FC<PointDetailsModalProps> = ({
  point,
  segment,
  station,
  onClose
}) => {
  if (!point && !segment && !station) return null;

  return (
    <div className="gis-modal-backdrop" onClick={onClose}>
      <div className="gis-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-info">
            {segment && (
              <span className="modal-badge transport">
                {segment.type === 'railway' ? <Train size={14} /> : <Navigation size={14} />}
                {segment.type.toUpperCase()} CORRIDOR
              </span>
            )}
            {station && (
              <span className="modal-badge station">
                <MapPin size={14} /> {station.type.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {point && (
              <span className="modal-badge grid">
                <MapPin size={14} /> 500m TERRAIN GRID CELL #{point.id}
              </span>
            )}
            <h3 className="modal-title">
              {segment ? segment.name : (station ? station.name : `Dima Hasao Spatial Point (${point?.latitude.toFixed(3)}°N, ${point?.longitude.toFixed(3)}°E)`)}
            </h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* A. TRANSPORT SEGMENT DETAILS */}
          {segment && (
            <div className="detail-section">
              <div className="status-banner" data-status={segment.threatLevel}>
                <ShieldAlert size={20} />
                <div>
                  <div className="status-label">Operational Threat Level</div>
                  <div className="status-value">{segment.threatLevel} HAZARD ALERT</div>
                </div>
              </div>

              <div className="grid-2col">
                <div className="spec-card">
                  <span className="spec-title">Route Code</span>
                  <span className="spec-value">{segment.code}</span>
                </div>
                <div className="spec-card">
                  <span className="spec-title">Corridor Length</span>
                  <span className="spec-value">{segment.lengthKm} km</span>
                </div>
                <div className="spec-card">
                  <span className="spec-title">Max Proximity Risk</span>
                  <span className="spec-value text-red">{Math.round(segment.maxNearbyProbability * 100)}%</span>
                </div>
                <div className="spec-card">
                  <span className="spec-title">Max Terrain Slope</span>
                  <span className="spec-value text-cyan">{segment.maxSlope}° (Avg: {segment.averageSlope}°)</span>
                </div>
              </div>

              <div className="speed-restriction-card">
                <Gauge size={22} className="text-purple" />
                <div>
                  <div className="speed-title">Dynamic Speed Restriction</div>
                  <div className="speed-desc">
                    Recommended Max Speed: <strong>{segment.recommendedSpeedKmh} km/h</strong> (Normal track limit: {segment.speedLimitKmh} km/h)
                  </div>
                </div>
              </div>

              <div className="advisory-callout">
                <AlertCircle size={18} className="text-amber" />
                <div>
                  <strong>Official Operational Advisory:</strong>
                  <p>{segment.advisory}</p>
                </div>
              </div>
            </div>
          )}

          {/* B. STATION NODE DETAILS */}
          {station && (
            <div className="detail-section">
              <div className="status-banner" data-status={station.vulnerabilityStatus}>
                <ShieldAlert size={20} />
                <div>
                  <div className="status-label">Infrastructure Vulnerability</div>
                  <div className="status-value">{station.vulnerabilityStatus} PRIORITY</div>
                </div>
              </div>

              <div className="grid-2col">
                <div className="spec-card">
                  <span className="spec-title">Elevation</span>
                  <span className="spec-value">{station.elevationM} meters ASL</span>
                </div>
                <div className="spec-card">
                  <span className="spec-title">Coordinates</span>
                  <span className="spec-value">{station.coordinates[0].toFixed(3)}°N, {station.coordinates[1].toFixed(3)}°E</span>
                </div>
              </div>

              <div className="notes-card">
                <span className="spec-title">Geotechnical & Strategic Notes</span>
                <p>{station.notes}</p>
              </div>
            </div>
          )}

          {/* C. GRID POINT DETAILS */}
          {point && (
            <div className="detail-section">
              <div className="status-banner" data-status={point.riskLevel}>
                <ShieldAlert size={20} />
                <div>
                  <div className="status-label">AI Model Landslide Probability</div>
                  <div className="status-value">{(point.probability * 100).toFixed(1)}% [{point.riskLevel} RISK]</div>
                </div>
              </div>

              <div className="grid-3col">
                <div className="spec-card">
                  <Mountain size={16} className="text-purple" />
                  <span className="spec-title">Slope Steepness</span>
                  <span className="spec-value">{point.slope}°</span>
                </div>
                <div className="spec-card">
                  <Layers size={16} className="text-amber" />
                  <span className="spec-title">Soil Clay %</span>
                  <span className="spec-value">{point.clayPercent}%</span>
                </div>
                <div className="spec-card">
                  <MapPin size={16} className="text-slate" />
                  <span className="spec-title">Elevation</span>
                  <span className="spec-value">{point.elevation} m</span>
                </div>
              </div>

              <div className="rain-forecast-box">
                <div className="rain-title">
                  <CloudRain size={16} className="text-blue" />
                  <span>3-Day Rainfall Saturation Forecast</span>
                </div>
                <div className="rain-bars">
                  <div className="rain-day">
                    <span className="day-name">Next 24h (Day 1)</span>
                    <span className="rain-mm">{point.rainDay1} mm</span>
                  </div>
                  <div className="rain-day">
                    <span className="day-name">Next 48h (Day 2)</span>
                    <span className="rain-mm">{point.rainDay2} mm</span>
                  </div>
                  <div className="rain-day">
                    <span className="day-name">Next 72h (Day 3)</span>
                    <span className="rain-mm">{point.rainDay3} mm</span>
                  </div>
                </div>
                <div className="rain-total">
                  Cumulative 3-Day Infiltration: <strong>{(point.rainDay1 + point.rainDay2 + point.rainDay3).toFixed(1)} mm</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close Inspector</button>
        </div>
      </div>
    </div>
  );
};
