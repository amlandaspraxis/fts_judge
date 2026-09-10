import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="evt-card" style={{ maxWidth: 440, width: '100%', padding: 28 }}>
      <div className="evt-eyebrow">Account Recovery</div>
      <h1 className="evt-h1" style={{ fontSize: 28, marginBottom: 4 }}>Reset Password</h1>
      <p className="evt-sub" style={{ marginBottom: 18 }}>
        Enter your registered email address to receive reset instructions.
      </p>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <CheckCircle2 size={40} color="#1C8A4C" style={{ marginBottom: 10 }} />
          <p style={{ fontWeight: 600, color: '#16274D' }}>
            If an account exists for {email}, recovery instructions have been sent.
          </p>
          <Link to="/login" className="evt-btn evt-btn-amber" style={{ marginTop: 14, textDecoration: 'none', display: 'inline-flex' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="evt-label">Email Address</label>
            <input
              type="email"
              className="evt-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. user@event.local"
              required
            />
          </div>
          <button type="submit" className="evt-btn evt-btn-amber" style={{ justifyContent: 'center' }}>
            Send Reset Instructions
          </button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Link to="/login" style={{ fontSize: 13, color: '#5B6890', textDecoration: 'none', fontWeight: 600 }}>
              Return to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
