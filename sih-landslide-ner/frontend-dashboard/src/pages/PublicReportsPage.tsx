import React, { useState, useEffect, useCallback } from 'react';
import type { PublicReport } from '../types/landslide';
import { fetchPublicReports, verifyPublicReport, deletePublicReport, getReportMediaUrl } from '../services/apiService';
import {
  Camera,
  Video,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  ExternalLink,
  RefreshCw,
  Filter,
  ShieldCheck,
  Search,
  Eye,
  X,
  Smartphone,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import './PublicReportsPage.css';

export const PublicReportsPage: React.FC = () => {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [spammingId, setSpammingId] = useState<number | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNVERIFIED' | 'VERIFIED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [enlargedMedia, setEnlargedMedia] = useState<{ url: string; type: 'PHOTO' | 'VIDEO'; title: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadReports = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await fetchPublicReports();
      setReports(data);
    } catch (err) {
      console.error('Error fetching public reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    // Auto-poll every 30 seconds for live incoming reports
    const interval = setInterval(() => loadReports(true), 30000);
    return () => clearInterval(interval);
  }, [loadReports]);

  const handleVerify = async (reportId: number) => {
    setVerifyingId(reportId);
    try {
      const updated = await verifyPublicReport(reportId);
      // Update report in-place in local state
      setReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, verified: true, verifiedAt: updated.verifiedAt, verifiedBy: updated.verifiedBy } : r))
      );
      setStatusMessage(`Report #${reportId} successfully verified! Verification status recorded.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Could not verify report: ${err.message || err}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSpam = async (reportId: number) => {
    if (!window.confirm(`Mark report #${reportId} as SPAM / False Observation? The image and report will be removed completely.`)) {
      return;
    }
    setSpammingId(reportId);
    try {
      await deletePublicReport(reportId);
      // Completely remove from visible list immediately
      setReports(prev => prev.filter(r => r.id !== reportId));
      setStatusMessage(`Report #${reportId} flagged as spam and permanently removed.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setReports(prev => prev.filter(r => r.id !== reportId));
    } finally {
      setSpammingId(null);
    }
  };

  const handleCopyCoords = (id: number, lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getCategoryBadgeClass = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('crack')) return 'cat-crack';
    if (c.includes('slope') || c.includes('movement')) return 'cat-slope';
    if (c.includes('road') || c.includes('blocked')) return 'cat-road';
    return 'cat-other';
  };

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('crack')) return '🪨';
    if (c.includes('slope') || c.includes('movement')) return '⛰️';
    if (c.includes('road') || c.includes('blocked')) return '🚧';
    return '📍';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    // Category filter
    if (activeCategoryFilter !== 'ALL' && r.category !== activeCategoryFilter) {
      return false;
    }
    // Verification filter
    if (statusFilter === 'UNVERIFIED' && r.verified) return false;
    if (statusFilter === 'VERIFIED' && !r.verified) return false;
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLoc = (r.locationName || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      const matchCat = (r.category || '').toLowerCase().includes(q);
      return matchLoc || matchDesc || matchCat;
    }
    return true;
  });

  const unverifiedCount = reports.filter(r => !r.verified).length;
  const verifiedCount = reports.filter(r => r.verified).length;

  return (
    <div className="public-reports-page">
      {/* Top Header Banner */}
      <div className="public-reports-header">
        <div className="header-title-area">
          <div className="header-icon-wrap">
            <Smartphone size={24} className="text-teal" />
          </div>
          <div>
            <div className="header-subtitle">CITIZEN & FIELD OBSERVATIONS</div>
            <h1 className="header-title">Public Reports & Geo-Tagged Media</h1>
          </div>
        </div>

        {/* Live Counters & Refresh */}
        <div className="header-right-meta">
          <div className="meta-stat-pill">
            <span className="pill-lbl">Total Reports:</span>
            <span className="pill-val">{reports.length}</span>
          </div>

          <div className="meta-stat-pill pending-pill">
            <span className="pill-lbl">Crowd-Sourced:</span>
            <span className="pill-val text-amber">{unverifiedCount}</span>
          </div>

          <div className="meta-stat-pill verified-pill">
            <span className="pill-lbl">Verified:</span>
            <span className="pill-val text-green">{verifiedCount}</span>
          </div>

          <button
            className={`btn-refresh-reports ${refreshing ? 'spin' : ''}`}
            onClick={() => loadReports(true)}
            disabled={refreshing}
            title="Refresh public reports from backend database"
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="success-toast-banner">
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Filter & Control Bar */}
      <div className="reports-filter-bar">
        <div className="filter-group">
          <span className="filter-label">
            <Filter size={13} /> Category:
          </span>
          <div className="filter-chips">
            {['ALL', 'Crack', 'Slope Movement', 'Blocked Road', 'Other'].map(cat => (
              <button
                key={cat}
                className={`filter-chip ${activeCategoryFilter === cat ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(cat)}
              >
                {cat === 'ALL' ? 'All Observations' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group right-group">
          <div className="status-toggle-group">
            <button
              className={`status-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({reports.length})
            </button>
            <button
              className={`status-btn ${statusFilter === 'UNVERIFIED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('UNVERIFIED')}
            >
              Crowd-Sourced ({unverifiedCount})
            </button>
            <button
              className={`status-btn ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('VERIFIED')}
            >
              Verified ({verifiedCount})
            </button>
          </div>

          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search location or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Content Viewport */}
      {loading ? (
        <div className="reports-loading-state">
          <div className="spinner" />
          <p>Retrieving real geo-tagged citizen observations from backend database...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="reports-empty-state">
          <div className="empty-icon-wrap">
            <Camera size={40} className="text-muted" />
          </div>
          <h3>No Public Reports Found</h3>
          <p>
            {searchQuery || activeCategoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No reports matched your selected filters. Try clearing filter criteria.'
              : 'Citizens and field officials can capture and upload real geo-tagged photos and videos directly from the Bhoomi Rakshak Mobile App.'}
          </p>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map(report => {
            const mediaSrc = getReportMediaUrl(report.mediaUrl);
            const isVideo = report.mediaType === 'VIDEO';

            return (
              <div
                key={report.id}
                className={`report-card ${report.verified ? 'is-verified' : 'is-unverified'}`}
              >
                {/* Card Media Preview */}
                <div className="card-media-wrapper">
                  {isVideo ? (
                    <div className="video-player-container">
                      <video
                        src={mediaSrc}
                        controls
                        preload="metadata"
                        className="report-video-element"
                      />
                      <span className="media-type-badge video-badge">
                        <Video size={11} /> VIDEO
                      </span>
                    </div>
                  ) : (
                    <div
                      className="image-preview-container"
                      onClick={() =>
                        setEnlargedMedia({
                          url: mediaSrc,
                          type: 'PHOTO',
                          title: `${report.category} at ${report.locationName || 'Location'}`
                        })
                      }
                    >
                      <img
                        src={mediaSrc}
                        alt={report.category}
                        className="report-img-element"
                        loading="lazy"
                        onError={e => {
                          // Fallback placeholder if image load fails
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%231e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-family="sans-serif" font-size="14">Media loading or unavailable</text></svg>';
                        }}
                      />
                      <div className="image-hover-overlay">
                        <Eye size={18} />
                        <span>Enlarge Photo</span>
                      </div>
                      <span className="media-type-badge photo-badge">
                        <Camera size={11} /> PHOTO
                      </span>
                    </div>
                  )}

                  {/* Category Pill floating on media */}
                  <div className={`card-category-pill ${getCategoryBadgeClass(report.category)}`}>
                    <span>{getCategoryIcon(report.category)}</span>
                    <span>{report.category}</span>
                  </div>
                </div>

                {/* Card Details Body */}
                <div className="card-body">
                  {/* Status Banner */}
                  <div className="card-status-row">
                    {!report.verified ? (
                      <span className="badge-crowdsourced" title="Submitted by citizen/field scout. Pending authority review.">
                        <AlertTriangle size={12} /> CROWD-SOURCED
                      </span>
                    ) : (
                      <span className="badge-verified" title={`Verified by ${report.verifiedBy || 'Authority'}`}>
                        <CheckCircle2 size={12} /> VERIFIED
                      </span>
                    )}

                    <span className="report-id-tag">#{report.id}</span>
                  </div>

                  {/* Location & Coordinates */}
                  <div className="card-location-block">
                    <div className="location-name">
                      <MapPin size={14} className="text-teal pin-icon" />
                      <span title={report.locationName}>{report.locationName || 'Dima Hasao Sector'}</span>
                    </div>

                    <div className="coordinates-row">
                      <span className="coords-text">
                        {report.latitude.toFixed(5)}° N, {report.longitude.toFixed(5)}° E
                      </span>
                      <button
                        className="btn-copy-coords"
                        onClick={() => handleCopyCoords(report.id, report.latitude, report.longitude)}
                        title="Copy GPS Coordinates"
                      >
                        {copiedId === report.id ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                      </button>
                      <a
                        href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-map-link"
                        title="Open in Google Maps"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Notes / Description */}
                  {report.description ? (
                    <div className="card-notes-block">
                      <p className="report-notes">"{report.description}"</p>
                    </div>
                  ) : null}

                  {/* Card Meta Timestamp & Submitter */}
                  <div className="card-meta-row">
                    <div className="timestamp">
                      <Clock size={12} />
                      <span>{formatDate(report.createdAt)}</span>
                    </div>
                    {report.uploaderPhone && (
                      <span className="uploader-meta">Scout: {report.uploaderPhone.slice(-4).padStart(report.uploaderPhone.length, '*')}</span>
                    )}
                  </div>

                  {/* Verification & Spam Action Buttons */}
                  <div className="card-action-block">
                    {!report.verified ? (
                      <button
                        className="btn-verify-action"
                        onClick={() => handleVerify(report.id)}
                        disabled={verifyingId === report.id || spammingId === report.id}
                        title="Mark observation as officially verified"
                      >
                        {verifyingId === report.id ? (
                          <>
                            <RefreshCw size={13} className="spin-icon" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} />
                            <span>[ VERIFIED ]</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="card-verified-footer">
                        <span className="verified-footer-text">
                          <CheckCircle2 size={13} className="text-green" /> Verified
                        </span>
                      </div>
                    )}

                    <button
                      className="btn-spam-action"
                      onClick={() => handleSpam(report.id)}
                      disabled={spammingId === report.id || verifyingId === report.id}
                      title="Mark as SPAM or False report (removes immediately)"
                    >
                      {spammingId === report.id ? (
                        <>
                          <RefreshCw size={13} className="spin-icon" />
                          <span>Removing...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={13} />
                          <span>[ SPAM ]</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Modal for Enlarged Media */}
      {enlargedMedia && (
        <div className="media-lightbox-backdrop" onClick={() => setEnlargedMedia(null)}>
          <div className="media-lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header">
              <h4>{enlargedMedia.title}</h4>
              <button className="lightbox-close-btn" onClick={() => setEnlargedMedia(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="lightbox-body">
              <img src={enlargedMedia.url} alt="Enlarged Report" className="lightbox-img" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
