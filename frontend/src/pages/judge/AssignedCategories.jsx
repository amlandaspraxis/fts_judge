import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { List, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AssignedCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/judge/categories').then(res => setCategories(res.data.categories));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Judicial Scope</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>My Assigned Categories</h1>
        <p className="evt-sub">
          You are authorized to review and score participants belonging only to the following categories.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
          {categories.length === 0 && (
            <div className="evt-sub" style={{ padding: 24, textAlign: 'center' }}>
              No categories currently assigned to your judge profile. Please ask Admin to assign you.
            </div>
          )}
          {categories.map(c => (
            <div key={c.id} className="evt-card" style={{ padding: 18 }}>
              <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                {c.prefix}
              </span>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#16274D', marginTop: 10 }}>
                {c.name}
              </div>
              <p className="evt-sub" style={{ fontSize: 13, margin: '6px 0 14px' }}>
                {c.description}
              </p>
              <Link
                to={`/judge/participants?categoryId=${c.id}`}
                className="evt-btn evt-btn-teal"
                style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
              >
                Evaluate Acts <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
