import React, { useState, useEffect, useCallback } from 'react';
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
import { LandingPage } from './pages/LandingPage';
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
  FileSpreadsheet,
  CheckCircle2,
  Info,
  Home,
  Compass
} from 'lucide-react';
import './index.css';

type ActivePage = 'landing' | 'map' | 'corridors' | 'analytics' | 'alerts';

const DEFAULT_FILTERS: FilterState = {
  minRiskLevel: 'ALL',
  minSlope: 0,
  minRainfall: 0,
  forecastHorizon: '24h',
  showHeatmap: false,
  showGridPoints: true,
  showRailways: true,
  showHighways: true,
  showStations: true,
  showHistoricalIncidents: true,
  baseMap: 'topo'
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<ActivePage>('landing');
  const [gridPoints, setGridPoints] = useState<GridPoint[]>([]);
  const [railways, setRailways] = useState<TransportSegment[]>(RAILWAY_SECTIONS);
  const [highways, setHighways] = useState<TransportSegment[]>(HIGHWAY_SECTIONS);
  const [stations] = useState<StationNode[]>(CRITICAL_STATIONS);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [stats, setStats] = useState<SummaryStatsData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected item modal
  const [selectedPoint, setSelectedPoint] = useState<GridPoint | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<TransportSegment | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationNode | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadData = useCallback(async () => {
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
  }, []);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshPipeline = async () => {
    setIsRefreshing(true);
    const result = await triggerLivePipeline();
    if (result.isLive) {
      showToast('🚀 Live ML assessment triggered on Spring Boot backend & FastAPI model.');
    } else {
      showToast('🌧️ Synced live Open-Meteo rainfall satellite feed & updated geotechnical model.');
    }

    setTimeout(async () => {
      await loadData();
      setIsRefreshing(false);
    }, 1200);
  };

  const handleSelectPoint = useCallback((point: GridPoint) => {
    setSelectedPoint(point);
    setSelectedTransport(null);
    setSelectedStation(null);
  }, []);

  const handleSelectTransport = useCallback((segment: TransportSegment) => {
    setSelectedTransport(segment);
    setSelectedPoint(null);
    setSelectedStation(null);
  }, []);

  const handleSelectStation = useCallback((station: StationNode) => {
    setSelectedStation(station);
    setSelectedPoint(null);
    setSelectedTransport(null);
  }, []);

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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-alert">
          {isBackendConnected ? <CheckCircle2 size={16} className="text-green" /> : <Info size={16} className="text-amber" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sleek Modern Glassmorphic Header */}
      <header className="app-header">
        <div
          className="header-brand"
          onClick={() => setCurrentPage('landing')}
          style={{ cursor: 'pointer' }}
          title="Return to Overview / Landing Page"
        >
          <div className="brand-logo-badge">
            <ShieldAlert size={22} className="text-red" />
          </div>
          <div className="brand-text-block">
            <h1 className="system-title">NER-LANDSLIDE GIS</h1>
            <div className="system-title-badges">
              <span className="live-tag">
                <Radio size={10} className="live-icon text-green" /> NER REGION
              </span>
              <span
                className={`connection-badge ${isBackendConnected ? 'connected' : 'offline'}`}
                title={isBackendConnected ? 'Connected to Spring Boot & FastAPI ML Engine' : 'Running on calibrated geotechnical GIS simulation.'}
              >
                <span className={`dot ${isBackendConnected ? 'dot-green' : 'dot-amber'}`} />
                <span>{isBackendConnected ? 'ML Live' : 'Model 3.0'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Page Navigation Bar */}
        <nav className="header-navbar">
          <button
            className={`nav-link-btn ${currentPage === 'landing' ? 'active' : ''}`}
            onClick={() => setCurrentPage('landing')}
          >
            <Home size={15} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-link-btn ${currentPage === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentPage('map')}
          >
            <MapIcon size={15} />
            <span>GIS Hazard Map</span>
          </button>

          <button
            className={`nav-link-btn ${currentPage === 'corridors' ? 'active' : ''}`}
            onClick={() => setCurrentPage('corridors')}
          >
            <Train size={15} />
            <span>Corridors</span>
            {railways.some(r => r.threatLevel === 'CRITICAL') && (
              <span className="nav-badge-dot" />
            )}
          </button>

          <button
            className={`nav-link-btn ${currentPage === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentPage('analytics')}
          >
            <BarChart3 size={15} />
            <span>Analytics</span>
          </button>

          <button
            className={`nav-link-btn ${currentPage === 'alerts' ? 'active' : ''}`}
            onClick={() => setCurrentPage('alerts')}
          >
            <BellRing size={15} />
            <span>Alerts</span>
            {stats && stats.highRiskCount > 0 && (
              <span className="nav-badge-count">{stats.highRiskCount}</span>
            )}
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className="header-actions">
          {currentPage === 'landing' ? (
            <button
              className="btn-launch-header"
              onClick={() => setCurrentPage('map')}
            >
              <Compass size={15} />
              <span>Launch Map</span>
            </button>
          ) : (
            <button
              className={`btn-refresh-top ${isRefreshing ? 'spin' : ''}`}
              onClick={handleRefreshPipeline}
              disabled={isRefreshing}
              title="Trigger Live Weather & Geotechnical Assessment"
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Assessing...' : 'Live Recalculate'}</span>
            </button>
          )}

          <div className="btn-export-group">
            <button className="btn-export" onClick={handleExportCSV} title="Export CSV Data">
              <FileSpreadsheet size={13} /> CSV
            </button>
            <button className="btn-export" onClick={handleExportGeoJSON} title="Export GeoJSON">
              <Download size={13} /> GeoJSON
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
            {currentPage === 'landing' && (
              <LandingPage
                gridPoints={gridPoints}
                railways={railways}
                highways={highways}
                stations={stations}
                stats={stats}
                onNavigate={(page) => setCurrentPage(page)}
                onRefreshPipeline={handleRefreshPipeline}
                isRefreshing={isRefreshing}
                isBackendConnected={isBackendConnected}
                onExportCSV={handleExportCSV}
                onExportGeoJSON={handleExportGeoJSON}
              />
            )}

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
                onSelectPoint={handleSelectPoint}
                onSelectTransport={handleSelectTransport}
                onSelectStation={handleSelectStation}
              />
            )}

            {currentPage === 'corridors' && (
              <CorridorsPage
                gridPoints={gridPoints}
                railways={railways}
                highways={highways}
                stations={stations}
                filters={filters}
                onSelectTransport={handleSelectTransport}
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
