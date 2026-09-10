import React, { useState } from 'react';
import { 
  Gavel, ClipboardList, KeyRound, Plus, Trophy, Eye, EyeOff, Users, QrCode, MonitorPlay, 
  UserPlus, BadgeCheck, ExternalLink, Pencil, Check, X, Camera, Image as ImageIcon, LogOut,
  Sliders, Percent, Play, Square, Tv, ChevronLeft, ChevronRight, Sparkles, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { sortParticipantsByCode } from '../lib/scoring';
import PhotoModal, { Avatar } from '../components/PhotoModal';

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

export default function AdminView(props) {
  const {
    participants, addParticipant, judges, addJudge, registrations,
    current, currentId, selectParticipant, votingOpen, setVotingOpen,
    audienceVoteCount, audienceAvg, judgeTotalFor, judgesAvgOutOf10, finalScore,
    scoreRevealed, setScoreRevealed, leaderboardRevealed, setLeaderboardRevealed,
    weights, setWeights, leaderboard, categoryFilter, setCategoryFilter,
    CATEGORIES, togglePerformed, updateParticipant, removeParticipant, updateJudge, removeJudge,
    lastUndoAction, undoMarkDone,
    showQR, setShowQR, showEventCode, setShowEventCode,
    showJudgesOnProjector, setShowJudgesOnProjector,
    qrSpotlight, setQrSpotlight,
    leaderboardLimits, setLeaderboardLimit,
    clearAllData,
    stageMode, setStageMode,
    showPhotoOnProjector, setShowPhotoOnProjector,
    showCodeOnProjector, setShowCodeOnProjector,
    showNameOnProjector, setShowNameOnProjector,
    showFormulaBanner, setShowFormulaBanner
  } = props;

  const [newName, setNewName] = useState("");
  const [newAct, setNewAct] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(CATEGORIES[0].id);
  const [newCodeNumber, setNewCodeNumber] = useState("");
  const [newParticipantPhoto, setNewParticipantPhoto] = useState(null);
  const [selectedSection, setSelectedSection] = useState(CATEGORIES[0]?.id || 'dance');
  const [copied, setCopied] = useState(false);

  const audienceUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/live/audience`
    : '/live/audience';

  const copyAudienceLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(audienceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const [newJudgeName, setNewJudgeName] = useState("");
  const [newJudgePhoto, setNewJudgePhoto] = useState(null);
  const [justAddedJudgeCode, setJustAddedJudgeCode] = useState(null);
  const [editingParticipantId, setEditingParticipantId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAct, setEditAct] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const [editingJudgeId, setEditingJudgeId] = useState(null);
  const [editJudgeName, setEditJudgeName] = useState("");

  // Photo modal state
  const [photoModal, setPhotoModal] = useState({
    isOpen: false,
    title: "Set Photo",
    currentPhoto: null,
    onSave: () => { }
  });

  const openParticipantPhotoModal = (participant) => {
    setPhotoModal({
      isOpen: true,
      title: `Set Photo for ${participant.name}`,
      currentPhoto: participant.photo || null,
      onSave: (photo) => updateParticipant(participant.id, { photo })
    });
  };

  const openJudgePhotoModal = (judge) => {
    setPhotoModal({
      isOpen: true,
      title: `Full-Body Photo for ${judge.name}`,
      currentPhoto: judge.photo || null,
      defaultMode: "portrait",
      onSave: (photo) => updateJudge(judge.id, { photo })
    });
  };

  const startEditJudge = (judge) => {
    setEditingJudgeId(judge.id);
    setEditJudgeName(judge.name);
  };

  const saveJudgeEdit = (id) => {
    if (editJudgeName.trim()) {
      updateJudge(id, { name: editJudgeName.trim() });
    }
    setEditingJudgeId(null);
    setEditJudgeName("");
  };

  const cancelJudgeEdit = () => {
    setEditingJudgeId(null);
    setEditJudgeName("");
  };

  const pendingRegs = registrations.filter(r => r.status === "pending");

  const submitParticipant = () => {
    if (!newName.trim()) return;
    const cat = CATEGORIES.find(c => c.id === newCategoryId);
    let code = "";
    if (newCodeNumber.trim()) {
      code = `${cat?.prefix || ""}${newCodeNumber.trim().toUpperCase()}`;
    } else {
      const catParts = participants.filter(p => p.categoryId === newCategoryId);
      let maxNum = 0;
      catParts.forEach(p => {
        const m = p.code?.match(/\d+/);
        if (m) {
          const val = parseInt(m[0], 10);
          if (val > maxNum) maxNum = val;
        }
      });
      code = `${cat?.prefix || ""}${maxNum + 1}`;
    }
    addParticipant(newName.trim(), newAct.trim() || "Unlisted act", newCategoryId, code, newParticipantPhoto);
    setNewName(""); setNewAct(""); setNewCodeNumber(""); setNewParticipantPhoto(null);
  };
  const submitJudge = () => {
    if (!newJudgeName.trim()) return;
    const code = addJudge(newJudgeName.trim(), newJudgePhoto);
    setJustAddedJudgeCode({ name: newJudgeName.trim(), code });
    setNewJudgeName("");
    setNewJudgePhoto(null);
  };

  // Live Projector Stage Handlers
  const handleStandbyVideo = () => {
    if (setStageMode) setStageMode('video');
    if (setShowJudgesOnProjector) setShowJudgesOnProjector(false);
    if (setQrSpotlight) setQrSpotlight(false);
    if (setLeaderboardRevealed) setLeaderboardRevealed(false);
  };

  const handleShowPerformerOnProjector = (pid = null) => {
    if (setStageMode) setStageMode('performer');
    if (setShowJudgesOnProjector) setShowJudgesOnProjector(false);
    if (setQrSpotlight) setQrSpotlight(false);
    if (setLeaderboardRevealed) setLeaderboardRevealed(false);
    if (pid) {
      selectParticipant(pid);
    } else if (!currentId && participants.length > 0) {
      selectParticipant(participants[0].id);
    }
  };

  const handleToggleJudgesOnProjector = () => {
    const nextState = !showJudgesOnProjector;
    if (setShowJudgesOnProjector) setShowJudgesOnProjector(nextState);
    if (nextState) {
      if (setStageMode) setStageMode('judges');
      if (setQrSpotlight) setQrSpotlight(false);
      if (setLeaderboardRevealed) setLeaderboardRevealed(false);
    } else {
      if (setStageMode) setStageMode(currentId ? 'performer' : 'video');
    }
  };

  const handleToggleQRSpotlight = () => {
    const next = !qrSpotlight;
    if (setQrSpotlight) setQrSpotlight(next);
    if (next) {
      if (setShowQR) setShowQR(true);
      if (setShowJudgesOnProjector) setShowJudgesOnProjector(false);
      if (setLeaderboardRevealed) setLeaderboardRevealed(false);
    }
  };

  const handleToggleLeaderboardProjector = () => {
    const next = !leaderboardRevealed;
    if (setLeaderboardRevealed) setLeaderboardRevealed(next);
    if (next) {
      if (setShowJudgesOnProjector) setShowJudgesOnProjector(false);
      if (setQrSpotlight) setQrSpotlight(false);
    }
  };

  const handleRevealAllScores = () => {
    if (!currentId || !setScoreRevealed) return;
    setScoreRevealed(s => ({
      ...s,
      [currentId]: {
        ...(s[currentId] || {}),
        judges: true,
        audience: true,
        overall: true
      }
    }));
  };

  const handleHideAllScores = () => {
    if (!currentId || !setScoreRevealed) return;
    setScoreRevealed(s => ({
      ...s,
      [currentId]: {
        ...(s[currentId] || {}),
        judges: false,
        audience: false,
        overall: false
      }
    }));
  };

  const handleStepParticipant = (direction) => {
    const activeCatList = sortParticipantsByCode(participants.filter(p => !categoryFilter || p.categoryId === categoryFilter));
    if (activeCatList.length === 0) return;
    const currIdx = activeCatList.findIndex(p => p.id === currentId);
    let nextIdx = 0;
    if (direction === 'next') {
      nextIdx = (currIdx + 1) % activeCatList.length;
    } else {
      nextIdx = (currIdx - 1 + activeCatList.length) % activeCatList.length;
    }
    handleShowPerformerOnProjector(activeCatList[nextIdx]?.id);
  };

  // Determine effective stage mode for live status indicator
  let effectiveStageMode = stageMode || 'video';
  if (leaderboardRevealed) {
    effectiveStageMode = 'leaderboard';
  } else if (showJudgesOnProjector) {
    effectiveStageMode = 'judges';
  } else if (qrSpotlight) {
    effectiveStageMode = 'qr';
  } else if (stageMode === 'performer' && !current) {
    effectiveStageMode = 'video';
  }

  // Determine what the projector is currently displaying
  let projectorStatusBadge = {
    title: "Standby Video Looping Fullscreen",
    sub: "Stage is idle with clean looping video edge-to-edge. No buttons shown on projector.",
    icon: MonitorPlay,
    color: "#29ABE2",
    bg: "#E8F4FD",
    textColor: "#FFFFFF"
  };

  if (leaderboardRevealed) {
    const activeCat = CATEGORIES.find(c => c.id === categoryFilter);
    projectorStatusBadge = {
      title: `Category Leaderboard: ${activeCat?.label || "Standings"}`,
      sub: "Projector is broadcasting category rankings & calculated final scores.",
      icon: Trophy,
      color: "#FFD400",
      bg: "#16274D",
      textColor: "#16274D"
    };
  } else if (showJudgesOnProjector || effectiveStageMode === 'judges') {
    projectorStatusBadge = {
      title: `Official Judges Panel (${judges.length} Judges)`,
      sub: "Projector is showcasing high-res photos, names and credentials of all judges.",
      icon: Gavel,
      color: "#29ABE2",
      bg: "#E8F4FD",
      textColor: "#FFFFFF"
    };
  } else if (qrSpotlight) {
    projectorStatusBadge = {
      title: `Audience Voting QR Spotlight (Center Stage)`,
      sub: `Projector is displaying full-screen audience voting QR code.`,
      icon: QrCode,
      color: "#16274D",
      bg: "#FFF9D6",
      textColor: "#FFD400"
    };
  } else if (effectiveStageMode === 'performer' && current && !current.performed) {
    const rev = scoreRevealed?.[current.id] || {};
    const scoresRevealedList = [
      rev.judges ? "Judges" : null,
      rev.audience ? "Audience" : null,
      rev.overall ? "Final" : null
    ].filter(Boolean);
    const scoreStateStr = scoresRevealedList.length > 0 ? `Scores: ${scoresRevealedList.join(" + ")}` : "Scores: Hidden";

    projectorStatusBadge = {
      title: `[${current.code || "ACT"}] ${current.name} on Stage`,
      sub: `Act: ${current.act} · Photo: ${showPhotoOnProjector ? "ON" : "OFF"} · Code: ${showCodeOnProjector ? "ON" : "OFF"} · ${scoreStateStr}`,
      icon: Users,
      color: "#1C8A4C",
      bg: "#E8F8F0",
      textColor: "#FFFFFF"
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="evt-eyebrow">PORTAL 1 · CONTROL ROOM</div>
          <h1 className="evt-h1">Admin Master Console</h1>
          <p className="evt-sub">Changes here sync instantly to judges, audience phones and the projector.</p>
        </div>
        <button
          onClick={() => {
            try {
              localStorage.removeItem('fts_auth_token');
            } catch {}
            window.location.href = '/login';
          }}
          className="evt-btn evt-btn-ghost"
          style={{ fontSize: 12, padding: "7px 14px", color: "#EF4136", borderColor: "#EF4136", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          title="Sign out of Admin Master Console & return to Login"
        >
          <LogOut size={13} color="#EF4136" /> Log Out Admin
        </button>
      </div>

      {lastUndoAction && (
        <div className="evt-card" style={{ background: "#FFF4E6", borderColor: "#FFD400", padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div className="evt-eyebrow" style={{ color: "#B8860B" }}>Oops!</div>
            <div style={{ fontWeight: 700, color: "#16274D", marginBottom: 4 }}>{lastUndoAction.name} marked as {lastUndoAction.wasPerformed ? "Done" : "Not Done"}</div>
            <div className="evt-sub" style={{ color: "#8B7500" }}>Click undo to revert this change</div>
          </div>
          <button className="evt-btn evt-btn-amber" onClick={undoMarkDone} style={{ whiteSpace: "nowrap" }}>
            ↶ Undo
          </button>
        </div>
      )}

      {/* 🎬 MASTER LIVE PROJECTOR SCREEN CONTROLS */}
      <div className="evt-card" style={{ border: "3px solid #16274D", boxShadow: "0 12px 36px rgba(22, 39, 77, 0.18)" }}>
        {/* Header & Status Indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", paddingBottom: 16, borderBottom: "2px solid #E2E8F0" }}>
          <div>
            <div className="evt-eyebrow" style={{ color: "#29ABE2", fontWeight: 800, fontSize: 12.5, letterSpacing: "0.15em" }}>
              STAGE HDMI BROADCAST · MASTER CONTROL
            </div>
            <h2 className="evt-h2" style={{ margin: "2px 0 4px", fontSize: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <MonitorPlay size={24} color="#16274D" /> Live Projector Screen Controls
            </h2>
            <p className="evt-sub" style={{ margin: 0, fontSize: 13.5 }}>
              Command everything shown to the audience on the projector. The projector portal itself stays clean and idle with <strong>zero buttons</strong>.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="/live/projector"
              target="_blank"
              rel="noreferrer"
              className="evt-btn evt-btn-amber"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", textDecoration: "none", fontWeight: 800, fontSize: 13 }}
              title="Open the clean, buttonless projector display in a new window for the HDMI cable"
            >
              <Tv size={16} /> Open Projector Screen (Stage HDMI) <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Live Broadcast Status Banner */}
        <div style={{
          marginTop: 16,
          padding: "14px 18px",
          background: projectorStatusBadge.bg,
          border: `2px solid ${projectorStatusBadge.color || "#C7CEDE"}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: projectorStatusBadge.color,
              color: projectorStatusBadge.textColor || "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              flexShrink: 0
            }}>
              <projectorStatusBadge.icon size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="evt-live-dot" style={{ width: 8, height: 8 }} />
                <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: projectorStatusBadge.color }}>
                  Projector Broadcast Status
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#16274D", marginTop: 2 }}>
                {projectorStatusBadge.title}
              </div>
              <div className="evt-sub" style={{ fontSize: 12, marginTop: 1 }}>
                {projectorStatusBadge.sub}
              </div>
            </div>
          </div>


        </div>

        {/* 1. Stage Mode Preset Buttons */}
        <div style={{ marginTop: 20 }}>
          <div className="evt-eyebrow" style={{ color: "#5B6890", marginBottom: 8 }}>
            1. CHOOSE WHAT TO BROADCAST ON PROJECTOR
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {/* Standby Video Loop */}
            <button
              className={`evt-btn ${effectiveStageMode === 'video' ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={handleStandbyVideo}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: effectiveStageMode === 'video' ? 2.5 : 1.5
              }}
              title="Clear stage: projector only plays the looping video full screen with no buttons"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <Play size={16} /> Standby Video Loop
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                Clean fullscreen edge-to-edge video
              </span>
            </button>

            {/* Show Performer */}
            <button
              className={`evt-btn ${effectiveStageMode === 'performer' ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={() => handleShowPerformerOnProjector(currentId)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: effectiveStageMode === 'performer' ? 2.5 : 1.5
              }}
              title="Show participant photo, event code, name and score cards"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <Users size={16} /> Performer on Stage
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                {current ? `${current.name} (${current.code})` : "Display active participant"}
              </span>
            </button>

            {/* Show Judges */}
            <button
              className={`evt-btn ${showJudgesOnProjector ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={handleToggleJudgesOnProjector}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: showJudgesOnProjector ? 2.5 : 1.5
              }}
              title="Show photos and titles of all registered judges on stage"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <Gavel size={16} /> Judges Panel ({judges.length})
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                {showJudgesOnProjector ? "Currently visible on stage" : "Show judge photos & status"}
              </span>
            </button>

            {/* Show QR Spotlight */}
            <button
              className={`evt-btn ${qrSpotlight ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={handleToggleQRSpotlight}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: qrSpotlight ? 2.5 : 1.5
              }}
              title="Display large voting QR full screen in center stage"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <QrCode size={16} /> QR Spotlight
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                Center stage voting join screen
              </span>
            </button>

            {/* Show Leaderboard */}
            <button
              className={`evt-btn ${leaderboardRevealed ? 'evt-btn-amber' : 'evt-btn-ghost'}`}
              onClick={handleToggleLeaderboardProjector}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: leaderboardRevealed ? 2.5 : 1.5
              }}
              title="Publish or unpublish category rankings on the projector"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <Trophy size={16} /> Leaderboard
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                {leaderboardRevealed ? "Published on projector" : "Publish top finalists"}
              </span>
            </button>
          </div>
        </div>

        {/* 2. Performer Selection & Display Elements on Projector */}
        <div style={{ marginTop: 20, padding: 18, background: "#F7F9FD", border: "2px solid #C7CEDE", borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
                2. ACTIVE PERFORMER & STAGE ELEMENTS
              </div>
              <div style={{ fontSize: 13, color: "#5B6890", fontWeight: 600 }}>
                Select who is currently performing, and toggle what details appear on the screen:
              </div>
            </div>

            {/* Step Prev / Next Buttons */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={() => handleStepParticipant('prev')}
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}
                title="Switch projector to previous act"
              >
                <ChevronLeft size={14} /> Prev Act
              </button>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={() => handleStepParticipant('next')}
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 4 }}
                title="Switch projector to next act"
              >
                Next Act <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Category Filter Chips & Performer Selector Dropdown */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(c => {
                const isSel = categoryFilter === c.id;
                return (
                  <button
                    key={c.id}
                    className={`evt-chip ${isSel ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(c.id)}
                    style={{ padding: "5px 12px", fontSize: 12 }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div style={{ flex: "1 1 280px" }}>
              <select
                className="evt-input"
                value={currentId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    handleStandbyVideo();
                  } else {
                    handleShowPerformerOnProjector(val);
                  }
                }}
                style={{ fontWeight: 700, fontSize: 13.5, background: "#FFFFFF", padding: "8px 12px" }}
              >
                <option value="">-- 🎬 Standby (Loop Video Fullscreen) --</option>
                {sortParticipantsByCode(participants.filter(p => !categoryFilter || p.categoryId === categoryFilter)).map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code || "ACT"}] {p.name} - {p.act} {p.performed ? "(Done)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Display Toggles: Photo, Event Code, Name */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            background: "#FFFFFF",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1.5px solid #C7CEDE"
          }}>
            {/* Photo Toggle */}
            <button
              className={`evt-btn ${showPhotoOnProjector ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => setShowPhotoOnProjector && setShowPhotoOnProjector(!showPhotoOnProjector)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Show or hide participant photo portrait on the projector"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={15} /> Participant Photo
              </span>
              <span className={`evt-badge ${showPhotoOnProjector ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 11 }}>
                {showPhotoOnProjector ? "SHOWN" : "HIDDEN"}
              </span>
            </button>

            {/* Event Code Toggle */}
            <button
              className={`evt-btn ${showCodeOnProjector ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => setShowCodeOnProjector && setShowCodeOnProjector(!showCodeOnProjector)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Show or hide large event code badge (e.g. DAN-07) on the projector"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BadgeCheck size={15} /> Event Code
              </span>
              <span className={`evt-badge ${showCodeOnProjector ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 11 }}>
                {showCodeOnProjector ? "SHOWN" : "HIDDEN"}
              </span>
            </button>

            {/* Name & Act Toggle */}
            <button
              className={`evt-btn ${showNameOnProjector ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => setShowNameOnProjector && setShowNameOnProjector(!showNameOnProjector)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Show or hide performer name marquee and description on the projector"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={15} /> Name & Act Title
              </span>
              <span className={`evt-badge ${showNameOnProjector ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 11 }}>
                {showNameOnProjector ? "SHOWN" : "HIDDEN"}
              </span>
            </button>

            {/* Live Voting Toggle */}
            <button
              className={`evt-btn ${votingOpen ? "evt-btn-red" : "evt-btn-teal"}`}
              onClick={() => setVotingOpen(!votingOpen)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Open or close real-time audience voting for current act"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={15} /> {votingOpen ? "Close Audience Voting" : "Open Audience Voting"}
              </span>
              <span className="evt-badge" style={{ background: votingOpen ? "#FFF1F0" : "#E8F4FD", color: votingOpen ? "#EF4136" : "#16274D", fontSize: 11, fontWeight: 800 }}>
                {currentId ? `${audienceVoteCount(currentId)} votes` : "0 votes"}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Score Reveals on Projector */}
        <div style={{ marginTop: 20, padding: 18, background: "#F7F9FD", border: "2px solid #C7CEDE", borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
                3. PROJECTOR SCORE REVEALS {current ? `FOR [${current.code || "ACT"}] ${current.name}` : ""}
              </div>
              <div style={{ fontSize: 13, color: "#5B6890", fontWeight: 600 }}>
                Control dramatic score reveals on the big screen:
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={handleRevealAllScores}
                disabled={!currentId}
                style={{ fontSize: 12, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
                title="Instantly reveal all scores on the projector"
              >
                <Eye size={13} /> Reveal All Scores
              </button>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={handleHideAllScores}
                disabled={!currentId}
                style={{ fontSize: 12, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
                title="Hide all scores on the projector"
              >
                <EyeOff size={13} /> Hide All Scores
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {/* Judges Score Toggle */}
            <div style={{
              background: "#FFFFFF",
              border: `2px solid ${scoreRevealed[currentId]?.judges ? "#29ABE2" : "#C7CEDE"}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="evt-eyebrow" style={{ color: "#29ABE2", margin: 0 }}>JUDGES' AVERAGE</span>
                <span className={`evt-badge ${scoreRevealed[currentId]?.judges ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 10.5 }}>
                  {scoreRevealed[currentId]?.judges ? "REVEALED ON STAGE" : "HIDDEN"}
                </span>
              </div>
              <div className="evt-score-num" style={{ fontSize: 26 }}>
                {currentId ? judgesAvgOutOf10(currentId) : "—"} <span style={{ fontSize: 14, color: "#5B6890" }}>/ 10</span>
              </div>
              <button
                className={`evt-btn ${scoreRevealed[currentId]?.judges ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
                onClick={() => setScoreRevealed(s => ({ ...s, [currentId]: { ...(s[currentId] || {}), judges: !s[currentId]?.judges } }))}
                disabled={!currentId}
                style={{ marginTop: "auto", fontSize: 12, padding: "6px 12px", justifyContent: "center" }}
              >
                <Gavel size={14} />
                {scoreRevealed[currentId]?.judges ? "Hide Judges on Projector" : "Reveal Judges on Projector"}
              </button>
            </div>

            {/* Audience Score Toggle */}
            <div style={{
              background: "#FFFFFF",
              border: `2px solid ${scoreRevealed[currentId]?.audience ? "#FFD400" : "#C7CEDE"}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="evt-eyebrow" style={{ color: "#B8860B", margin: 0 }}>AUDIENCE AVERAGE</span>
                <span className={`evt-badge ${scoreRevealed[currentId]?.audience ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 10.5 }}>
                  {scoreRevealed[currentId]?.audience ? "REVEALED ON STAGE" : "HIDDEN"}
                </span>
              </div>
              <div className="evt-score-num" style={{ fontSize: 26, color: "#16274D" }}>
                {currentId ? audienceAvg(currentId) : "—"} <span style={{ fontSize: 14, color: "#5B6890" }}>/ 10</span>
              </div>
              <button
                className={`evt-btn ${scoreRevealed[currentId]?.audience ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
                onClick={() => setScoreRevealed(s => ({ ...s, [currentId]: { ...(s[currentId] || {}), audience: !s[currentId]?.audience } }))}
                disabled={!currentId}
                style={{ marginTop: "auto", fontSize: 12, padding: "6px 12px", justifyContent: "center" }}
              >
                <Users size={14} />
                {scoreRevealed[currentId]?.audience ? "Hide Audience on Projector" : "Reveal Audience on Projector"}
              </button>
            </div>

            {/* Combined Final Score Reveal */}
            <div style={{
              background: "#FFFFFF",
              border: `2px solid ${scoreRevealed[currentId]?.overall ? "#FFD400" : "#C7CEDE"}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: scoreRevealed[currentId]?.overall ? "0 4px 16px rgba(255,212,0,0.25)" : "none"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="evt-eyebrow" style={{ color: "#16274D", margin: 0 }}>COMBINED FINAL SCORE</span>
                <span className={`evt-badge ${scoreRevealed[currentId]?.overall ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 10.5 }}>
                  {scoreRevealed[currentId]?.overall ? "REVEALED ON STAGE" : "HIDDEN"}
                </span>
              </div>
              <div className="evt-score-num" style={{ fontSize: 26, color: "#16274D" }}>
                {currentId ? finalScore(currentId) : "—"} <span style={{ fontSize: 14, color: "#5B6890" }}>/ 10</span>
              </div>
              <button
                className={`evt-btn ${scoreRevealed[currentId]?.overall ? 'evt-btn-amber' : 'evt-btn-ghost'}`}
                onClick={() => setScoreRevealed(s => ({ ...s, [currentId]: { ...(s[currentId] || {}), overall: !s[currentId]?.overall } }))}
                disabled={!currentId}
                style={{ marginTop: "auto", fontSize: 12, padding: "6px 12px", justifyContent: "center", fontWeight: 800 }}
              >
                {scoreRevealed[currentId]?.overall ? <EyeOff size={14} /> : <Trophy size={14} />}
                {scoreRevealed[currentId]?.overall ? "Hide Combined Final Score" : "Reveal Combined Final Score"}
              </button>
            </div>
          </div>
        </div>

        {/* 4. Combined Percentage Ratio System */}
        <div style={{ marginTop: 20, padding: 18, background: "#F7F9FD", border: "2px solid #C7CEDE", borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
                4. COMBINED PERCENTAGE RATIO ({weights.judge}% JUDGES / {weights.audience}% AUDIENCE)
              </div>
              <div style={{ fontSize: 13, color: "#5B6890", fontWeight: 600 }}>
                Configure the evaluation balance applied when computing final scores on the projector:
              </div>
            </div>

            {/* Formula Banner Toggle for Projector */}
            <button
              className={`evt-btn ${showFormulaBanner ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => setShowFormulaBanner && setShowFormulaBanner(!showFormulaBanner)}
              style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              title="Show or hide the calculation equation badge on the projector screen"
            >
              <Percent size={14} />
              {showFormulaBanner ? "Hide Formula Banner on Projector" : "Show Formula Banner on Projector"}
            </button>
          </div>

          {/* Quick Ratio Presets */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#16274D" }}>Quick Presets:</span>
            {[
              { j: 70, a: 30, label: "70% / 30% (Default FTS)" },
              { j: 80, a: 20, label: "80% / 20%" },
              { j: 60, a: 40, label: "60% / 40%" },
              { j: 50, a: 50, label: "50% / 50% (Equal)" },
              { j: 100, a: 0, label: "100% Judges Only" }
            ].map(preset => {
              const isActive = weights.judge === preset.j && weights.audience === preset.a;
              return (
                <button
                  key={preset.label}
                  className={`evt-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setWeights({ judge: preset.j, audience: preset.a })}
                  style={{ padding: "5px 12px", fontSize: 12 }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Ratio Slider & Inputs */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", background: "#FFFFFF", padding: "14px 18px", borderRadius: 12, border: "1.5px solid #C7CEDE" }}>
            <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 }}>
                <span style={{ color: "#29ABE2" }}>Judges: {weights.judge}%</span>
                <span style={{ color: "#16274D" }}>Audience: {weights.audience}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.judge}
                onChange={e => {
                  const j = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                  setWeights({ judge: j, audience: 100 - j });
                }}
                style={{ width: "100%", accentColor: "#29ABE2", cursor: "pointer" }}
              />
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#16274D" }}>
                Judges %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.judge}
                  onChange={e => {
                    const j = Math.max(0, Math.min(100, +e.target.value));
                    setWeights({ judge: j, audience: 100 - j });
                  }}
                  className="evt-input"
                  style={{ width: 75, marginTop: 3, padding: "5px 8px", textAlign: "center", fontSize: 13 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#5B6890" }}>
                Audience %
                <input
                  type="number"
                  value={weights.audience}
                  disabled
                  className="evt-input"
                  style={{ width: 75, marginTop: 3, padding: "5px 8px", textAlign: "center", fontSize: 13, background: "#F1F5F9" }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 5. Audience QR & Event PIN Controls */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
                5. AUDIENCE VOTING QR ACCESS
              </div>
              <div style={{ fontSize: 13, color: "#5B6890" }}>
                Display the QR code on stage for phone voting access:
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                className={`evt-btn ${showQR ? "evt-btn-teal" : "evt-btn-ghost"}`}
                onClick={() => setShowQR(!showQR)}
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <QrCode size={14} /> {showQR ? "Hide QR Code" : "Show QR Code"}
              </button>

              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className={`evt-chip ${!qrSpotlight ? 'active' : ''}`}
                  onClick={() => setQrSpotlight && setQrSpotlight(false)}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  title="Show QR in stage corner so performer remains visible"
                >
                  Corner Dock
                </button>
                <button
                  className={`evt-chip ${qrSpotlight ? 'active' : ''}`}
                  onClick={() => setQrSpotlight && setQrSpotlight(true)}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  title="Show full screen in center stage"
                >
                  Center Spotlight
                </button>
              </div>
            </div>
          </div>

          {showQR && (
            <div style={{
              marginTop: 14,
              padding: 16,
              background: "#F7F9FD",
              border: "2px solid #C7CEDE",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ background: "#ffffff", padding: 8, borderRadius: 12, border: "2px solid #16274D", boxShadow: "3px 3px 0 #16274D" }}>
                  <QRCodeSVG
                    value={audienceUrl}
                    size={100}
                    level="M"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#16274D"
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#16274D" }}>Audience QR Dock Active on Projector</div>
                  <div className="evt-mono" style={{ fontSize: 12, color: "#5B6890", marginTop: 2 }}>{audienceUrl}</div>
                  <div className="evt-sub" style={{ fontSize: 12, marginTop: 4 }}>Audience scans this QR code to access mobile voting directly</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="evt-btn evt-btn-ghost"
                  onClick={copyAudienceLink}
                  style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {copied ? <Check size={13} color="#1C8A4C" /> : <ClipboardList size={13} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a
                  href="#/audience"
                  target="_blank"
                  rel="noreferrer"
                  className="evt-btn evt-btn-ghost"
                  style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                >
                  Test Portal <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="evt-card">
        <div className="evt-h2" style={{ textAlign: "center" }}>Event Portals & Direct Links</div>
        <p className="evt-sub" style={{ textAlign: "center", marginBottom: 16 }}>
          Each portal runs independently with isolated access. Open these across screens, tablets, and mobile devices:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={{ background: "#F7F9FD", border: "1.5px solid #C7CEDE", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#16274D" }}>
              <MonitorPlay size={16} color="#29ABE2" /> Projector Stage
            </div>
            <div className="evt-sub" style={{ fontSize: 12, flex: 1 }}>Pure stage screen for HDMI projector</div>
            <a href="/live/projector" target="_blank" rel="noreferrer" className="evt-btn evt-btn-ghost" style={{ fontSize: 12, padding: "7px 12px", justifyContent: "center", textDecoration: "none", marginTop: "auto" }}>
              Open Projector <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ background: "#F7F9FD", border: "1.5px solid #C7CEDE", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#16274D" }}>
              <UserPlus size={16} color="#29ABE2" /> Registration Desk
            </div>
            <div className="evt-sub" style={{ fontSize: 12, flex: 1 }}>Desk volunteer code issuing</div>
            <a href="/live/volunteer" target="_blank" rel="noreferrer" className="evt-btn evt-btn-ghost" style={{ fontSize: 12, padding: "7px 12px", justifyContent: "center", textDecoration: "none", marginTop: "auto" }}>
              Open Desk <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ background: "#F7F9FD", border: "1.5px solid #C7CEDE", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#16274D" }}>
              <BadgeCheck size={16} color="#29ABE2" /> Participant Portal
            </div>
            <div className="evt-sub" style={{ fontSize: 12, flex: 1 }}>Participant code claim & enrolment</div>
            <a href="/live/enroll" target="_blank" rel="noreferrer" className="evt-btn evt-btn-ghost" style={{ fontSize: 12, padding: "7px 12px", justifyContent: "center", textDecoration: "none", marginTop: "auto" }}>
              Open Participant <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ background: "#F7F9FD", border: "1.5px solid #C7CEDE", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#16274D" }}>
              <Gavel size={16} color="#29ABE2" /> Judge Panel
            </div>
            <div className="evt-sub" style={{ fontSize: 12, flex: 1 }}>Scoring sliders for judges</div>
            <a href="/live/judge" target="_blank" rel="noreferrer" className="evt-btn evt-btn-ghost" style={{ fontSize: 12, padding: "7px 12px", justifyContent: "center", textDecoration: "none", marginTop: "auto" }}>
              Open Judge Panel <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ background: "#F7F9FD", border: "1.5px solid #C7CEDE", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#16274D" }}>
              <Users size={16} color="#29ABE2" /> Audience Portal
            </div>
            <div className="evt-sub" style={{ fontSize: 12, flex: 1 }}>Audience QR destination & voting</div>
            <a href="/live/audience" target="_blank" rel="noreferrer" className="evt-btn evt-btn-ghost" style={{ fontSize: 12, padding: "7px 12px", justifyContent: "center", textDecoration: "none", marginTop: "auto" }}>
              Open Audience <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="evt-card">
        <div className="evt-h2">Participants</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {CATEGORIES.map(c => {
            const count = participants.filter(p => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                className={`evt-chip ${selectedSection === c.id ? 'active' : ''}`}
                onClick={() => setSelectedSection(c.id)}
              >
                {c.label} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14 }}>
          {(() => {
            const currentCat = CATEGORIES.find(c => c.id === selectedSection) || CATEGORIES[0];
            const list = sortParticipantsByCode(participants.filter(p => p.categoryId === currentCat?.id));
            return (
              <div className="evt-card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800 }}>{currentCat?.label}</div>
                  <div className="evt-sub">{list.length} participants</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {list.length === 0 && (
                    <div className="evt-sub" style={{ padding: '12px 0', textAlign: 'center' }}>
                      No participants registered in this category yet.
                    </div>
                  )}
                  {list.map(p => {
                    const isCurrent = p.id === currentId;
                    return (
                      <div
                        key={p.id}
                        className="evt-leader-row"
                        onClick={() => selectParticipant(isCurrent ? null : p.id)}
                        style={{
                          cursor: 'pointer',
                          borderColor: isCurrent ? "#FFD400" : "#C7CEDE",
                          background: isCurrent ? "#FFF9D6" : "#F7F9FD",
                          position: "relative",
                          overflow: "hidden",
                          boxShadow: isCurrent ? "0 6px 18px rgba(255, 212, 0, 0.28)" : "none",
                          transition: "all .2s ease"
                        }}
                      >
                        {isCurrent && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              backgroundImage: "url('/Backdrop.PNG')",
                              backgroundPosition: "center center",
                              backgroundRepeat: "no-repeat",
                              backgroundSize: "contain",
                              opacity: 0.28,
                              pointerEvents: "none"
                            }}
                          />
                        )}
                        <span
                          className="evt-mono evt-badge"
                          style={{
                            minWidth: 72,
                            textAlign: "center",
                            fontSize: 13,
                            padding: "5px 10px",
                            background: "#16274D",
                            color: "#FFD400",
                            border: "1.5px solid #0E1830",
                            borderRadius: 8,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            flexShrink: 0,
                            position: "relative",
                            zIndex: 1
                          }}
                        >
                          {p.token || p.code || "—"}
                        </span>

                        {/* Participant photo thumbnail in the list */}
                        <div
                          style={{ position: "relative", zIndex: 1, cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); openParticipantPhotoModal(p); }}
                          title="Click to take/upload photo"
                        >
                          <Avatar
                            photo={p.photo}
                            name={p.name}
                            size={isCurrent ? 44 : 38}
                            style={{ border: isCurrent ? "2.5px solid #FFD400" : "1.5px solid #16274D" }}
                          />
                        </div>

                        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: "#16274D" }}>{p.name}</div>
                          <div className="evt-sub" style={{ fontWeight: 600, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span>{p.act}</span>
                            {p.regNo && <span className="evt-mono" style={{ color: "#16274D" }}>[Reg: {p.regNo}]</span>}
                            {p.phone && <span>📞 {p.phone}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: "relative", zIndex: 1 }}>
                          {isCurrent && (
                            <>
                              <span className="evt-badge evt-badge-ok">Now Performing</span>
                              <button
                                className="evt-btn evt-btn-ghost"
                                style={{ fontSize: 11, padding: "4px 8px", color: "#8A5B00" }}
                                onClick={(e) => { e.stopPropagation(); selectParticipant(null); }}
                                title="Clear performer from stage and return to standby"
                              >
                                Standby
                              </button>
                            </>
                          )}
                          <button
                            className="evt-btn evt-btn-ghost"
                            style={{ fontSize: 11.5, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                            onClick={(e) => { e.stopPropagation(); openParticipantPhotoModal(p); }}
                            title="Take or Upload Photo"
                          >
                            <Camera size={13} /> Photo
                          </button>
                          {p.performed ? (
                            <button
                              className="evt-btn evt-btn-ghost"
                              onClick={(e) => { e.stopPropagation(); togglePerformed(p.id); }}
                              style={{ padding: '4px 8px', fontSize: 11.5, background: '#DFF6E8', color: '#1C8A4C', borderColor: '#1C8A4C', display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Click to unmark as Done"
                            >
                              <Check size={13} color="#1C8A4C" /> Done
                            </button>
                          ) : (
                            <button className="evt-btn evt-btn-ghost" onClick={(e) => { e.stopPropagation(); togglePerformed(p.id); }} style={{ padding: '6px 10px' }}>Mark Done</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #C7CEDE", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 180px" }}>
            <label className="evt-label">Name</label>
            <input className="evt-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Participant name" />
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <label className="evt-label">Act / Description</label>
            <input className="evt-input" value={newAct} onChange={e => setNewAct(e.target.value)} placeholder="e.g. Classical Dance Solo" />
          </div>
          <div style={{ flex: "1 1 150px" }}>
            <label className="evt-label">Event / Category</label>
            <select className="evt-input" value={newCategoryId} onChange={e => setNewCategoryId(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 100px" }}>
            <label className="evt-label">Number</label>
            <input className="evt-input evt-mono" value={newCodeNumber} onChange={e => setNewCodeNumber(e.target.value)} placeholder="e.g. 96" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="evt-btn evt-btn-ghost"
              type="button"
              onClick={() => {
                setPhotoModal({
                  isOpen: true,
                  title: "Participant Photo (Camera or Gallery)",
                  currentPhoto: newParticipantPhoto,
                  onSave: (photo) => setNewParticipantPhoto(photo)
                });
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Camera size={14} />
              {newParticipantPhoto ? "Change Photo" : "Add Photo"}
            </button>
            {newParticipantPhoto && (
              <Avatar photo={newParticipantPhoto} name={newName || "New"} size={36} />
            )}
          </div>
          <button className="evt-btn evt-btn-ghost" onClick={submitParticipant}><Plus size={15} /> Add Participant</button>
        </div>
        <p className="evt-sub" style={{ marginTop: 8 }}>For walk-in registrations, send participants to the Registration Desk instead — see below.</p>
      </div>

      <div className="evt-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="evt-h2" style={{ margin: 0 }}>Judges</div>
          <span className="evt-sub">{judges.length} registered judges</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {judges.map(j => {
            const isEditing = editingJudgeId === j.id;
            if (isEditing) {
              return (
                <div
                  key={j.id}
                  className="evt-pending-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#FFFCEB",
                    borderColor: "#FFD400",
                    borderWidth: 2,
                    boxShadow: "0 4px 12px rgba(255, 212, 0, 0.25)"
                  }}
                >
                  <div style={{ cursor: "pointer" }} onClick={() => openJudgePhotoModal(j)} title="Change Photo">
                    <Avatar photo={j.photo} name={editJudgeName || j.name} size={40} />
                  </div>
                  <input
                    type="text"
                    className="evt-input"
                    value={editJudgeName}
                    onChange={e => setEditJudgeName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveJudgeEdit(j.id);
                      if (e.key === "Escape") cancelJudgeEdit();
                    }}
                    placeholder="Enter judge name"
                    autoFocus
                    style={{ flex: 1, padding: "6px 12px", fontSize: 14, fontWeight: 700 }}
                  />
                  <button
                    className="evt-btn evt-btn-ghost"
                    style={{ fontSize: 12, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => openJudgePhotoModal(j)}
                    title="Change Photo"
                  >
                    <Camera size={13} /> Photo
                  </button>
                  <span className="evt-mono evt-badge evt-badge-ok" style={{ flexShrink: 0 }}>{j.code}</span>
                  <button
                    className="evt-btn evt-btn-teal"
                    style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}
                    onClick={() => saveJudgeEdit(j.id)}
                    title="Save Name"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    className="evt-btn evt-btn-ghost"
                    style={{ fontSize: 12, padding: "6px 10px", display: "flex", alignItems: "center", gap: 5 }}
                    onClick={cancelJudgeEdit}
                    title="Cancel Edit"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              );
            }

            return (
              <div
                key={j.id}
                className="evt-pending-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#F7F9FD",
                  transition: "all .15s ease"
                }}
              >
                <div style={{ cursor: "pointer" }} onClick={() => openJudgePhotoModal(j)} title="Click to take/upload photo">
                  <Avatar photo={j.photo} name={j.name} size={40} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#16274D" }}>{j.name}</span>
                </div>
                <span className="evt-mono evt-badge evt-badge-ok">{j.code}</span>
                <button
                  className="evt-btn evt-btn-ghost"
                  style={{ fontSize: 12, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => openJudgePhotoModal(j)}
                  title="Take or Upload Photo"
                >
                  <Camera size={13} /> Photo
                </button>
                <button
                  className="evt-btn evt-btn-ghost"
                  style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}
                  onClick={() => startEditJudge(j)}
                  title="Edit Judge Name"
                >
                  <Pencil size={13} /> Edit Name
                </button>
              </div>
            );
          })}
          {judges.length === 0 && (
            <div className="evt-sub" style={{ textAlign: "center", padding: "14px 0" }}>
              No judges registered yet. Add a judge below.
            </div>
          )}
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #C7CEDE", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 220px" }}>
            <label className="evt-label">Judge Name</label>
            <input className="evt-input" value={newJudgeName} onChange={e => setNewJudgeName(e.target.value)} placeholder="e.g. Ms. Fernandes" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="evt-btn evt-btn-ghost"
              type="button"
              onClick={() => {
                setPhotoModal({
                  isOpen: true,
                  title: "Judge Full-Body Photo (Camera or Gallery)",
                  currentPhoto: newJudgePhoto,
                  defaultMode: "portrait",
                  onSave: (photo) => setNewJudgePhoto(photo)
                });
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Camera size={14} />
              {newJudgePhoto ? "Change Photo" : "Add Photo"}
            </button>
            {newJudgePhoto && (
              <Avatar photo={newJudgePhoto} name={newJudgeName || "Judge"} size={36} />
            )}
          </div>
          <button className="evt-btn evt-btn-teal" onClick={submitJudge}><KeyRound size={15} /> Add Judge & Generate Code</button>
        </div>
        {justAddedJudgeCode && (
          <div className="evt-sub" style={{ marginTop: 10 }}>
            Give <strong>{justAddedJudgeCode.name}</strong> this access code: <span className="evt-mono" style={{ color: "#16274D", fontWeight: 700 }}>{justAddedJudgeCode.code}</span>
          </div>
        )}
      </div>

      <div className="evt-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="evt-h2" style={{ margin: 0 }}>Registration Desk Queue</div>
          <span className="evt-sub">{pendingRegs.length} waiting to enrol</span>
        </div>
        {pendingRegs.length === 0 ? (
          <p className="evt-sub" style={{ marginTop: 10 }}>No pending codes right now — codes generated at the desk that haven't been claimed yet will show up here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {pendingRegs.map(r => (
              <div key={r.id} className="evt-pending-row">
                <ClipboardList size={15} color="#16274D" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div className="evt-sub">{CATEGORIES.find(c => c.id === r.categoryId)?.label}</div>
                </div>
                <span className="evt-mono evt-badge evt-badge-wait">{r.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {current && (
        <div
          className="evt-card"
          style={{
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "48%",
              backgroundImage: "url('/Backdrop.PNG')",
              backgroundPosition: "center right",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              opacity: 0.16,
              pointerEvents: "none"
            }}
          />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ cursor: "pointer" }} onClick={() => openParticipantPhotoModal(current)} title="Click to take/upload photo">
                <Avatar photo={current.photo} name={current.name} size={64} style={{ border: "3px solid #FFD400", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
              </div>
              <div>
                <div className="evt-eyebrow">Currently on stage</div>
                {current.code && (
                  <div style={{ marginTop: 4, marginBottom: 4 }}>
                    <span
                      className="evt-mono evt-badge"
                      style={{
                        fontSize: 15,
                        padding: "4px 12px",
                        background: "#16274D",
                        color: "#FFD400",
                        border: "1.5px solid #0E1830",
                        borderRadius: 8,
                        fontWeight: 700
                      }}
                    >
                      {current.code}
                    </span>
                  </div>
                )}
                <div className="evt-h2" style={{ margin: 0 }}>
                  {current.name}
                </div>
                <div className="evt-sub" style={{ marginTop: 4, fontWeight: 600 }}>{current.act}</div>
              </div>
            </div>
            <LiveTag open={votingOpen} />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button className={`evt-btn ${votingOpen ? "evt-btn-red" : "evt-btn-teal"}`} onClick={() => setVotingOpen(v => !v)}>
              {votingOpen ? "Close Audience Voting" : "Open Audience Voting"}
            </button>
            <div className="evt-sub">Live audience votes:</div>
            <FlipNumber value={audienceVoteCount(currentId)} />
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div className="evt-card" style={{ background: "#F7F9FD" }}>
              <div className="evt-eyebrow">Audience Average</div>
              <div className="evt-score-num" style={{ fontSize: 26 }}>{audienceAvg(currentId)} / 10</div>
            </div>
            <div className="evt-card" style={{ background: "#F7F9FD" }}>
              <div className="evt-eyebrow">Judges' Average</div>
              <div className="evt-score-num" style={{ fontSize: 26 }}>{judgesAvgOutOf10(currentId)} / 10</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {judges.map(j => {
                  const t = judgeTotalFor(currentId, j.id);
                  return (
                    <div key={j.id} className="evt-sub" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{j.name}</span>
                      <span>{t === null ? <span className="evt-badge evt-badge-wait">Pending</span> : <span className="evt-badge evt-badge-ok">{t}/{props.MAX_JUDGE_TOTAL}</span>}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="evt-card" style={{ background: "#F7F9FD" }}>
              <div className="evt-eyebrow">Weighted Final</div>
              <div className="evt-score-num" style={{ fontSize: 26 }}>{finalScore(currentId)} / 10</div>
              <div className="evt-sub">Judges {weights.judge}% · Audience {weights.audience}%</div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className={`evt-btn ${scoreRevealed[currentId]?.audience ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={() => setScoreRevealed(s => ({ ...s, [currentId]: { ...(s[currentId] || {}), audience: !s[currentId]?.audience } }))}
            >
              <Users size={15} />
              {scoreRevealed[currentId]?.audience ? "Hide Audience Avg" : "Reveal Audience Avg"}
            </button>

            <button
              className={`evt-btn ${scoreRevealed[currentId]?.judges ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={() => setScoreRevealed(s => ({ ...s, [currentId]: { ...(s[currentId] || {}), judges: !s[currentId]?.judges } }))}
            >
              <Gavel size={15} />
              {scoreRevealed[currentId]?.judges ? "Hide Judges Avg" : "Reveal Judges Avg"}
            </button>

            <button
              className={`evt-btn ${scoreRevealed[currentId]?.overall ? 'evt-btn-amber' : 'evt-btn-ghost'}`}
              onClick={() => setScoreRevealed(s => ({ ...s, [currentId]: { ...(s[currentId] || {}), overall: !s[currentId]?.overall } }))}
            >
              {scoreRevealed[currentId]?.overall ? <EyeOff size={15} /> : <Eye size={15} />}
              {scoreRevealed[currentId]?.overall ? "Hide Final Score" : "Reveal Final Score"}
            </button>
          </div>
        </div>
      )}

      <div className="evt-card">
        <div className="evt-h2">Scoring Weight</div>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <label className="evt-sub">Judges %
            <input type="number" min={0} max={100} value={weights.judge}
              onChange={e => {
                const j = Math.max(0, Math.min(100, +e.target.value));
                setWeights({ judge: j, audience: 100 - j });
              }}
              className="evt-input" style={{ width: 90, marginTop: 4 }} />
          </label>
          <label className="evt-sub">Audience %
            <input className="evt-input" style={{ width: 90, marginTop: 4 }} value={weights.audience} disabled />
          </label>
        </div>
      </div>

      <div className="evt-card">
        {(() => {
          const currentCat = CATEGORIES.find(c => c.id === categoryFilter) || CATEGORIES[0];
          const allInCategory = leaderboard.filter(p => p.categoryId === categoryFilter);
          const rawLimit = leaderboardLimits?.[categoryFilter] ?? 5;
          const limit = rawLimit === 'all' ? 'all' : (Number(rawLimit) || 5);
          const shownList = allInCategory.slice(0, limit === 'all' ? undefined : limit);
          const hiddenCount = allInCategory.length - shownList.length;

          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div className="evt-h2" style={{ margin: 0 }}>Leaderboard</div>
                  <div className="evt-sub" style={{ fontSize: 12, marginTop: 2 }}>
                    Configure Top N finalists and publish rankings directly to the main projector.
                  </div>
                </div>
                <button
                  className={`evt-btn ${leaderboardRevealed ? "evt-btn-amber" : "evt-btn-ghost"}`}
                  onClick={() => setLeaderboardRevealed(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Trophy size={15} />
                  {leaderboardRevealed
                    ? `Unpublish ${currentCat?.label || "Category"} Leaderboard`
                    : `Publish ${currentCat?.label || "Category"} ${limit === 'all' ? "All" : `Top ${limit}`} Leaderboard`}
                </button>
              </div>

              {/* Category selector chips with current limit badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {CATEGORIES.filter(c => participants.some(p => p.categoryId === c.id)).map(c => {
                  const count = participants.filter(p => p.categoryId === c.id).length;
                  const catRawLimit = leaderboardLimits?.[c.id] ?? 5;
                  const catLimitLabel = catRawLimit === 'all' ? 'All' : `Top ${catRawLimit}`;
                  return (
                    <button
                      key={c.id}
                      className={`evt-chip ${categoryFilter === c.id ? "active" : ""}`}
                      onClick={() => setCategoryFilter(c.id)}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span>{c.label} ({count})</span>
                      <span style={{
                        fontSize: 10.5,
                        background: categoryFilter === c.id ? "#16274D" : "#E2E8F0",
                        color: categoryFilter === c.id ? "#FFD400" : "#5B6890",
                        padding: "1px 7px",
                        borderRadius: 10,
                        fontWeight: 800
                      }}>
                        {catLimitLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Top N Selection Toolbar for active category */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 14,
                padding: "12px 16px",
                background: "#F7F9FD",
                border: "1.5px solid #C7CEDE",
                borderRadius: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#16274D" }}>
                    Show in {currentCat?.label || "Category"}:
                  </span>
                  {[3, 5, 10, 'all'].map(opt => {
                    const isSelected = limit === opt;
                    return (
                      <button
                        key={opt}
                        className={`evt-chip ${isSelected ? "active" : ""}`}
                        style={{ padding: "4px 12px", fontSize: 12 }}
                        onClick={() => setLeaderboardLimit(categoryFilter, opt)}
                      >
                        {opt === 'all' ? 'All' : `Top ${opt}`}
                      </button>
                    );
                  })}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                    <span className="evt-sub" style={{ fontSize: 12, fontWeight: 700 }}>Custom Top N:</span>
                    <input
                      type="number"
                      min={1}
                      max={allInCategory.length || 50}
                      value={typeof limit === 'number' ? limit : ''}
                      placeholder="N"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val > 0) setLeaderboardLimit(categoryFilter, val);
                        else if (e.target.value === '') setLeaderboardLimit(categoryFilter, 'all');
                      }}
                      className="evt-input"
                      style={{ width: 64, padding: "3px 8px", fontSize: 12, height: 28 }}
                    />
                  </div>
                </div>

                <div className="evt-sub" style={{ fontSize: 12.5, fontWeight: 600, color: "#16274D" }}>
                  Showing <strong>{shownList.length}</strong> of {allInCategory.length} on Projector
                </div>
              </div>

              {/* Leaderboard Table */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {shownList.map((p, i) => (
                  <div
                    key={p.id}
                    className="evt-leader-row"
                    style={{
                      background: i === 0 ? "linear-gradient(90deg, #FFF9D6 0%, #F7F9FD 100%)" : "#F7F9FD",
                      borderColor: i === 0 ? "#FFD400" : "#C7CEDE"
                    }}
                  >
                    <div className={`evt-rank ${i === 0 ? "gold" : (i === 1 ? "silver" : (i === 2 ? "bronze" : ""))}`}>
                      {i + 1}
                    </div>
                    {p.code && (
                      <span
                        className="evt-mono evt-badge"
                        style={{
                          minWidth: 72,
                          textAlign: "center",
                          fontSize: 13,
                          padding: "5px 10px",
                          background: "#16274D",
                          color: "#FFD400",
                          border: "1.5px solid #0E1830",
                          borderRadius: 8,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          flexShrink: 0
                        }}
                      >
                        {p.code}
                      </span>
                    )}
                    <Avatar photo={p.photo} name={p.name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div className="evt-sub">{p.act}</div>
                    </div>
                    <div className="evt-score-num" style={{ fontSize: 18 }}>{p.score}</div>
                  </div>
                ))}

                {hiddenCount > 0 && (
                  <div
                    className="evt-sub"
                    style={{
                      textAlign: "center",
                      padding: "10px 14px",
                      fontSize: 12.5,
                      color: "#8A5B00",
                      background: "#FFF9D6",
                      borderRadius: 10,
                      border: "1.5px dashed #FFD400",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10
                    }}
                  >
                    <span>+ {hiddenCount} more participants in {currentCat?.label} hidden from projector</span>
                    <button
                      className="evt-btn evt-btn-ghost"
                      onClick={() => setLeaderboardLimit(categoryFilter, 'all')}
                      style={{ padding: "3px 10px", fontSize: 11.5, background: "#FFFFFF", fontWeight: 700 }}
                    >
                      Show All
                    </button>
                  </div>
                )}

                {shownList.length === 0 && (
                  <div className="evt-sub" style={{ textAlign: "center", padding: 20 }}>
                    No participants scored yet in this category.
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* Danger Zone: Clear / Reset All Data */}
      {clearAllData && (
        <div className="evt-card" style={{ borderColor: "#EF4136", marginTop: 24, background: "#FFF5F5" }}>
          <div className="evt-eyebrow" style={{ color: "#D93025" }}>Data Administration</div>
          <div className="evt-h2" style={{ color: "#D93025", fontSize: 20, margin: "2px 0 6px" }}>Reset All Event Data</div>
          <p className="evt-sub" style={{ marginBottom: 14 }}>
            Wipe all participants, desk registration codes, judges, judge scores, and audience votes to start completely fresh.
          </p>
          <button
            type="button"
            className="evt-btn evt-btn-red"
            onClick={clearAllData}
            style={{ fontSize: 13, padding: "9px 16px" }}
          >
            Remove All Present Data
          </button>
        </div>
      )}

      {/* Reusable Photo Capture / Upload Modal */}
      <PhotoModal
        isOpen={photoModal.isOpen}
        title={photoModal.title}
        currentPhoto={photoModal.currentPhoto}
        defaultMode={photoModal.defaultMode || "square"}
        onSave={photoModal.onSave}
        onClose={() => setPhotoModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
