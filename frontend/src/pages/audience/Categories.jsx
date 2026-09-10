import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { List, ArrowRight, CheckCircle2 } from 'lucide-react';
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

export default function AudienceCategories() {
  const localState = typeof window !== 'undefined' ? loadStateFromStorage() : null;
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [votedIds, setVotedIds] = useState([]);
  const [votingOpen, setVotingOpen] = useState(() => localState?.votingOpen ?? true);

  useEffect(() => {
    api.get('/audience/dashboard')
      .then(res => {
        if (res?.data?.categories?.length) {
          setCategories(res.data.categories);
        }
        if (res?.data?.votedCategoryIds) {
          setVotedIds(res.data.votedCategoryIds);
        }
        if (res?.data?.votingOpen !== undefined) {
          setVotingOpen(res.data.votingOpen);
        }
      })
      .catch(err => {
        console.warn('Audience categories API offline, using local state:', err?.message);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Voting Ballot</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Select a Category to Vote</h1>
        <p className="evt-sub">
          Choose a category to view eligible performers and cast your ballot.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
          {categories.map(c => {
            const hasVoted = votedIds.includes(c.id);
            return (
              <div key={c.id} className="evt-card" style={{ padding: 18 }}>
                <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                  {c.prefix}
                </span>
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
                  {votingOpen ? 'Proceed to Ballot' : 'Voting Closed'} <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
