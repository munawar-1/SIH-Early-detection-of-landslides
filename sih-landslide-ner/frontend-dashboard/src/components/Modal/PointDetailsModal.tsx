import React from 'react';
import type { GridPoint, TransportSegment, StationNode } from '../../types/landslide';
import {
  X,
  MapPin,
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

  // Keep this calculation identical to ml-service/src/main.py's
  // transform_feature_dict(). These are the derived values in the 12-column model tensor.
  const modelInputs = point ? (() => {
    const rainDayMinus1 = point.rainDay1;
    const rain3dSum = point.rainDay1 + point.rainDay2 + point.rainDay3;
    const rain7dApi = rainDayMinus1
      + (rain3dSum - rainDayMinus1) * 0.84
      + (rain3dSum * 0.65) * (0.84 ** 3);
    const sandPercent = point.sandPercent ?? 30;
    const bulkDensity = point.bulkDensity ?? 1.26;
    const porePressureIndex = (Math.sin(point.slope * Math.PI / 180) * (rain7dApi * point.clayPercent))
      / (100 * Math.max(0.8, bulkDensity) * (1 + sandPercent / 100));

    return [
      ['Slope', `${point.slope.toFixed(1)}°`],
      ['Elevation', `${point.elevation.toFixed(1)} m`],
      ['Aspect sine', (point.aspectSin ?? Math.sin((point.aspect ?? 145) * Math.PI / 180)).toFixed(4)],
      ['Aspect cosine', (point.aspectCos ?? Math.cos((point.aspect ?? 145) * Math.PI / 180)).toFixed(4)],
      ['Clay content', `${point.clayPercent.toFixed(1)}%`],
      ['Sand content', `${sandPercent.toFixed(1)}%`],
      ['Silt content', `${(point.siltPercent ?? (100 - point.clayPercent - sandPercent)).toFixed(1)}%`],
      ['Bulk density', `${bulkDensity.toFixed(3)} g/cm³`],
      ['Rainfall — last 24h', `${rainDayMinus1.toFixed(1)} mm`],
      ['Rainfall — 3-day total', `${rain3dSum.toFixed(1)} mm`],
      ['7-day antecedent rainfall', `${rain7dApi.toFixed(1)} mm`],
      ['Pore-pressure index', porePressureIndex.toFixed(2)],
    ];
  })() : [];

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

              <div className="model-inputs-section">
                <div className="model-inputs-heading">
                  <Layers size={16} className="text-purple" />
                  <div>
                    <span>All 12 ML input features</span>
                    <small>Exact feature vector used for this grid-cell prediction</small>
                  </div>
                </div>
                <div className="model-inputs-grid">
                  {modelInputs.map(([label, value]) => (
                    <div className="spec-card model-input-card" key={label}>
                      <span className="spec-title">{label}</span>
                      <span className="spec-value">{value}</span>
                    </div>
                  ))}
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
                  Forecast total (also shown above as the ML 3-day rainfall feature): <strong>{(point.rainDay1 + point.rainDay2 + point.rainDay3).toFixed(1)} mm</strong>
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
