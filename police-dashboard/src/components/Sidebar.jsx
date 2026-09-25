import React from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  MapPin,
  Users,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Award,
  Radio,
  Sliders,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'Live Geo-Fence Map', icon: MapPin },
    { id: 'tourists', label: 'Tourist Monitoring', icon: Users },
    { id: 'emergencies', label: 'Emergency & SOS', icon: AlertTriangle, badge: '1 ACTIVE' },
    { id: 'incidents', label: 'Incident Desk', icon: Radio },
    { id: 'efir', label: 'E-FIR Processing', icon: FileText },
    { id: 'geofences', label: 'Geo-Fence Zones', icon: Sliders },
    { id: 'verification', label: 'Digital ID Verification', icon: ShieldCheck },
    { id: 'certificates', label: 'Tour Certificates', icon: Award }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-police) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px var(--color-accent-glow)'
        }}>
          <ShieldAlert size={24} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #FFFFFF, #93C5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SafeX
            </h1>
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-accent)', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.3)', fontWeight: '700' }}>
              SIH-2025
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Authority Command Center</p>
        </div>
      </div>

      {/* Authority Profile Strip */}
      <div style={{ padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-medium)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-accent)' }}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'PO'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Authorized Officer'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="beacon-dot safe" style={{ width: '6px', height: '6px' }}></span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {user?.role === 'POLICE' ? 'Tourist Police Control' : user?.role || 'Authority'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 12px 10px', fontWeight: '600' }}>
          Operations & Monitoring
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                  background: isActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  position: 'relative'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--color-accent)' : '#94A3B8'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#F87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontWeight: '700'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer / Logout */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          id="btn-sidebar-logout"
          onClick={logout}
          className="btn btn-outline"
          style={{ width: '100%', justifyContent: 'flex-start', color: '#EF4444' }}
        >
          <LogOut size={16} />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}
