import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { Gavel, CheckCircle2, Lock, Edit2 } from 'lucide-react';
import { getCategoryCriteriaData } from '../../config/judgmentCriteria';

export default function JudgeParticipants() {
  const [searchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('categoryId') || '';
  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(categoryIdParam);

  useEffect(() => {
    api.get('/judge/categories').then(res => {
      setCategories(res.data.categories);
      if (!selectedCat && res.data.categories.length > 0) {
        setSelectedCat(res.data.categories[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCat) {
      api.get(`/judge/participants?categoryId=${selectedCat}`).then(res => {
        setParticipants(res.data.participants);
      });
    }
  }, [selectedCat]);

  const activeCategoryObj = categories.find(c => c.id === selectedCat);
  const selectedCategoryData = useMemo(() => {
    return getCategoryCriteriaData(activeCategoryObj || selectedCat);
  }, [activeCategoryObj, selectedCat]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div className="evt-eyebrow">Assigned Acts</div>
        <h1 className="evt-h1" style={{ fontSize: 32 }}>Performer Evaluation</h1>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {categories.map(c => (
            <button
              key={c.id}
              className={`evt-tab ${selectedCat === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Dynamic Category Judgment Criteria Section */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1.5px solid #E7EAF2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span className="evt-eyebrow" style={{ margin: 0 }}>Judgment Criteria</span>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{selectedCategoryData.name}</div>
            </div>
            <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 12, padding: '4px 10px' }}>
              Total: 100 Marks
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {selectedCategoryData.criteria.map(c => (
              <div key={c.id} style={{ background: '#F7F9FD', border: '1.5px solid #C7CEDE', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#16274D' }}>{c.label}</span>
                <span className="evt-mono" style={{ fontSize: 12, fontWeight: 700, color: '#29ABE2' }}>20 Marks</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="evt-card">
        <div className="evt-h2" style={{ fontSize: 22 }}>Acts to Score</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          {participants.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 28 }}>
              No registered participants in this category yet.
            </div>
          )}

          {participants.map(p => {
            const isScored = p.myScore !== null && p.myScore !== undefined;
            const isLocked = p.locked || p.revisionCount >= 1;
            return (
              <div key={p.id} className="evt-pending-row">
                <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', padding: '6px 12px', fontSize: 13 }}>
                  {p.participantCode}
                </span>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{p.name}</div>
                  <div className="evt-sub">{p.act}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isScored ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="evt-score-num" style={{ fontSize: 18 }}>
                        {p.myScore} / 100
                      </div>
                      {isLocked ? (
                        <span className="evt-badge" style={{ background: '#E7EAF2', color: '#5B6890' }}>
                          <Lock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Locked
                        </span>
                      ) : (
                        <Link
                          to={`/judge/score?participantId=${p.id}&categoryId=${p.categoryId}&scoreId=${p.scoreId}`}
                          className="evt-btn evt-btn-ghost"
                          style={{ fontSize: 12, padding: '6px 10px', textDecoration: 'none' }}
                        >
                          <Edit2 size={12} /> Edit (1 left)
                        </Link>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={`/judge/score?participantId=${p.id}&categoryId=${p.categoryId}`}
                      className="evt-btn evt-btn-amber"
                      style={{ fontSize: 12, padding: '7px 14px', textDecoration: 'none' }}
                    >
                      <Gavel size={13} /> Score Act
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
