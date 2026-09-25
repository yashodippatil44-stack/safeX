import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, ShieldCheck, Key, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, quickLogin, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please fill in both email and password.');
      return;
    }
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setLocalError(res.error || 'Authentication failed.');
    }
  }

  async function handleQuick(role) {
    setLoading(true);
    setLocalError('');
    const res = await quickLogin(role);
    setLoading(false);
    if (!res?.success) {
      setLocalError(res?.error || 'Quick login failed.');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(6, 182, 212, 0.12) 0%, rgba(11, 15, 25, 0.98) 60%), #070B14',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-police) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px var(--color-accent-glow)',
            marginBottom: '16px'
          }}>
            <ShieldAlert size={34} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '6px' }}>
            SAFEX COMMAND
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Smart Tourist Safety & Incident Response System
          </p>
          <div style={{ display: 'inline-block', marginTop: '10px' }}>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
              SIH-2025 • PROBLEM ID SIH25002
            </span>
          </div>
        </div>

        {/* Login Box */}
        <div className="glass-panel-elevated" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Authorized Access</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Sign in with official credentials or use 1-click Demo credentials below.
          </p>

          {(localError || error) && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="input-email">Official Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-email"
                  type="email"
                  className="form-input"
                  placeholder="name@police.visionx.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Mail size={18} color="#64748B" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-password">Secure Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Lock size={18} color="#64748B" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', marginTop: '12px' }}
            >
              <span>{loading ? 'Authenticating...' : 'Enter Command Center'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center', fontWeight: '600' }}>
              ⚡ Quick Demo Credentials (1-Click)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                id="btn-quick-police"
                type="button"
                onClick={() => handleQuick('POLICE')}
                disabled={loading}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '0.825rem', padding: '10px 14px' }}
              >
                <ShieldCheck size={16} color="var(--color-police)" />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <strong>Police Dispatcher</strong> <span style={{ color: 'var(--text-muted)' }}>(Inspector Vikram Joshi)</span>
                </div>
              </button>

              <button
                id="btn-quick-admin"
                type="button"
                onClick={() => handleQuick('ADMIN')}
                disabled={loading}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '0.825rem', padding: '10px 14px' }}
              >
                <Key size={16} color="var(--color-accent)" />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <strong>Command Admin</strong> <span style={{ color: 'var(--text-muted)' }}>(VisionX HQ)</span>
                </div>
              </button>

              <button
                id="btn-quick-tourist"
                type="button"
                onClick={() => handleQuick('TOURIST')}
                disabled={loading}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', fontSize: '0.825rem', padding: '10px 14px' }}
              >
                <UserCheck size={16} color="var(--color-safe)" />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <strong>Tourist Yashodip</strong> <span style={{ color: 'var(--text-muted)' }}>(VX-TRV-0001)</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          SafeX Platform • Powered by AI Risk Engine, Geo-Fencing & Hyperledger Fabric
        </div>
      </div>
    </div>
  );
}
