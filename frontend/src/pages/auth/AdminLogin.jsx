import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MonitorPlay,
  Layers,
  Smartphone,
  Laptop
} from 'lucide-react';

export default function AdminLogin() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const cleanId = loginId.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError('Please enter your Management ID and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(cleanId, cleanPass);
      if (user.role !== 'ADMIN') {
        setError('Unauthorized: This console is strictly restricted to Management Administrators.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your Management credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(135deg, #0E1830 0%, #16274D 50%, #1a3668 100%)'
    }}>
      {/* Top Branding */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <img
          src="/main_logo.png"
          alt="Freshmen Talent Search 2026"
          style={{
            height: 72,
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'
          }}
        />
      </div>

      {/* Main Admin Card */}
      <div style={{
        maxWidth: 460,
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '32px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 212, 0, 0.25)',
        border: '2px solid #16274D'
      }}>
        {/* Header Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            background: '#16274D',
            color: '#FFD400',
            fontSize: 11,
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 6,
            letterSpacing: '0.08em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Shield size={13} color="#FFD400" /> MANAGEMENT CONSOLE
          </div>

          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#EF4136',
            background: '#FEE2E2',
            padding: '3px 8px',
            borderRadius: 6
          }}>
            RESTRICTED ACCESS
          </span>
        </div>

        <h1 style={{
          fontSize: 26,
          fontWeight: 900,
          color: '#16274D',
          margin: '0 0 6px 0',
          fontFamily: 'Montserrat, sans-serif'
        }}>
          Event Operations Sign In
        </h1>

        <p style={{ fontSize: 13, color: '#5B6890', margin: '0 0 20px 0', lineHeight: 1.4 }}>
          This console is isolated from public portals. Enter your pre-issued management credentials to operate event screens, voting, scoring, and stage elements.
        </p>

        {/* Error Alert */}
        {error && (
          <div style={{
            color: '#D93025',
            background: '#FDE8E8',
            border: '1.5px solid #F87171',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} color="#29ABE2" /> Management Login ID / Email
            </label>
            <input
              type="text"
              className="evt-input"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder="e.g. admin@admin.com or admin"
              autoFocus
              required
              style={{ fontSize: 14 }}
            />
          </div>

          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} color="#29ABE2" /> Management Password
            </label>
            <input
              type="password"
              className="evt-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ fontSize: 14 }}
            />
          </div>

          <button
            type="submit"
            className="evt-btn evt-btn-amber"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: 14,
              marginTop: 6,
              background: '#FFD400',
              color: '#16274D',
              fontWeight: 900
            }}
          >
            {loading ? 'Authenticating Management...' : (
              <>
                Sign In to Management Console <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Multi-Device Support Feature Box */}
        <div style={{
          marginTop: 20,
          background: '#F8FAFC',
          border: '1.5px solid #E2E8F0',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <div style={{
            background: '#E0F2FE',
            color: '#0284C7',
            padding: 6,
            borderRadius: 8,
            flexShrink: 0
          }}>
            <Laptop size={16} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#16274D' }}>
              Multi-Device Concurrent Operation Supported
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.4 }}>
              Multiple laptops, tablets, and phones can operate the management console concurrently with real-time state synchronization.
            </div>
          </div>
        </div>
      </div>

      {/* Footer link to public stage & audience */}
      <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', gap: 18, justifyContent: 'center' }}>
        <Link
          to="/login"
          style={{
            color: '#94A3B8',
            fontSize: 12,
            textDecoration: 'none'
          }}
        >
          ← Audience Portal
        </Link>
        <span style={{ color: '#475569' }}>•</span>
        <Link
          to="/projector"
          style={{
            color: '#94A3B8',
            fontSize: 12,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <MonitorPlay size={14} /> Stage Projector Screen →
        </Link>
      </div>
    </div>
  );
}
