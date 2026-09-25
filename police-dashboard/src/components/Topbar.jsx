import React, { useState } from 'react';
import { Radio, RefreshCw, Bell, Search, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function Topbar({ onRefreshData }) {
  const [resetting, setResetting] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  async function handleResetDemoData() {
    if (confirm('Reset SafeX demo database to clean default state?')) {
      setResetting(true);
      try {
        await api.resetDemoDb();
        setNotificationMsg('Database reset to defaults.');
        if (onRefreshData) onRefreshData();
        setTimeout(() => setNotificationMsg(''), 4000);
      } catch (err) {
        alert('Failed to reset: ' + err.message);
      } finally {
        setResetting(false);
      }
    }
  }

  return (
    <header className="topbar">
      {/* Left: Status & Jurisdiction */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(6, 182, 212, 0.08)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
          <span className="beacon-dot safe"></span>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-accent)' }}>
            GRID ACTIVE • 24x7 TELEMETRY
          </span>
        </div>
        <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Sector:</strong> Shillong Tourist Safety Network
        </div>
      </div>

      {/* Right: Quick actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {notificationMsg && (
          <div style={{ fontSize: '0.8rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            {notificationMsg}
          </div>
        )}

        <button
          id="btn-topbar-reset-demo"
          onClick={handleResetDemoData}
          disabled={resetting}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '7px 12px' }}
          title="Reset demo tourists and incidents to fresh state"
        >
          <RefreshCw size={14} className={resetting ? 'spin' : ''} />
          <span>{resetting ? 'Resetting...' : 'Reset Demo Data'}</span>
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)'
        }}>
          <span className="beacon-dot danger"></span>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#F87171' }}>
            1 SOS ACTIVE
          </span>
        </div>
      </div>
    </header>
  );
}
