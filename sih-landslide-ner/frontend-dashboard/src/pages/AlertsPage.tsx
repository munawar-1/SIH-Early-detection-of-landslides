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
  Users
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
      window.speechSynthesis.cancel(); // Stop any pending
      const utterance = new SpeechSynthesisUtterance(currentMsg.speech);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Assign appropriate lang code if supported
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

    try {
      await Promise.allSettled([
        fetch('http://localhost:8080/api/alerts/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: broadcastPayload }),
        fetch('http://localhost:8000/api/alerts/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: broadcastPayload }),
        fetch('http://192.168.1.13:8080/api/alerts/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: broadcastPayload }),
        fetch('http://192.168.1.13:8000/api/alerts/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: broadcastPayload }),
      ]);
    } catch (apiErr) {
      console.warn('Backend broadcast dispatch note:', apiErr);
    }

    // Simulate SMS gateway API dispatch & UI update
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
      {/* Header */}
      <div className="page-header-bar">
        <div className="header-info">
          <div className="icon-badge danger">
            <BellRing size={20} className="text-red" />
          </div>
          <div>
            <h2 className="page-title">Early Warning & Evacuation Directives</h2>
            <p className="page-subtitle">
              Automated SMS broadcast, multilingual alerts, and offline-synchronized disaster governance for NER
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
            <span className={`sync-status-pill ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'Cloud Sync Active' : 'Offline Edge Cache'}
            </span>
          </div>
          <h3 className="banner-title">
            Severe Slope Destabilization & Debris Flow Risk Detected in Borail Mountain Corridor
          </h3>
          <p className="banner-desc">
            High cumulative precipitation combined with slope angles exceeding 38° has heightened the risk of rotational landslides along the <strong>Lumding–Badarpur Hill Section (Daotuhaja – Mahur – New Haflong)</strong> and <strong>NH-27 Jatinga Pass</strong>.
          </p>
        </div>
      </div>

      {/* NEW: Automated SMS & Multilingual Broadcast Hub */}
      <div className="broadcast-hub-section">
        <div className="broadcast-hub-grid">
          
          {/* Left Column: Multilingual Alert Composer & SMS Trigger */}
          <div className="broadcast-card composer-card">
            <div className="card-header-row">
              <div className="header-title-col">
                <Radio size={18} className="text-red" />
                <h4>Automated SMS Early Warning Dispatcher</h4>
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
                <option value="railway_control">🚂 NFR Lumding Hill Section (Station Masters & Loco Pilots) - 86 Contacts</option>
                <option value="village_heads">🏘️ Hillside Village Panchayats & Gaon Burhas - 128 Villages</option>
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
                {isPlayingAudio ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isPlayingAudio ? 'Stop Audio Siren' : 'Play Voice Siren'}</span>
              </button>

              <button 
                className={`btn-dispatch-sms ${isSendingSms ? 'sending' : ''}`}
                onClick={handleTriggerSmsBroadcast}
                disabled={isSendingSms}
              >
                <Send size={15} className={isSendingSms ? 'animate-fly' : ''} />
                <span>{isSendingSms ? 'Broadcasting via Gateway...' : 'Broadcast SMS Alert Now'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Offline Sync Engine & Recent Broadcast Log */}
          <div className="broadcast-card sync-log-card">
            <div className="card-header-row">
              <div className="header-title-col">
                <Database size={18} className="text-cyan" />
                <h4>Edge Resilience & Gateway Logs</h4>
              </div>
              <button 
                className={`btn-sync-edge ${isSyncing ? 'spin' : ''}`}
                onClick={handleForceSync}
                disabled={isSyncing}
                title="Synchronize Local Database with Edge Server"
              >
                <RefreshCw size={12} className={isSyncing ? 'spin-icon' : ''} />
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
              <h5 className="logs-title">Recent Automated Dispatch Records</h5>
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
