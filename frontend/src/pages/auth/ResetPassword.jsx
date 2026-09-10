import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError('Passwords do not match');
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="evt-card" style={{ maxWidth: 440, width: '100%', padding: 28 }}>
      <div className="evt-eyebrow">Security Credentials</div>
      <h1 className="evt-h1" style={{ fontSize: 28, marginBottom: 4 }}>Set New Password</h1>

      {done ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <CheckCircle2 size={40} color="#1C8A4C" style={{ marginBottom: 10 }} />
          <p style={{ fontWeight: 600 }}>Password updated! Redirecting to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ color: '#D93025', fontSize: 13 }}>{error}</div>}
          <div>
            <label className="evt-label">New Password</label>
            <input
              type="password"
              className="evt-input"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="evt-label">Confirm New Password</label>
            <input
              type="password"
              className="evt-input"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="evt-btn evt-btn-amber" style={{ justifyContent: 'center' }}>
            Update Password
          </button>
        </form>
      )}
    </div>
  );
}
