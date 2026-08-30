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
  FileSpreadsheet, 
  BarChart3, 
  Map as MapIcon, 
  ChevronRight,
  Zap,
  Radio,
  Cpu,
  TrendingUp
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
  const moderateRiskPoints = gridPoints.filter(p => p.riskLevel === 'MODERATE');
  const totalPoints = gridPoints.length || 5076;

  return (
    <div className="landing-page-root">
      {/* Dynamic Ambient Background with Geotechnical Contours */}
      <div className="landing-ambient-bg" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
        <div className="ambient-grid-overlay" />
        
        {/* Subtle Topographic Terrain Contours SVG */}
        <svg className="hero-topo-bg-svg" viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 280 C 200 180, 450 350, 750 240 C 1050 130, 1300 320, 1600 200" stroke="rgba(30, 43, 24, 0.05)" strokeWidth="1.5" strokeDasharray="6 4" />
          <path d="M-100 340 C 220 220, 480 400, 780 290 C 1080 180, 1320 380, 1600 260" stroke="rgba(30, 43, 24, 0.06)" strokeWidth="1.5" />
          <path d="M-100 400 C 240 260, 510 450, 810 340 C 1110 230, 1340 440, 1600 320" stroke="rgba(30, 43, 24, 0.04)" strokeWidth="1.5" strokeDasharray="8 6" />
          <path d="M-100 460 C 260 300, 540 500, 840 390 C 1140 280, 1360 500, 1600 380" stroke="rgba(30, 43, 24, 0.05)" strokeWidth="1.5" />
          <path d="M-100 520 C 280 340, 570 550, 870 440 C 1170 330, 1380 560, 1600 440" stroke="rgba(30, 43, 24, 0.03)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="landing-content-container">
        
        {/* ========================================================= */}
        {/* 1. HERO SECTION: PROJECT TITLE & VALUE PROPOSITION */}
        {/* ========================================================= */}
        <section className="landing-hero-section">
          <h1 className="hero-main-title">
            AI-Based Early Warning &amp; Landslide Risk Monitoring System in NER
          </h1>

          <p className="hero-tagline">
            High-precision geotechnical hazard intelligence fusing <strong>NASA SRTM 30m Digital Elevation Models</strong>, 
            <strong> 72-hour dynamic Open-Meteo precipitation forecasts</strong>, and <strong>geotechnical soil mechanics</strong> to 
            protect life, strategic mountain transport corridors, and railway networks across the <strong>North-Eastern Region (NER)</strong>.
          </p>

          {/* Primary Action Button Area */}
          <div className="hero-cta-group">
            <button className="btn-hero-primary" onClick={() => onNavigate('map')}>
              <div className="btn-icon-pulse">
                <Compass size={18} />
              </div>
              <span>Launch Live GIS Command Center</span>
              <ArrowRight size={17} className="btn-arrow-hover" />
            </button>

            <button className="btn-hero-secondary" onClick={() => onNavigate('corridors')}>
              <Train size={16} className="btn-sub-icon" />
              <span>Inspect Transport Lifelines</span>
            </button>

            <button className="btn-hero-secondary btn-hero-alerts" onClick={() => onNavigate('alerts')}>
              <BellRing size={16} className="btn-sub-icon" />
              <span>Early Warning Bulletins</span>
              {highRiskPoints.length > 0 && (
                <span className="hero-alert-pill">
                  <span className="alert-dot" />
                  {highRiskPoints.length} Critical
                </span>
              )}
            </button>
          </div>

          {/* Quick Metrics Bar (Hero Telemetry Ribbon with Animated Blob Effect) */}
          <div className="hero-telemetry-ribbon">
            
            <div className="telemetry-card blob-card cyan" onClick={() => onNavigate('map')}>
              <div className="telemetry-blob cyan" aria-hidden="true" />
              <div className="telemetry-card-bg">
                <div className="telemetry-card-inner">
                  <div className="telemetry-icon-box cyan">
                    <Layers size={18} />
                  </div>
                  <div className="telemetry-data">
                    <span className="telemetry-label">Monitored Grid Cells</span>
                    <div className="telemetry-val-row">
                      <span className="telemetry-value">{totalPoints.toLocaleString()}</span>
                      <span className="telemetry-unit">Points</span>
                    </div>
                    <span className="telemetry-subtext">30m NASA DEM Grid</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="telemetry-card blob-card blue" onClick={() => onNavigate('analytics')}>
              <div className="telemetry-blob blue" aria-hidden="true" />
              <div className="telemetry-card-bg">
                <div className="telemetry-card-inner">
                  <div className="telemetry-icon-box blue">
                    <CloudRain size={18} />
                  </div>
                  <div className="telemetry-data">
                    <span className="telemetry-label">Forecast Horizon</span>
                    <div className="telemetry-val-row">
                      <span className="telemetry-value">72</span>
                      <span className="telemetry-unit">Hours Dynamic</span>
                    </div>
                    <span className="telemetry-subtext">Open-Meteo Ingestion</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="telemetry-card blob-card amber" onClick={() => onNavigate('corridors')}>
              <div className="telemetry-blob amber" aria-hidden="true" />
              <div className="telemetry-card-bg">
                <div className="telemetry-card-inner">
                  <div className="telemetry-icon-box amber">
                    <Train size={18} />
                  </div>
                  <div className="telemetry-data">
                    <span className="telemetry-label">Monitored Lifelines</span>
                    <div className="telemetry-val-row">
                      <span className="telemetry-value">185.2</span>
                      <span className="telemetry-unit">km Track &amp; Road</span>
                    </div>
                    <span className="telemetry-subtext">LMG-BPB &amp; NH-27 Corridor</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="telemetry-card blob-card red highlight-danger" onClick={() => onNavigate('alerts')}>
              <div className="telemetry-blob red" aria-hidden="true" />
              <div className="telemetry-card-bg">
                <div className="telemetry-card-inner">
                  <div className="telemetry-icon-box red">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="telemetry-data">
                    <span className="telemetry-label">High Hazard Hotspots</span>
                    <div className="telemetry-val-row">
                      <span className="telemetry-value text-red">{highRiskPoints.length}</span>
                      <span className="telemetry-unit text-red">Red Zones</span>
                    </div>
                    <span className="telemetry-subtext">{moderateRiskPoints.length} Moderate Risks</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="telemetry-card blob-card green" onClick={() => onNavigate('map')}>
              <div className="telemetry-blob green" aria-hidden="true" />
              <div className="telemetry-card-bg">
                <div className="telemetry-card-inner">
                  <div className="telemetry-icon-box green">
                    <Activity size={18} />
                  </div>
                  <div className="telemetry-data">
                    <span className="telemetry-label">Model Pipeline</span>
                    <div className="telemetry-val-row">
                      <span className="telemetry-value text-green">
                        {isBackendConnected ? 'FastAPI + Spring Live' : 'Calibrated ML 3.0'}
                      </span>
                    </div>
                    <span className="telemetry-subtext">XGBoost &amp; Random Forest</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. WHAT OUR PROJECT DOES (THE 4 CORE ARCHITECTURE PILLARS) */}
        {/* ========================================================= */}
        <section className="landing-section">
          <div className="section-header-center">
            <div className="section-eyebrow">
              <Zap size={13} className="text-green" />
              <span>END-TO-END EARLY WARNING ARCHITECTURE</span>
            </div>
            <h2 className="section-title">What Our Platform Does</h2>
            <p className="section-subtitle">
              A comprehensive artificial intelligence framework engineered to predict slope instabilities before failure, safeguarding lives and maintaining mountain supply connectivity.
            </p>
          </div>

          <div className="pipeline-steps-container">
            {/* Visual Process Flow Connector Line */}
            <div className="pipeline-flow-line" aria-hidden="true" />

            <div className="pipeline-steps-grid">
              
              <div className="odd-fly-card pipeline-step-card">
                <div className="odd-fly-inner">
                  <div className="step-card-header">
                    <div className="step-num-pill">
                      <span className="step-idx">01</span>
                      <span className="step-stage">TERRAIN</span>
                    </div>
                    <div className="step-icon-box cyan">
                      <Mountain size={20} />
                    </div>
                  </div>
                  <h3 className="step-title">Multispectral &amp; Elevation Modeling</h3>
                  <p className="step-desc">
                    Ingests NASA SRTM 30m Digital Elevation Models to extract precise slope gradients, terrain curvature, aspect orientation, and elevation profiles across mountainous regions.
                  </p>
                  <div className="step-meta-pill">
                    <Layers size={13} />
                    <span>High-Resolution DEM Processing</span>
                  </div>
                </div>
              </div>

              <div className="odd-fly-card pipeline-step-card">
                <div className="odd-fly-inner">
                  <div className="step-card-header">
                    <div className="step-num-pill">
                      <span className="step-idx">02</span>
                      <span className="step-stage">WEATHER</span>
                    </div>
                    <div className="step-icon-box blue">
                      <CloudRain size={20} />
                    </div>
                  </div>
                  <h3 className="step-title">72-Hour Dynamic Weather Ingestion</h3>
                  <p className="step-desc">
                    Continuously polls live Open-Meteo forecasts to calculate cumulative antecedent precipitation (API), soil moisture saturation, and pore-water pressure build-up.
                  </p>
                  <div className="step-meta-pill">
                    <Radio size={13} />
                    <span>Dynamic Rainfall Saturation</span>
                  </div>
                </div>
              </div>

              <div className="odd-fly-card pipeline-step-card">
                <div className="odd-fly-inner">
                  <div className="step-card-header">
                    <div className="step-num-pill">
                      <span className="step-idx">03</span>
                      <span className="step-stage">AI CORE</span>
                    </div>
                    <div className="step-icon-box green">
                      <Cpu size={20} />
                    </div>
                  </div>
                  <h3 className="step-title">Geotechnical Machine Learning Engine</h3>
                  <p className="step-desc">
                    An ensemble of XGBoost and Random Forest classifiers trained on historical North-East India landslides to evaluate Mohr-Coulomb failure probabilities in real time.
                  </p>
                  <div className="step-meta-pill">
                    <TrendingUp size={13} />
                    <span>Calibrated AI Hazard Scoring</span>
                  </div>
                </div>
              </div>

              <div className="odd-fly-card pipeline-step-card highlight-step">
                <div className="odd-fly-inner">
                  <div className="step-card-header">
                    <div className="step-num-pill alert">
                      <span className="step-idx">04</span>
                      <span className="step-stage">DISASTER MITIGATION</span>
                    </div>
                    <div className="step-icon-box red">
                      <BellRing size={20} />
                    </div>
                  </div>
                  <h3 className="step-title">Lifeline Safeguard &amp; Early Warning</h3>
                  <p className="step-desc">
                    Automatically issues railway slow orders, highway traffic advisories, GeoJSON feeds for GIS software, and evacuation bulletins for disaster response authorities (NDMA/SDMA).
                  </p>
                  <div className="step-meta-pill alert">
                    <ShieldAlert size={13} />
                    <span>Actionable Directives &amp; SOPs</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. THE 4 PLATFORM MODULES (DIRECTORY) */}
        {/* ========================================================= */}
        <section className="landing-section">
          <div className="section-header-center">
            <div className="section-eyebrow">
              <Layers size={13} />
              <span>COMMAND MODULES &amp; CAPABILITIES</span>
            </div>
            <h2 className="section-title">Explore Platform Capabilities</h2>
            <p className="section-subtitle">
              Purpose-built operational suites engineered for emergency operations centers (EOC), railway divisions, highway authorities, and NDRF relief teams.
            </p>
          </div>

          <div className="platform-modules-grid">
            
            <div className="odd-fly-card module-card" onClick={() => onNavigate('map')}>
              <div className="odd-fly-inner">
                <div className="module-card-top">
                  <div className="module-icon-box cyan">
                    <MapIcon size={22} />
                  </div>
                  <span className="module-badge">INTERACTIVE GIS</span>
                </div>
                <h3 className="module-title">GIS Hazard Map &amp; Layer Controls</h3>
                <p className="module-desc">
                  Interactive spatial map with Dark, Satellite, and Topographic DEM basemaps, hazard heatmaps, elevation filters, and point telemetry inspection.
                </p>
                <div className="module-action-link">
                  <span>Launch Interactive Map</span>
                  <ChevronRight size={16} className="module-arrow-icon" />
                </div>
              </div>
            </div>

            <div className="odd-fly-card module-card" onClick={() => onNavigate('corridors')}>
              <div className="odd-fly-inner">
                <div className="module-card-top">
                  <div className="module-icon-box amber">
                    <Train size={22} />
                  </div>
                  <span className="module-badge">INFRASTRUCTURE</span>
                </div>
                <h3 className="module-title">Transport Lifelines Corridor Monitor</h3>
                <p className="module-desc">
                  Route navigator for strategic mountain railways and national highway networks, detailing recommended speed restrictions and soil clay saturation.
                </p>
                <div className="module-action-link">
                  <span>Inspect Corridors</span>
                  <ChevronRight size={16} className="module-arrow-icon" />
                </div>
              </div>
            </div>

            <div className="odd-fly-card module-card" onClick={() => onNavigate('analytics')}>
              <div className="odd-fly-inner">
                <div className="module-card-top">
                  <div className="module-icon-box green">
                    <BarChart3 size={22} />
                  </div>
                  <span className="module-badge">INTELLIGENCE</span>
                </div>
                <h3 className="module-title">Risk Analytics &amp; Topographic Charts</h3>
                <p className="module-desc">
                  Rich interactive charts powered by Recharts covering risk distribution, slope-rainfall correlation matrices, and soil clay percentage vulnerability.
                </p>
                <div className="module-action-link">
                  <span>Explore Analytics</span>
                  <ChevronRight size={16} className="module-arrow-icon" />
                </div>
              </div>
            </div>

            <div className="odd-fly-card module-card" onClick={() => onNavigate('alerts')}>
              <div className="odd-fly-inner">
                <div className="module-card-top">
                  <div className="module-icon-box red">
                    <BellRing size={22} />
                  </div>
                  <span className="module-badge red">EMERGENCY SOPS</span>
                </div>
                <h3 className="module-title">Early Warning Bulletins &amp; Evacuation SOPs</h3>
                <p className="module-desc">
                  Formal directives ready for disaster response authorities and railway teams with printable emergency directives and SMS alert feeds.
                </p>
                <div className="module-action-link">
                  <span>View Alert Bulletins</span>
                  <ChevronRight size={16} className="module-arrow-icon" />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. DATA EXPORT & DISASTER RESPONSE INTEGRATION */}
        {/* ========================================================= */}
        <section className="landing-section">
          <div className="export-callout-card">
            <div className="export-callout-bg-glow" aria-hidden="true" />
            <div className="export-callout-content">
              <div className="export-icon-box">
                <Download size={24} className="text-green" />
              </div>
              <div className="export-text-block">
                <div className="export-badge-tag">OPEN GEOSPATIAL DATA INTEROPERABILITY</div>
                <h3 className="export-title">Disaster Response Data Feeds &amp; GIS Export</h3>
                <p className="export-desc">
                  Export high-resolution predictions in standard GeoJSON and CSV formats for immediate ingestion into <strong>ArcGIS</strong>, <strong>QGIS</strong>, or <strong>Disaster Management EOCs</strong>.
                </p>
              </div>
            </div>

            <div className="export-buttons-group">
              <button className="btn-export-action" onClick={onExportCSV} title="Export CSV Data">
                <FileSpreadsheet size={16} />
                <span>Export ML CSV Dataset</span>
              </button>
              <button className="btn-export-action primary" onClick={onExportGeoJSON} title="Export GeoJSON Features">
                <Download size={16} />
                <span>Export QGIS GeoJSON Feed</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. FOOTER */}
        {/* ========================================================= */}
        <footer className="landing-footer">
          <div className="footer-top-row">
            <div className="footer-brand">
              <div className="brand-logo-badge small">
                <ShieldAlert size={18} className="text-red" />
              </div>
              <div>
                <h4 className="footer-brand-title">NER-LANDSLIDE GIS</h4>
                <p className="footer-brand-sub">AI-Based Early Warning &amp; Landslide Risk Monitoring System in NER</p>
              </div>
            </div>

            <div className="footer-tech-stack">
              <span className="tech-badge">FastAPI ML</span>
              <span className="tech-badge">Spring Boot</span>
              <span className="tech-badge">NASA SRTM</span>
              <span className="tech-badge">XGBoost 3.0</span>
              <span className="tech-badge">Leaflet GIS</span>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p className="copyright-text">
              National Disaster Management Platform • Problem Statement: AI-Based Early Warning and Landslide Risk Monitoring System in NER
            </p>
            <div className="footer-status-pill">
              <span className="footer-status-dot" />
              <span>GEOTECHNICAL PREDICTION GRID OPERATIONAL</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};
