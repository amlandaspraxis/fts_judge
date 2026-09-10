import React, { useState, useEffect, useMemo } from 'react';
import { Gavel, CheckCircle2, AlertCircle, LogOut, KeyRound } from 'lucide-react';
import { Avatar } from '../components/PhotoModal';
import { getCategoryCriteriaData, getCriteriaForCategory } from '../config/judgmentCriteria';

export default function JudgeView({ current, judges = [], judgeScores = {}, setJudgeScores, judgeTotalFor, CRITERIA = [], MAX_CRITERION = 20, MAX_JUDGE_TOTAL = 100 }) {
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fts_judge_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [code, setCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('code') || '';
    }
    return '';
  });

  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [marks, setMarksLocal] = useState({});

  // Synchronize active judge data from authoritative judges list if code matches
  useEffect(() => {
    if (loggedIn) {
      const matching = judges.find(j => j.code?.toLowerCase() === loggedIn.code?.toLowerCase() || j.id === loggedIn.id);
      if (matching) {
        setLoggedIn(matching);
        sessionStorage.setItem('fts_judge_session', JSON.stringify(matching));
      }
    }
  }, [judges]);

  const existing = current && loggedIn ? judgeScores[current.id]?.[loggedIn?.id] : null;

  useEffect(() => {
    setMarksLocal(existing || {});
    setEditing(false);
  }, [current?.id, loggedIn?.id]);

  const login = (e) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toLowerCase();
    if (!cleanCode) {
      setError("Please enter your judge access code.");
      return;
    }

    const j = judges.find(j => j.code?.toLowerCase() === cleanCode);
    if (!j) { 
      setError("Invalid judge access code. Please check with the Event Admin."); 
      return; 
    }

    setLoggedIn(j);
    sessionStorage.setItem('fts_judge_session', JSON.stringify(j));
    setError("");
  };

  const logout = () => {
    setLoggedIn(null);
    sessionStorage.removeItem('fts_judge_session');
    setCode("");
    setError("");
    window.location.href = '/login';
  };

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 440, margin: "40px auto" }}>
        <form onSubmit={login} className="evt-ticket">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Gavel size={22} color="#29ABE2" />
            <span className="evt-eyebrow" style={{ margin: 0 }}>PORTAL 3 · JUDGES PORTAL</span>
          </div>
          <h2 className="evt-h2" style={{ marginTop: 6, fontSize: 26 }}>Judge Panel Sign-In</h2>
          <p className="evt-sub" style={{ marginBottom: 18 }}>
            Enter your official Judge Access Code issued by the Event Admin.
          </p>

          <label className="evt-label">Judge Access Code</label>
          <input 
            className="evt-input evt-mono" 
            value={code} 
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }} 
            placeholder="e.g. JDG21" 
            style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.08em" }}
            autoFocus
          />

          {error && (
            <div style={{ 
              color: "#D93025", 
              background: "#FDE8E8", 
              border: "1px solid #F87171", 
              borderRadius: 8, 
              padding: "8px 12px", 
              fontSize: 12.5, 
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="evt-btn evt-btn-teal" 
            style={{ marginTop: 16, width: "100%", justifyContent: "center", fontSize: 15, padding: "12px" }}
          >
            <KeyRound size={16} /> Enter Judge Evaluation Panel
          </button>

          {judges.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed #C7CEDE", textAlign: "center" }}>
              <span className="evt-eyebrow" style={{ fontSize: 10 }}>Active Judge Codes:</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
                {judges.map(j => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => { setCode(j.code); setError(""); }}
                    className="evt-mono evt-badge"
                    style={{ 
                      background: "#16274D", 
                      color: "#FFD400", 
                      border: "none", 
                      cursor: "pointer", 
                      padding: "4px 8px", 
                      fontSize: 12 
                    }}
                  >
                    {j.code} ({j.name})
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    );
  }

  const activeJudge = judges.find(j => j.id === loggedIn?.id) || loggedIn;

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", paddingBottom: 40 }}>
      {/* Judge Top Bar */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "#FFFFFF", 
        border: "2.5px solid #16274D", 
        borderRadius: 14, 
        padding: "10px 16px", 
        marginBottom: 16,
        boxShadow: "3px 3px 0 #16274D"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar photo={activeJudge.photo} name={activeJudge.name} size={38} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#16274D" }}>{activeJudge.name}</div>
            <span className="evt-mono evt-badge" style={{ background: "#29ABE2", color: "#0E1830", fontSize: 10, padding: "2px 6px" }}>
              CODE: {activeJudge.code}
            </span>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="evt-btn evt-btn-ghost" 
          style={{ fontSize: 11, padding: "5px 10px", gap: 4 }}
          title="Sign out of Judge Panel"
        >
          <LogOut size={12} /> Sign Out
        </button>
      </div>

      {/* Waiting screen if no participant selected */}
      {!current ? (
        <div className="evt-card" style={{ padding: 36, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF3C4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Gavel size={28} color="#8A5B00" />
          </div>
          <h2 className="evt-h2" style={{ fontSize: 24, marginBottom: 8 }}>Waiting for Next Performer</h2>
          <p className="evt-sub" style={{ maxWidth: 360, margin: "0 auto" }}>
            The Event Admin has not called a participant to the stage yet. The scoring sheet will appear here automatically when a performance begins.
          </p>
        </div>
      ) : (
        <>
          {/* Active Performer Card */}
          <div 
            style={{ 
              position: "relative", 
              overflow: "hidden", 
              background: "#FFFFFF", 
              border: "3px solid #16274D", 
              borderRadius: 16, 
              padding: 20, 
              marginBottom: 16, 
              boxShadow: "5px 5px 0 #16274D" 
            }}
          >
            <div 
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "url('/Backdrop.PNG')",
                backgroundPosition: "center right",
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
                opacity: 0.16,
                pointerEvents: "none"
              }} 
            />
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar photo={current.photo} name={current.name} size={64} style={{ border: "3px solid #16274D", boxShadow: "0 3px 8px rgba(0,0,0,0.15)" }} />
              <div>
                <div className="evt-eyebrow">On Stage Performer</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 2px" }}>
                  {(current.token || current.code) && (
                    <span className="evt-mono evt-badge" style={{ fontSize: 14, background: "#16274D", color: "#FFD400" }}>
                      {current.token || current.code}
                    </span>
                  )}
                  <h1 className="evt-h1" style={{ margin: 0, fontSize: 26 }}>{current.name}</h1>
                </div>
                <p className="evt-sub" style={{ margin: 0, fontWeight: 600 }}>{current.act || "Performance"}</p>
              </div>
            </div>
          </div>

          {/* Scoring Criteria Card */}
          {(() => {
            const categoryData = getCategoryCriteriaData(current?.categoryId || current?.categoryName || current?.act || 'singing');
            const activeCriteria = (CRITERIA && CRITERIA.length === 5) ? CRITERIA : categoryData.criteria;
            const effectiveMaxCriterion = 20;
            const effectiveMaxTotal = 100;

            return (
              <div className="evt-card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #E7EAF2", paddingBottom: 10 }}>
                  <div>
                    <span className="evt-eyebrow" style={{ margin: 0 }}>Official Scoring Criteria</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#16274D" }}>{categoryData.name}</div>
                  </div>
                  <span className="evt-sub" style={{ fontSize: 12 }}>Rate 0 to {effectiveMaxCriterion} marks</span>
                </div>

                {activeCriteria.map(c => (
                  <div key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span className="evt-label" style={{ margin: 0, fontSize: 13 }}>{c.label} (20 Marks)</span>
                      <span className="evt-mono" style={{ color: "#16274D", fontWeight: 800, fontSize: 15 }}>
                        {marks[c.id] || 0} / {effectiveMaxCriterion}
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={effectiveMaxCriterion} step={1}
                      className="evt-slider"
                      disabled={!!existing && !editing}
                      value={marks[c.id] || 0}
                      onChange={e => setMarksLocal(m => ({ ...m, [c.id]: +e.target.value }))}
                    />
                  </div>
                ))}

                {/* Total Score & Submit */}
                <div style={{ borderTop: "2px solid #16274D", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div className="evt-eyebrow">Your Total Score</div>
                    <div className="evt-score-num" style={{ fontSize: 26, color: "#16274D" }}>
                      {activeCriteria.reduce((s, c) => s + (marks[c.id] || 0), 0)} <span style={{ fontSize: 16, color: "#5B6890" }}>/ {effectiveMaxTotal}</span>
                    </div>
                  </div>

                  {existing && !editing ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="evt-badge evt-badge-ok" style={{ padding: "8px 12px", fontSize: 12 }}>
                        <CheckCircle2 size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                        Scores Submitted
                      </span>
                      <button className="evt-btn evt-btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditing(true)}>
                        Edit Scores
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="evt-btn evt-btn-teal" 
                      style={{ fontSize: 14, padding: "10px 20px" }}
                      onClick={() => {
                        setJudgeScores(current.id, activeJudge.id, marks);
                        setEditing(false);
                      }}
                    >
                      <Gavel size={15} /> Submit Scores
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
