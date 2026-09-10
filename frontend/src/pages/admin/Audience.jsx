import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, CheckCircle2, Download } from 'lucide-react';
import { exportVotesToCsv } from '../../utils/csvDownloader';
import { subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminAudience() {
  const [audience, setAudience] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [selectedVoter, setSelectedVoter] = useState(null);

  const loadData = () => {
    api.get('/admin/audience')
      .then(res => setAudience(res.data.audience || []))
      .finally(() => setLoading(false));

    api.get('/admin/categories')
      .then(res => setCategories(res.data.categories || []));
  };

  useEffect(() => {
    loadData();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((msg) => {
      if (['AUDIENCE_UPDATE', 'CAST_AUDIENCE_VOTE', 'STATE_UPDATE'].includes(msg.action)) {
        loadData();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const handleDownloadVotesCsv = async () => {
    try {
      const res = await api.get('/results/export');
      if (res.data?.votes) {
        exportVotesToCsv(res.data.votes, categories, 'fts_audience_votes_ballots.csv');
        setMsg(`Successfully exported ${res.data.votes.length} voting records to CSV!`);
      }
    } catch (err) {
      alert('Failed to download voting records: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="evt-eyebrow">Voter Registry</div>
            <h1 className="evt-h1" style={{ fontSize: 32 }}>Audience Accounts ({audience.length})</h1>
            <p className="evt-sub" style={{ margin: 0 }}>
              Monitor authenticated audience voters and voting activity across categories.
            </p>
          </div>

          <button
            onClick={handleDownloadVotesCsv}
            className="evt-btn evt-btn-amber"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={15} /> Download Voting Data (.CSV)
          </button>
        </div>

        {msg && <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 14 }}>{msg}</div>}

        {selectedVoter && (
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
              <div className="evt-eyebrow">AUDIENCE VOTER INSPECTION</div>
              <h2 className="evt-h2" style={{ fontSize: 24, margin: '4px 0 12px' }}>{selectedVoter.name}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1.5px solid #CBD5E1', marginBottom: 18 }}>
                <div>
                  <span className="evt-sub" style={{ fontSize: 11, fontWeight: 700 }}>EMAIL ADDRESS</span>
                  <div style={{ fontWeight: 700, color: '#16274D' }}>{selectedVoter.email}</div>
                </div>
                <div>
                  <span className="evt-sub" style={{ fontSize: 11, fontWeight: 700 }}>VOTING ACTIVITY</span>
                  <div style={{ fontWeight: 800, color: '#16274D' }}>{selectedVoter.votesCast} Votes Submitted</div>
                </div>
                <div>
                  <span className="evt-sub" style={{ fontSize: 11, fontWeight: 700 }}>ACCOUNT STATUS</span>
                  <div>
                    <span className="evt-badge evt-badge-ok">● VERIFIED VOTER</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  className="evt-btn evt-btn-ghost"
                  onClick={() => setSelectedVoter(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          {audience.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>No audience accounts created yet.</div>
          )}
          {audience.map(a => (
            <div key={a.id} className="evt-pending-row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{a.name}</div>
                <div className="evt-sub">{a.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="evt-badge" style={{ background: '#FFF3C4', color: '#16274D', padding: '6px 12px' }}>
                  {a.votesCast} VOTES CAST
                </span>
                <span className="evt-badge evt-badge-ok">VERIFIED</span>
                <button
                  onClick={() => setSelectedVoter(a)}
                  className="evt-btn evt-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Inspect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
