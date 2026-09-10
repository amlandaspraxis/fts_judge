import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, CheckCircle2, ArrowRight, ShieldCheck, QrCode, MonitorPlay, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadStateFromStorage } from '../../lib/eventSync';

const FALLBACK_CATEGORIES = [
  { id: "dance", name: "Dance", label: "Dance", prefix: "DNC", description: "Solo and group dance performances" },
  { id: "singing", name: "Singing / Music", label: "Singing / Music", prefix: "MSC", description: "Vocal and instrumental melodies" },
  { id: "comedy", name: "Comedy", label: "Comedy", prefix: "CMD", description: "Standup and comedic acts" },
  { id: "band", name: "Band", label: "Band", prefix: "BND", description: "Live musical bands" },
  { id: "drama", name: "Drama / Theatre", label: "Drama / Theatre", prefix: "DRM", description: "Theatrical sketches and stage plays" },
  { id: "poetry", name: "Poetry / Spoken Word", label: "Poetry / Spoken Word", prefix: "PTY", description: "Expressive poetry and spoken word" },
];

export default function AudienceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audience/dashboard')
      .then(res => {
        if (res?.data) setData(res.data);
      })
      .catch(err => {
        console.warn('Audience dashboard API offline, using local state:', err?.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const localState = typeof window !== 'undefined' ? loadStateFromStorage() : null;
  const categories = (data?.categories && data.categories.length > 0) 
    ? data.categories 
    : FALLBACK_CATEGORIES;

  const votingOpen = data?.votingOpen !== undefined 
    ? data.votingOpen 
    : (localState?.votingOpen !== undefined ? localState.votingOpen : true);

  const votedIds = data?.votedCategoryIds || [];

  if (loading && !data) {
    return <div className="evt-card" style={{ padding: 24, textAlign: 'center' }}>Loading audience portal…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Banner */}
      <div className="evt-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="evt-eyebrow">Audience Participation Hub</div>
          <h1 className="evt-h1" style={{ fontSize: 32 }}>Cast Your Vote</h1>
          <p className="evt-sub">
            Support your favorite performers. You may cast <strong>one official vote per category</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/audience-live"
            className="evt-btn evt-btn-teal"
            style={{ textDecoration: 'none', fontSize: 13, padding: '8px 14px' }}
          >
            <MonitorPlay size={15} /> Live Stage Act Voting →
          </Link>
          <span className={`evt-badge ${votingOpen ? 'evt-badge-ok' : 'evt-badge-wait'}`} style={{ fontSize: 13, padding: '8px 16px' }}>
            {votingOpen ? 'Voting Active' : 'Voting Closed'}
          </span>
        </div>
      </div>

      <div className="evt-card">
        <div className="evt-h2" style={{ fontSize: 22 }}>Available Categories</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 14 }}>
          {categories.map(c => {
            const alreadyVoted = votedIds.includes(c.id);
            return (
              <div key={c.id} className="evt-card" style={{ padding: 18, background: alreadyVoted ? '#F7F9FD' : '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                    {c.prefix}
                  </span>
                  {alreadyVoted && (
                    <span className="evt-badge evt-badge-ok" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Voted
                    </span>
                  )}
                </div>

                <div style={{ fontWeight: 800, fontSize: 20, color: '#16274D', marginTop: 10 }}>
                  {c.name}
                </div>
                <div className="evt-sub" style={{ fontSize: 13, margin: '6px 0 14px' }}>
                  {c.description}
                </div>

                <Link
                  to={votingOpen ? `/audience/vote?categoryId=${c.id}` : '#'}
                  className={`evt-btn ${votingOpen ? 'evt-btn-amber' : 'evt-btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                >
                  {votingOpen ? 'Vote for Performers' : 'Voting Not Open'} <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
