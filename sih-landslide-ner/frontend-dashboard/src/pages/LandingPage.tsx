import React from 'react';
import type { GridPoint, TransportSegment, StationNode, SummaryStatsData } from '../types/landslide';
import { 
  ShieldAlert, 
  Train, 
  BellRing, 
  ArrowRight, 
  Layers, 
  CloudRain, 
  Mountain, 
  Activity, 
  Download, 
  Compass, 
  Sparkles, 
  FileSpreadsheet, 
  BarChart3, 
  Map as MapIcon, 
  ChevronRight,
  Zap
} from 'lucide-react';

interface LandingPageProps {
  gridPoints: GridPoint[];
  railways?: TransportSegment[];
  highways?: TransportSegment[];
  stations?: StationNode[];
  stats?: SummaryStatsData | null;
  onNavigate: (page: 'map' | 'corridors' | 'analytics' | 'alerts') => void;
  onRefreshPipeline?: () => void;
  isRefreshing?: boolean;
  isBackendConnected: boolean;
  onExportCSV: () => void;
  onExportGeoJSON: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  gridPoints,
  onNavigate,
  isBackendConnected,
  onExportCSV,
  onExportGeoJSON
}) => {
  const highRiskPoints = gridPoints.filter(p => p.riskLevel === 'HIGH');
  const totalPoints = gridPoints.length || 5076;

  return (
    <div className="landing-page-root">
      {/* Ambient background glow */}
      <div className="landing-ambient-bg">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-grid-overlay" />
      </div>

      <div className="landing-content-container">
        
        {/* ========================================================= */}
        {/* 1. HERO SECTION: PROJECT TITLE & VALUE PROPOSITION */}
        {/* ========================================================= */}
        <section className="landing-hero-section">
          
          <div className="hero-top-badge">
            <span className="pulse-beacon" />
            <span className="badge-text">
              Smart India Hackathon • National AI Disaster Mitigation Platform
            </span>
            <span className="badge-team">
              Engineered by team <strong>Tech4Bharath</strong>
            </span>
          </div>

          <h1 className="hero-main-title">
            AI-Based Early Warning & Landslide Risk Monitoring System in NER
          </h1>

          <p className="hero-tagline">
            High-precision geotechnical hazard intelligence fusing <strong>NASA SRTM 30m Digital Elevation Models</strong>, 
            <strong> 72-hour dynamic Open-Meteo precipitation forecasts</strong>, and <strong>geotechnical soil mechanics</strong> to 
            protect life, strategic mountain transport corridors, and railway networks across the <strong>North-Eastern Region (NER)</strong>.
          </p>

          <div className="hero-cta-group">
            <button className="btn-hero-primary" onClick={() => onNavigate('map')}>
              <Compass size={18} />
              <span>Launch Live GIS Command Center</span>
              <ArrowRight size={16} />
            </button>

            <button className="btn-hero-secondary" onClick={() => onNavigate('corridors')}>
              <Train size={17} />
              <span>Inspect Transport Lifelines</span>
            </button>

            <button className="btn-hero-secondary btn-hero-alerts" onClick={() => onNavigate('alerts')}>
              <BellRing size={17} />
              <span>Early Warning Bulletins</span>
              {highRiskPoints.length > 0 && (
                <span className="hero-alert-pill">{highRiskPoints.length}</span>
              )}
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hero-telemetry-ribbon">
            <div className="telemetry-card">
              <div className="telemetry-icon-box cyan">
                <Layers size={18} />
              </div>
              <div className="telemetry-data">
                <span className="telemetry-label">Monitored Grid Cells</span>
                <span className="telemetry-value">{totalPoints} <small>Points</small></span>
              </div>
            </div>

            <div className="telemetry-card">
              <div className="telemetry-icon-box blue">
                <CloudRain size={18} />
              </div>
              <div className="telemetry-data">
                <span className="telemetry-label">Forecast Horizon</span>
                <span className="telemetry-value">72 <small>Hours Dynamic</small></span>
              </div>
            </div>

            <div className="telemetry-card">
              <div className="telemetry-icon-box amber">
                <Train size={18} />
              </div>
              <div className="telemetry-data">
                <span className="telemetry-label">Monitored Lifelines</span>
                <span className="telemetry-value">185.2 <small>km Track & Road</small></span>
              </div>
            </div>

            <div className="telemetry-card">
              <div className="telemetry-icon-box red">
                <ShieldAlert size={18} />
              </div>
              <div className="telemetry-data">
                <span className="telemetry-label">High Hazard Hotspots</span>
                <span className="telemetry-value text-red">{highRiskPoints.length} <small>Red Zones</small></span>
              </div>
            </div>

            <div className="telemetry-card">
              <div className="telemetry-icon-box green">
                <Activity size={18} />
              </div>
              <div className="telemetry-data">
                <span className="telemetry-label">Model Pipeline</span>
                <span className="telemetry-value text-green">
                  {isBackendConnected ? 'FastAPI + Spring Live' : 'Calibrated ML 3.0'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. WHAT OUR PROJECT DOES (THE 4 CORE PILLARS) */}
        {/* ========================================================= */}
        <section className="landing-section">
          <div className="section-header-center">
            <span className="section-eyebrow">
              <Zap size={14} className="text-cyan" /> CORE SYSTEM ARCHITECTURE
            </span>
            <h2 className="section-title">What Our Platform Does</h2>
            <p className="section-subtitle">
              An end-to-end artificial intelligence framework designed to prevent disaster and maintain strategic connectivity across North-East India.
            </p>
          </div>

          <div className="pipeline-steps-grid">
            
            <div className="pipeline-step-card">
              <div className="step-num-badge">01</div>
              <div className="step-icon-box cyan">
                <Mountain size={22} />
              </div>
              <h3 className="step-title">Multispectral & Elevation Modeling</h3>
              <p className="step-desc">
                Ingests NASA SRTM 30m Digital Elevation Models to extract precise slope gradients, terrain curvature, aspect orientation, and elevation profiles across mountainous regions.
              </p>
              <div className="step-meta-pill">
                <span>🛰️ High-Resolution DEM Processing</span>
              </div>
            </div>

            <div className="pipeline-step-card">
              <div className="step-num-badge">02</div>
              <div className="step-icon-box blue">
                <CloudRain size={22} />
              </div>
              <h3 className="step-title">72-Hour Dynamic Weather Ingestion</h3>
              <p className="step-desc">
                Continuously polls live Open-Meteo forecasts to calculate cumulative antecedent precipitation (API), soil moisture saturation, and pore-water pressure build-up.
              </p>
              <div className="step-meta-pill">
                <span>🌧️ Dynamic Rainfall Saturation</span>
              </div>
            </div>

            <div className="pipeline-step-card">
              <div className="step-num-badge">03</div>
              <div className="step-icon-box green">
                <Activity size={22} />
              </div>
              <h3 className="step-title">Geotechnical Machine Learning Engine</h3>
              <p className="step-desc">
                An ensemble of XGBoost and Random Forest classifiers trained on historical North-East India landslides to evaluate Mohr-Coulomb failure probabilities in real time.
              </p>
              <div className="step-meta-pill">
                <span>🧠 Calibrated AI Hazard Scoring</span>
              </div>
            </div>

            <div className="pipeline-step-card">
              <div className="step-num-badge">04</div>
              <div className="step-icon-box red">
                <BellRing size={22} />
              </div>
              <h3 className="step-title">Lifeline Safeguard & Early Warning</h3>
              <p className="step-desc">
                Automatically issues railway slow orders, highway traffic advisories, GeoJSON feeds for GIS software, and evacuation bulletins for disaster response authorities (NDMA/SDMA).
              </p>
              <div className="step-meta-pill">
                <span>📢 Actionable Directives & SOPs</span>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. THE 4 PLATFORM MODULES (DIRECTORY) */}
        {/* ========================================================= */}
        <section className="landing-section">
          <div className="section-header-center">
            <span className="section-eyebrow">
              <Layers size={14} /> PLATFORM MODULES & CAPABILITIES
            </span>
            <h2 className="section-title">Explore Platform Capabilities</h2>
            <p className="section-subtitle">
              Engineered for emergency operation centers, railway divisions, highway authorities, and disaster relief teams.
            </p>
          </div>

          <div className="platform-modules-grid">
            
            <div className="module-card" onClick={() => onNavigate('map')}>
              <div className="module-icon-box cyan">
                <MapIcon size={22} />
              </div>
              <h3 className="module-title">GIS Hazard Map & Layer Controls</h3>
              <p className="module-desc">
                Interactive spatial map with Dark, Satellite, and Topographic DEM basemaps, hazard heatmaps, elevation filters, and point telemetry inspection.
              </p>
              <div className="module-action-link">
                <span>Launch Interactive Map</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="module-card" onClick={() => onNavigate('corridors')}>
              <div className="module-icon-box amber">
                <Train size={22} />
              </div>
              <h3 className="module-title">Transport Lifelines Corridor Monitor</h3>
              <p className="module-desc">
                Route navigator for strategic mountain railways and national highway networks, detailing recommended speed restrictions and soil clay saturation.
              </p>
              <div className="module-action-link">
                <span>Inspect Corridors</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="module-card" onClick={() => onNavigate('analytics')}>
              <div className="module-icon-box green">
                <BarChart3 size={22} />
              </div>
              <h3 className="module-title">Risk Analytics & Topographic Charts</h3>
              <p className="module-desc">
                Rich interactive charts powered by Recharts covering risk distribution, slope-rainfall correlation matrices, and soil clay percentage vulnerability.
              </p>
              <div className="module-action-link">
                <span>Explore Analytics</span>
                <ChevronRight size={16} />
              </div>
            </div>

            <div className="module-card" onClick={() => onNavigate('alerts')}>
              <div className="module-icon-box red">
                <BellRing size={22} />
              </div>
              <h3 className="module-title">Early Warning Bulletins & Evacuation SOPs</h3>
              <p className="module-desc">
                Formal directives ready for disaster response authorities and railway teams with printable emergency directives and SMS alert feeds.
              </p>
              <div className="module-action-link">
                <span>View Alert Bulletins</span>
                <ChevronRight size={16} />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. DATA EXPORT & DISASTER RESPONSE INTEGRATION */}
        {/* ========================================================= */}
        <section className="landing-section">
          <div className="export-callout-card">
            <div className="export-callout-content">
              <div className="export-icon-box">
                <Download size={24} className="text-cyan" />
              </div>
              <div>
                <h3 className="export-title">Open Geospatial Data Feeds & Reports</h3>
                <p className="export-desc">
                  Export high-resolution predictions in standard GeoJSON and CSV formats for immediate ingestion into <strong>ArcGIS</strong>, <strong>QGIS</strong>, or <strong>Disaster Management EOCs</strong>.
                </p>
              </div>
            </div>

            <div className="export-buttons-group">
              <button className="btn-export-action" onClick={onExportCSV}>
                <FileSpreadsheet size={16} />
                <span>Export Machine Learning CSV Dataset</span>
              </button>
              <button className="btn-export-action primary" onClick={onExportGeoJSON}>
                <Download size={16} />
                <span>Export QGIS GeoJSON Feature Collection</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. FOOTER & TEAM ATTRIBUTION */}
        {/* ========================================================= */}
        <footer className="landing-footer">
          <div className="footer-top-row">
            <div className="footer-brand">
              <div className="brand-logo-badge small">
                <ShieldAlert size={18} className="text-red" />
              </div>
              <div>
                <h4 className="footer-brand-title">NER-LANDSLIDE GIS</h4>
                <p className="footer-brand-sub">AI-Based Early Warning & Landslide Risk Monitoring System in NER</p>
              </div>
            </div>

            <div className="footer-attribution-badge">
              <Sparkles size={15} className="text-cyan" />
              <span>Engineered with excellence by team <strong>Tech4Bharath</strong></span>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p className="copyright-text">
              Smart India Hackathon • Problem Statement: AI-Based Early Warning and Landslide Risk Monitoring System in NER
            </p>
            <div className="footer-tech-stack">
              <span>FastAPI ML</span>
              <span>•</span>
              <span>Spring Boot</span>
              <span>•</span>
              <span>NASA SRTM</span>
              <span>•</span>
              <span>XGBoost 3.0</span>
              <span>•</span>
              <span>Leaflet GIS</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};
