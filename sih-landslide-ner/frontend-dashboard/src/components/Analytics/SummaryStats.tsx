import React from 'react';
import type { SummaryStatsData } from '../../types/landslide';
import { 
  ShieldAlert, 
  MapPin, 
  Mountain, 
  CloudRain, 
  Train, 
  Navigation,
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

interface SummaryStatsProps {
  stats: SummaryStatsData;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ stats }) => {
  const chartData = [
    { name: 'High Risk', count: stats.highRiskCount, color: '#ef4444' },
    { name: 'Moderate', count: stats.moderateRiskCount, color: '#f59e0b' },
    { name: 'Low/Safe', count: stats.lowRiskCount, color: '#22c55e' }
  ];

  return (
    <div className="summary-stats-container">
      {/* KPI Cards Grid */}
      <div className="stats-kpi-grid">
        <div className="kpi-card danger-glow">
          <div className="kpi-header">
            <span className="kpi-title">High Risk Zones</span>
            <ShieldAlert size={18} className="text-red" />
          </div>
          <div className="kpi-value text-red">{stats.highRiskCount.toLocaleString()}</div>
          <div className="kpi-subtext">Immediate disaster warning active</div>
        </div>

        <div className="kpi-card warning-glow">
          <div className="kpi-header">
            <span className="kpi-title">Critical Railway</span>
            <Train size={18} className="text-amber" />
          </div>
          <div className="kpi-value text-amber">{stats.criticalRailwayKm} <span className="kpi-unit">km</span></div>
          <div className="kpi-subtext">Lumding–Badarpur Hill Section</div>
        </div>

        <div className="kpi-card info-glow">
          <div className="kpi-header">
            <span className="kpi-title">Threatened Highway</span>
            <Navigation size={18} className="text-cyan" />
          </div>
          <div className="kpi-value text-cyan">{stats.criticalHighwayKm} <span className="kpi-unit">km</span></div>
          <div className="kpi-subtext">NH-27 Mountain Corridor</div>
        </div>

        <div className="kpi-card rain-glow">
          <div className="kpi-header">
            <span className="kpi-title">3-Day Peak Rain</span>
            <CloudRain size={18} className="text-blue" />
          </div>
          <div className="kpi-value text-blue">{stats.peakRainfall} <span className="kpi-unit">mm</span></div>
          <div className="kpi-subtext">Forecasted cumulative saturation</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Average Slope</span>
            <Mountain size={18} className="text-purple" />
          </div>
          <div className="kpi-value text-purple">{stats.averageSlope}°</div>
          <div className="kpi-subtext">Borail Mountain Range</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Grid Points</span>
            <MapPin size={18} className="text-slate" />
          </div>
          <div className="kpi-value">{stats.totalPoints.toLocaleString()}</div>
          <div className="kpi-subtext">~{stats.monitoredAreaSqKm.toLocaleString()} km² coverage</div>
        </div>
      </div>

      {/* Mini Risk Breakdown Bar Chart */}
      <div className="mini-chart-card">
        <div className="chart-header">
          <Activity size={15} className="text-cyan" />
          <span>Spatial Risk Distribution Across Dima Hasao</span>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                formatter={(val: any) => [`${val.toLocaleString()} Points`, 'Total Count']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
