import React, { useState, useEffect } from 'react';
import type { 
  GridPoint, 
  FilterState, 
  TransportSegment, 
  StationNode, 
  SummaryStatsData 
} from './types/landslide';
import { 
  RAILWAY_SECTIONS, 
  HIGHWAY_SECTIONS, 
  CRITICAL_STATIONS 
} from './data/infrastructureData';
import { 
  fetchGridPredictions, 
  triggerLivePipeline, 
  evaluateTransportVulnerability, 
  computeSummaryStats 
} from './services/apiService';

// Pages
import { MapPage } from './pages/MapPage';
import { CorridorsPage } from './pages/CorridorsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AlertsPage } from './pages/AlertsPage';
import { PointDetailsModal } from './components/Modal/PointDetailsModal';

import { 
  ShieldAlert, 
  Map as MapIcon, 
  Train, 
  BarChart3, 
  BellRing, 
  Radio, 
  RefreshCw, 
  Download, 
  FileSpreadsheet
} from 'lucide-react';
import './index.css';

type ActivePage = 'map' | 'corridors' | 'analytics' | 'alerts';

const DEFAULT_FILTERS: FilterState = {
  minRiskLevel: 'ALL',
  minSlope: 0,
  minRainfall: 0,
  forecastHorizon: '24h',
  showHeatmap: true,
  showGridPoints: true,
  showRailways: true,
  showHighways: true,
  showStations: true,
  showHistoricalIncidents: true,
  baseMap: 'dark'
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<ActivePage>('map');
  const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
  const [railways, setRailways] = useState<TransportSegment[]>(RAILWAY_SECTIONS);
  const [highways, setHighways] = useState<TransportSegment[]>(HIGHWAY_SECTIONS);
  const [stations] = useState<StationNode[]>(CRITICAL_STATIONS);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [stats, setStats] = useState<SummaryStatsData | null>(null);

  // Selected item modal
  const [selectedPoint, setSelectedPoint] = useState<GridPoint | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<TransportSegment | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationNode | null>(null);

  // Initial Load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await fetchGridPredictions();
    setGridPoints(result.data);
    setIsBackendConnected(!result.isFallback);

    const evaluatedRailways = evaluateTransportVulnerability(RAILWAY_SECTIONS, result.data);
    const evaluatedHighways = evaluateTransportVulnerability(HIGHWAY_SECTIONS, result.data);
    setRailways(evaluatedRailways);
    setHighways(evaluatedHighways);

    const calculatedStats = computeSummaryStats(result.data, evaluatedRailways, evaluatedHighways);
    setStats(calculatedStats);

    setIsLoading(false);
  };

  const handleRefreshPipeline = async () => {
    setIsRefreshing(true);
    await triggerLivePipeline();
    setTimeout(async () => {
      await loadData();
      setIsRefreshing(false);
    }, 1800);
  };

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleExportCSV = () => {
    if (!gridPoints.length) return;
    const header = 'id,district,latitude,longitude,elevation,slope,clay_percent,rain_day1,rain_day2,rain_day3,probability,risk_level\n';
    const rows = gridPoints.map(p => 
      `${p.id},${p.district},${p.latitude},${p.longitude},${p.elevation},${p.slope},${p.clayPercent},${p.rainDay1},${p.rainDay2},${p.rainDay3},${p.probability},${p.riskLevel}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dima_hasao_landslide_predictions_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportGeoJSON = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: gridPoints.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.longitude, p.latitude]
        },
        properties: {
          id: p.id,
          elevation: p.elevation,
          slope: p.slope,
          clayPercent: p.clayPercent,
          rainDay1: p.rainDay1,
          rainDay2: p.rainDay2,
          rainDay3: p.rainDay3,
          probability: p.probability,
          riskLevel: p.riskLevel
        }
      }))
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dima_hasao_landslide_hazard_grid.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Sleek Top Navigation Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo-badge">
            <ShieldAlert size={22} className="text-red" />
          </div>
          <div>
            <div className="system-title-row">
              <h1 className="system-title">NER-LANDSLIDE GIS</h1>
              <span className="live-tag">
                <Radio size={12} className="live-icon text-green" /> DIMA HASAO
              </span>
            </div>
            <p className="system-subtitle">
              Early Warning & Transport Corridor Hazard System (Lumding–Badarpur Railway & NH-27)
            </p>
          </div>
        </div>

        {/* Multi-Page Navigation Bar */}
        <nav className="header-navbar">
          <button 
            className={`nav-link-btn ${currentPage === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentPage('map')}
          >
            <MapIcon size={16} />
            <span>GIS Hazard Map</span>
          </button>

          <button 
            className={`nav-link-btn ${currentPage === 'corridors' ? 'active' : ''}`}
            onClick={() => setCurrentPage('corridors')}
          >
            <Train size={16} />
            <span>Transport Corridors</span>
            {railways.some(r => r.threatLevel === 'CRITICAL') && (
              <span className="nav-badge-dot" />
            )}
          </button>

          <button 
            className={`nav-link-btn ${currentPage === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentPage('analytics')}
          >
            <BarChart3 size={16} />
            <span>Risk Analytics</span>
          </button>

          <button 
            className={`nav-link-btn ${currentPage === 'alerts' ? 'active' : ''}`}
            onClick={() => setCurrentPage('alerts')}
          >
            <BellRing size={16} />
            <span>Early Warning Alerts</span>
            {stats && stats.highRiskCount > 0 && (
              <span className="nav-badge-count">{stats.highRiskCount}</span>
            )}
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className="header-actions">
          <button 
            className={`btn-refresh-top ${isRefreshing ? 'spin' : ''}`}
            onClick={handleRefreshPipeline}
            disabled={isRefreshing}
            title="Trigger Live Open-Meteo & ML Assessment"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Assessing...' : 'Live Recalculation'}</span>
          </button>

          <div className="btn-export-group">
            <button className="btn-export" onClick={handleExportCSV} title="Export CSV Data">
              <FileSpreadsheet size={14} /> CSV
            </button>
            <button className="btn-export" onClick={handleExportGeoJSON} title="Export GeoJSON">
              <Download size={14} /> GeoJSON
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Viewport */}
      <main className="main-content-viewport">
        {isLoading ? (
          <div className="page-loading-screen">
            <div className="spinner" />
            <h3>Loading Dima Hasao Geospatial Grid & Transportation Data...</h3>
            <p>Rendering Borail mountain slopes, railway tracks, and soil clay models...</p>
          </div>
        ) : (
          <>
            {currentPage === 'map' && (
              <MapPage
                gridPoints={gridPoints}
                railways={railways}
                highways={highways}
                stations={stations}
                filters={filters}
                onFilterChange={handleFilterChange}
                onRefreshPipeline={handleRefreshPipeline}
                isRefreshing={isRefreshing}
                isBackendConnected={isBackendConnected}
                onSelectPoint={p => {
                  setSelectedPoint(p);
                  setSelectedTransport(null);
                  setSelectedStation(null);
                }}
                onSelectTransport={t => {
                  setSelectedTransport(t);
                  setSelectedPoint(null);
                  setSelectedStation(null);
                }}
                onSelectStation={s => {
                  setSelectedStation(s);
                  setSelectedPoint(null);
                  setSelectedTransport(null);
                }}
              />
            )}

            {currentPage === 'corridors' && (
              <CorridorsPage
                gridPoints={gridPoints}
                railways={railways}
                highways={highways}
                stations={stations}
                filters={filters}
                onSelectTransport={t => {
                  setSelectedTransport(t);
                  setSelectedPoint(null);
                  setSelectedStation(null);
                }}
                selectedTransport={selectedTransport}
              />
            )}

            {currentPage === 'analytics' && stats && (
              <AnalyticsPage
                stats={stats}
                gridPoints={gridPoints}
                onExportCSV={handleExportCSV}
                onExportGeoJSON={handleExportGeoJSON}
              />
            )}

            {currentPage === 'alerts' && (
              <AlertsPage
                gridPoints={gridPoints}
                railways={railways}
                highways={highways}
                stations={stations}
              />
            )}
          </>
        )}
      </main>

      {/* Detail Modal Inspector */}
      <PointDetailsModal
        point={selectedPoint}
        segment={selectedTransport}
        station={selectedStation}
        onClose={() => {
          setSelectedPoint(null);
          setSelectedTransport(null);
          setSelectedStation(null);
        }}
      />
    </div>
  );
};

export default App;
