import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Gavel,
  Shield,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MonitorPlay,
  Scale,
  Sparkles
} from 'lucide-react';

export default function JudgeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle Juror Email/Password Credentials Sign In
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError('Please enter your Juror Email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(cleanEmail, cleanPass);
      if (user.role !== 'JUDGE' && user.role !== 'ADMIN') {
        setError('Access Denied: This console is strictly restricted to Official Judges.');
        return;
      }
      sessionStorage.setItem('fts_judge_session', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        authenticatedVia: 'CREDENTIALS',
        verifiedAt: new Date().toISOString()
      }));
      navigate('/judge/dashboard');
    } catch (err) {
      setError(err.message || 'Juror authentication failed. Please check your credentials.');
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
      background: 'linear-gradient(135deg, #09192F 0%, #0E2A47 50%, #173D6B 100%)'
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

      {/* Main Juror Console Card */}
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '30px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1.5px rgba(41, 171, 226, 0.3)',
        border: '2px solid #0E2A47'
      }}>
        {/* Header Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            background: '#0E2A47',
            color: '#29ABE2',
            fontSize: 11,
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 6,
            letterSpacing: '0.08em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Gavel size={13} color="#29ABE2" /> OFFICIAL JUROR CONSOLE
          </div>

          <span style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: '#0369A1',
            background: '#E0F2FE',
            padding: '3px 8px',
            borderRadius: 6,
            letterSpacing: '0.04em'
          }}>
            RESTRICTED ACCESS • LEVEL 2
          </span>
        </div>

        <h1 style={{
          fontSize: 25,
          fontWeight: 900,
          color: '#0E2A47',
          margin: '0 0 4px 0',
          fontFamily: 'Montserrat, sans-serif'
        }}>
          Judge Panel Sign In
        </h1>

        <p style={{ fontSize: 13, color: '#5B6890', margin: '0 0 20px 0', lineHeight: 1.4 }}>
          Enter your official juror credentials to access evaluation benchmarks and score contestants.
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

        {/* Official Email / Password Sign-in Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} color="#29ABE2" /> Juror Email Address *
            </label>
            <input
              type="email"
              className="evt-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. judge1@event.local"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="evt-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} color="#29ABE2" /> Juror Password *
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
              background: '#29ABE2',
              color: '#FFFFFF'
            }}
          >
            {loading ? 'Verifying Juror Credentials…' : (
              <>
                <Shield size={16} /> Sign In to Juror Console <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Rule Highlights */}
        <div style={{
          marginTop: 20,
          background: '#F0F9FF',
          border: '1.5px solid #BAE6FD',
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
            <Scale size={16} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0369A1' }}>
              Judging Integrity & Single-Modification Rule
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
              Per competition regulations (Section 10), submitted scores can be modified <strong>only once</strong> to ensure tamper-proof evaluation. Judge scores contribute 85% of total score.
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
