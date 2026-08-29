import React from 'react';
import type { SummaryStatsData, GridPoint } from '../types/landslide';
import { SUB_DIVISIONS } from '../data/dimaHasaoBoundary';
import { 
  BarChart3, 
  ShieldAlert, 
  Mountain, 
  CloudRain, 
  Train, 
  Navigation, 
  MapPin, 
  Download, 
  FileSpreadsheet, 
  Users, 
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

interface AnalyticsPageProps {
  stats: SummaryStatsData;
  gridPoints: GridPoint[];
  onExportCSV: () => void;
  onExportGeoJSON: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  stats,
  gridPoints,
  onExportCSV,
  onExportGeoJSON
}) => {
  // Risk Distribution Data
  const riskChartData = [
    { name: 'High Risk (>70%)', count: stats.highRiskCount, color: '#ef4444' },
    { name: 'Moderate (40-70%)', count: stats.moderateRiskCount, color: '#f59e0b' },
    { name: 'Low/Safe (<40%)', count: stats.lowRiskCount, color: '#22c55e' }
  ];

  // Slope Bracket Distribution
  const slopeRanges = [
    { range: '0° - 15° (Gentle)', count: gridPoints.filter(p => p.slope < 15).length, color: '#3b82f6' },
    { range: '15° - 30° (Moderate)', count: gridPoints.filter(p => p.slope >= 15 && p.slope < 30).length, color: '#eab308' },
    { range: '30° - 45° (Steep)', count: gridPoints.filter(p => p.slope >= 30 && p.slope < 45).length, color: '#ea580c' },
    { range: '> 45° (Extreme)', count: gridPoints.filter(p => p.slope >= 45).length, color: '#ef4444' }
  ];

  return (
    <div className="analytics-page-container">
      {/* Page Title */}
      <div className="page-header-bar">
        <div className="header-info">
          <div className="icon-badge">
            <BarChart3 size={20} className="text-cyan" />
          </div>
          <div>
            <h2 className="page-title">Dima Hasao Spatial Intelligence & Risk Analytics</h2>
            <p className="page-subtitle">
              Comprehensive disaster vulnerability overview for Borail Mountain Range, transport lifelines, and sub-divisions
            </p>
          </div>
        </div>

        <div className="btn-export-group">
          <button className="btn-export" onClick={onExportCSV}>
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button className="btn-export" onClick={onExportGeoJSON}>
            <Download size={14} /> Export GeoJSON
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="analytics-kpi-grid">
        <div className="a-kpi-card danger">
          <div className="kpi-top">
            <span>High Risk Hotspots</span>
            <ShieldAlert size={18} className="text-red" />
          </div>
          <div className="kpi-num text-red">{stats.highRiskCount.toLocaleString()}</div>
          <div className="kpi-footer">Terrain grid points &gt; 70% probability</div>
        </div>

        <div className="a-kpi-card warning">
          <div className="kpi-top">
            <span>Endangered Railway</span>
            <Train size={18} className="text-amber" />
          </div>
          <div className="kpi-num text-amber">{stats.criticalRailwayKm} <span className="unit">km</span></div>
          <div className="kpi-footer">Lumding–Badarpur Hill Section</div>
        </div>

        <div className="a-kpi-card info">
          <div className="kpi-top">
            <span>Threatened Highway</span>
            <Navigation size={18} className="text-cyan" />
          </div>
          <div className="kpi-num text-cyan">{stats.criticalHighwayKm} <span className="unit">km</span></div>
          <div className="kpi-footer">NH-27 East-West Mountain Corridor</div>
        </div>

        <div className="a-kpi-card rain">
          <div className="kpi-top">
            <span>3-Day Peak Rainfall</span>
            <CloudRain size={18} className="text-blue" />
          </div>
          <div className="kpi-num text-blue">{stats.peakRainfall} <span className="unit">mm</span></div>
          <div className="kpi-footer">Cumulative saturation potential</div>
        </div>

        <div className="a-kpi-card">
          <div className="kpi-top">
            <span>Average Terrain Slope</span>
            <Mountain size={18} className="text-purple" />
          </div>
          <div className="kpi-num text-purple">{stats.averageSlope}°</div>
          <div className="kpi-footer">Borail Mountain System</div>
        </div>

        <div className="a-kpi-card">
          <div className="kpi-top">
            <span>Total District Area</span>
            <MapPin size={18} className="text-slate" />
          </div>
          <div className="kpi-num">4,888 <span className="unit">km²</span></div>
          <div className="kpi-footer">{stats.totalPoints.toLocaleString()} active grid cells</div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="analytics-charts-grid">
        {/* Chart 1: Risk Distribution */}
        <div className="chart-card">
          <div className="card-header">
            <Activity size={16} className="text-cyan" />
            <h3>Spatial Landslide Risk Category Breakdown</h3>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(val: any) => [`${val.toLocaleString()} Grid Points`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Slope Distribution */}
        <div className="chart-card">
          <div className="card-header">
            <Mountain size={16} className="text-purple" />
            <h3>Terrain Slope Bracket Distribution</h3>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={slopeRanges} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(val: any) => [`${val.toLocaleString()} Grid Points`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {slopeRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sub-Divisions Risk Assessment Table */}
      <div className="subdivisions-card">
        <div className="card-header">
          <Users size={16} className="text-cyan" />
          <h3>Dima Hasao Administrative Sub-Divisions Vulnerability Assessment</h3>
        </div>

        <div className="table-responsive">
          <table className="subdiv-table">
            <thead>
              <tr>
                <th>Sub-Division</th>
                <th>Headquarters</th>
                <th>Monitored Area</th>
                <th>Vulnerable Population</th>
                <th>Risk Classification</th>
                <th>Priority Action</th>
              </tr>
            </thead>
            <tbody>
              {SUB_DIVISIONS.map(sub => (
                <tr key={sub.id}>
                  <td><strong>{sub.name}</strong></td>
                  <td>{sub.hq}</td>
                  <td>{sub.areaSqKm.toLocaleString()} km²</td>
                  <td>{sub.population.toLocaleString()} citizens</td>
                  <td>
                    <span className={`risk-pill ${sub.riskIndex.toLowerCase()}`}>
                      {sub.riskIndex} RISK ({Math.round(sub.vulnerabilityFactor * 100)}%)
                    </span>
                  </td>
                  <td className="action-cell">
                    {sub.riskIndex === 'HIGH' 
                      ? 'Deploy Emergency SDRF teams & monitor NH-27/Railway' 
                      : 'Maintain river water level and culvert inspection'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
