import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Trophy, Clock, CheckCircle2 } from 'lucide-react';

export default function ScoreHistory() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/judge/scores')
      .then(res => setScores(res.data.scores || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Audit Trail</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>My Score Submissions</h1>
        <p className="evt-sub">
          History of all scores submitted by you, including revision logs.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {scores.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>
              No scores submitted yet.
            </div>
          )}

          {scores.map(s => (
            <div key={s.id} className="evt-pending-row">
              <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                {s.participantCode}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{s.participantName}</div>
                <div className="evt-sub">{s.categoryName} · {new Date(s.submittedAt).toLocaleTimeString()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="evt-score-num" style={{ fontSize: 20 }}>
                  {s.score} / 100
                </div>
                <span className={`evt-badge ${s.revisionCount >= 1 ? 'evt-badge-wait' : 'evt-badge-ok'}`}>
                  {s.revisionCount >= 1 ? 'Edited (Locked)' : 'Initial Submission'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
