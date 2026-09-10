import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Gavel, CheckCircle2, Clock, List, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function JudgeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/judge/dashboard')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="evt-card" style={{ padding: 24, textAlign: 'center' }}>Loading judge panel…</div>;
  }

  const judgingOpen = data?.judgingOpen;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="evt-eyebrow">Judicial Access</div>
          <h1 className="evt-h1" style={{ fontSize: 32 }}>Welcome, {data?.judge?.name}</h1>
          <p className="evt-sub">
            You are authorized to score acts within your assigned categories.
          </p>
        </div>

        <div>
          <span className={`evt-badge ${judgingOpen ? 'evt-badge-ok' : 'evt-badge-wait'}`} style={{ fontSize: 13, padding: '8px 16px' }}>
            {judgingOpen ? 'Judging Session Active' : 'Judging Closed / Paused'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="evt-card">
          <div className="evt-eyebrow">Assigned Categories</div>
          <div className="evt-h1" style={{ fontSize: 36, margin: '6px 0 2px' }}>
            {data?.assignedCategories?.length || 0}
          </div>
          <div className="evt-sub">Categories allocated to you</div>
        </div>

        <div className="evt-card">
          <div className="evt-eyebrow">Scored Acts</div>
          <div className="evt-h1" style={{ fontSize: 36, margin: '6px 0 2px', color: '#1C8A4C' }}>
            {data?.scoredCount || 0}
          </div>
          <div className="evt-sub">Submissions recorded</div>
        </div>

        <div className="evt-card">
          <div className="evt-eyebrow">Pending Evaluation</div>
          <div className="evt-h1" style={{ fontSize: 36, margin: '6px 0 2px', color: '#B7791F' }}>
            {data?.pendingCount || 0}
          </div>
          <div className="evt-sub">Acts awaiting your marks</div>
        </div>
      </div>

      <div className="evt-card">
        <div className="evt-h2" style={{ fontSize: 22 }}>Assigned Categories for Evaluation</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
          {data?.assignedCategories?.map(c => (
            <Link
              key={c.id}
              to={`/judge/participants?categoryId=${c.id}`}
              className="evt-pchip"
              style={{ textDecoration: 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                  {c.prefix}
                </span>
                <ArrowRight size={14} color="#16274D" />
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#16274D', marginTop: 8 }}>
                {c.name}
              </div>
              <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>
                {c.description || 'Open to evaluate participants'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
