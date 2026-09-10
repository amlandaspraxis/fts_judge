import React, { useEffect, useState, useRef } from 'react';
import { 
  Trophy, QrCode, Sparkles, Gavel, Users, CheckCircle2, Percent
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '../components/PhotoModal';

const EQ_BARS = 7;

const DEFAULT_FALLBACK_JUDGES = [
  { 
    id: "j1", 
    name: "Dr. N. Kapoor", 
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", 
    title: "Senior Faculty & Performing Arts Chair" 
  },
  { 
    id: "j2", 
    name: "Prof. R. Iyer", 
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80", 
    title: "Dean of Cultural Affairs" 
  },
  { 
    id: "j3", 
    name: "Elena Rostova", 
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", 
    title: "National Choreography Lead" 
  }
];

const DEFAULT_FALLBACK_PARTICIPANTS = [
  {
    id: "p1",
    name: "Alex Rivera",
    code: "DAN-07",
    act: "Breakbeat Fusion",
    categoryId: "dance",
    photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
    performed: false
  },
  {
    id: "p2",
    name: "Sanya Malhotra",
    code: "DNC-14",
    act: "Classical Kathak Contemporary",
    categoryId: "dance",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    performed: false
  }
];

function FlipNumber({ value, size = 20 }) {
  return (
    <span className="evt-flip" style={{ fontSize: size }}>
      <span key={value} className="evt-flip-digit">{value}</span>
    </span>
  );
}

function LiveTag({ open }) {
  return open ? (
    <span className="evt-live"><span className="evt-live-dot" />Voting Live</span>
  ) : (
    <span className="evt-closed">Voting Closed</span>
  );
}

function ProjectorCenterPinBanner({ EVENT_PIN }) {
  return (
    <div 
      className="evt-projector-pin-center"
      style={{
        position: "fixed",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "3px solid #16274D",
        borderRadius: 16,
        padding: "6px 22px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45), 3px 3px 0 #16274D",
        animation: "evtpop .3s ease"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 12.5, color: "#16274D", letterSpacing: "0.08em" }}>
        <span style={{ fontSize: 17 }}>🎟️</span>
        <span style={{ color: "#29ABE2", fontWeight: 900 }}>EVENT PIN / CODE:</span>
      </div>
      <div className="evt-mono" style={{ fontSize: 26, fontWeight: 900, color: "#16274D", letterSpacing: "0.14em" }}>
        {EVENT_PIN}
      </div>
    </div>
  );
}

function ProjectorQRDock({ showQR, audienceUrl }) {
  if (!showQR) return null;
  return (
    <div 
      className="evt-projector-qr-dock"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 35,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "3.5px solid #16274D",
        borderRadius: 20,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 18px 48px rgba(0, 0, 0, 0.5), 6px 6px 0 #16274D",
        maxWidth: 220,
        animation: "evtpop .3s ease"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: "#16274D", letterSpacing: "0.05em" }}>
        <QrCode size={16} color="#29ABE2" />
        <span>VOTE LIVE</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ background: "#ffffff", padding: 8, borderRadius: 12, border: "2px solid #16274D", boxShadow: "3px 3px 0 #16274D" }}>
          <QRCodeSVG 
            value={audienceUrl}
            size={135}
            level="M"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#16274D"
          />
        </div>
        <span className="evt-eyebrow" style={{ fontSize: 11, color: "#16274D", fontWeight: 800 }}>Scan to Join</span>
      </div>
    </div>
  );
}

function ProjectorCenterQRCard({ showQR, audienceUrl, isStandby }) {
  if (!showQR) return null;
  return (
    <div 
      style={{ 
        background: "#FFFFFF", 
        border: "4px solid #16274D", 
        borderRadius: 22, 
        padding: "32px 42px", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        gap: 16,
        boxShadow: "0 20px 54px rgba(0, 0, 0, 0.65), 8px 8px 0 #16274D",
        maxWidth: 580,
        width: "92%",
        zIndex: 25,
        animation: "evtpop .35s ease"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
        <div className="evt-marquee" style={{ fontSize: 34, color: "#16274D", textShadow: "2px 2px 0 #FFD400", margin: 0, textAlign: "center" }}>
          {isStandby ? "The Show Begins Shortly" : "Audience Voting Access"}
        </div>
        <div className="evt-sub" style={{ fontSize: 14.5, fontWeight: 600, color: "#5B6890", textAlign: "center" }}>
          Scan the QR code with your phone camera to join live voting
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
          {showQR && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ background: "#fff", padding: 12, borderRadius: 16, border: "3px solid #16274D", boxShadow: "4px 4px 0 #16274D" }}>
                <QRCodeSVG 
                  value={audienceUrl}
                  size={190}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#16274D"
                />
              </div>
              <span className="evt-eyebrow" style={{ fontSize: 12.5, color: "#16274D", fontWeight: 800 }}>Scan to Join</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectorLeaderboardCard({ currentCat, leaderboard = [], leaderboardLimits = {} }) {
  const allFiltered = leaderboard.filter(p => p.categoryId === currentCat?.id);
  const limit = leaderboardLimits?.[currentCat?.id] ?? 5;
  const filtered = limit === 'all' ? allFiltered : allFiltered.slice(0, Number(limit) || 5);
  const heading = `${currentCat?.label || currentCat?.name || "Category"} — ${limit === 'all' ? "Final Leaderboard" : `Top ${limit} Leaderboard`}`;

  return (
    <div style={{ zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", animation: "evtpop .35s ease", marginTop: 10 }}>
      <Trophy size={42} color="#FFD400" style={{ filter: "drop-shadow(0 0 14px rgba(255, 212, 0, 0.7))" }} />
      <div className="evt-marquee" style={{ fontSize: 42, margin: "6px 0 10px 0", textShadow: "3px 3px 0 #16274D" }}>{heading}</div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 620, zIndex: 5 }}>
        {filtered.map((p, i) => (
          <div 
            key={p.id} 
            className="evt-leader-row"
            style={{
              background: i === 0 ? "linear-gradient(90deg, #FFF9D6 0%, #FFFFFF 100%)" : "#FFFFFF",
              borderColor: i === 0 ? "#FFD400" : (i === 1 ? "#A0AEC0" : (i === 2 ? "#CD7F32" : "#C7CEDE")),
              boxShadow: i === 0 ? "0 6px 18px rgba(255, 212, 0, 0.4)" : "0 3px 8px rgba(0,0,0,0.1)",
              borderWidth: i === 0 ? 3 : 2,
              padding: "14px 20px"
            }}
          >
            <div className={`evt-rank ${i === 0 ? "gold" : (i === 1 ? "silver" : (i === 2 ? "bronze" : ""))}`}>{i + 1}</div>
            {p.code && (
              <span 
                className="evt-mono evt-badge" 
                style={{ 
                  fontSize: 13, 
                  padding: "4px 10px", 
                  background: "#16274D", 
                  color: "#FFD400", 
                  border: "1.5px solid #0E1830",
                  borderRadius: 6 
                }}
              >
                {p.code}
              </span>
            )}
            <Avatar photo={p.photo} name={p.name} size={42} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#16274D" }}>{p.name}</div>
              <div className="evt-sub" style={{ fontSize: 13.5 }}>{p.act}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="evt-eyebrow" style={{ fontSize: 10, color: "#5B6890" }}>Score</div>
              <FlipNumber value={p.score} size={20} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="evt-sub" style={{ padding: 28, textAlign: "center", color: "#FFFFFF", background: "rgba(22, 39, 77, 0.9)", borderRadius: 14, border: "2px solid #29ABE2" }}>
            No scores recorded yet in this category.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Clean Projector Portal View
 * Display-only stage screen for audience and HDMI projector.
 * Zero buttons, zero HUD.
 * Shows looping video full-screen whenever nothing is shown on stage.
 * Receives all display instructions remotely from the Admin Dashboard.
 */
export default function ProjectorView({ 
  current, 
  currentId,
  participants = [],
  votingOpen = false,
  audienceVoteCount = () => 0,
  audienceAvg = () => 0,
  judgesAvgOutOf10 = () => 0,
  judgeTotalFor,
  judgeScores = {},
  finalScore = () => 0,
  weights = { judge: 70, audience: 30 },
  scoreRevealed = {},
  leaderboardRevealed = false,
  leaderboard = [],
  categoryFilter,
  CATEGORIES = [],
  EVENT_PIN = '4821',
  showQR = false,
  showEventCode = false,
  pinPosition = 'hidden',
  judges = [],
  showJudgesOnProjector = false,
  selectedJudgeIds = ['j1', 'j2', 'j3'],
  qrSpotlight = false,
  leaderboardLimits = {},
  stageMode = 'video',
  showPhotoOnProjector = true,
  showCodeOnProjector = true,
  showNameOnProjector = true,
  showFormulaBanner = true
}) {
  const [phase, setPhase] = useState({});
  const [barHeights, setBarHeights] = useState(Array(EQ_BARS).fill(20));
  
  const projectorContainerRef = useRef(null);
  const videoRef = useRef(null);

  const displayJudges = (judges && judges.length > 0) ? judges : DEFAULT_FALLBACK_JUDGES;
  const filteredJudges = (Array.isArray(selectedJudgeIds) && selectedJudgeIds.length > 0)
    ? displayJudges.filter(j => selectedJudgeIds.includes(j.id))
    : displayJudges;
  const finalJudgesToShow = filteredJudges.length > 0 ? filteredJudges : displayJudges;
  const activeCurrent = current || null;

  // Determine effective stage display mode commanded by Admin Dashboard
  let effectiveStageMode = stageMode;
  if (leaderboardRevealed) {
    effectiveStageMode = 'leaderboard';
  } else if (showJudgesOnProjector) {
    effectiveStageMode = 'judges';
  } else if (qrSpotlight) {
    effectiveStageMode = 'qr';
  } else if (stageMode === 'performer' && !activeCurrent) {
    // If performer mode requested but no performer is selected, remain on pure video loop
    effectiveStageMode = 'video';
  }

  const pid = activeCurrent?.id;
  const revealedAudience = activeCurrent && !!scoreRevealed?.[pid]?.audience;
  const revealedJudges = activeCurrent && !!scoreRevealed?.[pid]?.judges;
  const revealedOverall = activeCurrent && !!scoreRevealed?.[pid]?.overall;
  const performed = activeCurrent && !!activeCurrent.performed;

  const currentJudgeWeight = weights?.judge ?? 70;
  const currentAudienceWeight = weights?.audience ?? 30;

  const currentCat = CATEGORIES.find(c => c.id === categoryFilter) || CATEGORIES[0];

  const audienceUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}/#/audience`
    : '#/audience';

  // Hotkey 'F' allows technician to easily enter full screen on stage without any visual button
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          projectorContainerRef.current?.requestFullscreen?.().catch(console.warn);
        } else {
          document.exitFullscreen?.().catch(console.warn);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Equalizer animation effect for overall score reveal
  useEffect(() => {
    if (!pid) return;
    if (revealedOverall && !phase[pid]) {
      setPhase(p => ({ ...p, [pid]: "animating" }));
      let ticks = 0;
      const interval = setInterval(() => {
        ticks++;
        setBarHeights(Array.from({ length: EQ_BARS }, () => 15 + Math.random() * 85));
        if (ticks >= 16) {
          clearInterval(interval);
          setPhase(p => ({ ...p, [pid]: "done" }));
        }
      }, 90);
      return () => clearInterval(interval);
    }
    if (!revealedOverall && phase[pid]) {
      setPhase(p => ({ ...p, [pid]: undefined }));
    }
  }, [revealedOverall, pid]);

  // Guaranteed video autoplay and loop listener
  useEffect(() => {
    const play = () => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };
    play();
    const handleVisibility = () => {
      if (!document.hidden) play();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [effectiveStageMode]);

  return (
    <div 
      className="evt-projector" 
      ref={projectorContainerRef} 
      style={{ 
        minHeight: "100vh", 
        width: "100%", 
        position: "relative", 
        padding: effectiveStageMode === 'video' ? 0 : "32px 30px 60px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {/* 1. Looping Fullscreen Video - Always playing edge-to-edge */}
      <video 
        ref={videoRef}
        className="evt-projector-video" 
        autoPlay 
        muted 
        loop 
        playsInline 
        preload="auto" 
        aria-hidden
        onEnded={(e) => {
          try {
            e.target.currentTime = 0;
            e.target.play();
          } catch (err) {}
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 0,
          pointerEvents: "none"
        }}
      >
        <source src="/gemini_generated_video_02D4725A.MP4" type="video/mp4" />
        <source src="/loop.mp4" type="video/mp4" />
      </video>

      {/* 2. Pure Stage Content Display (Zero buttons on projector portal) */}
      
      {/* Standby mode: When effectiveStageMode === 'video', NOTHING is rendered over the video.
          The video plays on loop full screen, edge to edge! */}

      {/* Mode A: Judges Panel Showcase */}
      {effectiveStageMode === 'judges' && (
        <div 
          style={{ 
            background: "rgba(255, 255, 255, 0.88)", 
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "4px solid #16274D", 
            borderRadius: 24, 
            padding: "32px 38px", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: 16,
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7), 10px 10px 0 #16274D",
            maxWidth: finalJudgesToShow.length === 1 ? 640 : (finalJudgesToShow.length === 2 ? 860 : 1100),
            width: "95%",
            zIndex: 30,
            marginTop: (pinPosition === 'center' && showEventCode) ? 38 : 0,
            animation: "evtpop .35s ease"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
            <span className="evt-eyebrow" style={{ color: "#29ABE2", fontWeight: 800, fontSize: 13.5, letterSpacing: "0.18em" }}>
              {finalJudgesToShow.length === 1 
                ? "OFFICIAL EVALUATOR SPOTLIGHT · FRESHMEN TALENT SEARCH 2026"
                : (finalJudgesToShow.length === 2 
                    ? "FEATURED EVALUATORS · FRESHMEN TALENT SEARCH 2026" 
                    : `OFFICIAL EVALUATION PANEL (${finalJudgesToShow.length} JUDGES) · FRESHMEN TALENT SEARCH 2026`)}
            </span>
            <div className="evt-marquee" style={{ fontSize: finalJudgesToShow.length === 1 ? 42 : 46, color: "#16274D", textShadow: "2.5px 2.5px 0 #FFD400", margin: 0 }}>
              {finalJudgesToShow.length === 1 
                ? `Judge Spotlight: ${finalJudgesToShow[0]?.name || "Official Evaluator"}`
                : (finalJudgesToShow.length === 2 ? "Featured Evaluation Panel" : `Panel of ${finalJudgesToShow.length} Distinguished Judges`)}
            </div>
            <div className="evt-sub" style={{ fontSize: 15, fontWeight: 600, color: "#5B6890" }}>
              {finalJudgesToShow.length === 1
                ? (finalJudgesToShow[0]?.title || "Evaluating live performance with official scoring criteria")
                : (finalJudgesToShow.length === 2 
                    ? "Displaying 2 official evaluators for this performance" 
                    : "Adjudicating Performance, Technical Mastery, Creativity & Stage Presence")}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 24, flexWrap: "wrap", width: "100%", marginTop: 10 }}>
            {finalJudgesToShow.map(j => {
              const mark = activeCurrent && judgeTotalFor ? judgeTotalFor(activeCurrent.id, j.id) : null;
              const isSpotlight = finalJudgesToShow.length === 1;
              const isDual = finalJudgesToShow.length === 2;

              return (
                <div 
                  key={j.id} 
                  style={{ 
                    background: "rgba(247, 249, 253, 0.94)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: isSpotlight ? "4px solid #16274D" : "3px solid #16274D",
                    borderRadius: 22,
                    padding: isSpotlight ? "22px 26px 24px" : "16px 18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: isSpotlight ? 320 : (isDual ? 280 : 240),
                    maxWidth: isSpotlight ? 460 : (isDual ? 360 : 300),
                    flex: isSpotlight ? "0 1 440px" : (isDual ? "0 1 340px" : "1 1 240px"),
                    boxShadow: isSpotlight ? "8px 8px 0 #16274D, 0 12px 30px rgba(41, 171, 226, 0.25)" : "6px 6px 0 #16274D"
                  }}
                >
                  {/* Photo Frame */}
                  <div 
                    style={{
                      width: "100%",
                      height: isSpotlight ? 360 : 320,
                      borderRadius: 18,
                      overflow: "hidden",
                      background: "linear-gradient(180deg, #0E1830 0%, #16274D 100%)",
                      border: "3px solid #16274D",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.25), 0 0 0 3px #FFD400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative"
                    }}
                  >
                    {j.photo ? (
                      <img 
                        src={j.photo} 
                        alt={j.name} 
                        style={{ 
                          width: "100%", 
                          height: "100%", 
                          objectFit: "cover", 
                          display: "block" 
                        }} 
                      />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #16274D" }}>
                          <span style={{ fontSize: 40, fontWeight: 900, color: "#16274D" }}>{j.name?.charAt(0)}</span>
                        </div>
                        <span style={{ color: "#FFD400", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em" }}>JUDGE PHOTO</span>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "center", marginTop: 14, width: "100%" }}>
                    <div style={{ fontWeight: 800, fontSize: isSpotlight ? 24 : 20, color: "#16274D" }}>{j.name}</div>
                    <div style={{ fontSize: isSpotlight ? 14.5 : 13, color: "#5B6890", fontWeight: 600, marginTop: 4, minHeight: 38 }}>
                      {j.title || "Distinguished Panelist"}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
                      <span 
                        style={{ 
                          background: isSpotlight ? "linear-gradient(135deg, #16274D 0%, #0E1830 100%)" : "#16274D", 
                          color: "#FFD400", 
                          fontSize: isSpotlight ? 13 : 12, 
                          padding: isSpotlight ? "5px 16px" : "3px 12px", 
                          borderRadius: 8,
                          fontWeight: 800,
                          letterSpacing: "0.05em",
                          display: "inline-block",
                          border: isSpotlight ? "1.5px solid #FFD400" : "none"
                        }}
                      >
                        {isSpotlight ? "★ Chief Evaluator" : "Official Evaluator"}
                      </span>

                      {activeCurrent && (
                        mark !== null ? (
                          <span 
                            style={{ 
                              background: "#E8F5E9", 
                              color: "#2E7D32", 
                              border: "1.5px solid #2E7D32",
                              fontSize: 12, 
                              padding: "3px 10px", 
                              borderRadius: 6,
                              fontWeight: 800
                            }}
                          >
                            ✓ Score Submitted
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              background: "#FFF8E1", 
                              color: "#F57F17", 
                              border: "1.5px solid #F57F17",
                              fontSize: 12, 
                              padding: "3px 10px", 
                              borderRadius: 6,
                              fontWeight: 700
                            }}
                          >
                            Evaluating…
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode B: Center Stage QR Spotlight Card */}
      {effectiveStageMode === 'qr' && (
        <ProjectorCenterQRCard 
          showQR={showQR !== false} 
          showEventCode={showEventCode} 
          audienceUrl={audienceUrl} 
          EVENT_PIN={EVENT_PIN} 
          isStandby={false} 
          pinPosition={pinPosition}
        />
      )}

      {/* Mode C: Category Leaderboard */}
      {effectiveStageMode === 'leaderboard' && (
        <ProjectorLeaderboardCard 
          currentCat={currentCat} 
          leaderboard={leaderboard} 
          leaderboardLimits={leaderboardLimits} 
        />
      )}

      {/* Mode D: Active Performer Card & Score Reveals */}
      {effectiveStageMode === 'performer' && activeCurrent && !performed && (
        <>
          {/* Main Performer Card */}
          <div 
            style={{ 
              background: "#FFFFFF", 
              border: "4px solid #16274D", 
              borderRadius: 24, 
              padding: "28px 52px", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: 12,
              boxShadow: "0 20px 54px rgba(0, 0, 0, 0.65), 8px 8px 0 #16274D",
              maxWidth: 680,
              width: "90%",
              zIndex: 10,
              marginTop: (pinPosition === 'center' && showEventCode) ? 38 : 0,
              animation: "evtpop .35s ease"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800, fontSize: 13, letterSpacing: "0.15em" }}>
                  CURRENTLY ON STAGE
                </span>
                <LiveTag open={votingOpen} />
              </div>

              {/* Participant Photo */}
              {showPhotoOnProjector && (
                <div style={{ position: "relative", marginTop: 4, marginBottom: 2 }}>
                  <Avatar 
                    photo={activeCurrent.photo} 
                    name={activeCurrent.name} 
                    size={128} 
                    style={{ 
                      border: "4px solid #16274D", 
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 4px #FFD400",
                    }} 
                  />
                </div>
              )}

              {/* Event Code Placed Prominently Above the Name */}
              {showCodeOnProjector && activeCurrent.code && (
                <span 
                  className="evt-mono evt-badge" 
                  style={{ 
                    fontSize: 22, 
                    padding: "6px 22px", 
                    background: "#16274D", 
                    color: "#FFD400", 
                    border: "2.5px solid #0E1830",
                    borderRadius: 10,
                    marginTop: 4,
                    boxShadow: "3px 3px 0 #0E1830, 0 0 16px rgba(255, 212, 0, 0.35)",
                    letterSpacing: "0.08em",
                    fontWeight: 900
                  }}
                >
                  EVENT CODE: {activeCurrent.code}
                </span>
              )}

              {/* Performer Name */}
              {showNameOnProjector && (
                <div className="evt-marquee" style={{ fontSize: 52, color: "#16274D", textShadow: "2.5px 2.5px 0 #FFD400", margin: "4px 0 2px 0", textAlign: "center" }}>
                  {activeCurrent.name}
                </div>
              )}

              {/* Act & Category Name */}
              <div className="evt-sub" style={{ fontSize: 19, fontWeight: 700, color: "#29ABE2", textAlign: "center" }}>
                {activeCurrent.act || "Featured Act"} 
                <span style={{ color: "#5B6890", marginLeft: 8, fontSize: 16 }}>
                  · {currentCat?.label || currentCat?.name || "General Category"}
                </span>
              </div>
            </div>
          </div>

          {/* Live Audience Vote Counter */}
          {votingOpen && !revealedOverall && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12, 
              marginTop: 10,
              background: "rgba(22, 39, 77, 0.9)",
              padding: "8px 22px",
              borderRadius: 999,
              border: "2px solid #FFD400",
              boxShadow: "0 4px 14px rgba(0,0,0,0.3)"
            }}>
              <Sparkles size={18} color="#FFD400" />
              <span className="evt-sub" style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>Live Audience Votes Cast:</span>
              <FlipNumber value={audienceVoteCount(activeCurrent.id)} size={24} />
            </div>
          )}

          {/* Score Reveals: Judges Score + Audience Score */}
          {(revealedJudges || revealedAudience) && (
            <div style={{ display: 'flex', gap: 18, marginTop: 14, alignItems: 'center', flexWrap: "wrap", justifyContent: "center" }}>
              {/* Judges Score Card */}
              {revealedJudges && (
                <div 
                  className="evt-score-tile"
                  style={{
                    background: "linear-gradient(135deg, #16274D 0%, #1D3768 100%)",
                    border: "3px solid #29ABE2",
                    boxShadow: "0 8px 24px rgba(41, 171, 226, 0.35), 4px 4px 0 #0E1830",
                    minWidth: 200,
                    textAlign: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                    <Gavel size={15} color="#29ABE2" />
                    <div className="evt-eyebrow" style={{ color: "#29ABE2", margin: 0 }}>JUDGES SCORE</div>
                  </div>
                  <div className="evt-score-num" style={{ fontSize: 40, color: "#FFD400" }}>
                    {judgesAvgOutOf10(activeCurrent.id)} <span style={{ fontSize: 20, color: "#CFE3F5" }}>/ 10</span>
                  </div>
                  <div style={{ 
                    marginTop: 6, 
                    fontSize: 11.5, 
                    fontWeight: 800, 
                    background: "rgba(41, 171, 226, 0.2)", 
                    color: "#29ABE2", 
                    padding: "2px 8px", 
                    borderRadius: 6,
                    display: "inline-block"
                  }}>
                    Ratio: {currentJudgeWeight}%
                  </div>
                </div>
              )}

              {/* Audience Score Card */}
              {revealedAudience && (
                <div 
                  className="evt-score-tile"
                  style={{
                    background: "linear-gradient(135deg, #16274D 0%, #1D3768 100%)",
                    border: "3px solid #FFD400",
                    boxShadow: "0 8px 24px rgba(255, 212, 0, 0.35), 4px 4px 0 #0E1830",
                    minWidth: 200,
                    textAlign: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                    <Users size={15} color="#FFD400" />
                    <div className="evt-eyebrow" style={{ color: "#FFD400", margin: 0 }}>AUDIENCE SCORE</div>
                  </div>
                  <div className="evt-score-num" style={{ fontSize: 40, color: "#FFD400" }}>
                    {audienceAvg(activeCurrent.id)} <span style={{ fontSize: 20, color: "#CFE3F5" }}>/ 10</span>
                  </div>
                  <div style={{ 
                    marginTop: 6, 
                    fontSize: 11.5, 
                    fontWeight: 800, 
                    background: "rgba(255, 212, 0, 0.2)", 
                    color: "#FFD400", 
                    padding: "2px 8px", 
                    borderRadius: 6,
                    display: "inline-block"
                  }}>
                    Ratio: {currentAudienceWeight}% ({audienceVoteCount(activeCurrent.id)} votes)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Combined Formula & Percentage Ratio Banner */}
          {showFormulaBanner && (revealedJudges || revealedAudience) && (
            <div 
              style={{
                background: "rgba(14, 24, 48, 0.94)",
                backdropFilter: "blur(12px)",
                border: "2px solid #FFD400",
                borderRadius: 14,
                padding: "8px 24px",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                marginTop: 12,
                animation: "evtpop .3s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#FFD400", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Percent size={15} />
                <span>Combined Formula Ratio:</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#29ABE2", color: "#0E1830", padding: "3px 10px", borderRadius: 6, fontWeight: 900, fontSize: 13 }}>
                  Judges {currentJudgeWeight}%
                </span>
                <span style={{ color: "#CFE3F5", fontWeight: 900, fontSize: 15 }}>+</span>
                <span style={{ background: "#FFD400", color: "#16274D", padding: "3px 10px", borderRadius: 6, fontWeight: 900, fontSize: 13 }}>
                  Audience {currentAudienceWeight}%
                </span>
              </div>

              <div style={{ color: "#CFE3F5", fontSize: 13, borderLeft: "1.5px solid rgba(255,255,255,0.2)", paddingLeft: 12, fontWeight: 600 }}>
                Calculation: ({judgesAvgOutOf10(activeCurrent.id)} × {currentJudgeWeight}%) + ({audienceAvg(activeCurrent.id)} × {currentAudienceWeight}%)
              </div>
            </div>
          )}

          {/* Final Score Animation & Pop Reveal */}
          {revealedOverall && phase[pid] === "animating" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 12 }}>
              <div className="evt-sub" style={{ color: "#FFD400", fontWeight: 800, fontSize: 16 }}>
                Calculating Combined Final Score ({currentJudgeWeight}% Judges + {currentAudienceWeight}% Audience)…
              </div>
              <div className="evt-eqbars">
                {barHeights.map((h, i) => (
                  <div key={i} className="evt-eqbar" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          )}

          {revealedOverall && phase[pid] === "done" && (
            <div 
              className="evt-final-tile" 
              style={{ 
                marginTop: 12,
                background: "linear-gradient(135deg, #16274D 0%, #0E1830 100%)",
                border: "4px solid #FFD400",
                boxShadow: "0 0 40px rgba(255, 212, 0, 0.5), 8px 8px 0 #0E1830",
                padding: "26px 54px",
                textAlign: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
                <Trophy size={22} color="#FFD400" />
                <div className="evt-eyebrow" style={{ color: "#FFD400", fontSize: 13, letterSpacing: "0.15em" }}>
                  COMBINED FINAL SCORE
                </div>
              </div>

              <div className="evt-final-num" style={{ fontSize: 64, textShadow: "0 0 20px rgba(255,212,0,0.6)" }}>
                {finalScore(activeCurrent.id)}
              </div>

              <div style={{ 
                marginTop: 8, 
                display: "inline-flex", 
                alignItems: "center", 
                gap: 6, 
                background: "#FFD400", 
                color: "#16274D", 
                padding: "4px 16px", 
                borderRadius: 8, 
                fontWeight: 900, 
                fontSize: 13 
              }}>
                <CheckCircle2 size={15} /> Verified Ratio: {currentJudgeWeight}% Judges · {currentAudienceWeight}% Audience
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Top-Right QR Code Dock (Only shown when not in video-only standby mode) */}
      {effectiveStageMode !== 'video' && effectiveStageMode !== 'qr' && (activeCurrent || showJudgesOnProjector || leaderboardRevealed) && showQR && (
        <ProjectorQRDock 
          showQR={showQR} 
          audienceUrl={audienceUrl} 
        />
      )}
    </div>
  );
}
