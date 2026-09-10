import React, { useState, useEffect } from "react";
import {
  Radio, Users, Gavel, MonitorPlay, Lock, CheckCircle2, QrCode,
  ChevronRight, Trophy, Star, Sparkles, Mic2, ShieldCheck, Eye, EyeOff,
  UserPlus, ClipboardList, BadgeCheck, Plus, KeyRound, ExternalLink, ArrowLeft, LogOut
} from "lucide-react";

import {
  saveStateToStorage, loadStateFromStorage, broadcastStateChange, subscribeToBroadcast, clearStorage,
  initRealtimeEventSync, fetchAuthoritativeState, syncActionToServer, subscribeToConnectionStatus
} from "./lib/eventSync";

import AdminView from "./screens/Admin";
import VolunteerView from "./screens/Volunteer";
import ParticipantEnrollView from "./screens/Enroll";
import JudgeView from "./screens/Judge";
import AudienceView from "./screens/Audience";
import ProjectorView from "./screens/Projector";
import { getCriteriaForCategory } from "./config/judgmentCriteria";

/* ---------------------------------------------------------------
 SEED DATA
--------------------------------------------------------------- */
const EVENT_PIN = "4821";
const MOCK_OTP = "123456";

const CRITERIA = [
  { id: "c1", label: "Performance" },
  { id: "c2", label: "Creativity" },
  { id: "c3", label: "Technique" },
  { id: "c4", label: "Stage Presence" },
];

const CATEGORIES = [
  { id: "dance", label: "Dance", prefix: "DNC" },
  { id: "singing", label: "Singing / Music", prefix: "MSC" },
  { id: "comedy", label: "Comedy", prefix: "CMD" },
  { id: "band", label: "Band", prefix: "BND" },
  { id: "drama", label: "Drama / Theatre", prefix: "DRM" },
  { id: "poetry", label: "Poetry / Spoken Word", prefix: "PTY" },
];

const INITIAL_JUDGES = [
  { 
    id: "j1", 
    name: "Dr. N. Kapoor", 
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", 
    accessCode: "4821", 
    title: "Senior Faculty & Performing Arts Chair" 
  },
  { 
    id: "j2", 
    name: "Prof. R. Iyer", 
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80", 
    accessCode: "4822", 
    title: "Dean of Cultural Affairs" 
  },
  { 
    id: "j3", 
    name: "Elena Rostova", 
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", 
    accessCode: "4823", 
    title: "National Choreography Lead" 
  }
];

const INITIAL_PARTICIPANTS = [
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
  },
  {
    id: "p3",
    name: "Rohan Varma",
    code: "MSC-03",
    act: "Acoustic Indie Rock",
    categoryId: "singing",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    performed: false
  },
  {
    id: "p4",
    name: "Kavya Deshmukh",
    code: "CMD-09",
    act: "Campus Life Standup",
    categoryId: "comedy",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    performed: false
  }
];

const INITIAL_VOTES = {
  p1: { aud_1: 9, aud_2: 10, aud_3: 8, aud_4: 9, aud_5: 9 },
  p2: { aud_1: 8, aud_2: 9, aud_3: 8 },
  p3: { aud_1: 9, aud_2: 9, aud_3: 10 }
};

const INITIAL_JUDGE_SCORES = {
  p1: {
    j1: { c1: 9, c2: 8, c3: 9, c4: 9 },
    j2: { c1: 8, c2: 9, c3: 8, c4: 9 },
    j3: { c1: 9, c2: 9, c3: 8, c4: 9 }
  },
  p2: {
    j1: { c1: 8, c2: 8, c3: 8, c4: 8 },
    j2: { c1: 9, c2: 8, c3: 9, c4: 8 }
  }
};

const MAX_CRITERION = 20;
const MAX_JUDGE_TOTAL = 100;

function makeUniqueCode(prefix, takenCodes) {
  let code;
  do {
    const num = Math.floor(10 + Math.random() * 90);
    code = `${prefix}${num}`;
  } while (takenCodes.has(code));
  return code;
}

const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    .evt { font-family: 'Poppins', sans-serif; background: linear-gradient(115deg, #FFD400 0%, #FFD400 42%, #29ABE2 46%, #29ABE2 100%); background-attachment: fixed; color: #16274D; min-height: 100vh; }
    .evt * { box-sizing: border-box; }
    .evt-display { font-family: 'Luckiest Guy', cursive; letter-spacing: 0.02em; }
    .evt-mono { font-family: 'JetBrains Mono', monospace; }

    .evt-nav { display:flex; gap:8px; padding:14px 20px; background:#16274D; border-bottom:4px solid #0E1830; flex-wrap:wrap; align-items:center; }
    .evt-brand { display:flex; align-items:center; gap:8px; margin-right:auto; }
    .evt-brand-dot { width:10px; height:10px; border-radius:50%; background:#FFD400; box-shadow:0 0 8px #FFD400AA; }
    .evt-tab { display:flex; align-items:center; gap:7px; padding:9px 16px; border-radius:999px; border:2px solid #29ABE2; background:#1D3768; color:#CFE3F5; font-size:13px; font-weight:700; cursor:pointer; transition:.15s; }
    .evt-tab:hover { border-color:#FFD400; color:#fff; }
    .evt-tab.active { background:#FFD400; color:#16274D; border-color:#16274D; }

    .evt-stage { padding:26px 20px 60px; max-width:1080px; margin:0 auto; }
    .evt-card { background:#FFFFFF; border:3px solid #16274D; border-radius:16px; padding:20px; box-shadow:6px 6px 0 #16274D; }
    .evt-eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:0.14em; color:#5B6890; font-weight:800; margin-bottom:4px; }
    .evt-h1 { font-family:'Luckiest Guy'; font-size:42px; letter-spacing:0.02em; line-height:1; margin:0 0 4px; color:#16274D; text-shadow:3px 3px 0 #FFD400; }
    .evt-h2 { font-family:'Luckiest Guy'; font-size:26px; letter-spacing:0.02em; margin:0 0 10px; color:#16274D; }
    .evt-sub { color:#5B6890; font-size:13.5px; font-weight:500; }

    .evt-live { display:inline-flex; align-items:center; gap:6px; background:#EF4136; color:#fff; border:2px solid #16274D; padding:5px 12px; border-radius:999px; font-size:11.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
    .evt-live-dot { width:7px; height:7px; border-radius:50%; background:#fff; animation:evtpulse 1.4s infinite; }
    @keyframes evtpulse { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:.35; transform:scale(1.3);} }

    .evt-closed { display:inline-flex; align-items:center; gap:6px; background:#E7EAF2; color:#5B6890; border:2px solid #C7CEDE; padding:5px 12px; border-radius:999px; font-size:11.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }

    .evt-btn { border-radius:10px; padding:11px 18px; font-weight:800; font-size:13.5px; cursor:pointer; transition:.12s; display:inline-flex; align-items:center; gap:8px; border:2px solid #16274D; box-shadow:3px 3px 0 #16274D; }
    .evt-btn:active { transform:translate(2px,2px); box-shadow:1px 1px 0 #16274D; }
    .evt-btn-amber { background:#FFD400; color:#16274D; } .evt-btn-amber:hover{ background:#FFDF40; }
    .evt-btn-teal { background:#29ABE2; color:#0E1830; } .evt-btn-teal:hover{ background:#4FC0EF; }
    .evt-btn-ghost { background:#fff; color:#16274D; } .evt-btn-ghost:hover{ background:#F3F6FC; }
    .evt-btn-red { background:#EF4136; color:#fff; }
    .evt-btn:disabled { opacity:.4; cursor:not-allowed; box-shadow:none; }

    .evt-flip { display:inline-flex; font-family:'JetBrains Mono'; font-weight:700; background:#16274D; color:#FFD400; border:2px solid #0E1830; border-radius:8px; padding:6px 12px; overflow:hidden; }
    .evt-flip-digit { display:inline-block; animation:evtflip .35s ease; }
    @keyframes evtflip { 0%{ transform:translateY(-40%); opacity:0;} 100%{transform:translateY(0); opacity:1;} }

    .evt-input { width:100%; background:#F7F9FD; border:2px solid #C7CEDE; color:#16274D; border-radius:10px; padding:12px 14px; font-size:14px; outline:none; font-family:'Poppins'; }
    .evt-input:focus { border-color:#29ABE2; }
    .evt-label { font-size:12px; font-weight:700; color:#5B6890; margin-bottom:6px; display:block; }

    .evt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
    .evt-pchip { text-align:left; background:#F7F9FD; border:2px solid #C7CEDE; border-radius:12px; padding:14px; cursor:pointer; transition:.15s; }
    .evt-pchip:hover { border-color:#29ABE2; }
    .evt-pchip.current { border-color:#16274D; background:#FFF3C4; }

    .evt-slider { width:100%; accent-color:#29ABE2; }

    .evt-badge { font-size:10.5px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; padding:3px 8px; border-radius:6px; }
    .evt-badge-ok { background:#DFF6E8; color:#1C8A4C; }
    .evt-badge-wait { background:#FFF1C2; color:#8A5B00; }

    .evt-ticket { max-width:400px; margin:30px auto; background:#fff; border:3px dashed #16274D; border-radius:16px; padding:26px; box-shadow:6px 6px 0 #16274D; }

    .evt-projector { position:relative; overflow:hidden; background:#000; border:none; padding:16px 20px 60px; text-align:center; min-height:100vh; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; box-sizing:border-box; }
    .evt-marquee { font-family:'Luckiest Guy'; font-size:52px; letter-spacing:.02em; line-height:1; color:#FFD400; text-shadow:3px 3px 0 #0E1830; }
    .evt-score-row { display:flex; gap:22px; flex-wrap:wrap; justify-content:center; }
    .evt-score-tile { background:#1D3768; border:2px solid #29ABE2; border-radius:14px; padding:18px 26px; min-width:150px; }
    .evt-score-num { font-family:'JetBrains Mono'; font-weight:700; font-size:34px; color:#FFD400; }

    .evt-leader-row { display:flex; align-items:center; gap:14px; padding:12px 16px; border-radius:10px; background:#F7F9FD; border:2px solid #C7CEDE; }
    .evt-rank { font-family:'Luckiest Guy'; font-size:24px; width:34px; color:#5B6890; }
    .evt-rank.gold { color:#F5A623; }
    .evt-rank.silver { color:#8C9BAE; }
    .evt-rank.bronze { color:#CD7F32; }

    .evt-eqbars { display:flex; align-items:flex-end; gap:7px; height:150px; padding:0 6px; }
    .evt-eqbar { width:16px; border-radius:5px 5px 2px 2px; background:linear-gradient(180deg,#FFE45C,#FFD400); box-shadow:0 0 10px #FFD40066; transition:height .09s ease-out; }
    .evt-final-tile { background:#1D3768; border:3px solid #FFD400; border-radius:18px; padding:26px 46px; box-shadow:0 0 30px #FFD40044; animation:evtpop .4s ease; }
    @keyframes evtpop { 0%{ transform:scale(.85); opacity:0;} 100%{ transform:scale(1); opacity:1;} }
    .evt-final-num { font-family:'JetBrains Mono'; font-weight:700; font-size:52px; color:#FFD400; }

    .evt-code-reveal { background:#FFF9E0; border:3px dashed #16274D; border-radius:16px; padding:24px; text-align:center; }
    .evt-code-big { font-family:'JetBrains Mono'; font-weight:700; font-size:40px; letter-spacing:.08em; color:#16274D; }
    .evt-pending-row { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; background:#F7F9FD; border:2px solid #C7CEDE; }

    .evt-chip { padding:7px 14px; border-radius:999px; border:2px solid #C7CEDE; background:#fff; color:#5B6890; font-size:12.5px; font-weight:700; cursor:pointer; transition:.15s; }
    .evt-chip:hover { border-color:#29ABE2; color:#16274D; }
    .evt-chip.active { background:#FFD400; color:#16274D; border-color:#16274D; }

    .evt-projector-video { position:fixed !important; top:0 !important; left:0 !important; right:0 !important; bottom:0 !important; width:100vw !important; height:100vh !important; max-width:100vw !important; max-height:100vh !important; object-fit:cover !important; margin:0 !important; transform:none !important; z-index:0 !important; opacity:1 !important; background:#000; border:none !important; border-radius:0 !important; pointer-events:none; }
    .evt-projector > *:not(.evt-projector-video) { position:relative; z-index:1; }
    .evt-projector-qr-dock { position:absolute !important; top:56px; right:48px; z-index:35 !important; }
    @media (max-width: 900px) {
      .evt-projector-qr-dock { position:relative !important; top:auto; right:auto; margin-top:16px; }
    }
  `}</style>
);

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

function resolveRole(initialRole) {
  if (initialRole) return initialRole;
  if (typeof window === "undefined") return "projector";
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/volunteer") || path.includes("/desk")) return "volunteer";
  if (path.includes("/enroll") || path.includes("/participant")) return "enroll";
  if (path.includes("/judge")) return "judge";
  if (path.includes("/audience")) return "audience";
  if (path.includes("/projector") || path.includes("/stage")) return "projector";
  if (path.includes("/admin")) return "admin";
  return getPortalFromHash();
}

function getPortalFromHash() {
  if (typeof window === "undefined") return "projector";
  const raw = window.location.hash.replace(/^#\/?/, "").toLowerCase().trim();
  if (raw === "participant" || raw === "enroll") return "enroll";
  if (raw === "desk" || raw === "volunteer") return "volunteer";
  if (raw === "judge") return "judge";
  if (raw === "audience") return "audience";
  if (raw === "projector") return "projector";
  if (raw === "admin") return "admin";
  return "projector";
}

export default function EventJudgingApp({ initialRole }) {
  const savedState = typeof window !== 'undefined' ? loadStateFromStorage() : null;
  const [role, setRole] = useState(() => resolveRole(initialRole));
  const [adminPreviewRole, setAdminPreviewRole] = useState("admin");
  const [connStatus, setConnStatus] = useState("live");

  const [participants, setParticipants] = useState(() => (savedState?.participants && savedState.participants.length > 0) ? savedState.participants : INITIAL_PARTICIPANTS);
  const [judges, setJudges] = useState(() => (savedState?.judges && savedState.judges.length > 0) ? savedState.judges : INITIAL_JUDGES);
  const [registrations, setRegistrations] = useState(() => savedState?.registrations || []);
  const [currentId, setCurrentId] = useState(() => savedState?.currentId || INITIAL_PARTICIPANTS[0]?.id || null);
  const [votingOpen, setVotingOpen] = useState(() => savedState?.votingOpen || false);
  const [scoreRevealed, setScoreRevealed] = useState(() => savedState?.scoreRevealed || {});
  const [leaderboardRevealed, setLeaderboardRevealed] = useState(() => savedState?.leaderboardRevealed || false);
  const [categoryFilter, setCategoryFilter] = useState(() => savedState?.categoryFilter || (CATEGORIES[0]?.id || "dance"));
  const [weights, setWeights] = useState(() => savedState?.weights || { judge: 70, audience: 30 });
  const [leaderboardLimits, setLeaderboardLimits] = useState(() => savedState?.leaderboardLimits || {});
  const [showQR, setShowQR] = useState(() => savedState?.showQR || false);
  const [showEventCode, setShowEventCode] = useState(() => savedState?.showEventCode ?? false);
  const [pinPosition, setPinPosition] = useState(() => savedState?.pinPosition || 'hidden');
  const [showJudgesOnProjector, setShowJudgesOnProjector] = useState(() => savedState?.showJudgesOnProjector || false);
  const [selectedJudgeIds, setSelectedJudgeIds] = useState(() => savedState?.selectedJudgeIds || ['j1', 'j2', 'j3']);
  const [qrSpotlight, setQrSpotlight] = useState(() => savedState?.qrSpotlight || false);
  const [stageMode, setStageMode] = useState(() => savedState?.stageMode || 'video');
  const [showPhotoOnProjector, setShowPhotoOnProjector] = useState(() => savedState?.showPhotoOnProjector ?? true);
  const [showCodeOnProjector, setShowCodeOnProjector] = useState(() => savedState?.showCodeOnProjector ?? true);
  const [showNameOnProjector, setShowNameOnProjector] = useState(() => savedState?.showNameOnProjector ?? true);
  const [showFormulaBanner, setShowFormulaBanner] = useState(() => savedState?.showFormulaBanner ?? true);

  const [votes, setVotes] = useState(() => (savedState?.votes && Object.keys(savedState.votes).length > 0) ? savedState.votes : INITIAL_VOTES);
  const [judgeScores, setJudgeScores] = useState(() => (savedState?.judgeScores && Object.keys(savedState.judgeScores).length > 0) ? savedState.judgeScores : INITIAL_JUDGE_SCORES);
  const [lastUndoAction, setLastUndoAction] = useState(null);

  // Sync role if initialRole prop changes
  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  // Sync route on hashchange
  useEffect(() => {
    const onHashChange = () => {
      const p = getPortalFromHash();
      setRole(p);
      if (p === "admin") setAdminPreviewRole("admin");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Initialize cross-device real-time Server-Sent Events (SSE) and connection monitor
  useEffect(() => {
    const unsubSSE = initRealtimeEventSync();
    const unsubStatus = subscribeToConnectionStatus(status => setConnStatus(status));

    fetchAuthoritativeState().then(s => {
      if (s) {
        if (s.participants !== undefined) setParticipants(s.participants);
        if (s.judges !== undefined) setJudges(s.judges);
        if (s.registrations !== undefined) setRegistrations(s.registrations);
        if (s.currentId !== undefined) setCurrentId(s.currentId);
        if (s.votingOpen !== undefined) setVotingOpen(s.votingOpen);
        if (s.scoreRevealed !== undefined) setScoreRevealed(s.scoreRevealed);
        if (s.leaderboardRevealed !== undefined) setLeaderboardRevealed(s.leaderboardRevealed);
        if (s.categoryFilter !== undefined) setCategoryFilter(s.categoryFilter);
        if (s.weights !== undefined) setWeights(s.weights);
        if (s.showQR !== undefined) setShowQR(s.showQR);
        if (s.showEventCode !== undefined) setShowEventCode(s.showEventCode);
        if (s.pinPosition !== undefined) setPinPosition(s.pinPosition);
        if (s.showJudgesOnProjector !== undefined) setShowJudgesOnProjector(s.showJudgesOnProjector);
        if (s.selectedJudgeIds !== undefined) setSelectedJudgeIds(s.selectedJudgeIds);
        if (s.qrSpotlight !== undefined) setQrSpotlight(s.qrSpotlight);
        if (s.stageMode !== undefined) setStageMode(s.stageMode);
        if (s.showPhotoOnProjector !== undefined) setShowPhotoOnProjector(s.showPhotoOnProjector);
        if (s.showCodeOnProjector !== undefined) setShowCodeOnProjector(s.showCodeOnProjector);
        if (s.showNameOnProjector !== undefined) setShowNameOnProjector(s.showNameOnProjector);
        if (s.showFormulaBanner !== undefined) setShowFormulaBanner(s.showFormulaBanner);
        if (s.votes !== undefined) setVotes(s.votes);
        if (s.judgeScores !== undefined) setJudgeScores(s.judgeScores);
        if (s.leaderboardLimits !== undefined) setLeaderboardLimits(s.leaderboardLimits);
      }
    });

    return () => {
      unsubSSE();
      unsubStatus();
    };
  }, []);

  // Broadcast state changes and save to localStorage (Only active controllers broadcast, never projector display)
  useEffect(() => {
    if (role === "projector") return;

    const stateObj = {
      participants, judges, registrations, currentId, votingOpen,
      scoreRevealed, leaderboardRevealed, categoryFilter, weights,
      showQR, showEventCode, pinPosition, showJudgesOnProjector, selectedJudgeIds, qrSpotlight,
      stageMode, showPhotoOnProjector, showCodeOnProjector, showNameOnProjector, showFormulaBanner,
      votes, judgeScores, leaderboardLimits
    };
    saveStateToStorage(stateObj);
    broadcastStateChange('STATE_UPDATE', stateObj);
  }, [
    role,
    participants, judges, registrations, currentId, votingOpen,
    scoreRevealed, leaderboardRevealed, categoryFilter, weights,
    showQR, showEventCode, pinPosition, showJudgesOnProjector, selectedJudgeIds, qrSpotlight,
    stageMode, showPhotoOnProjector, showCodeOnProjector, showNameOnProjector, showFormulaBanner,
    votes, judgeScores, leaderboardLimits
  ]);

  // Listen for broadcast messages from other open tabs and server updates
  useEffect(() => {
    const unsub = subscribeToBroadcast((msg) => {
      if (msg && msg.action === 'STATE_UPDATE' && msg.payload) {
        const s = msg.payload;
        if (s.participants !== undefined) setParticipants(s.participants);
        if (s.judges !== undefined) setJudges(s.judges);
        if (s.registrations !== undefined) setRegistrations(s.registrations);
        if (s.currentId !== undefined) setCurrentId(s.currentId);
        if (s.votingOpen !== undefined) setVotingOpen(s.votingOpen);
        if (s.scoreRevealed !== undefined) setScoreRevealed(s.scoreRevealed);
        if (s.leaderboardRevealed !== undefined) setLeaderboardRevealed(s.leaderboardRevealed);
        if (s.categoryFilter !== undefined) setCategoryFilter(s.categoryFilter);
        if (s.weights !== undefined) setWeights(s.weights);
        if (s.showQR !== undefined) setShowQR(s.showQR);
        if (s.showEventCode !== undefined) setShowEventCode(s.showEventCode);
        if (s.pinPosition !== undefined) setPinPosition(s.pinPosition);
        if (s.showJudgesOnProjector !== undefined) setShowJudgesOnProjector(s.showJudgesOnProjector);
        if (s.selectedJudgeIds !== undefined) setSelectedJudgeIds(s.selectedJudgeIds);
        if (s.qrSpotlight !== undefined) setQrSpotlight(s.qrSpotlight);
        if (s.stageMode !== undefined) setStageMode(s.stageMode);
        if (s.showPhotoOnProjector !== undefined) setShowPhotoOnProjector(s.showPhotoOnProjector);
        if (s.showCodeOnProjector !== undefined) setShowCodeOnProjector(s.showCodeOnProjector);
        if (s.showNameOnProjector !== undefined) setShowNameOnProjector(s.showNameOnProjector);
        if (s.showFormulaBanner !== undefined) setShowFormulaBanner(s.showFormulaBanner);
        if (s.votes !== undefined) setVotes(s.votes);
        if (s.judgeScores !== undefined) setJudgeScores(s.judgeScores);
        if (s.leaderboardLimits !== undefined) setLeaderboardLimits(s.leaderboardLimits);
      } else if (msg && msg.action === 'SUBMIT_JUDGE_SCORE' && msg.payload) {
        const { participantId, judgeId, marks, score } = msg.payload;
        const finalMarks = marks || score || {};
        setJudgeScores(prev => ({
          ...prev,
          [participantId]: { ...(prev[participantId] || {}), [judgeId]: finalMarks }
        }));
      } else if (msg && msg.action === 'CAST_AUDIENCE_VOTE' && msg.payload) {
        const { participantId, studentId, score } = msg.payload;
        setVotes(prev => ({
          ...prev,
          [participantId]: { ...(prev[participantId] || {}), [studentId]: score }
        }));
      } else if (msg && msg.action === 'ADD_JUDGE' && msg.payload?.judge) {
        const j = msg.payload.judge;
        setJudges(prev => {
          const exists = prev.some(x => x.id === j.id);
          return exists ? prev.map(x => x.id === j.id ? { ...x, ...j } : x) : [...prev, j];
        });
        setSelectedJudgeIds(prev => prev.includes(j.id) ? prev : [...prev, j.id]);
      } else if (msg && msg.action === 'ADD_PARTICIPANT' && (msg.payload?.participant || msg.payload)) {
        const p = msg.payload.participant || msg.payload;
        setParticipants(prev => {
          const exists = prev.some(x => x.id === p.id || x.code === p.code);
          return exists ? prev.map(x => (x.id === p.id || x.code === p.code) ? { ...x, ...p } : x) : [...prev, p];
        });
      }
    });

    const onStorage = (e) => {
      if ((e.key === 'fts_event_state_v2' || e.key === 'fts_event_state_v1') && e.newValue) {
        try {
          const s = JSON.parse(e.newValue);
          if (s.participants !== undefined) setParticipants(s.participants);
          if (s.judges !== undefined) setJudges(s.judges);
          if (s.registrations !== undefined) setRegistrations(s.registrations);
          if (s.currentId !== undefined) setCurrentId(s.currentId);
          if (s.votingOpen !== undefined) setVotingOpen(s.votingOpen);
          if (s.scoreRevealed !== undefined) setScoreRevealed(s.scoreRevealed);
          if (s.leaderboardRevealed !== undefined) setLeaderboardRevealed(s.leaderboardRevealed);
          if (s.categoryFilter !== undefined) setCategoryFilter(s.categoryFilter);
          if (s.weights !== undefined) setWeights(s.weights);
          if (s.showQR !== undefined) setShowQR(s.showQR);
          if (s.showEventCode !== undefined) setShowEventCode(s.showEventCode);
          if (s.pinPosition !== undefined) setPinPosition(s.pinPosition);
          if (s.showJudgesOnProjector !== undefined) setShowJudgesOnProjector(s.showJudgesOnProjector);
          if (s.selectedJudgeIds !== undefined) setSelectedJudgeIds(s.selectedJudgeIds);
          if (s.qrSpotlight !== undefined) setQrSpotlight(s.qrSpotlight);
          if (s.stageMode !== undefined) setStageMode(s.stageMode);
          if (s.showPhotoOnProjector !== undefined) setShowPhotoOnProjector(s.showPhotoOnProjector);
          if (s.showCodeOnProjector !== undefined) setShowCodeOnProjector(s.showCodeOnProjector);
          if (s.showNameOnProjector !== undefined) setShowNameOnProjector(s.showNameOnProjector);
          if (s.showFormulaBanner !== undefined) setShowFormulaBanner(s.showFormulaBanner);
          if (s.votes !== undefined) setVotes(s.votes);
          if (s.judgeScores !== undefined) setJudgeScores(s.judgeScores);
          if (s.leaderboardLimits !== undefined) setLeaderboardLimits(s.leaderboardLimits);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const current = participants.find(p => p.id === currentId) || null;

  const setLeaderboardLimit = (catId, limit) => {
    setLeaderboardLimits(prev => ({ ...prev, [catId]: limit }));
    syncActionToServer('SET_LEADERBOARD_LIMIT', { categoryId: catId, limit });
  };

  const selectParticipant = (id) => {
    setCurrentId(id);
    setVotingOpen(false);
    syncActionToServer('SELECT_PARTICIPANT', { id });
  };

  const handleSetVotingOpen = (valOrUpdater) => {
    setVotingOpen(prev => {
      const nextVal = typeof valOrUpdater === 'function' ? valOrUpdater(prev) : valOrUpdater;
      syncActionToServer('SET_VOTING_OPEN', { open: nextVal });
      return nextVal;
    });
  };

  const addParticipant = (name, act, categoryId, code, photo = null) => {
    const newP = { id: `p_${Date.now()}`, name, act, categoryId, code, photo, performed: false };
    setParticipants(prev => [...prev, newP]);
    syncActionToServer('ADD_PARTICIPANT', { name, act, categoryId, code, photo });
  };

  const togglePerformed = (id) => {
    const participant = participants.find(p => p.id === id);
    if (participant) {
      setLastUndoAction({ id, name: participant.name, wasPerformed: participant.performed, timestamp: Date.now() });
      setTimeout(() => setLastUndoAction(null), 5000);
    }
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, performed: !p.performed } : p));
    syncActionToServer('TOGGLE_PERFORMED', { id });
  };

  const undoMarkDone = () => {
    if (lastUndoAction) {
      setParticipants(prev => prev.map(p => p.id === lastUndoAction.id ? { ...p, performed: lastUndoAction.wasPerformed } : p));
      setLastUndoAction(null);
      syncActionToServer('UNDO_MARK_DONE', {});
    }
  };

  const addJudge = (name, photo = null) => {
    const taken = new Set(judges.map(j => j.code));
    const code = makeUniqueCode("JDG", taken);
    setJudges(prev => [...prev, { id: `j_${Date.now()}`, name, code, photo }]);
    syncActionToServer('ADD_JUDGE', { name, code, photo });
    return code;
  };

  const updateParticipant = (id, fields) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    syncActionToServer('UPDATE_PARTICIPANT', { id, fields });
  };

  const removeParticipant = (id) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (currentId === id) setCurrentId(null);
    syncActionToServer('REMOVE_PARTICIPANT', { id });
  };

  const updateJudge = (id, fields) => {
    setJudges(prev => prev.map(j => j.id === id ? { ...j, ...fields } : j));
    syncActionToServer('UPDATE_JUDGE', { id, fields });
  };

  const removeJudge = (id) => {
    setJudges(prev => prev.filter(j => j.id !== id));
    syncActionToServer('REMOVE_JUDGE', { id });
  };

  const handleSetWeights = (w) => {
    setWeights(w);
    syncActionToServer('SET_WEIGHTS', w);
  };

  const handleSetCategoryFilter = (catId) => {
    setCategoryFilter(catId);
    syncActionToServer('SET_CATEGORY_FILTER', { categoryId: catId });
  };

  const handleSetScoreRevealed = (updater) => {
    setScoreRevealed(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (currentId && next[currentId]) {
        syncActionToServer('SET_SCORE_REVEALED', { participantId: currentId, reveals: next[currentId] });
      }
      return next;
    });
  };

  const handleSetLeaderboardRevealed = (updater) => {
    setLeaderboardRevealed(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: next });
      return next;
    });
  };

  const handleSetShowQR = (val) => {
    setShowQR(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showQR: val });
  };

  const handleSetShowEventCode = (val) => {
    setShowEventCode(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showEventCode: val });
  };

  const handleSetShowJudgesOnProjector = (val) => {
    setShowJudgesOnProjector(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showJudgesOnProjector: val });
  };

  const handleSetPinPosition = (pos) => {
    setPinPosition(pos);
    const showCode = pos !== 'hidden';
    setShowEventCode(showCode);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { pinPosition: pos, showEventCode: showCode });
  };

  const handleSetSelectedJudgeIds = (ids) => {
    setSelectedJudgeIds(ids);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { selectedJudgeIds: ids });
  };

  const handleSetQrSpotlight = (val) => {
    setQrSpotlight(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { qrSpotlight: val });
  };

  const handleSetStageMode = (mode) => {
    setStageMode(mode);
    const updates = { stageMode: mode };
    if (mode === 'video') {
      setShowJudgesOnProjector(false);
      setLeaderboardRevealed(false);
      setQrSpotlight(false);
      updates.showJudgesOnProjector = false;
      updates.qrSpotlight = false;
    } else if (mode === 'judges') {
      setShowJudgesOnProjector(true);
      setLeaderboardRevealed(false);
      setQrSpotlight(false);
      updates.showJudgesOnProjector = true;
      updates.qrSpotlight = false;
    } else if (mode === 'qr') {
      setQrSpotlight(true);
      setShowJudgesOnProjector(false);
      setLeaderboardRevealed(false);
      updates.qrSpotlight = true;
      updates.showJudgesOnProjector = false;
    } else if (mode === 'leaderboard') {
      setLeaderboardRevealed(true);
      setShowJudgesOnProjector(false);
      setQrSpotlight(false);
      updates.showJudgesOnProjector = false;
      updates.qrSpotlight = false;
    } else if (mode === 'performer') {
      setShowJudgesOnProjector(false);
      setLeaderboardRevealed(false);
      setQrSpotlight(false);
      updates.showJudgesOnProjector = false;
      updates.qrSpotlight = false;
    }
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', updates);
  };

  const handleSetShowPhotoOnProjector = (val) => {
    setShowPhotoOnProjector(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showPhotoOnProjector: val });
  };

  const handleSetShowCodeOnProjector = (val) => {
    setShowCodeOnProjector(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showCodeOnProjector: val });
  };

  const handleSetShowNameOnProjector = (val) => {
    setShowNameOnProjector(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showNameOnProjector: val });
  };

  const handleSetShowFormulaBanner = (val) => {
    setShowFormulaBanner(val);
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', { showFormulaBanner: val });
  };

  const clearAllData = () => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to remove all event data (participants, registrations, judges, scores, and votes)?')) {
      return;
    }
    setParticipants([]);
    setJudges([]);
    setRegistrations([]);
    setCurrentId(null);
    setVotingOpen(false);
    setScoreRevealed({});
    setLeaderboardRevealed(false);
    setVotes({});
    setJudgeScores({});
    setLastUndoAction(null);
    clearStorage();
    syncActionToServer('CLEAR_ALL_DATA', {});
    broadcastStateChange('STATE_UPDATE', {
      participants: [],
      judges: [],
      registrations: [],
      currentId: null,
      votingOpen: false,
      scoreRevealed: {},
      leaderboardRevealed: false,
      votes: {},
      judgeScores: {},
      categoryFilter,
      weights,
      showQR,
      showEventCode,
      showJudgesOnProjector,
      qrSpotlight,
      leaderboardLimits
    });
  };

  const generateRegistrationCode = (name, categoryId, codeNumber, metadata = {}) => {
    const category = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
    if (!category) return { ok: false, error: "Invalid category selected." };
    const prefix = metadata.categoryCode || category.prefix || "GEN";
    const num = String(codeNumber || "").trim().toUpperCase();
    const token = String(metadata.token || (num ? `${prefix}${num}` : `${prefix}${Math.floor(10 + Math.random() * 90)}`)).trim().toUpperCase();
    const code = token;

    // Check duplicate in pending/enrolled registrations
    const existingReg = registrations.find(r => r.code.toUpperCase() === code || (r.token && r.token.toUpperCase() === token));
    if (existingReg) {
      return { 
        ok: false, 
        error: `Token/Code ${code} is already issued to "${existingReg.name}".` 
      };
    }

    // Check duplicate in existing participants
    const existingPart = participants.find(p => (p.code && p.code.toUpperCase() === code) || (p.token && p.token.toUpperCase() === token));
    if (existingPart) {
      return { 
        ok: false, 
        error: `Token/Code ${code} is already assigned to participant "${existingPart.name}".` 
      };
    }

    const reg = { 
      id: `r_${Date.now()}`, 
      name: name.trim(), 
      categoryId,
      categoryCode: prefix,
      categoryName: category.label,
      code,
      token,
      phone: metadata.phone ? String(metadata.phone).trim() : "",
      regNo: metadata.regNo ? String(metadata.regNo).trim().toUpperCase() : "",
      status: "enrolled",
      createdAt: new Date().toISOString()
    };
    setRegistrations(prev => [reg, ...prev]);

    // Ensure participant is also added directly to participants state so Admin can immediately call them
    const newPart = {
      id: `p_${Date.now()}`,
      name: name.trim(),
      act: metadata.act?.trim() || category.label,
      categoryId,
      categoryCode: prefix,
      categoryName: category.label,
      code,
      token,
      phone: metadata.phone ? String(metadata.phone).trim() : "",
      regNo: metadata.regNo ? String(metadata.regNo).trim().toUpperCase() : "",
      photo: null,
      performed: false
    };
    setParticipants(prev => [...prev, newPart]);

    syncActionToServer('GENERATE_REGISTRATION_CODE', { 
      name: name.trim(), 
      categoryId, 
      categoryCode: prefix,
      codeNumber: num,
      phone: metadata.phone,
      regNo: metadata.regNo,
      token,
      autoEnroll: true,
      act: metadata.act
    });

    return { ok: true, reg, code, token, participant: newPart };
  };

  const claimRegistration = (code, act, photo = null) => {
    const trimmedCode = (code || "").trim().toUpperCase();
    const reg = registrations.find(r => r.code.toUpperCase() === trimmedCode);
    
    // Check if participant already exists with this code (e.g. pre-existing or created by admin)
    const existingPart = participants.find(p => p.code && p.code.toUpperCase() === trimmedCode);
    if (existingPart) {
      if (photo !== null || (act && act.trim())) {
        updateParticipant(existingPart.id, {
          ...(photo !== null ? { photo } : {}),
          ...(act && act.trim() ? { act: act.trim() } : {})
        });
      }
      return { 
        ok: true, 
        isExisting: true, 
        participant: { ...existingPart, ...(photo !== null ? { photo } : {}), ...(act && act.trim() ? { act: act.trim() } : {}) },
        reg: reg || null,
        category: CATEGORIES.find(c => c.id === existingPart.categoryId) || CATEGORIES[0]
      };
    }

    if (!reg) return { ok: false, error: "That code doesn't match any registration. Check with the desk." };
    if (reg.status === "enrolled") return { ok: false, error: "This code has already been used to enrol." };
    
    const category = CATEGORIES.find(c => c.id === reg.categoryId) || CATEGORIES[0];
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: "enrolled" } : r));
    const newPartId = `p_${Date.now()}`;
    const newPart = { 
      id: newPartId, 
      name: reg.name, 
      act: act?.trim() || category.label, 
      categoryId: reg.categoryId, 
      code: reg.code, 
      photo, 
      performed: false 
    };
    setParticipants(prev => [...prev, newPart]);
    syncActionToServer('CLAIM_REGISTRATION', { code, act, photo });
    return { ok: true, reg, category, participant: newPart };
  };

  const handleCastVote = (participantId, studentId, score) => {
    setVotes(prev => ({
      ...prev,
      [participantId]: { ...(prev[participantId] || {}), [studentId]: score }
    }));
    syncActionToServer('CAST_AUDIENCE_VOTE', { participantId, studentId, score });
  };

  const handleSubmitJudgeScore = (participantId, judgeId, marks) => {
    setJudgeScores(prev => ({
      ...prev,
      [participantId]: { ...(prev[participantId] || {}), [judgeId]: marks }
    }));
    syncActionToServer('SUBMIT_JUDGE_SCORE', { participantId, judgeId, marks });
  };

  const audienceVoteCount = (pid) => Object.keys(votes[pid] || {}).length;
  const audienceAvg = (pid) => {
    const v = Object.values(votes[pid] || {});
    if (!v.length) return 0;
    return +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2);
  };
  const judgeTotalFor = (pid, jid) => {
    const marks = judgeScores[pid]?.[jid];
    if (!marks && marks !== 0) return null;
    if (typeof marks === 'number') {
      return marks;
    }
    if (typeof marks === 'object') {
      const part = participants.find(p => p.id === pid);
      const catCriteria = getCriteriaForCategory(part?.categoryId);
      return catCriteria.reduce((sum, c) => sum + (Number(marks[c.id]) || 0), 0);
    }
    return Number(marks) || null;
  };
  const judgesAvgOutOf10 = (pid) => {
    const totals = judges.map(j => judgeTotalFor(pid, j.id)).filter(t => t !== null && !isNaN(t));
    if (!totals.length) return 0;
    const avgRaw = totals.reduce((a, b) => a + b, 0) / totals.length;
    return +((avgRaw / MAX_JUDGE_TOTAL) * 10).toFixed(2);
  };
  const finalScore = (pid) => {
    const j = judgesAvgOutOf10(pid);
    const a = audienceAvg(pid);
    return +((j * weights.judge + a * weights.audience) / 100).toFixed(2);
  };

  const leaderboard = [...participants].map(p => ({ ...p, score: finalScore(p.id) })).sort((a, b) => b.score - a.score);

  // Determine active view: Admin can preview any view; other portals are strictly locked to their own view
  const activeRole = role === "admin" ? adminPreviewRole : role;

  const PORTAL_NAMES = {
    admin: "Admin Master Console",
    volunteer: "Registration Desk",
    enroll: "Participant Portal",
    judge: "Judge Panel",
    audience: "Audience Portal",
    projector: "Projector Screen"
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('fts_audience_session');
      sessionStorage.removeItem('fts_judge_session');
      localStorage.removeItem('fts_auth_token');
    } catch {}
    window.location.href = '/login';
  };

  return (
    <div className="evt">
      <Style />

      {/* Portal Top Bar */}
      {role === "projector" ? null : (
        <nav className="evt-nav" style={{ justifyContent: "space-between", alignItems: "center", gap: 16, minHeight: 74, padding: "8px 24px" }}>
          <div className="evt-brand" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <img 
              src="/main_logo.png" 
              alt="Freshmen Talent Search 2026" 
              style={{ 
                height: 60, 
                width: "auto", 
                objectFit: "contain", 
                flexShrink: 0, 
                filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" 
              }} 
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
              {connStatus === "live" ? (
                <span className="evt-live" style={{ fontSize: 11, padding: "3px 9px" }} title="Authoritative real-time sync active across all connected screens">
                  <span className="evt-live-dot" /> LIVE SYNC
                </span>
              ) : (
                <span className="evt-closed" style={{ fontSize: 11, padding: "3px 9px", background: "#FFF3C4", color: "#8A5B00", borderColor: "#FFD400" }}>
                  ⚠ RECONNECTING...
                </span>
              )}
            </div>
          </div>

          {/* Participant Portal: Badge + Log Out */}
          {role === "enroll" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="evt-badge" style={{ background: "#FFD400", color: "#16274D", fontSize: 13, padding: "7px 14px", border: "1.5px solid #16274D", fontWeight: 800 }}>
                <BadgeCheck size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Participant Portal
              </span>
              <button 
                onClick={handleLogout}
                className="evt-btn evt-btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, color: "#EF4136", borderColor: "#EF4136", background: "#FFFFFF", fontWeight: 700 }}
                title="Log Out & Return to Login"
              >
                <LogOut size={13} color="#EF4136" /> Log Out
              </button>
            </div>
          )}

          {/* Registration Desk: Badge + Log Out */}
          {role === "volunteer" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="evt-badge" style={{ background: "#29ABE2", color: "#0E1830", fontSize: 13, padding: "7px 14px", border: "1.5px solid #16274D", fontWeight: 800 }}>
                <UserPlus size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Registration Desk Portal
              </span>
              <button 
                onClick={handleLogout}
                className="evt-btn evt-btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, color: "#EF4136", borderColor: "#EF4136", background: "#FFFFFF", fontWeight: 700 }}
                title="Log Out Desk & Return to Login"
              >
                <LogOut size={13} color="#EF4136" /> Log Out
              </button>
            </div>
          )}

          {/* Judge Panel: Badge + Log Out */}
          {role === "judge" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="evt-badge" style={{ background: "#29ABE2", color: "#0E1830", fontSize: 13, padding: "7px 14px", border: "1.5px solid #16274D", fontWeight: 800 }}>
                <Gavel size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Judge Evaluation Portal
              </span>
              <button 
                onClick={handleLogout}
                className="evt-btn evt-btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, color: "#EF4136", borderColor: "#EF4136", background: "#FFFFFF", fontWeight: 700 }}
                title="Log Out Judge Panel & Return to Login"
              >
                <LogOut size={13} color="#EF4136" /> Log Out
              </button>
            </div>
          )}

          {/* Audience Portal: Badge + Log Out */}
          {role === "audience" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="evt-badge" style={{ background: "#FFD400", color: "#16274D", fontSize: 13, padding: "7px 14px", border: "1.5px solid #16274D", fontWeight: 800 }}>
                <Users size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} /> Audience Voting Portal
              </span>
              <button 
                onClick={handleLogout}
                className="evt-btn evt-btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, color: "#EF4136", borderColor: "#EF4136", background: "#FFFFFF", fontWeight: 700 }}
                title="Log Out Voter & Return to Login"
              >
                <LogOut size={13} color="#EF4136" /> Log Out
              </button>
            </div>
          )}

          {/* Admin Master Navigation: Admin switch previews + Log Out */}
          {role === "admin" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="evt-badge" style={{ background: "#EF4136", color: "#fff", fontSize: 11, padding: "5px 9px", marginRight: 4, fontWeight: 800, letterSpacing: "0.08em" }}>
                ADMIN CONSOLE
              </span>
              {[
                { id: "admin", label: "Admin", icon: Radio },
                { id: "volunteer", label: "Desk", icon: UserPlus },
                { id: "enroll", label: "Participant", icon: BadgeCheck },
                { id: "judge", label: "Judge", icon: Gavel },
                { id: "audience", label: "Audience", icon: Users },
                { id: "projector", label: "Projector", icon: MonitorPlay },
              ].map(t => (
                <button 
                  key={t.id} 
                  className={`evt-tab ${activeRole === t.id ? "active" : ""}`} 
                  onClick={() => setAdminPreviewRole(t.id)}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
              <button 
                onClick={handleLogout}
                className="evt-btn evt-btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, color: "#EF4136", borderColor: "#EF4136", background: "#FFFFFF", fontWeight: 700, marginLeft: 6 }}
                title="Log Out Admin & Return to Login"
              >
                <LogOut size={13} color="#EF4136" /> Log Out
              </button>
            </div>
          )}
        </nav>
      )}

      {/* Admin Preview Notification Bar */}
      {role === "admin" && activeRole !== "admin" && (
        <div style={{ background: "#FFF3C4", borderBottom: "2px solid #FFD400", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#16274D" }}>
            👁️ Admin Preview: Viewing <u>{PORTAL_NAMES[activeRole]}</u> (Users accessing this portal directly cannot see other screens)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {activeRole === "projector" && (
              <a
                href="/live/projector"
                target="_blank"
                rel="noopener noreferrer"
                className="evt-btn evt-btn-teal"
                style={{ fontSize: 12, padding: "5px 12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                title="Open clean projector display in separate window for HDMI / second screen"
              >
                <ExternalLink size={13} /> Open Projector in Separate Tab
              </a>
            )}
            <button 
              className="evt-btn evt-btn-amber" 
              style={{ fontSize: 12, padding: "5px 12px" }}
              onClick={() => setAdminPreviewRole("admin")}
            >
              <ArrowLeft size={13} /> Return to Admin Console
            </button>
          </div>
        </div>
      )}

      <div className={activeRole === "projector" ? "" : "evt-stage"}>
        <div style={{ display: activeRole === "admin" ? "block" : "none" }}>
          <AdminView
            participants={participants}
            addParticipant={addParticipant}
            judges={judges}
            addJudge={addJudge}
            registrations={registrations}
            current={current}
            currentId={currentId}
            selectParticipant={selectParticipant}
            votingOpen={votingOpen}
            setVotingOpen={handleSetVotingOpen}
            audienceVoteCount={audienceVoteCount}
            audienceAvg={audienceAvg}
            judgeTotalFor={judgeTotalFor}
            judgesAvgOutOf10={judgesAvgOutOf10}
            finalScore={finalScore}
            scoreRevealed={scoreRevealed}
            setScoreRevealed={handleSetScoreRevealed}
            leaderboardRevealed={leaderboardRevealed}
            setLeaderboardRevealed={handleSetLeaderboardRevealed}
            weights={weights}
            setWeights={handleSetWeights}
            leaderboard={leaderboard}
            categoryFilter={categoryFilter}
            setCategoryFilter={handleSetCategoryFilter}
            CATEGORIES={CATEGORIES}
            EVENT_PIN={EVENT_PIN}
            MAX_JUDGE_TOTAL={MAX_JUDGE_TOTAL}
            togglePerformed={togglePerformed}
            updateParticipant={updateParticipant}
            removeParticipant={removeParticipant}
            updateJudge={updateJudge}
            removeJudge={removeJudge}
            lastUndoAction={lastUndoAction}
            undoMarkDone={undoMarkDone}
            showQR={showQR}
            setShowQR={handleSetShowQR}
            showEventCode={showEventCode}
            setShowEventCode={handleSetShowEventCode}
            showJudgesOnProjector={showJudgesOnProjector}
            setShowJudgesOnProjector={handleSetShowJudgesOnProjector}
            qrSpotlight={qrSpotlight}
            setQrSpotlight={handleSetQrSpotlight}
            leaderboardLimits={leaderboardLimits}
            setLeaderboardLimit={setLeaderboardLimit}
            clearAllData={clearAllData}
            stageMode={stageMode}
            setStageMode={handleSetStageMode}
            showPhotoOnProjector={showPhotoOnProjector}
            setShowPhotoOnProjector={handleSetShowPhotoOnProjector}
            showCodeOnProjector={showCodeOnProjector}
            setShowCodeOnProjector={handleSetShowCodeOnProjector}
            showNameOnProjector={showNameOnProjector}
            setShowNameOnProjector={handleSetShowNameOnProjector}
            showFormulaBanner={showFormulaBanner}
            setShowFormulaBanner={handleSetShowFormulaBanner}
          />
        </div>

        <div style={{ display: activeRole === "volunteer" ? "block" : "none" }}>
          <VolunteerView 
            registrations={registrations} 
            participants={participants}
            generateRegistrationCode={generateRegistrationCode} 
            CATEGORIES={CATEGORIES} 
          />
        </div>

        <div style={{ display: activeRole === "enroll" ? "block" : "none" }}>
          <ParticipantEnrollView 
            claimRegistration={claimRegistration} 
            participants={participants}
            updateParticipant={updateParticipant}
            registrations={registrations}
            CATEGORIES={CATEGORIES}
          />
        </div>

        <div style={{ display: activeRole === "judge" ? "block" : "none" }}>
          <JudgeView
            current={current}
            judges={judges}
            judgeScores={judgeScores}
            setJudgeScores={handleSubmitJudgeScore}
            judgeTotalFor={judgeTotalFor}
            CRITERIA={getCriteriaForCategory(current?.categoryId)}
            MAX_CRITERION={20}
            MAX_JUDGE_TOTAL={100}
          />
        </div>

        <div style={{ display: activeRole === "audience" ? "block" : "none" }}>
          <AudienceView 
            current={current} 
            votingOpen={votingOpen} 
            votes={votes} 
            setVotes={handleCastVote} 
            EVENT_PIN={EVENT_PIN} 
          />
        </div>

        <div style={{ display: activeRole === "projector" ? "block" : "none" }}>
          <ProjectorView
            current={current}
            currentId={currentId}
            participants={participants}
            selectParticipant={selectParticipant}
            votingOpen={votingOpen}
            setVotingOpen={handleSetVotingOpen}
            audienceVoteCount={audienceVoteCount}
            audienceAvg={audienceAvg}
            judgesAvgOutOf10={judgesAvgOutOf10}
            judgeTotalFor={judgeTotalFor}
            judgeScores={judgeScores}
            finalScore={finalScore}
            weights={weights}
            setWeights={handleSetWeights}
            scoreRevealed={scoreRevealed}
            setScoreRevealed={handleSetScoreRevealed}
            leaderboardRevealed={leaderboardRevealed}
            setLeaderboardRevealed={handleSetLeaderboardRevealed}
            leaderboard={leaderboard}
            categoryFilter={categoryFilter}
            setCategoryFilter={handleSetCategoryFilter}
            CATEGORIES={CATEGORIES}
            EVENT_PIN={EVENT_PIN}
            showQR={showQR}
            setShowQR={handleSetShowQR}
            showEventCode={showEventCode}
            setShowEventCode={handleSetShowEventCode}
            pinPosition={pinPosition}
            judges={judges}
            showJudgesOnProjector={showJudgesOnProjector}
            setShowJudgesOnProjector={handleSetShowJudgesOnProjector}
            selectedJudgeIds={selectedJudgeIds}
            qrSpotlight={qrSpotlight}
            setQrSpotlight={handleSetQrSpotlight}
            leaderboardLimits={leaderboardLimits}
            togglePerformed={togglePerformed}
            MAX_JUDGE_TOTAL={MAX_JUDGE_TOTAL}
            stageMode={stageMode}
            showPhotoOnProjector={showPhotoOnProjector}
            showCodeOnProjector={showCodeOnProjector}
            showNameOnProjector={showNameOnProjector}
            showFormulaBanner={showFormulaBanner}
          />
        </div>
      </div>
    </div>
  );
}
