import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle,
  Truck,
  FileCheck,
  RefreshCw,
  ExternalLink,
  MapPin,
  MessageSquare
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

export default function EmergencyDesk({ setActiveTab }) {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState('');
  const [assignOfficerName, setAssignOfficerName] = useState('Inspector Vikram Joshi (SHL-POL-402)');

  async function loadEmergencies() {
    try {
      const res = await api.getEmergencyQueue();
      if (res.success) {
        setEmergencies(res.data);
      }
    } catch (err) {
      console.error('Failed to load emergencies:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmergencies();
    const interval = setInterval(loadEmergencies, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleAcknowledge(id) {
    setActionLoading(true);
    try {
      const res = await api.acknowledgeEmergency(id);
      if (res.success) {
        setSelectedEmergency(res.data);
        await loadEmergencies();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssign(id) {
    setActionLoading(true);
    try {
      const res = await api.assignResponder(id, 'SHL-POL-402', assignOfficerName);
      if (res.success) {
        setSelectedEmergency(res.data);
        await loadEmergencies();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStart(id) {
    setActionLoading(true);
    try {
      const res = await api.startResponse(id);
      if (res.success) {
        setSelectedEmergency(res.data);
        await loadEmergencies();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve(id) {
    if (!resolveRemarks.trim()) {
      alert('Please enter resolution remarks before closing the case.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.resolveEmergency(id, resolveRemarks);
      if (res.success) {
        setSelectedEmergency(res.data);
        setResolveRemarks('');
        await loadEmergencies();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Summary counts
  const newCount = emergencies.filter(e => e.status === 'NEW').length;
  const ackCount = emergencies.filter(e => e.status === 'ACKNOWLEDGED').length;
  const assignedCount = emergencies.filter(e => e.status === 'RESPONDER_ASSIGNED').length;
  const inProgressCount = emergencies.filter(e => e.status === 'IN_PROGRESS').length;
  const criticalCount = emergencies.filter(e => e.severity === 'CRITICAL' && e.status !== 'RESOLVED' && e.status !== 'CANCELLED').length;

  const statusCards = [
    { label: 'NEW ALERTS', count: newCount, color: 'var(--color-danger)', icon: AlertTriangle },
    { label: 'ACKNOWLEDGED', count: ackCount, color: 'var(--color-warning)', icon: UserCheck },
    { label: 'RESPONDER ASSIGNED', count: assignedCount, color: 'var(--color-police)', icon: Truck },
    { label: 'IN PROGRESS', count: inProgressCount, color: 'var(--color-accent)', icon: Clock },
    { label: 'CRITICAL CASES', count: criticalCount, color: '#DC2626', icon: ShieldAlert }
  ];

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Emergency Response & SOS Command Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Active SOS dispatch queue, responder assignment, and real-time case resolution.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-refresh-emergencies"
            onClick={loadEmergencies}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Emergency Status Counters */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {statusCards.map((sc, i) => {
          const Icon = sc.icon;
          return (
            <div key={i} className="stat-card">
              <div className="stat-header">
                <span className="stat-title" style={{ fontSize: '0.78rem' }}>{sc.label}</span>
                <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)' }}>
                  <Icon size={18} color={sc.color} />
                </div>
              </div>
              <div className="stat-value" style={{ color: sc.count > 0 ? sc.color : 'var(--text-secondary)' }}>
                {sc.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergencies Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Active Emergency Queue</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Polling every 5s • Auto-prioritized by severity
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Emergency ID</th>
                <th>Tourist</th>
                <th>Tourist ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Created</th>
                <th>Assigned Officer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {emergencies.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No emergency SOS cases reported. All tourist sectors clear.
                  </td>
                </tr>
              ) : (
                emergencies.map(emg => {
                  let badgeClass = 'badge-danger';
                  if (emg.status === 'ACKNOWLEDGED') badgeClass = 'badge-warning';
                  if (emg.status === 'RESPONDER_ASSIGNED') badgeClass = 'badge-police';
                  if (emg.status === 'IN_PROGRESS') badgeClass = 'badge-info';
                  if (emg.status === 'RESOLVED') badgeClass = 'badge-safe';

                  return (
                    <tr key={emg.id} style={{ background: emg.status === 'NEW' ? 'rgba(239, 68, 68, 0.08)' : undefined }}>
                      <td>
                        <span className="id-tag">{emg.emergencyId}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{emg.touristName}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {emg.touristId}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', fontSize: '0.8rem' }}>{emg.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${emg.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                          {emg.severity}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {emg.latitude?.toFixed(4)}, {emg.longitude?.toFixed(4)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {emg.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {timeAgo(emg.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: emg.assignedOfficerName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {emg.assignedOfficerName || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <button
                          id={`btn-view-${emg.emergencyId}`}
                          onClick={() => setSelectedEmergency(emg)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Detail & Status Workflow Modal */}
      {selectedEmergency && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '680px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="id-tag" style={{ fontSize: '1rem' }}>{selectedEmergency.emergencyId}</span>
                <span className={`badge ${selectedEmergency.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                  {selectedEmergency.severity} SEVERITY
                </span>
                <span className="badge badge-info">{selectedEmergency.status}</span>
              </div>
              <button
                onClick={() => setSelectedEmergency(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
              {selectedEmergency.type} Emergency • {selectedEmergency.touristName}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Tourist ID: {selectedEmergency.touristId} • Filed {timeAgo(selectedEmergency.createdAt)}
            </p>

            {/* Tourist message */}
            {selectedEmergency.touristMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px'
              }}>
                <MessageSquare size={18} color="#F87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#FCA5A5', textTransform: 'uppercase' }}>
                    Tourist Distress Message
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#F8FAFC', marginTop: '2px' }}>
                    "{selectedEmergency.touristMessage}"
                  </div>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>GPS Coordinates: </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                  {selectedEmergency.latitude?.toFixed(5)}° N, {selectedEmergency.longitude?.toFixed(5)}° E
                </span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>GPS Accuracy: </span>
                <span>{selectedEmergency.accuracy || 10} meters</span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Officer: </span>
                <span style={{ fontWeight: '600' }}>{selectedEmergency.assignedOfficerName || 'Not Assigned'}</span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tracking Rate: </span>
                <span style={{ color: '#F87171', fontWeight: '700' }}>30-second Emergency Ping</span>
              </div>
              {selectedEmergency.resolutionRemarks && (
                <div style={{ gridColumn: '1 / -1', fontSize: '0.85rem', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Resolution Remarks: </span>
                  <span style={{ color: '#34D399' }}>{selectedEmergency.resolutionRemarks}</span>
                </div>
              )}
            </div>

            {/* Workflow Action Buttons (Strictly according to current status) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Police Operational Workflow
              </div>

              {selectedEmergency.status === 'NEW' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    id="btn-emg-acknowledge"
                    onClick={() => handleAcknowledge(selectedEmergency.id)}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <UserCheck size={16} />
                    <span>Acknowledge Emergency Dispatch</span>
                  </button>
                </div>
              )}

              {selectedEmergency.status === 'ACKNOWLEDGED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={assignOfficerName}
                      onChange={(e) => setAssignOfficerName(e.target.value)}
                      placeholder="Officer Name / Badge"
                      style={{ flex: 1 }}
                    />
                    <button
                      id="btn-emg-assign"
                      onClick={() => handleAssign(selectedEmergency.id)}
                      disabled={actionLoading}
                      className="btn btn-primary"
                    >
                      <Truck size={16} />
                      <span>Assign Quick Response Team</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedEmergency.status === 'RESPONDER_ASSIGNED' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    id="btn-emg-start"
                    onClick={() => handleStart(selectedEmergency.id)}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <Clock size={16} />
                    <span>Start Tactical Response (Mark In-Progress)</span>
                  </button>
                </div>
              )}

              {selectedEmergency.status === 'IN_PROGRESS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    id="input-resolve-remarks"
                    type="text"
                    className="form-input"
                    placeholder="Enter official resolution remarks (e.g. Tourist safely evacuated)"
                    value={resolveRemarks}
                    onChange={(e) => setResolveRemarks(e.target.value)}
                  />
                  <button
                    id="btn-emg-resolve"
                    onClick={() => handleResolve(selectedEmergency.id)}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    <CheckCircle size={16} />
                    <span>Resolve Emergency Case</span>
                  </button>
                </div>
              )}

              {selectedEmergency.status === 'RESOLVED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34D399', fontSize: '0.9rem' }}>
                  <CheckCircle size={20} />
                  <span>This case has been resolved and officially recorded in the audit log.</span>
                </div>
              )}

              {selectedEmergency.status === 'CANCELLED' && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  This emergency was cancelled by the tourist.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedEmergency(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedEmergency(null);
                  setActiveTab('map');
                }}
                className="btn btn-outline"
              >
                <MapPin size={16} />
                <span>Track on Map</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
