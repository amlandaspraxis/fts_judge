import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VoteHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audience/vote-status').then(res => {
      setHistory(res.data.votes || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Participation Activity</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>My Voting History</h1>
        <p className="evt-sub">
          Official record of ballots submitted under your authenticated account.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {history.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>
              You have not submitted any votes yet.
            </div>
          )}
          {history.map(v => (
            <div key={v.id} className="evt-pending-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>
                  Vote ID: {v.id}
                </div>
                <div className="evt-sub" style={{ fontSize: 12.5 }}>
                  Cast on: {new Date(v.submittedAt).toLocaleString()}
                </div>
              </div>
              <span className="evt-badge evt-badge-ok">
                <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Confirmed & Locked
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
