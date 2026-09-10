import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Gavel, CheckCircle2, ArrowLeft, AlertCircle, Lock } from 'lucide-react';
import { getCategoryCriteriaData, getCriteriaForCategory } from '../../config/judgmentCriteria';

export default function ScoreParticipant() {
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get('participantId');
  const categoryIdParam = searchParams.get('categoryId');
  const scoreId = searchParams.get('scoreId');
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(categoryIdParam || '');
  const [criterionMarks, setCriterionMarks] = useState({});
  const [reason, setReason] = useState('');

  const [participant, setParticipant] = useState(null);
  const [existingScore, setExistingScore] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch assigned categories
  useEffect(() => {
    api.get('/judge/categories')
      .then(res => {
        const cats = res.data.categories || [];
        setCategories(cats);
        if (!selectedCatId && cats.length > 0) {
          setSelectedCatId(cats[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const activeCategoryId = selectedCatId || categoryIdParam || participant?.categoryId;

  const currentCategoryData = useMemo(() => {
    const matchingCat = categories.find(c => c.id === activeCategoryId);
    return getCategoryCriteriaData(matchingCat || activeCategoryId);
  }, [categories, activeCategoryId]);

  const criteria = currentCategoryData.criteria;

  useEffect(() => {
    if (participantId) {
      const fetchCat = selectedCatId || categoryIdParam;
      api.get(`/judge/participants?categoryId=${fetchCat}`).then(res => {
        const found = res.data.participants.find(p => p.id === participantId);
        setParticipant(found);
        if (found?.categoryId && !selectedCatId) {
          setSelectedCatId(found.categoryId);
        }
        if (found?.myScore !== null && found?.myScore !== undefined) {
          setExistingScore(found.myScore);
          // Pre-distribute existing score across the 5 criteria
          const base = Math.floor(found.myScore / criteria.length);
          const rem = found.myScore % criteria.length;
          const initialMarks = {};
          criteria.forEach((c, idx) => {
            initialMarks[c.id] = base + (idx === criteria.length - 1 ? rem : 0);
          });
          setCriterionMarks(initialMarks);
        } else {
          // Default initial marks (20 per criterion)
          const initialMarks = {};
          criteria.forEach(c => {
            initialMarks[c.id] = c.marks || 20;
          });
          setCriterionMarks(initialMarks);
        }
      }).catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [participantId, selectedCatId, categoryIdParam]);

  // When category changes, ensure criteria marks are initialized
  useEffect(() => {
    setCriterionMarks(prev => {
      const updated = {};
      criteria.forEach(c => {
        updated[c.id] = prev[c.id] !== undefined ? prev[c.id] : (c.marks || 20);
      });
      return updated;
    });
  }, [criteria]);

  const totalScore = criteria.reduce((sum, c) => {
    const val = criterionMarks[c.id] !== undefined ? criterionMarks[c.id] : 20;
    return sum + val;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (scoreId) {
        // One-time edit
        await api.put(`/judge/scores/${scoreId}`, { score: totalScore, reason });
      } else {
        // Initial submission
        await api.post('/judge/scores', { participantId, categoryId: activeCategoryId, score: totalScore });
      }
      navigate('/judge/participants?categoryId=' + activeCategoryId);
    } catch (err) {
      setError(err.message || 'Score submission failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="evt-card" style={{ padding: 24, textAlign: 'center' }}>Loading act details…</div>;
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link to={`/judge/participants?categoryId=${activeCategoryId}`} className="evt-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Participant List
      </Link>

      <div className="evt-card">
        <div className="evt-eyebrow">Scoring Sheet · {currentCategoryData.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 8px' }}>
          <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400', fontSize: 15 }}>
            {participant?.participantCode}
          </span>
          <h1 className="evt-h1" style={{ fontSize: 28, margin: 0 }}>{participant?.name}</h1>
        </div>
        <p className="evt-sub" style={{ margin: 0 }}>Routine: <strong>{participant?.act}</strong></p>

        {existingScore !== null && (
          <div style={{ background: '#FFF3C4', border: '1.5px solid #FFD400', padding: 12, borderRadius: 8, marginTop: 14 }}>
            <div style={{ fontWeight: 800, color: '#16274D', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} /> ONE-TIME MODIFICATION POLICY
            </div>
            <p className="evt-sub" style={{ fontSize: 12, margin: '4px 0 0', color: '#8A5B00' }}>
              You are modifying your previous score of <strong>{existingScore}</strong>. Once submitted, this score is permanently locked by the backend.
            </p>
          </div>
        )}

        {error && (
          <div style={{ color: '#D93025', background: '#FDE8E8', padding: '10px 14px', borderRadius: 8, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {criteria.map(c => {
            const val = criterionMarks[c.id] !== undefined ? criterionMarks[c.id] : 20;
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="evt-label" style={{ margin: 0 }}>{c.label} (20 Marks)</span>
                  <span className="evt-mono" style={{ fontWeight: 800 }}>{val} / 20</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={val}
                  onChange={e => {
                    const nextVal = Number(e.target.value);
                    setCriterionMarks(prev => ({ ...prev, [c.id]: nextVal }));
                  }}
                  className="evt-slider"
                />
              </div>
            );
          })}

          {scoreId && (
            <div>
              <label className="evt-label">Reason for Modification (Logged in Audit Trail)</label>
              <input
                className="evt-input"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Adjusted technique mark following full routine"
              />
            </div>
          )}

          <div style={{ borderTop: '2px solid #C7CEDE', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="evt-eyebrow">Calculated Total</div>
              <div className="evt-score-num" style={{ fontSize: 26, color: '#16274D' }}>
                {totalScore} / 100
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="evt-btn evt-btn-amber"
              style={{ fontSize: 14, padding: '12px 24px' }}
            >
              {scoreId ? 'Submit Final Edit' : 'Submit Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
