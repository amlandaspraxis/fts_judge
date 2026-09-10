import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus,
  Shield,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MonitorPlay,
  ClipboardList,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function RegDeskLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stationPin, setStationPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Registration Desk Sign In with Station PIN verification
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanPin = stationPin.trim();

    if (!cleanEmail || !cleanPass) {
      setError('Please enter your Registration Desk Officer email and password.');
      return;
    }

    // Station PIN check: verify against configured Event PIN (default: 4821)
    if (cleanPin && cleanPin !== '4821') {
      setError('Invalid Registration Desk Station Security PIN.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(cleanEmail, cleanPass);
      if (user.role !== 'HELP_DESK' && user.role !== 'ADMIN') {
        setError('Unauthorized: This terminal is restricted to Registration & Help Desk personnel.');
        return;
      }
      sessionStorage.setItem('fts_desk_session', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        stationAuthorized: true,
        verifiedAt: new Date().toISOString()
      }));
      navigate('/helpdesk/dashboard');
    } catch (err) {
      setError(err.message || 'Help Desk authentication failed. Please verify your officer credentials.');
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
      background: 'linear-gradient(135deg, #062419 0%, #0A3626 50%, #104C37 100%)'
    }}>
      {/* Top Branding */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <img
          src="/main_logo.png"
          alt="Freshmen Talent Search 2026"
          style={{
            height: 68,
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))'
          }}
        />
      </div>

      {/* Main Card */}
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '30px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1.5px rgba(16, 185, 129, 0.3)',
        border: '2px solid #0A3626'
      }}>
        {/* Header Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            background: '#0A3626',
            color: '#10B981',
            fontSize: 11,
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 6,
            letterSpacing: '0.08em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <UserPlus size={13} color="#10B981" /> REGISTRATION DESK
          </div>

          <span style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: '#065F46',
            background: '#D1FAE5',
            padding: '3px 8px',
            borderRadius: 6,
            letterSpacing: '0.04em'
          }}>
            AUTHORIZED PERSONNEL ONLY
          </span>
        </div>

        <h1 style={{
          fontSize: 25,
          fontWeight: 900,
          color: '#0A3626',
          margin: '0 0 4px 0',
          fontFamily: 'Montserrat, sans-serif'
        }}>
          Help Desk Terminal Sign In
        </h1>

        <p style={{ fontSize: 13, color: '#5B6890', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          Enter your desk officer credentials to access participant enrollments, chest number allocations, and check-ins.
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
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} color="#10B981" /> Desk Officer Email / ID *
            </label>
            <input
              type="email"
              className="evt-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="helpdesk@event.local"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} color="#10B981" /> Officer Password *
            </label>
            <input
              type="password"
              className="evt-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={13} color="#10B981" /> Station Security PIN (Optional)
            </label>
            <input
              type="password"
              className="evt-input evt-mono"
              value={stationPin}
              onChange={e => setStationPin(e.target.value)}
              placeholder="4-digit event PIN"
              maxLength={6}
            />
            <span style={{ fontSize: 11, color: '#64748B', marginTop: 3, display: 'block' }}>
              Physical station verification PIN.
            </span>
          </div>

          <button
            type="submit"
            className="evt-btn evt-btn-teal"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: 14,
              fontWeight: 800,
              marginTop: 4,
              background: '#10B981',
              color: '#FFFFFF'
            }}
          >
            {loading ? 'Authenticating Desk Terminal…' : (
              <>
                <UserPlus size={16} /> Open Registration Desk <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security & Audit Protection Info */}
        <div style={{
          marginTop: 18,
          background: '#F0FDF4',
          border: '1.5px solid #BBF7D0',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <div style={{
            background: '#DCFCE7',
            color: '#16A34A',
            padding: 6,
            borderRadius: 8,
            flexShrink: 0
          }}>
            <ClipboardList size={16} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#166534' }}>
              Participant Audit & Enrollment Security
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
              All participant registrations, chest number assignments, and category switches are cryptographically logged with the officer session for complete event traceability.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', gap: 18 }}>
        <Link
          to="/login"
          style={{ color: '#94A3B8', fontSize: 12, textDecoration: 'none' }}
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
            gap: 4
          }}
        >
          <MonitorPlay size={13} /> Stage Projector Screen →
        </Link>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus,
  Shield,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MonitorPlay,
  ClipboardList,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export default function RegDeskLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stationPin, setStationPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Registration Desk Sign In with Station PIN verification
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanPin = stationPin.trim();

    if (!cleanEmail || !cleanPass) {
      setError('Please enter your Registration Desk Officer email and password.');
      return;
    }

    // Station PIN check: verify against configured Event PIN (default: 4821)
    if (cleanPin && cleanPin !== '4821') {
      setError('Invalid Registration Desk Station Security PIN.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(cleanEmail, cleanPass);
      if (user.role !== 'HELP_DESK' && user.role !== 'ADMIN') {
        setError('Unauthorized: This terminal is restricted to Registration & Help Desk personnel.');
        return;
      }
      sessionStorage.setItem('fts_desk_session', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        stationAuthorized: true,
        verifiedAt: new Date().toISOString()
      }));
      navigate('/helpdesk/dashboard');
    } catch (err) {
      setError(err.message || 'Help Desk authentication failed. Please verify your officer credentials.');
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
      background: 'linear-gradient(135deg, #062419 0%, #0A3626 50%, #104C37 100%)'
    }}>
      {/* Top Branding */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <img
          src="/main_logo.png"
          alt="Freshmen Talent Search 2026"
          style={{
            height: 68,
            width: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))'
          }}
        />
      </div>

      {/* Main Card */}
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '30px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1.5px rgba(16, 185, 129, 0.3)',
        border: '2px solid #0A3626'
      }}>
        {/* Header Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            background: '#0A3626',
            color: '#10B981',
            fontSize: 11,
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 6,
            letterSpacing: '0.08em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <UserPlus size={13} color="#10B981" /> REGISTRATION DESK
          </div>

          <span style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: '#065F46',
            background: '#D1FAE5',
            padding: '3px 8px',
            borderRadius: 6,
            letterSpacing: '0.04em'
          }}>
            AUTHORIZED PERSONNEL ONLY
          </span>
        </div>

        <h1 style={{
          fontSize: 25,
          fontWeight: 900,
          color: '#0A3626',
          margin: '0 0 4px 0',
          fontFamily: 'Montserrat, sans-serif'
        }}>
          Help Desk Terminal Sign In
        </h1>

        <p style={{ fontSize: 13, color: '#5B6890', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          Enter your desk officer credentials to access participant enrollments, chest number allocations, and check-ins.
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
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} color="#10B981" /> Desk Officer Email / ID *
            </label>
            <input
              type="email"
              className="evt-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="helpdesk@event.local"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} color="#10B981" /> Officer Password *
            </label>
            <input
              type="password"
              className="evt-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={13} color="#10B981" /> Station Security PIN (Optional)
            </label>
            <input
              type="password"
              className="evt-input evt-mono"
              value={stationPin}
              onChange={e => setStationPin(e.target.value)}
              placeholder="4-digit event PIN"
              maxLength={6}
            />
            <span style={{ fontSize: 11, color: '#64748B', marginTop: 3, display: 'block' }}>
              Physical station verification PIN.
            </span>
          </div>

          <button
            type="submit"
            className="evt-btn evt-btn-teal"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: 14,
              fontWeight: 800,
              marginTop: 4,
              background: '#10B981',
              color: '#FFFFFF'
            }}
          >
            {loading ? 'Authenticating Desk Terminal…' : (
              <>
                <UserPlus size={16} /> Open Registration Desk <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security & Audit Protection Info */}
        <div style={{
          marginTop: 18,
          background: '#F0FDF4',
          border: '1.5px solid #BBF7D0',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <div style={{
            background: '#DCFCE7',
            color: '#16A34A',
            padding: 6,
            borderRadius: 8,
            flexShrink: 0
          }}>
            <ClipboardList size={16} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#166534' }}>
              Participant Audit & Enrollment Security
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
              All participant registrations, chest number assignments, and category switches are cryptographically logged with the officer session for complete event traceability.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', gap: 18 }}>
        <Link
          to="/login"
          style={{ color: '#94A3B8', fontSize: 12, textDecoration: 'none' }}
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
            gap: 4
          }}
        >
          <MonitorPlay size={13} /> Stage Projector Screen →
        </Link>
      </div>
    </div>
  );
}
