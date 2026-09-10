import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function VoteConfirmation() {
  return (
    <div style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
      <div className="evt-card" style={{ padding: 32 }}>
        <CheckCircle2 size={56} color="#1C8A4C" style={{ marginBottom: 16 }} />
        <div className="evt-eyebrow" style={{ color: '#1C8A4C' }}>Ballot Officially Verified</div>
        <h1 className="evt-h1" style={{ fontSize: 36, margin: '6px 0 10px' }}>Vote Recorded!</h1>
        <p className="evt-sub" style={{ marginBottom: 24, fontSize: 15 }}>
          Your vote has been securely recorded by the system and factored into the category standings.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/audience/categories" className="evt-btn evt-btn-amber" style={{ textDecoration: 'none' }}>
            Vote in Another Category <ArrowRight size={14} />
          </Link>
          <Link to="/audience/history" className="evt-btn evt-btn-ghost" style={{ textDecoration: 'none' }}>
            View My Cast Votes
          </Link>
        </div>
      </div>
    </div>
  );
}
