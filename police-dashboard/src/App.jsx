import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardOverview from './pages/DashboardOverview';
import { ShieldCheck, MapPin, Users, AlertTriangle, Radio, FileText, Sliders, Award } from 'lucide-react';

import LiveMap from './components/LiveMap';
import EmergencyDesk from './pages/EmergencyDesk';
import IncidentDesk from './pages/IncidentDesk';

function DashboardShell() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070B14' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="beacon-dot danger" style={{ width: '16px', height: '16px', marginBottom: '16px' }}></div>
          <div style={{ color: 'var(--color-accent)', fontWeight: '600' }}>Initializing SafeX Command Telemetry...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  function renderContent() {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview setActiveTab={setActiveTab} />;

      case 'map':
        return <LiveMap setActiveTab={setActiveTab} />;

      case 'tourists':
        return (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <Users size={48} color="var(--color-police)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Tourist Monitoring & Digital ID Directory</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
              Detailed directory of registered tourists with identity records, emergency contacts, real-time location histories, and risk trajectories.
            </p>
            <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">
              Back to Overview
            </button>
          </div>
        );

      case 'emergencies':
        return <EmergencyDesk setActiveTab={setActiveTab} />;

      case 'incidents':
        return <IncidentDesk />;

      case 'efir':
        return (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <FileText size={48} color="var(--color-accent)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Electronic First Information Report (E-FIR)</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
              Official review and endorsement pipeline for tourist E-FIR requests with digital stamp and status tracking.
            </p>
            <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">
              Back to Overview
            </button>
          </div>
        );

      case 'geofences':
        return (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <Sliders size={48} color="var(--color-safe)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Geo-Fence Boundary Administration</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
              Define, customize, and adjust coordinates, radii, and risk tiers for protected ecological sanctuaries and hazardous cliffs.
            </p>
            <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">
              Back to Overview
            </button>
          </div>
        );

      case 'verification':
        return (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <ShieldCheck size={48} color="var(--color-safe)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Hyperledger Blockchain Digital ID Validator</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
              Cryptographic integrity verification comparing off-chain database records against on-chain SHA-256 state hashes.
            </p>
            <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">
              Back to Overview
            </button>
          </div>
        );

      case 'certificates':
        return (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            <Award size={48} color="var(--color-accent)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Tour Completion Certificates & QR Ledger</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 20px' }}>
              Verified tourist certificates with cryptographic QR code validation for safe tour completion.
            </p>
            <button onClick={() => setActiveTab('dashboard')} className="btn btn-secondary">
              Back to Overview
            </button>
          </div>
        );

      default:
        return <DashboardOverview setActiveTab={setActiveTab} />;
    }
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Topbar onRefreshData={() => setActiveTab('dashboard')} />
        <main className="content-body">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardShell />
    </AuthProvider>
  );
}
