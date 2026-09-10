import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Settings, ShieldCheck, Play, Square, Lock, CheckCircle2 } from 'lucide-react';
import { subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminEventControl() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadEvent = () => {
    api.get('/admin/dashboard')
      .then(res => setEvent(res.data.event))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvent();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((msg) => {
      if (['STATE_UPDATE', 'SET_VOTING_OPEN', 'EVENT_STATUS_CHANGE'].includes(msg.action)) {
        loadEvent();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const [confirmModal, setConfirmModal] = useState({ open: false, targetKey: null });

  const initiateTransition = (statusKey) => {
    setConfirmModal({ open: true, targetKey: statusKey });
  };

  const confirmTransition = async () => {
    const target = confirmModal.targetKey;
    setConfirmModal({ open: false, targetKey: null });
    if (!target) return;
    setError('');
    setMsg('');
    try {
      const res = await api.post('/admin/event/state', { status: target });
      setEvent(res.data.event);
      setMsg(`Event status transitioned to: ${target}`);
    } catch (err) {
      setError(err.message || 'Transition failed');
    }
  };

  const states = [
    { key: 'SETUP', label: '1. Setup Stage', desc: 'Pre-event configuration. Judging & voting blocked.' },
    { key: 'JUDGING_OPEN', label: '2. Judging Open', desc: 'Judges can access and score assigned acts.' },
    { key: 'VOTING_OPEN', label: '3. Audience Voting Open', desc: 'Audience can cast votes across active categories.' },
    { key: 'JUDGING_CLOSED', label: '4. Judging Closed', desc: 'Judge submissions and edits permanently locked.' },
    { key: 'VOTING_CLOSED', label: '5. Voting Closed', desc: 'Audience ballot entries permanently closed.' },
    { key: 'RESULTS_LOCKED', label: '6. Results Locked', desc: 'Calculated 85/15 outcome frozen for verification.' },
    { key: 'RESULTS_PUBLISHED', label: '7. Results Published', desc: 'Leaderboard is made visible to participants and public.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(13, 27, 61, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="evt-card" style={{ maxWidth: 440, width: '100%', padding: 26, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}>
            <div className="evt-eyebrow" style={{ color: '#EF4444' }}>CONFIRMATION REQUIRED</div>
            <h2 className="evt-h2" style={{ fontSize: 24, marginTop: 4 }}>Are you sure?</h2>
            <p className="evt-sub" style={{ fontSize: 14, margin: '10px 0 20px' }}>
              Switch event state to <strong className="evt-mono" style={{ color: '#16274D' }}>{confirmModal.targetKey}</strong>?
              {confirmModal.targetKey === 'RESULTS_LOCKED' && ' Once locked, no further judge or audience score changes will be accepted.'}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={() => setConfirmModal({ open: false, targetKey: null })}
              >
                Cancel
              </button>
              <button
                className="evt-btn evt-btn-amber"
                onClick={confirmTransition}
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="evt-card">
        <div className="evt-eyebrow">State Machine Engine</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Event Control Center</h1>
        <p className="evt-sub">
          The backend verifies the active server state on every judging and voting request.
        </p>

        {error && <div style={{ color: '#D93025', background: '#FDE8E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{error}</div>}
        {msg && <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>{msg}</div>}

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {states.map(s => {
            const isCurrent = event?.status === s.key;
            return (
              <div
                key={s.key}
                className="evt-card"
                style={{
                  padding: 16,
                  borderColor: isCurrent ? '#16274D' : '#C7CEDE',
                  background: isCurrent ? '#FFF9D6' : '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{s.label}</span>
                    {isCurrent && (
                      <span className="evt-badge evt-badge-ok">Active State</span>
                    )}
                  </div>
                  <div className="evt-sub" style={{ fontSize: 13, marginTop: 4 }}>{s.desc}</div>
                </div>

                <button
                  className={`evt-btn ${isCurrent ? 'evt-btn-ghost' : 'evt-btn-amber'}`}
                  disabled={isCurrent}
                  onClick={() => initiateTransition(s.key)}
                  style={{ minWidth: 140, justifyContent: 'center' }}
                >
                  {isCurrent ? 'Current' : `Switch to ${s.key}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
