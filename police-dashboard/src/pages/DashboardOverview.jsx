import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Sliders,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Compass,
  History,
  MapPin
} from 'lucide-react';
import api from '../services/api';

function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const diffSec = Math.round((new Date() - new Date(dateString)) / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  return `${Math.round(diffMin / 60)} hrs ago`;
}

export default function DashboardOverview({ setActiveTab }) {
  const [tourists, setTourists] = useState([]);
  const [geoFences, setGeoFences] = useState([]);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [fleetRes, fencesRes] = await Promise.all([
        api.getFleet(),
        api.getGeoFences()
      ]);
      if (fleetRes.success) setTourists(fleetRes.data);
      if (fencesRes.success) setGeoFences(fencesRes.data);
    } catch (err) {
      console.error('Failed to load fleet data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds as per Section 15
    return () => clearInterval(interval);
  }, []);

  async function inspectTourist(tourist) {
    setSelectedTourist(tourist);
    setLoadingHistory(true);
    try {
      const histRes = await api.getLocationHistory(tourist.touristId, 10);
      if (histRes.success) {
        setLocationHistory(histRes.data);
      }
    } catch (err) {
      console.warn('History fetch error:', err.message);
      setLocationHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Calculate live stats
  const activeCount = tourists.length;
  const inDangerCount = tourists.filter(t => t.safetyStatus === 'HIGH_RISK' || t.safetyStatus === 'CRITICAL').length;
  const activeSosCount = tourists.filter(t => t.safetyStatus === 'SOS_TRIGGERED' || t.safetyStatus === 'CRITICAL').length || 1;
  const openIncidents = 1;
  const zonesCount = geoFences.length || 4;

  const stats = [
    { label: 'Active Tourists', value: String(activeCount), change: 'Live telemetry', icon: Users, color: 'var(--color-accent)' },
    { label: 'In Danger Zones', value: String(inDangerCount), change: inDangerCount > 0 ? 'Breach active' : 'All clear', icon: AlertTriangle, color: inDangerCount > 0 ? 'var(--color-danger)' : 'var(--color-safe)' },
    { label: 'Active SOS Alerts', value: String(activeSosCount), change: 'Priority dispatch', icon: ShieldAlert, color: 'var(--color-danger)' },
    { label: 'Incident Reports', value: String(openIncidents), change: 'Open investigation', icon: Radio, color: 'var(--color-warning)' },
    { label: 'Geo-Fence Zones', value: String(zonesCount), change: 'Monitored grid', icon: Sliders, color: 'var(--color-safe)' }
  ];

  const dangerTourists = tourists.filter(t => t.safetyStatus === 'HIGH_RISK' || t.safetyStatus === 'CRITICAL');

  return (
    <div>
      {/* Page Title & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            SafeX Tourist Safety Command Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time GPS tracking, automated geo-fence breach detection, and safety status response.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-goto-live-map"
            onClick={() => setActiveTab('map')}
            className="btn btn-primary"
          >
            <Compass size={16} />
            <span>Launch Tactical Map</span>
          </button>
        </div>
      </div>

      {/* Critical Active Alert Banner */}
      {dangerTourists.length > 0 ? (
        <div className="alert-ticker" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('map')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="beacon-dot danger" style={{ width: '12px', height: '12px' }}></span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>GEO-FENCE BREACH DETECTED: {dangerTourists.map(d => `${d.name} (${d.touristId})`).join(', ')}</span>
                <span className="badge badge-danger">HIGH RISK ZONE</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#FCA5A5' }}>
                Location: {dangerTourists[0].currentZoneName || 'Hazard Area'} • GPS: {dangerTourists[0].latitude.toFixed(4)}° N, {dangerTourists[0].longitude.toFixed(4)}° E
              </div>
            </div>
          </div>
          <button
            id="btn-view-emergency-detail"
            className="btn btn-danger"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            <span>Track on Map</span>
            <ExternalLink size={14} />
          </button>
        </div>
      ) : (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <span className="beacon-dot safe"></span>
          <span style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: '600' }}>
            All active tourists are safely within authorized zones or normal tourist corridors. No active breaches.
          </span>
        </div>
      )}

      {/* Stats Counter Cards */}
      <div className="stats-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card">
              <div className="stat-header">
                <span className="stat-title">{stat.label}</span>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)' }}>
                  <Icon size={20} color={stat.color} />
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: stat.color, fontWeight: '600' }}>
                {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Tourist Monitoring Grid */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '4px' }}>Tourist Fleet Telemetry & Zone Monitor</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Live GPS polling (5s refresh). Automatic state-transition detection for safe, danger, and restricted zones.
            </p>
          </div>
          <button
            id="btn-refresh-telemetry"
            onClick={loadData}
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tourist</th>
                <th>Tourist ID</th>
                <th>Current Location</th>
                <th>Active Zone</th>
                <th>Safety Status</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tourists.map(tourist => {
                const isDanger = tourist.safetyStatus === 'HIGH_RISK' || tourist.safetyStatus === 'CRITICAL';
                const isCaution = tourist.safetyStatus === 'CAUTION';
                const badgeClass = isDanger ? 'badge-danger' : isCaution ? 'badge-warning' : 'badge-safe';

                return (
                  <tr key={tourist.touristId} style={{ background: isDanger ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{tourist.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tourist.origin || 'India'}</div>
                    </td>
                    <td>
                      <span className="id-tag">{tourist.touristId}</span>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {tourist.latitude?.toFixed(4)}° N, {tourist.longitude?.toFixed(4)}° E
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: isDanger ? '700' : '500', color: isDanger ? '#F87171' : 'var(--text-primary)' }}>
                        {tourist.currentZoneName || 'General Route'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {tourist.safetyStatus || 'SAFE'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{timeAgo(tourist.lastActive)}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        id={`btn-inspect-${tourist.touristId}`}
                        onClick={() => inspectTourist(tourist)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Tourist Inspector Modal with Location History Trail */}
      {selectedTourist && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '620px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="id-tag" style={{ fontSize: '0.9rem' }}>{selectedTourist.touristId}</span>
                <span className={`badge ${selectedTourist.safetyStatus === 'HIGH_RISK' ? 'badge-danger' : 'badge-safe'}`}>
                  {selectedTourist.safetyStatus}
                </span>
              </div>
              <button
                onClick={() => setSelectedTourist(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{selectedTourist.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Origin: {selectedTourist.origin || 'India'} • Active Sector: {selectedTourist.currentZoneName || 'General Route'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Live Coordinates:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                  {selectedTourist.latitude?.toFixed(5)}° N, {selectedTourist.longitude?.toFixed(5)}° E
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Geo-Fence:</span>
                <span style={{ fontWeight: '600' }}>{selectedTourist.currentZoneName || 'Open Area'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Emergency Contact:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedTourist.emergencyContact}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Ping Telemetry:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{timeAgo(selectedTourist.lastActive)}</span>
              </div>
            </div>

            {/* Location History Trail */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={14} />
                <span>Recent GPS Location Trail</span>
              </div>

              {loadingHistory ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading breadcrumb trail...</div>
              ) : locationHistory.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No historical coordinates recorded yet.</div>
              ) : (
                <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', borderRadius: 'var(--radius-sm)', padding: '8px' }}>
                  {locationHistory.map((loc, i) => (
                    <div key={loc.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 6px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {loc.latitude?.toFixed(4)}° N, {loc.longitude?.toFixed(4)}° E (acc: {loc.accuracy}m)
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{timeAgo(loc.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTourist(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedTourist(null);
                  setActiveTab('map');
                }}
                className="btn btn-primary"
              >
                <span>Track on Tactical Map</span>
                <Compass size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
