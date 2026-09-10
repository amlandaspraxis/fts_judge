import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Trophy, Lock, CheckCircle2, Download, Award, Star, FileSpreadsheet, MonitorPlay } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportResultsToCsv, exportVotesToCsv } from '../../utils/csvDownloader';
import { subscribeToBroadcast, initRealtimeEventSync } from '../../lib/eventSync';

export default function AdminResults() {
  const [resultsData, setResultsData] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [eventStatus, setEventStatus] = useState('');
  const [resultsLocked, setResultsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  const loadResults = () => {
    api.get('/admin/categories').then(res => {
      const cats = res.data.categories || [];
      setCategories(cats);
      if (!selectedCat && cats.length > 0) {
        setSelectedCat(cats[0].id);
      }
    });

    api.get('/results').then(res => {
      setResultsData(res.data.results || {});
      setResultsLocked(res.data.resultsLocked);
      setEventStatus(res.data.eventStatus);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadResults();
    const unsubRealtime = initRealtimeEventSync();
    const unsubBroadcast = subscribeToBroadcast((msg) => {
      if (['SUBMIT_JUDGE_SCORE', 'CAST_AUDIENCE_VOTE', 'STATE_UPDATE', 'EVENT_STATUS_CHANGE'].includes(msg.action)) {
        loadResults();
      }
    });

    return () => {
      unsubRealtime?.();
      unsubBroadcast?.();
    };
  }, []);

  const handleLock = async () => {
    if (!window.confirm('Lock official results? No further changes to scores or votes will be accepted.')) return;
    try {
      await api.post('/results/lock');
      setMsg('Results locked permanently.');
      loadResults();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Publish official results for public display?')) return;
    try {
      await api.post('/results/publish');
      setMsg('Results published successfully!');
      loadResults();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadResultsCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/results/export');
      if (res.data) {
        exportResultsToCsv(res.data.results, categories, 'fts_official_results.csv');
        setMsg('Downloaded official results in CSV format.');
      }
    } catch (err) {
      alert('Failed to download CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadVotesCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/results/export');
      if (res.data?.votes) {
        exportVotesToCsv(res.data.votes, categories, 'fts_audience_voting_data.csv');
        setMsg(`Downloaded ${res.data.votes.length} audience vote records in CSV format.`);
      }
    } catch (err) {
      alert('Failed to download voting CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const currentCategoryResults = (resultsData[selectedCat] || []).sort((a, b) => a.rank - b.rank);
  const currentCatObj = categories.find(c => c.id === selectedCat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="evt-eyebrow">Scoring Formula: (Judge × 0.85) + (Audience × 0.15)</div>
            <h1 className="evt-h1" style={{ fontSize: 32, margin: '2px 0 4px' }}>Official Results & Leaderboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span className="evt-sub">Calculated real-time standings and audience vote tabulations.</span>
              <span className="evt-badge" style={{
                background: resultsLocked ? '#16274D' : '#DFF6E8',
                color: resultsLocked ? '#FFD400' : '#1C8A4C',
                padding: '4px 10px'
              }}>
                Lifecycle: {resultsLocked ? (eventStatus === 'RESULTS_PUBLISHED' ? 'PUBLISHED' : 'LOCKED') : 'CALCULATING (LIVE)'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="evt-btn evt-btn-amber"
              onClick={handleDownloadVotesCsv}
              disabled={exporting}
              title="Download raw audience votes as .CSV"
            >
              <Download size={14} /> Download Voting Data (.CSV)
            </button>

            <button
              className="evt-btn evt-btn-ghost"
              onClick={handleDownloadResultsCsv}
              disabled={exporting}
              title="Download official final score breakdown as .CSV"
            >
              <FileSpreadsheet size={14} /> Export Results (.CSV)
            </button>

            <Link
              to="/admin/projector"
              className="evt-btn evt-btn-teal"
              style={{ textDecoration: 'none' }}
              title="Launch Big Screen Stage Projector"
            >
              <MonitorPlay size={14} /> Stage Projector
            </Link>

            <button
              className="evt-btn evt-btn-teal"
              disabled={resultsLocked}
              onClick={handleLock}
            >
              <Lock size={14} /> {resultsLocked ? 'Results Locked' : 'Lock Results'}
            </button>

            <button
              className="evt-btn evt-btn-amber"
              onClick={handlePublish}
            >
              <CheckCircle2 size={14} /> Publish Results
            </button>
          </div>
        </div>

        {msg && <div style={{ color: '#1C8A4C', background: '#DFF6E8', padding: '10px 14px', borderRadius: 8, marginTop: 14 }}>{msg}</div>}

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
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
      </div>

      <div className="evt-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="evt-h2" style={{ margin: 0, fontSize: 24 }}>
            {currentCatObj?.name} Leaderboard
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="evt-badge" style={{ background: '#16274D', color: '#FFD400', padding: '6px 12px' }}>
              Weighting: 85% Judge / 15% Audience
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentCategoryResults.length === 0 && (
            <div className="evt-sub" style={{ textAlign: 'center', padding: 32 }}>
              No scores recorded yet in this category.
            </div>
          )}

          {currentCategoryResults.map((r, idx) => {
            const isWinner = idx === 0;
            return (
              <div
                key={r.id}
                className="evt-card"
                style={{
                  padding: 16,
                  background: isWinner ? '#FFFCEB' : '#FFFFFF',
                  borderColor: isWinner ? '#FFD400' : '#16274D',
                  borderWidth: isWinner ? 3 : 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap'
                }}
              >
                <div style={{
                  fontSize: 26,
                  fontWeight: 900,
                  fontFamily: 'Luckiest Guy',
                  color: isWinner ? '#B7791F' : '#16274D',
                  minWidth: 44,
                  textAlign: 'center'
                }}>
                  #{r.rank}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="evt-mono evt-badge" style={{ background: '#16274D', color: '#FFD400' }}>
                      {r.participantCode}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#16274D' }}>
                      {r.participantName}
                    </span>
                    {isWinner && <Award size={18} color="#D97706" />}
                  </div>
                  <div className="evt-sub" style={{ fontSize: 13, marginTop: 4 }}>
                    Act: {r.act}
                  </div>
                </div>

                {/* Score Breakdown Pills */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="evt-eyebrow" style={{ fontSize: 10 }}>Judge Score (85%)</div>
                    <div className="evt-mono" style={{ fontWeight: 700, fontSize: 16, color: '#29ABE2' }}>
                      {r.judgeScore} / 100
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div className="evt-eyebrow" style={{ fontSize: 10 }}>Audience Share (15%)</div>
                    <div className="evt-mono" style={{ fontWeight: 700, fontSize: 16, color: '#EF4136' }}>
                      {r.audienceScore}% ({r.audienceVotesCount} votes)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', borderLeft: '2px solid #C7CEDE', paddingLeft: 16 }}>
                    <div className="evt-eyebrow" style={{ fontSize: 10 }}>Final Result</div>
                    <div className="evt-score-num" style={{ fontSize: 26, color: '#16274D', fontWeight: 900 }}>
                      {r.finalScore}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
