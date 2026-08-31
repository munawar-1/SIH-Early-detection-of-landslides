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
  Compass,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
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
    { name: 'High Risk (>70%)', count: stats.highRiskCount, color: '#EF4444' },
    { name: 'Moderate (40-70%)', count: stats.moderateRiskCount, color: '#F59E0B' },
    { name: 'Low/Safe (<40%)', count: stats.lowRiskCount, color: '#22C55E' }
  ];

  // Slope Bracket Distribution
  const slopeRanges = [
    { range: '0° - 15° (Gentle)', count: gridPoints.filter(p => p.slope < 15).length, color: '#3B82F6' },
    { range: '15° - 30° (Moderate)', count: gridPoints.filter(p => p.slope >= 15 && p.slope < 30).length, color: '#EAB308' },
    { range: '30° - 45° (Steep)', count: gridPoints.filter(p => p.slope >= 30 && p.slope < 45).length, color: '#EA580C' },
    { range: '> 45° (Extreme)', count: gridPoints.filter(p => p.slope >= 45).length, color: '#EF4444' }
  ];

  // Mouse spotlight handler
  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = `${e.clientX - rect.left}px`;
    const y = `${e.clientY - rect.top}px`;
    e.currentTarget.style.setProperty('--mouse-x', x);
    e.currentTarget.style.setProperty('--mouse-y', y);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="analytics-custom-tooltip">
          <div className="tooltip-title">{label}</div>
          <div className="tooltip-value-row">
            <span className="tooltip-dot" style={{ backgroundColor: payload[0].payload.color }} />
            <span className="tooltip-count">{payload[0].value.toLocaleString()}</span>
            <span className="tooltip-unit">Grid Points</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-page-container">
      {/* Background Topographic Contour & Ambient Light Elements */}
      <div className="analytics-ambient-bg" aria-hidden="true">
        <div className="analytics-ambient-orb orb-1" />
        <div className="analytics-ambient-orb orb-2" />
        <svg className="analytics-topo-svg" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 180 C 300 100, 600 280, 900 160 C 1200 40, 1400 240, 1600 140" stroke="rgba(30, 43, 24, 0.035)" strokeWidth="1.5" />
          <path d="M-100 300 C 320 180, 640 360, 940 240 C 1240 120, 1420 320, 1600 220" stroke="rgba(30, 43, 24, 0.04)" strokeWidth="1.5" strokeDasharray="6 4" />
          <path d="M-100 420 C 340 260, 680 440, 980 320 C 1280 200, 1440 400, 1600 300" stroke="rgba(30, 43, 24, 0.03)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="analytics-content-wrapper">
        
        {/* ========================================================= */}
        {/* 1. COMMAND HEADER */}
        {/* ========================================================= */}
        <div className="analytics-header-card card-spotlight" onMouseMove={handleSpotlightMove}>
          <div className="header-info">
            <div className="analytics-icon-badge">
              <BarChart3 size={24} className="text-cyan" />
            </div>
            <div>
              <div className="analytics-tag-row">
                <span className="analytics-sector-pill">
                  <Compass size={11} className="text-green" /> DIMA HASAO SECTOR • 4,888 KM²
                </span>
                <span className="analytics-live-tag">
                  <span className="live-pulse-dot" /> LIVE RISK TELEMETRY
                </span>
              </div>
              <h1 className="analytics-main-title anim-title">Dima Hasao Spatial Intelligence &amp; Risk Analytics</h1>
              <p className="analytics-main-subtitle anim-subtitle">
                Comprehensive disaster vulnerability overview for Borail Mountain Range, transport lifelines, and sub-divisions
              </p>
            </div>
          </div>

          <div className="analytics-export-group">
            <button className="btn-analytics-export" onClick={onExportCSV} title="Export CSV Dataset">
              <FileSpreadsheet size={15} />
              <span>Export CSV</span>
            </button>
            <button className="btn-analytics-export primary" onClick={onExportGeoJSON} title="Export QGIS GeoJSON Layer">
              <Download size={15} />
              <span>Export GeoJSON</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. KEY RISK INDICATORS (6 STATS CARDS) */}
        {/* ========================================================= */}
        <section className="analytics-section">
          <div className="analytics-section-title-row">
            <div className="section-title-icon-badge">
              <Zap size={14} className="text-green" />
            </div>
            <div>
              <h2 className="analytics-section-heading">Key Risk Indicators &amp; Critical Metrics</h2>
              <p className="analytics-section-subheading">Real-time geospatial intelligence aggregated across 5,076 satellite grid telemetry points</p>
            </div>
          </div>

          <div className="analytics-kpi-grid anim-cards">
            
            {/* Card 1: High Risk Hotspots */}
            <div className="rotating-border-card risk card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="rotating-border-inner kpi-card-inner">
                <div className="kpi-header-row">
                  <span className="kpi-title-label">High Risk Hotspots</span>
                  <div className="kpi-icon-container red">
                    <ShieldAlert size={18} />
                  </div>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-main-number text-red">{stats.highRiskCount.toLocaleString()}</span>
                  <span className="kpi-badge-tag red">RED ALERT</span>
                </div>
                <div className="kpi-footer-text">Terrain grid points &gt; 70% probability</div>
              </div>
            </div>

            {/* Card 2: Endangered Railway */}
            <div className="rotating-border-card transport card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="rotating-border-inner kpi-card-inner">
                <div className="kpi-header-row">
                  <span className="kpi-title-label">Endangered Railway</span>
                  <div className="kpi-icon-container amber">
                    <Train size={18} />
                  </div>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-main-number text-amber">{stats.criticalRailwayKm}</span>
                  <span className="kpi-unit-label">km</span>
                </div>
                <div className="kpi-footer-text">Lumding–Badarpur Hill Section</div>
              </div>
            </div>

            {/* Card 3: Threatened Highway */}
            <div className="rotating-border-card gis card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="rotating-border-inner kpi-card-inner">
                <div className="kpi-header-row">
                  <span className="kpi-title-label">Threatened Highway</span>
                  <div className="kpi-icon-container blue">
                    <Navigation size={18} />
                  </div>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-main-number text-blue">{stats.criticalHighwayKm}</span>
                  <span className="kpi-unit-label">km</span>
                </div>
                <div className="kpi-footer-text">NH-27 East-West Mountain Corridor</div>
              </div>
            </div>

            {/* Card 4: 3-Day Peak Rainfall */}
            <div className="rotating-border-card gis card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="rotating-border-inner kpi-card-inner">
                <div className="kpi-header-row">
                  <span className="kpi-title-label">3-Day Peak Rainfall</span>
                  <div className="kpi-icon-container cyan">
                    <CloudRain size={18} />
                  </div>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-main-number text-cyan">{stats.peakRainfall}</span>
                  <span className="kpi-unit-label">mm</span>
                </div>
                <div className="kpi-footer-text">Cumulative saturation potential</div>
              </div>
            </div>

            {/* Card 5: Average Terrain Slope */}
            <div className="rotating-border-card analytics card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="rotating-border-inner kpi-card-inner">
                <div className="kpi-header-row">
                  <span className="kpi-title-label">Average Terrain Slope</span>
                  <div className="kpi-icon-container purple">
                    <Mountain size={18} />
                  </div>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-main-number text-purple">{stats.averageSlope}</span>
                  <span className="kpi-unit-label">°</span>
                </div>
                <div className="kpi-footer-text">Borail Mountain System</div>
              </div>
            </div>

            {/* Card 6: Total District Area */}
            <div className="rotating-border-card ai card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="rotating-border-inner kpi-card-inner">
                <div className="kpi-header-row">
                  <span className="kpi-title-label">Total District Area</span>
                  <div className="kpi-icon-container green">
                    <MapPin size={18} />
                  </div>
                </div>
                <div className="kpi-value-row">
                  <span className="kpi-main-number text-green">4,888</span>
                  <span className="kpi-unit-label">km²</span>
                </div>
                <div className="kpi-footer-text">{stats.totalPoints.toLocaleString()} active grid cells</div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. CHARTS SECTION (RISK & SLOPE DISTRIBUTIONS) */}
        {/* ========================================================= */}
        <section className="analytics-section">
          <div className="analytics-section-title-row">
            <div className="section-title-icon-badge">
              <TrendingUp size={14} className="text-green" />
            </div>
            <div>
              <h2 className="analytics-section-heading">Spatial Risk &amp; Geomorphic Distributions</h2>
              <p className="analytics-section-subheading">Machine learning susceptibility classification and terrain gradient stratification</p>
            </div>
          </div>

          <div className="analytics-charts-grid">
            
            {/* Chart 1: Risk Category Breakdown */}
            <div className="analytics-chart-panel card-spotlight" onMouseMove={handleSpotlightMove}>
              <div className="chart-panel-header">
                <div className="chart-panel-title-block">
                  <div className="chart-title-icon-box cyan">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h3 className="chart-panel-title">Spatial Landslide Risk Category Breakdown</h3>
                    <p className="chart-panel-subtitle">Distribution of grid units across validated hazard severity tiers</p>
                  </div>
                </div>
                <span className="chart-badge">3 RISK TIERS</span>
              </div>

              <div className="chart-panel-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={riskChartData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 43, 24, 0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: 'rgba(30, 43, 24, 0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(30, 43, 24, 0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 43, 24, 0.03)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56} cursor="pointer">
                      {riskChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Slope Bracket Distribution */}
            <div className="analytics-chart-panel card-spotlight" onMouseMove={handleSpotlightMove}>
              <div className="chart-panel-header">
                <div className="chart-panel-title-block">
                  <div className="chart-title-icon-box purple">
                    <Mountain size={18} />
                  </div>
                  <div>
                    <h3 className="chart-panel-title">Terrain Slope Bracket Distribution</h3>
                    <p className="chart-panel-subtitle">DEM elevation gradient classification across Dima Hasao topography</p>
                  </div>
                </div>
                <span className="chart-badge">4 SLOPE BRACKETS</span>
              </div>

              <div className="chart-panel-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={slopeRanges} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 43, 24, 0.05)" vertical={false} />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10.5, fontWeight: 600 }}
                      axisLine={{ stroke: 'rgba(30, 43, 24, 0.1)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(30, 43, 24, 0.1)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 43, 24, 0.03)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56} cursor="pointer">
                      {slopeRanges.map((entry, index) => (
                        <Cell key={`cell-slope-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. ADMINISTRATIVE SUB-DIVISIONS TABLE */}
        {/* ========================================================= */}
        <section className="analytics-section">
          <div className="analytics-section-title-row">
            <div className="section-title-icon-badge">
              <Users size={14} className="text-green" />
            </div>
            <div>
              <h2 className="analytics-section-heading">Administrative Governance &amp; Sub-Divisional Risk</h2>
              <p className="analytics-section-subheading">Zonal vulnerability assessment, jurisdictional authority, and priority action tags</p>
            </div>
          </div>

          <div className="analytics-table-panel card-spotlight" onMouseMove={handleSpotlightMove}>
            <div className="table-panel-header">
              <div className="table-panel-title-block">
                <div className="table-title-icon-box cyan">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="table-panel-title">Dima Hasao Administrative Sub-Divisions Vulnerability Assessment</h3>
                  <p className="table-panel-subtitle">Official demographic, spatial footprint, and disaster management preparedness breakdown</p>
                </div>
              </div>
              <span className="table-count-badge">5 SUB-DIVISIONS</span>
            </div>

            <div className="analytics-table-wrapper">
              <table className="analytics-subdiv-table">
                <thead>
                  <tr>
                    <th>Sub-Division</th>
                    <th>Headquarters</th>
                    <th>Area (km²)</th>
                    <th>Population</th>
                    <th>Risk Classification</th>
                    <th>Priority Action Directive</th>
                  </tr>
                </thead>
                <tbody>
                  {SUB_DIVISIONS.map((sub) => (
                    <tr key={sub.name}>
                      <td>
                        <div className="subdiv-name-block">
                          <MapPin size={13} className="text-green" />
                          <span className="subdiv-name">{sub.name}</span>
                        </div>
                      </td>
                      <td className="subdiv-hq-cell">{sub.hq}</td>
                      <td className="subdiv-area-cell">{sub.areaSqKm.toLocaleString()}</td>
                      <td className="subdiv-pop-cell">{sub.population.toLocaleString()}</td>
                      <td>
                        <span className={`analytics-risk-badge ${sub.riskIndex === 'HIGH' ? 'high' : 'moderate'}`}>
                          {sub.riskIndex === 'HIGH' ? (
                            <>
                              <AlertTriangle size={11} /> HIGH RISK
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} /> MODERATE RISK
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className="action-tag-box">
                          {sub.riskIndex === 'HIGH' 
                            ? 'Pre-position SDRF rescue squads & inspect culverts' 
                            : 'Maintain drainage & automated telemetry vigil'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
