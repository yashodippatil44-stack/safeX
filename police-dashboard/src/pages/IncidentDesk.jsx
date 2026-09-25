import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, FileText, CheckCircle, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
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

export default function IncidentDesk() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [statusRemarks, setStatusRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadIncidents() {
    try {
      const res = await api.getIncidents();
      if (res.success) {
        setIncidents(res.data);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 6000);
    return () => clearInterval(interval);
  }, []);

  async function updateStatus(newStatus) {
    if (!selectedIncident) return;
    setActionLoading(true);
    try {
      const res = await api.updateIncidentStatus(selectedIncident.id, newStatus, statusRemarks);
      if (res.success) {
        setSelectedIncident(res.data);
        setStatusRemarks('');
        await loadIncidents();
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'VERIFIED':
        return <span className="badge badge-safe">VERIFIED</span>;
      case 'UNDER_REVIEW':
        return <span className="badge badge-warning">UNDER REVIEW</span>;
      case 'RESOLVED':
        return <span className="badge badge-safe">RESOLVED</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">REJECTED</span>;
      case 'REPORTED':
      default:
        return <span className="badge badge-police">REPORTED</span>;
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Incident Desk & Citizen Reports
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review tourist reports (Theft, Harassment, Fraud, Accidents) and coordinate investigations.
          </p>
        </div>
        <button
          id="btn-refresh-incidents"
          onClick={loadIncidents}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Desk</span>
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Tourist</th>
                <th>Category</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Coordinates</th>
                <th>Status</th>
                <th>Filed</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No incident reports on file.
                  </td>
                </tr>
              ) : (
                incidents.map(inc => (
                  <tr key={inc.id}>
                    <td>
                      <span className="id-tag">{inc.incidentId}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{inc.touristName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inc.touristId}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', fontSize: '0.8rem' }}>{inc.type}</span>
                    </td>
                    <td>
                      <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {inc.description}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${inc.severity === 'HIGH' || inc.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {inc.latitude?.toFixed(4)}, {inc.longitude?.toFixed(4)}
                      </span>
                    </td>
                    <td>{getStatusBadge(inc.status)}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{timeAgo(inc.createdAt)}</span>
                    </td>
                    <td>
                      <button
                        id={`btn-review-${inc.incidentId}`}
                        onClick={() => setSelectedIncident(inc)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedIncident && (
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
          <div className="glass-panel-elevated" style={{ width: '100%', maxWidth: '600px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="id-tag">{selectedIncident.incidentId}</span>
                {getStatusBadge(selectedIncident.status)}
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>
              {selectedIncident.type} Report • {selectedIncident.touristName}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Filed {timeAgo(selectedIncident.createdAt)} • Tourist ID: {selectedIncident.touristId}
            </p>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px' }}>
                Full Description
              </div>
              <div style={{ fontSize: '0.9rem', color: '#F8FAFC' }}>
                {selectedIncident.description}
              </div>
            </div>

            {selectedIncident.authorityRemarks && (
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>
                <strong>Authority Remarks:</strong> {selectedIncident.authorityRemarks}
                {selectedIncident.verifiedBy && <div><small>Verified by: {selectedIncident.verifiedBy}</small></div>}
              </div>
            )}

            {/* Actions for Police */}
            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ marginBottom: '6px' }}>Authority Remarks / Evidence Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter verification notes or investigation remarks..."
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <button
                id="btn-inc-verify"
                onClick={() => updateStatus('VERIFIED')}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                <CheckCircle size={14} />
                <span>Mark Verified</span>
              </button>

              <button
                id="btn-inc-under-review"
                onClick={() => updateStatus('UNDER_REVIEW')}
                disabled={actionLoading}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <Clock size={14} />
                <span>Under Review</span>
              </button>

              <button
                id="btn-inc-resolve"
                onClick={() => updateStatus('RESOLVED')}
                disabled={actionLoading}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', color: '#34D399' }}
              >
                <CheckCircle size={14} />
                <span>Resolve</span>
              </button>

              <button
                id="btn-inc-reject"
                onClick={() => updateStatus('REJECTED')}
                disabled={actionLoading}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', color: '#F87171' }}
              >
                <XCircle size={14} />
                <span>Reject</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedIncident(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
