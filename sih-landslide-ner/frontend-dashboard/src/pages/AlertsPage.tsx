import React from 'react';
import type { GridPoint, TransportSegment, StationNode } from '../types/landslide';
import { 
  BellRing, 
  Flame, 
  AlertTriangle, 
  ShieldAlert, 
  Train, 
  Navigation, 
  Download, 
  Clock, 
  Printer
} from 'lucide-react';

interface AlertsPageProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  stations: StationNode[];
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  gridPoints,
  railways,
  highways,
  stations
}) => {
  const highRiskPoints = gridPoints.filter(p => p.riskLevel === 'HIGH');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = () => {
    const reportText = `
========================================================================================
            OFFICE OF THE DISTRICT DISASTER MANAGEMENT AUTHORITY (DDMA)
                       DIMA HASAO (NORTH CACHAR HILLS), ASSAM
                     LANDSLIDE EARLY WARNING BULLETIN & DIRECTIVE
========================================================================================
Date & Time Generated: ${new Date().toLocaleString('en-IN')}
Hazard Category: SEVERE MONSOON SLOPE SATURATION ALERT
Prediction Horizon: Next 72 Hours Cumulative Infiltration

1. INFRASTRUCTURE EMERGENCY STATUS:
----------------------------------------------------------------------------------------
- Active High-Risk Terrain Hotspots: ${highRiskPoints.length} grid zones (>70% probability)
- Endangered Railway Corridors (Lumding–Badarpur Hill Section):
${railways.map(r => `  * [${r.threatLevel}] ${r.name} (${r.code}): Rec Speed: ${r.recommendedSpeedKmh} km/h | Risk: ${(r.maxNearbyProbability * 100).toFixed(1)}%`).join('\n')}

- National Highway & Arterial Roads:
${highways.map(h => `  * [${h.threatLevel}] ${h.name} (${h.code}): Status: ${h.threatLevel} | Advisory: ${h.advisory}`).join('\n')}

2. CRITICAL SETTLEMENTS ON HIGH PRIORITY EVACUATION WATCH:
----------------------------------------------------------------------------------------
* Haflong Town (Hill Slopes & Lower Basti) - Slope > 38°, Continuous runoff monitoring.
* Jatinga Pass & Canyon - Saturated shale strata, restricted heavy vehicular movement.
* New Haflong Railway Colony - Historical 2022 debris flow zone, immediate vigil.
* Ditokcherra & Harangajao Valley - River bank erosion and railway bridge scouring.

3. MANDATORY OPERATIONAL DIRECTIVES:
----------------------------------------------------------------------------------------
1. NFR Railway: Impose mandatory speed restriction of 20-30 km/h between Daotuhaja and New Harangajao.
2. ASDMA / SDRF: Pre-position search & rescue boats and earthmovers at Mahur and Maibang.
3. District Traffic Police: Restrict night heavy goods convoy movement on NH-27 between 20:00 - 05:00 hrs.

Signed:
Disaster Management Cell, Dima Hasao Early Warning System
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dima_hasao_emergency_bulletin_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="alerts-page-container">
      {/* Header */}
      <div className="page-header-bar">
        <div className="header-info">
          <div className="icon-badge danger">
            <BellRing size={20} className="text-red" />
          </div>
          <div>
            <h2 className="page-title">Early Warning & Evacuation Directives</h2>
            <p className="page-subtitle">
              Live operational bulletins and mitigation orders for District Administration, SDRF, and NFR Railway
            </p>
          </div>
        </div>

        <div className="btn-export-group">
          <button className="btn-export" onClick={handlePrint}>
            <Printer size={14} /> Print Directive
          </button>
          <button className="btn-export primary" onClick={handleDownloadReport}>
            <Download size={14} /> Download Official Bulletin
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner */}
      <div className="urgent-bulletin-banner">
        <div className="banner-icon-col">
          <Flame size={32} className="text-red animate-pulse" />
        </div>
        <div className="banner-content-col">
          <div className="badge-row">
            <span className="emergency-badge">RED ALERT BULLETIN #DH-2026-08</span>
            <span className="time-badge"><Clock size={12} /> Issued for Next 24h - 72h Horizon</span>
          </div>
          <h3 className="banner-title">
            Severe Slope Destabilization & Debris Flow Risk Detected in Borail Mountain Corridor
          </h3>
          <p className="banner-desc">
            High cumulative precipitation combined with slope angles exceeding 38° has heightened the risk of rotational landslides along the <strong>Lumding–Badarpur Hill Section (Daotuhaja – Mahur – New Haflong)</strong> and <strong>NH-27 Jatinga Pass</strong>.
          </p>
        </div>
      </div>

      {/* Grid of Action Directives */}
      <div className="directives-grid">
        {/* Railway Directive Card */}
        <div className="directive-card railway">
          <div className="card-top">
            <Train size={18} className="text-cyan" />
            <h4>Northeast Frontier Railway (NFR) Directives</h4>
          </div>
          <ul className="directive-list">
            <li>
              <strong>Mandatory Speed Restrictions:</strong> Enforce 20 km/h speed limit between Daotuhaja (Km 42) and New Harangajao (Km 68).
            </li>
            <li>
              <strong>Continuous Foot Patrol:</strong> Deploy stationary track watchmen at cutting portals and viaduct bridges (New Haflong & Ditokcherra).
            </li>
            <li>
              <strong>Night Movement Advisory:</strong> Consider daytime-only operations for freight and express rakes during peak rainfall.
            </li>
          </ul>
        </div>

        {/* Highway & Road Directive Card */}
        <div className="directive-card highway">
          <div className="card-top">
            <Navigation size={18} className="text-amber" />
            <h4>NHAI & District Traffic Administration</h4>
          </div>
          <ul className="directive-list">
            <li>
              <strong>NH-27 Mountain Pass:</strong> Pre-position heavy excavators at Mahur and Jatinga for immediate road clearance.
            </li>
            <li>
              <strong>Night Convoy Ban:</strong> Restrict multi-axle heavy trailers between 20:00 to 05:00 hrs on the Jatinga zigzag bypass.
            </li>
            <li>
              <strong>Alternate Arterial Route:</strong> Prepare SH-20 (Umrangso link) as contingency lifeline if central pass is obstructed.
            </li>
          </ul>
        </div>

        {/* Civil Defence & SDRF Card */}
        <div className="directive-card civil">
          <div className="card-top">
            <ShieldAlert size={18} className="text-red" />
            <h4>Civil Defence, SDRF & Evacuation Protocol</h4>
          </div>
          <ul className="directive-list">
            <li>
              <strong>Settlement Evacuation Notice:</strong> Issue precautionary advisories to hillside bastis in Lower Haflong and Ditokcherra.
            </li>
            <li>
              <strong>Relief Shelters:</strong> Activate emergency shelters at Haflong Government College and Maibang Town Hall.
            </li>
            <li>
              <strong>Emergency Helpline:</strong> District Control Room active at <strong>1077 / 03673-236324</strong>.
            </li>
          </ul>
        </div>
      </div>

      {/* High-Risk Zones Priority Table */}
      <div className="priority-zones-card">
        <div className="card-header">
          <AlertTriangle size={16} className="text-red" />
          <h3>Critical High-Risk Incident Watchlist</h3>
        </div>

        <div className="table-responsive">
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Location / Station</th>
                <th>Infrastructure</th>
                <th>Slope Angle</th>
                <th>Forecast Rain</th>
                <th>Hazard Threat</th>
                <th>Required Operational Response</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(st => (
                <tr key={st.id}>
                  <td><strong>{st.name}</strong></td>
                  <td>{st.type.replace('_', ' ').toUpperCase()}</td>
                  <td>{st.elevationM} m ASL</td>
                  <td>3-Day Active</td>
                  <td>
                    <span className={`risk-badge-sm ${st.vulnerabilityStatus.toLowerCase()}`}>
                      {st.vulnerabilityStatus}
                    </span>
                  </td>
                  <td>{st.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
