import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { getClientDeviceId } from '../../utils/deviceFingerprint';
import { Star, CheckCircle2, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';

export default function AudienceVote() {
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const [category, setCategory] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [votedPartIds, setVotedPartIds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI Vote Action Flow for current submission: 'idle' | 'submitting' | 'submitted'
  const [submitState, setSubmitState] = useState('idle');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (categoryId) {
      const deviceId = getClientDeviceId();
      api.get(`/audience/dashboard?deviceId=${encodeURIComponent(deviceId)}`).then(res => {
        const foundCat = res.data.categories.find(c => c.id === categoryId);
        setCategory(foundCat);
        setVotedPartIds(res.data.votedParticipantIds || []);
      }).catch(err => {
        console.warn('Dashboard fetch error:', err.message);
      });

      api.get(`/audience/participants/${categoryId}`).then(res => {
        setParticipants(res.data.participants || []);
      }).finally(() => setLoading(false));
    }
  }, [categoryId]);

  const selectedAlreadyVoted = Boolean(selectedPartId && votedPartIds.includes(selectedPartId));

  const handleVote = async (e) => {
    e.preventDefault();
    if (!selectedPartId || submitState !== 'idle') {
      if (!selectedPartId) setError('Please select a participant to cast your vote.');
      return;
    }
    if (selectedAlreadyVoted) {
      setError('You have already voted for this participant. Each person is allowed to vote only once per participant.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setSubmitState('submitting');

    try {
      const deviceId = getClientDeviceId();
      await api.post('/audience/votes', { 
        participantId: selectedPartId, 
        categoryId,
        deviceId,
        deviceFingerprint: deviceId
      });

      // Update local voted list so this participant is locked immediately
      setVotedPartIds(prev => [...prev, selectedPartId]);
      setSubmitState('submitted');
      setSuccessMsg('Vote recorded successfully!');

      // After a brief moment, unlock form so user can vote for remaining participants
      setTimeout(() => {
        setSubmitState('idle');
        setSelectedPartId('');
      }, 1500);
    } catch (err) {
      const friendlyMessage = (err.message?.includes('already voted') || err.status === 409 || err.code === 'ALREADY_VOTED')
        ? 'You have already voted for this participant. Each person is allowed to vote only once per participant.'
        : (err.message || 'Vote casting failed.');
      
      setError(friendlyMessage);
      if (err.status === 409 || err.code === 'ALREADY_VOTED') {
        setVotedPartIds(prev => prev.includes(selectedPartId) ? prev : [...prev, selectedPartId]);
      }
      setSubmitState('idle');
    }
  };

  if (loading) {
    return <div className="evt-card" style={{ padding: 24, textAlign: 'center' }}>Loading ballot…</div>;
  }

  const isSubmitting = submitState === 'submitting';
  const isSubmitted = submitState === 'submitted';

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link to="/audience/categories" className="evt-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Categories
      </Link>

      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="evt-eyebrow">Official Ballot</div>
          <span className="evt-mono evt-badge" style={{ background: '#F1F5F9', color: '#475569', fontSize: 11 }}>
            {votedPartIds.filter(id => participants.some(p => p.id === id)).length} of {participants.length} Voted
          </span>
        </div>

        <h1 className="evt-h1" style={{ fontSize: 30, marginTop: 4 }}>Vote for {category?.name || 'Category'}</h1>
        <p className="evt-sub">
          You can vote for <strong>each participant once</strong> under this category. Once submitted, your vote for that participant is permanent.
        </p>

        {error && (
          <div style={{ 
            color: '#991B1B', 
            background: '#FEF2F2', 
            border: '1.5px solid #F87171', 
            padding: '12px 16px', 
            borderRadius: 10, 
            marginTop: 14, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            fontWeight: 600,
            fontSize: 13.5
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ 
            color: '#065F46', 
            background: '#ECFDF5', 
            border: '1.5px solid #10B981', 
            padding: '12px 16px', 
            borderRadius: 10, 
            marginTop: 14, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            fontWeight: 600,
            fontSize: 13.5
          }}>
            <CheckCircle2 size={17} style={{ flexShrink: 0, color: '#10B981' }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleVote} style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {participants.length === 0 && (
              <div className="evt-sub" style={{ textAlign: 'center', padding: 24 }}>
                No participants registered in this category.
              </div>
            )}
            {participants.map(p => {
              const hasVotedForThis = votedPartIds.includes(p.id);
              const isSelected = selectedPartId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => { 
                    if (!hasVotedForThis && !isSubmitting && !isSubmitted) {
                      setSelectedPartId(p.id);
                      setError('');
                    }
                  }}
                  className="evt-card"
                  style={{
                    padding: 16,
                    cursor: hasVotedForThis ? 'not-allowed' : 'pointer',
                    borderColor: hasVotedForThis ? '#E2E8F0' : isSelected ? '#16274D' : '#C7CEDE',
                    background: hasVotedForThis ? '#F8FAFC' : isSelected ? '#FFF3C4' : '#FFFFFF',
                    borderWidth: isSelected ? 3 : 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    opacity: hasVotedForThis ? 0.75 : 1
                  }}
                >
                  <input
                    type="radio"
                    name="participant"
                    checked={isSelected}
                    disabled={hasVotedForThis || isSubmitting || isSubmitted}
                    onChange={() => { if (!hasVotedForThis) setSelectedPartId(p.id); }}
                    style={{ width: 18, height: 18, accentColor: '#16274D' }}
                  />
                  <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                    {p.participantCode || p.code}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#16274D' }}>{p.name}</div>
                    <div className="evt-sub" style={{ fontSize: 12.5 }}>{p.act}</div>
                  </div>
                  {hasVotedForThis ? (
                    <span className="evt-badge evt-badge-ok" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5 }}>
                      <CheckCircle2 size={12} /> Voted ✓
                    </span>
                  ) : isSelected ? (
                    <Star size={18} color="#D97706" fill="#FFD400" />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Voting Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || isSubmitted || selectedAlreadyVoted || !selectedPartId}
            className={`evt-btn ${selectedAlreadyVoted ? 'evt-btn-ghost' : isSubmitted ? 'evt-btn-ok' : 'evt-btn-amber'}`}
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              marginTop: 20, 
              padding: 14, 
              fontSize: 15,
              fontWeight: 800,
              cursor: (selectedAlreadyVoted || isSubmitted) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting && 'Recording Vote…'}
            {isSubmitted && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#065F46' }}>
                <CheckCircle2 size={16} /> Vote Submitted ✓
              </span>
            )}
            {selectedAlreadyVoted && 'You have already voted for this participant'}
            {!isSubmitting && !isSubmitted && !selectedAlreadyVoted && (selectedPartId ? 'Vote for Selected Participant' : 'Select a Participant to Vote')}
          </button>
        </form>

        {/* Multi-Signal Fair Voting Notice */}
        <div style={{
          marginTop: 18,
          padding: '10px 14px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: '#64748B'
        }}>
          <ShieldCheck size={16} color="#10B981" style={{ flexShrink: 0 }} />
          <span>
            <strong>Per-Participant Voting Rules:</strong> You are allowed to vote once for each participant under all categories. Duplicate votes for the same participant are automatically blocked across accounts, devices, and networks.
          </span>
        </div>
      </div>
    </div>
  );
}
