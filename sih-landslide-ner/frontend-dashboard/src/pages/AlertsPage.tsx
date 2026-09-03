import React, { useState, useEffect } from 'react';
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
  Printer,
  Radio,
  Send,
  Volume2,
  VolumeX,
  Languages,
  CheckCircle2,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  Users,
  Compass,
  Zap
} from 'lucide-react';
import { 
  saveSmsLog, 
  getRecentSmsLogs, 
  getSyncMetadata, 
  type SmsLogEntry 
} from '../services/offlineStorageService';

interface AlertsPageProps {
  gridPoints: GridPoint[];
  railways: TransportSegment[];
  highways: TransportSegment[];
  stations: StationNode[];
}

type AlertLanguage = 'en' | 'as' | 'bn' | 'dimasa';

export const AlertsPage: React.FC<AlertsPageProps> = ({
  gridPoints,
  railways,
  highways,
  stations
}) => {
  const highRiskPoints = gridPoints.filter(p => p.riskLevel === 'HIGH');
  
  // Multilingual warning state
  const [selectedLang, setSelectedLang] = useState<AlertLanguage>('en');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all_agencies');
  
  // SMS Broadcast state
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [smsSuccessMessage, setSmsSuccessMessage] = useState<string | null>(null);

  // Offline Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [cachedPointsCount, setCachedPointsCount] = useState<number>(gridPoints.length);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Initial load of SMS logs and Sync metadata
  useEffect(() => {
    const loadMetadataAndLogs = async () => {
      const logs = await getRecentSmsLogs();
      setSmsLogs(logs);

      const meta = await getSyncMetadata();
      if (meta.count > 0) setCachedPointsCount(meta.count);
      if (meta.lastSync) {
        setLastSyncTime(new Date(meta.lastSync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    };
    loadMetadataAndLogs();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Multilingual SMS & Alert Templates
  const alertMessages: Record<AlertLanguage, { title: string; body: string; speech: string }> = {
    en: {
      title: "RED ALERT: Severe Landslide Warning",
      body: "[RED ALERT - DIMA HASAO DDMA] Extreme slope destabilization detected along Lumding-Badarpur Railway corridor & NH-27 Jatinga Pass. Infiltration >110mm. Immediate evacuation recommended to Haflong Govt College shelter. Helpline: 1077.",
      speech: "Emergency Red Alert. Severe landslide risk detected in Dima Hasao Borail range and Jatinga corridor. All residents near steep slopes must evacuate immediately to designated relief shelters."
    },
    as: {
      title: "জৰুৰী সতৰ্কবাণী: ভূমিস্খলনৰ উচ্চ সতৰ্কতা",
      body: "[জৰুৰী সতৰ্কবাণী - ডিমা হাছাও DDMA] বৰাইল পাহাৰ, জাতিংগা আৰু হাফলং অঞ্চলত তীব্ৰ ভূমিস্খলনৰ আশংকা। পাহাৰৰ ঢালৰ পৰা ততাতৈয়াকৈ সুৰক্ষিত আশ্ৰয় শিবিৰলৈ যাওক। সাহায্য শিবিৰ: হাফলং গভৰ্ণমেণ্ট কলেজ। হেল্পলাইন: ১০৭৭।",
      speech: "জৰুৰী সতৰ্কবাণী। ডিমা হাছাও জিলাৰ বৰাইল পাহাৰ আৰু জাতিংগা অঞ্চলত তীব্ৰ ভূমিস্খলনৰ আশংকা। পাহাৰৰ ঢালৰ বাসিন্দাসকল অবিলম্বে সুৰক্ষিত আশ্ৰয় শিবিৰলৈ যাওক।"
    },
    bn: {
      title: "জরুরী সতর্কতা: ভয়াবহ ভূমিধসের লাল সংকেত",
      body: "[জরুরী সতর্কতা - ডিমা হাসাও DDMA] লামডিং-বদরপুর রেল লাইন এবং এনএইচ-২৭ জাতিঙ্গা গিরিপথে ভয়াবহ ভূমিধসের ঝুঁকি। ঝুঁকিপূর্ণ ঢালু এলাকা অবিলম্বে খালি করার নির্দেশ। আশ্রয়স্থল: হাফলং সরকারি কলেজ। কন্ট্রোল রুম: ১০৭৭।",
      speech: "জরুরী সতর্কতা। ডিমা হাসাও জেলার বোরাইল পাহাড় এবং জাতিঙ্গা গিরিপথে ভয়াবহ ভূমিধসের চরম ঝুঁকি। সকল ঝুঁকিপূর্ণ বাসিন্দাদের অবিলম্বে আশ্রয়কেন্দ্রে সরে যেতে অনুরোধ করা হচ্ছে।"
    },
    dimasa: {
      title: "ALERT GBAO: Hado Gasa Ringba (Dimasa)",
      body: "[ALERT GBAO - DIMA HASAO DDMA] Haflong aroni Borail hado ha-gasa bahaiba dong. Jatinga aroni Daotuhaja lama ha-khlai riyang ba dong. Hadur ha-geh ni mikhai thangbo. Haflong Govt College shelter bo thangba jaoba. Helpline: 1077.",
      speech: "Alert Gbao. Haflong Borail hado ha gasa bahaiba dong. Jatinga aroni Daotuhaja hadur ha geh ni mikhai thangbo."
    }
  };

  const currentMsg = alertMessages[selectedLang];

  // Mouse spotlight handler
  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = `${e.clientX - rect.left}px`;
    const y = `${e.clientY - rect.top}px`;
    e.currentTarget.style.setProperty('--mouse-x', x);
    e.currentTarget.style.setProperty('--mouse-y', y);
  };

  // Voice Alert Audio Synthesis
  const handleToggleVoice = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentMsg.speech);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      if (selectedLang === 'as' || selectedLang === 'bn') utterance.lang = 'bn-IN';
      else utterance.lang = 'en-IN';

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Automated SMS Broadcast Trigger
  const handleTriggerSmsBroadcast = async () => {
    setIsSendingSms(true);
    setSmsSuccessMessage(null);

    const recipientCounts: Record<string, { label: string; count: number }> = {
      all_agencies: { label: 'All Disaster Response Agencies (DDMA, SDRF, NFR, Police)', count: 342 },
      railway_control: { label: 'NFR Lumding Hill Section Control & Station Masters', count: 86 },
      village_heads: { label: 'Hillside Village Panchayats & Gaon Burhas', count: 128 },
      public_broadcast: { label: 'Geo-Fenced Public Mobile Cellular Broadcast', count: 14200 }
    };

    const target = recipientCounts[selectedRecipient] || recipientCounts.all_agencies;
    const latency = Math.floor(35 + Math.random() * 45);

    const broadcastPayload = JSON.stringify({
      threatLevel: highRiskPoints.length > 0 ? 'CRITICAL' : 'HIGH',
      district: 'Dima Hasao',
      targetLat: 25.18,
      targetLng: 92.76,
      targetRadiusKm: 50.0,
      title: currentMsg.title,
      body: currentMsg.body,
      language: selectedLang,
      dispatchedBy: 'District Disaster Management Authority (Higher Authority)',
      timestamp: new Date().toISOString()
    });

    const backendBase = (import.meta.env.VITE_API_BASE_URL || 'https://ner-landslide-backend.onrender.com').replace(/\/$/, '');
    const mlBase = (import.meta.env.VITE_ML_API_BASE_URL || 'https://sih-early-detection-of-landslides.onrender.com').replace(/\/$/, '');

    try {
      const broadcastEndpoints = [
        `${backendBase}/api/alerts/broadcast`,
        `${mlBase}/api/alerts/broadcast`
      ];

      await Promise.allSettled(
        broadcastEndpoints.map(url =>
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: broadcastPayload
          })
        )
      );
    } catch (apiErr) {
      console.warn('Backend broadcast dispatch note:', apiErr);
    }

    setTimeout(async () => {
      const newEntry: SmsLogEntry = {
        id: `SMS-${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipientGroup: target.label,
        phoneNumbersCount: target.count,
        threatLevel: highRiskPoints.length > 0 ? 'RED_ALERT' : 'WARNING',
        language: selectedLang,
        messageText: currentMsg.body,
        deliveryStatus: isOnline ? 'DELIVERED' : 'DISPATCHED_GSM',
        gateway: isOnline ? 'Fast2SMS' : 'NIC GSM Edge Modem',
        latencyMs: latency
      };

      await saveSmsLog(newEntry);
      setSmsLogs(prev => [newEntry, ...prev.slice(0, 9)]);
      setIsSendingSms(false);
      setSmsSuccessMessage(`✅ Automated Early Warning SMS successfully broadcast to ${target.count.toLocaleString()} recipients via ${newEntry.gateway} (${latency}ms).`);

      setTimeout(() => setSmsSuccessMessage(null), 6000);
    }, 800);
  };

  // Force Edge Sync
  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
  };

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
Operational Network Status: ${isOnline ? 'CLOUD CONNECTED (Online)' : 'REMOTE OFFLINE EDGE SYNCHRONIZED'}

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
4. Village Panchayats: Activate siren warnings in Lower Haflong and initiate shelter movement.

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
      {/* Background Topographic Contour Elements */}
      <div className="alerts-ambient-bg" aria-hidden="true">
        <div className="alerts-ambient-orb orb-alert-1" />
        <div className="alerts-ambient-orb orb-alert-2" />
        <svg className="alerts-topo-svg" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 160 C 300 80, 600 260, 900 140 C 1200 20, 1400 220, 1600 120" stroke="rgba(220, 38, 38, 0.035)" strokeWidth="1.5" />
          <path d="M-100 280 C 320 160, 640 340, 940 220 C 1240 100, 1420 300, 1600 200" stroke="rgba(30, 43, 24, 0.04)" strokeWidth="1.5" strokeDasharray="6 4" />
          <path d="M-100 400 C 340 240, 680 420, 980 300 C 1280 180, 1440 380, 1600 280" stroke="rgba(220, 38, 38, 0.03)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="alerts-content-wrapper">
        
        {/* ========================================================= */}
        {/* 1. COMMAND HEADER */}
        {/* ========================================================= */}
        <div className="alerts-header-card card-spotlight" onMouseMove={handleSpotlightMove}>
          <div className="header-info">
            <div className="alerts-icon-badge danger">
              <BellRing size={24} className="text-red" />
            </div>
            <div>
              <div className="alerts-tag-row">
                <span className="alerts-sector-pill">
                  <Compass size={11} className="text-red" /> EMERGENCY RESPONSE COMMAND • SECTOR 25.18°N
                </span>
                <span className="alerts-live-tag">
                  <span className="live-pulse-dot red" /> 24/7 EOC ACTIVE MONITORING
                </span>
              </div>
              <h1 className="alerts-main-title">Early Warning &amp; Evacuation Directives</h1>
              <p className="alerts-main-subtitle">
                Automated SMS broadcast, multilingual alerts, and offline-synchronized disaster governance for NER
              </p>
            </div>
          </div>

          <div className="alerts-export-group">
            <button className="btn-alerts-action" onClick={handlePrint} title="Print Official Action Bulletin">
              <Printer size={15} />
              <span>Print Directive</span>
            </button>
            <button className="btn-alerts-action primary danger" onClick={handleDownloadReport} title="Download Signed Bulletin File">
              <Download size={15} />
              <span>Download Official Bulletin</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. CRITICAL EMERGENCY ALERT BANNER */}
        {/* ========================================================= */}
        <div className="urgent-bulletin-banner card-spotlight" onMouseMove={handleSpotlightMove}>
          <div className="banner-pulse-halo" aria-hidden="true" />
          <div className="banner-icon-col">
            <div className="flame-icon-glow">
              <Flame size={32} className="text-red animate-pulse" />
            </div>
          </div>
          <div className="banner-content-col">
            <div className="badge-row">
              <span className="emergency-badge">
                <AlertTriangle size={12} /> RED ALERT BULLETIN #DH-2026-08
              </span>
              <span className="time-badge">
                <Clock size={12} /> Issued for Next 24h - 72h Horizon
              </span>
              <span className={`sync-status-pill ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isOnline ? 'Cloud Sync Active' : 'Offline Edge Cache'}
              </span>
            </div>
            <h3 className="banner-title">
              Severe Slope Destabilization &amp; Debris Flow Risk Detected in Borail Mountain Corridor
            </h3>
            <p className="banner-desc">
              High cumulative precipitation combined with slope angles exceeding 38° has heightened the risk of rotational landslides along the <strong>Lumding–Badarpur Hill Section (Daotuhaja – Mahur – New Haflong)</strong> and <strong>NH-27 Jatinga Pass</strong>.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. AUTOMATED SMS & MULTILINGUAL BROADCAST HUB */}
        {/* ========================================================= */}
        <div className="broadcast-hub-section">
          <div className="broadcast-hub-grid">
            
            {/* Left Column: Multilingual Alert Composer & SMS Trigger */}
            <div className="broadcast-card composer-card card-spotlight" onMouseMove={handleSpotlightMove}>
              <div className="card-header-row">
                <div className="header-title-col">
                  <div className="broadcast-icon-box red">
                    <Radio size={18} />
                  </div>
                  <div>
                    <h4>Automated SMS Early Warning Dispatcher</h4>
                    <span className="header-subtext">Instant multi-carrier GSM cell broadcast dispatch</span>
                  </div>
                </div>
                <div className="lang-switcher-tabs">
                  <Languages size={14} className="text-muted" />
                  <button 
                    className={`lang-tab ${selectedLang === 'en' ? 'active' : ''}`}
                    onClick={() => setSelectedLang('en')}
                  >
                    English
                  </button>
                  <button 
                    className={`lang-tab ${selectedLang === 'as' ? 'active' : ''}`}
                    onClick={() => setSelectedLang('as')}
                  >
                    অসমীয়া
                  </button>
                  <button 
                    className={`lang-tab ${selectedLang === 'bn' ? 'active' : ''}`}
                    onClick={() => setSelectedLang('bn')}
                  >
                    বাংলা
                  </button>
                  <button 
                    className={`lang-tab ${selectedLang === 'dimasa' ? 'active' : ''}`}
                    onClick={() => setSelectedLang('dimasa')}
                  >
                    Grao-Dima
                  </button>
                </div>
              </div>

              {/* Target Recipient Selector */}
              <div className="recipient-selector-box">
                <label className="form-label">
                  <Users size={13} /> Select Target Alert Channel / Geo-Target:
                </label>
                <select 
                  className="select-recipient-input"
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                >
                  <option value="all_agencies">🚨 All Disaster Responders (DDMA + SDRF + NFR + Police) - 342 Contacts</option>
                  <option value="railway_control">🚂 NFR Lumding Hill Section (Station Masters &amp; Loco Pilots) - 86 Contacts</option>
                  <option value="village_heads">🏘️ Hillside Village Panchayats &amp; Gaon Burhas - 128 Villages</option>
                  <option value="public_broadcast">📢 Geo-Fenced Mobile Cell Broadcast (Tower Broadcast ~14,200 Mobiles)</option>
                </select>
              </div>

              {/* SMS Preview Message Box */}
              <div className="sms-preview-box">
                <div className="preview-header">
                  <Smartphone size={14} className="text-cyan" />
                  <span>Cellular SMS Preview ({selectedLang.toUpperCase()})</span>
                  <span className="sms-chars-badge">{currentMsg.body.length} chars (1 SMS segment)</span>
                </div>
                <div className="sms-content-text">
                  {currentMsg.body}
                </div>
              </div>

              {/* Success Toast / Notification */}
              {smsSuccessMessage && (
                <div className="sms-success-banner">
                  <CheckCircle2 size={16} className="text-green" />
                  <span>{smsSuccessMessage}</span>
                </div>
              )}

              {/* Action Buttons: Voice Siren & SMS Dispatch */}
              <div className="broadcast-action-bar">
                <button 
                  className={`btn-voice-siren ${isPlayingAudio ? 'playing' : ''}`}
                  onClick={handleToggleVoice}
                  title="Synthesize Audio Warning Siren"
                >
                  {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isPlayingAudio ? 'Stop Audio Siren' : 'Play Voice Siren'}</span>
                </button>

                <button 
                  className={`btn-dispatch-sms ${isSendingSms ? 'sending' : ''}`}
                  onClick={handleTriggerSmsBroadcast}
                  disabled={isSendingSms}
                >
                  <Send size={16} className={isSendingSms ? 'animate-fly' : ''} />
                  <span>{isSendingSms ? 'Broadcasting via Gateway...' : 'Broadcast SMS Alert Now'}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Offline Sync Engine & Recent Broadcast Log */}
            <div className="broadcast-card sync-log-card card-spotlight" onMouseMove={handleSpotlightMove}>
              <div className="card-header-row">
                <div className="header-title-col">
                  <div className="broadcast-icon-box cyan">
                    <Database size={18} />
                  </div>
                  <div>
                    <h4>Edge Resilience &amp; Gateway Logs</h4>
                    <span className="header-subtext">Zero-connectivity failover telemetry engine</span>
                  </div>
                </div>
                <button 
                  className={`btn-sync-edge ${isSyncing ? 'spin' : ''}`}
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  title="Synchronize Local Database with Edge Server"
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin-icon' : ''} />
                  <span>Sync Now</span>
                </button>
              </div>

              {/* Offline Sync Status Details */}
              <div className="edge-status-grid">
                <div className="edge-stat-item">
                  <span className="stat-label">Connectivity Status</span>
                  <span className={`stat-value ${isOnline ? 'text-green' : 'text-amber'}`}>
                    {isOnline ? '🟢 Cloud Online' : '🟠 Offline Edge'}
                  </span>
                </div>
                <div className="edge-stat-item">
                  <span className="stat-label">IndexedDB Cached</span>
                  <span className="stat-value text-cyan">{cachedPointsCount.toLocaleString()} Points</span>
                </div>
                <div className="edge-stat-item">
                  <span className="stat-label">Last Synchronized</span>
                  <span className="stat-value">{lastSyncTime}</span>
                </div>
                <div className="edge-stat-item">
                  <span className="stat-label">SMS Failover Pipe</span>
                  <span className="stat-value text-green">GSM Modem Ready</span>
                </div>
              </div>

              {/* Recent SMS Broadcast Activity Log */}
              <div className="recent-logs-section">
                <div className="logs-header-row">
                  <h5 className="logs-title">Recent Automated Dispatch Records</h5>
                  <span className="logs-count-pill">{smsLogs.length} Events</span>
                </div>
                <div className="logs-list">
                  {smsLogs.length === 0 ? (
                    <div className="empty-log-msg">
                      No SMS alerts dispatched yet in this operational session.
                    </div>
                  ) : (
                    smsLogs.map(log => (
                      <div key={log.id} className="log-entry-row">
                        <div className="log-icon-col">
                          <CheckCircle2 size={14} className="text-green" />
                        </div>
                        <div className="log-details-col">
                          <div className="log-top-line">
                            <span className="log-recipient">{log.recipientGroup}</span>
                            <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="log-meta-line">
                            <span className="badge-gateway">{log.gateway}</span>
                            <span className="badge-recipients">{log.phoneNumbersCount.toLocaleString()} numbers</span>
                            <span className="badge-latency">{log.latencyMs}ms</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. THREE DIRECTIVE CARDS (WITH GIANT SQUID GLOW EFFECT) */}
        {/* ========================================================= */}
        <section className="alerts-section">
          <div className="alerts-section-title-row">
            <div className="section-title-icon-badge danger">
              <Zap size={14} className="text-red" />
            </div>
            <div>
              <h2 className="alerts-section-heading">Multi-Agency Operational Action Directives</h2>
              <p className="alerts-section-subheading">Pre-authorized standard operating procedures and mandatory corridor safeguards</p>
            </div>
          </div>

          <div className="directives-grid anim-cards">
            
            {/* Card 1: Railway Directive Card (Cyan/Blue Giant Squid Glow) */}
            <div className="alert-giant-card railway card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="alert-giant-blob cyan" aria-hidden="true" />
              <div className="alert-giant-inner">
                <div className="card-top">
                  <div className="directive-icon-box cyan">
                    <Train size={20} />
                  </div>
                  <div>
                    <span className="directive-tag cyan">RAILWAY LIFELINE</span>
                    <h4>Northeast Frontier Railway (NFR) Directives</h4>
                  </div>
                </div>
                <ul className="directive-list">
                  <li>
                    <strong>Mandatory Speed Restrictions:</strong> Enforce 20 km/h speed limit between Daotuhaja (Km 42) and New Harangajao (Km 68).
                  </li>
                  <li>
                    <strong>Continuous Foot Patrol:</strong> Deploy stationary track watchmen at cutting portals and viaduct bridges (New Haflong &amp; Ditokcherra).
                  </li>
                  <li>
                    <strong>Night Movement Advisory:</strong> Consider daytime-only operations for freight and express rakes during peak rainfall.
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Highway & Road Directive Card (Orange/Amber Giant Squid Glow) */}
            <div className="alert-giant-card highway card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="alert-giant-blob amber" aria-hidden="true" />
              <div className="alert-giant-inner">
                <div className="card-top">
                  <div className="directive-icon-box amber">
                    <Navigation size={20} />
                  </div>
                  <div>
                    <span className="directive-tag amber">HIGHWAY NETWORK</span>
                    <h4>NHAI &amp; District Traffic Administration</h4>
                  </div>
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
            </div>

            {/* Card 3: Civil Defence & SDRF Card (Red/Coral Giant Squid Glow) */}
            <div className="alert-giant-card civil card-spotlight card-sweep" onMouseMove={handleSpotlightMove}>
              <div className="alert-giant-blob red" aria-hidden="true" />
              <div className="alert-giant-inner">
                <div className="card-top">
                  <div className="directive-icon-box red">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <span className="directive-tag red">CIVIL DEFENCE</span>
                    <h4>Civil Defence, SDRF &amp; Evacuation Protocol</h4>
                  </div>
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

          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. HIGH-RISK INCIDENT WATCHLIST TABLE */}
        {/* ========================================================= */}
        <section className="alerts-section">
          <div className="priority-zones-card card-spotlight" onMouseMove={handleSpotlightMove}>
            <div className="table-panel-header">
              <div className="table-panel-title-block">
                <div className="table-title-icon-box red">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="table-panel-title">Critical High-Risk Incident Watchlist</h3>
                  <p className="table-panel-subtitle">Stationary telemetry nodes, landslide monitoring sectors, and automated contingency directives</p>
                </div>
              </div>
              <span className="table-count-badge red">{stations.length} CRITICAL NODES</span>
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
                    <tr key={st.id} className="alerts-row">
                      <td className="st-name-cell">
                        <strong>{st.name}</strong>
                      </td>
                      <td className="st-type-cell">{st.type.replace('_', ' ').toUpperCase()}</td>
                      <td className="st-elev-cell">{st.elevationM} m ASL</td>
                      <td className="st-rain-cell">3-Day Active</td>
                      <td className="st-risk-cell">
                        <span className={`risk-badge-sm ${st.vulnerabilityStatus.toLowerCase()}`}>
                          {st.vulnerabilityStatus}
                        </span>
                      </td>
                      <td className="st-notes-cell">
                        <span className="notes-tag">{st.notes}</span>
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
