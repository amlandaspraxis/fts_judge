import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Trophy,
  Maximize2,
  Minimize2,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  QrCode,
  Sparkles,
  Award,
  Crown,
  Medal,
  Users,
  MonitorPlay,
  Gavel,
  Tv,
  Play,
  Camera,
  BadgeCheck,
  Percent,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  initRealtimeEventSync,
  subscribeToBroadcast,
  fetchAuthoritativeState,
  syncActionToServer,
  broadcastStateChange,
  saveStateToStorage,
  loadStateFromStorage
} from '../../lib/eventSync';
import { sortParticipantsByCode } from '../../lib/scoring';

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

const DEFAULT_FALLBACK_JUDGES = [
  { 
    id: "j1", 
    name: "Dr. N. Kapoor", 
    code: "4821",
    accessCode: "4821", 
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", 
    title: "Senior Faculty & Performing Arts Chair" 
  },
  { 
    id: "j2", 
    name: "Prof. R. Iyer", 
    code: "4822",
    accessCode: "4822", 
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80", 
    title: "Dean of Cultural Affairs" 
  },
  { 
    id: "j3", 
    name: "Elena Rostova", 
    code: "4823",
    accessCode: "4823", 
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", 
    title: "National Choreography Lead" 
  }
];

const DEFAULT_CATEGORIES = [
  { id: "dance", label: "Dance", prefix: "DNC" },
  { id: "singing", label: "Singing / Music", prefix: "MSC" },
  { id: "comedy", label: "Comedy", prefix: "CMD" },
  { id: "band", label: "Band", prefix: "BND" },
  { id: "drama", label: "Drama / Theatre", prefix: "DRM" },
  { id: "poetry", label: "Poetry / Spoken Word", prefix: "PTY" }
];

export const matchParticipantToCategory = (p, cat, categoryList = []) => {
  if (!cat || !p) return true;
  let catObj = typeof cat === 'string' ? categoryList.find(c => c.id === cat) : cat;
  if (!catObj && typeof cat === 'string') {
    catObj = { id: cat, name: cat, label: cat };
  }
  if (!catObj || !catObj.id) return true;

  const pCat = (p.categoryId || "").toLowerCase().trim();
  const pCatName = (p.categoryName || "").toLowerCase().trim();
  const pCode = (p.code || p.participantCode || p.token || "").toUpperCase().trim();
  const cId = (catObj.id || "").toLowerCase().trim();
  const cName = (catObj.name || catObj.label || "").toLowerCase().trim();
  const cCode = (catObj.code || catObj.prefix || "").toUpperCase().trim();

  // 1. Direct ID, name, or code match
  if (pCat && (pCat === cId || pCat === cName || (cCode && pCat === cCode.toLowerCase()))) return true;
  if (pCatName && (pCatName === cName || pCatName === cId)) return true;

  // 2. Code prefix match (e.g. DAN-07 starts with DAN, DNC-14 starts with DNC)
  if (cCode && (pCode.startsWith(cCode) || pCat.toUpperCase().startsWith(cCode))) return true;

  // 3. Keyword / semantic substring match
  // Dance (Dancing superstar, DAN, DNC)
  if ((pCat.includes('danc') || pCode.startsWith('DAN') || pCode.startsWith('DNC')) && 
      (cId.includes('danc') || cName.includes('danc') || cCode === 'DAN' || cCode === 'DNC')) return true;
  // Singing / Music (Singing idol, SNG, MSC)
  if ((pCat.includes('sing') || pCat.includes('music') || pCode.startsWith('SNG') || pCode.startsWith('MSC')) && 
      (cId.includes('sing') || cName.includes('sing') || cId.includes('music') || cName.includes('music') || cCode === 'SNG' || cCode === 'MSC')) return true;
  // Comedy / Open Mic (Open mic, CMD, MIC)
  if ((pCat.includes('comed') || pCat.includes('standup') || pCode.startsWith('CMD') || pCode.startsWith('MIC')) && 
      (cId.includes('comed') || cName.includes('comed') || cId.includes('mic') || cName.includes('mic') || cCode === 'CMD' || cCode === 'MIC')) return true;
  // Poetry / Elocution / Spoken Word
  if ((pCat.includes('poet') || pCat.includes('spoken') || pCat.includes('elocut') || pCode.startsWith('POE') || pCode.startsWith('PTY') || pCode.startsWith('ELO')) && 
      (cId.includes('poet') || cName.includes('poet') || cId.includes('elocut') || cName.includes('elocut') || cCode === 'POE' || cCode === 'PTY' || cCode === 'ELO')) return true;
  // Drama / Dialogue
  if ((pCat.includes('drama') || pCat.includes('theat') || pCat.includes('dialogue') || pCode.startsWith('DRM') || pCode.startsWith('DEN')) && 
      (cId.includes('drama') || cName.includes('drama') || cId.includes('dialogue') || cName.includes('dialogue') || cCode === 'DRM' || cCode === 'DEN')) return true;
  // Fashion Show
  if ((pCat.includes('fashion') || pCode.startsWith('MMF') || pCode.startsWith('FSH')) && 
      (cId.includes('fashion') || cName.includes('fashion') || cCode === 'MMF' || cCode === 'FSH')) return true;
  // Special talent
  if ((pCat.includes('special') || pCode.startsWith('SPL')) &&
      (cId.includes('special') || cName.includes('special') || cCode === 'SPL')) return true;
  // Reel to reel
  if ((pCat.includes('reel') || pCode.startsWith('REL')) &&
      (cId.includes('reel') || cName.includes('reel') || cCode === 'REL')) return true;

  return false;
};

export default function AdminProjector() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCat, setSelectedCat] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topN, setTopN] = useState(5); // Default top 5
  const [revealScores, setRevealScores] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [copied, setCopied] = useState(false);

  // Authoritative Real-Time Event State from SSE / Server / localStorage
  const [liveState, setLiveState] = useState(() => {
    const saved = loadStateFromStorage();
    const parts = (saved?.participants && saved.participants.length > 0) ? saved.participants : DEFAULT_FALLBACK_PARTICIPANTS;
    const jdgs = (saved?.judges && saved.judges.length > 0) ? saved.judges : DEFAULT_FALLBACK_JUDGES;
    return {
      stageMode: saved?.stageMode || 'video',
      currentId: saved?.currentId || parts[0]?.id || 'p1',
      showPhotoOnProjector: saved?.showPhotoOnProjector !== undefined ? saved.showPhotoOnProjector : true,
      showCodeOnProjector: saved?.showCodeOnProjector !== undefined ? saved.showCodeOnProjector : true,
      showNameOnProjector: saved?.showNameOnProjector !== undefined ? saved.showNameOnProjector : true,
      showFormulaBanner: saved?.showFormulaBanner !== undefined ? saved.showFormulaBanner : true,
      showJudgesOnProjector: saved?.showJudgesOnProjector || false,
      showQR: saved?.showQR || false,
      showEventCode: false,
      pinPosition: 'hidden',
      selectedJudgeIds: (saved?.selectedJudgeIds && saved.selectedJudgeIds.length > 0) ? saved.selectedJudgeIds : jdgs.map(j => j.id),
      qrSpotlight: saved?.qrSpotlight || false,
      votingOpen: saved?.votingOpen || false,
      scoreRevealed: saved?.scoreRevealed || {},
      weights: saved?.weights || { judge: 70, audience: 30 },
      participants: parts,
      judges: jdgs,
      categoryFilter: saved?.categoryFilter || 'dance',
      EVENT_PIN: saved?.EVENT_PIN || '4821',
      leaderboardRevealed: saved?.leaderboardRevealed || false
    };
  });

  const stageRef = useRef(null);

  // Helper actions to dispatch authoritative commands to stage across BroadcastChannel, localStorage and Server
  const broadcastAndSync = (nextState, action, payload) => {
    setLiveState(nextState);
    saveStateToStorage(nextState);
    broadcastStateChange('STATE_UPDATE', nextState);
    if (action) {
      syncActionToServer(action, payload);
    }
  };

  // Initialize Real-time synchronization and load authoritative data
  useEffect(() => {
    const unsubSSE = initRealtimeEventSync();
    const unsubBC = subscribeToBroadcast((msg) => {
      if (!msg) return;
      if (msg.action === 'STATE_UPDATE' && msg.payload) {
        setLiveState(prev => ({ ...prev, ...msg.payload }));
      } else if (msg.action === 'ADD_JUDGE' && msg.payload?.judge) {
        const j = msg.payload.judge;
        setLiveState(prev => {
          const exists = (prev.judges || []).some(x => x.id === j.id);
          const nextJudges = exists ? prev.judges.map(x => x.id === j.id ? { ...x, ...j } : x) : [...(prev.judges || []), j];
          const nextSelected = (prev.selectedJudgeIds && prev.selectedJudgeIds.length > 0) ? prev.selectedJudgeIds : nextJudges.map(x => x.id);
          return { ...prev, judges: nextJudges, selectedJudgeIds: nextSelected };
        });
      } else if (msg.action === 'REMOVE_JUDGE' && msg.payload?.id) {
        const rid = msg.payload.id;
        setLiveState(prev => ({
          ...prev,
          judges: (prev.judges || []).filter(x => x.id !== rid),
          selectedJudgeIds: (prev.selectedJudgeIds || []).filter(x => x !== rid)
        }));
      } else if (msg.action === 'ADD_PARTICIPANT' && (msg.payload?.participant || msg.payload)) {
        const p = msg.payload.participant || msg.payload;
        setLiveState(prev => {
          const exists = (prev.participants || []).some(x => x.id === p.id || x.code === p.code);
          const nextParts = exists ? prev.participants.map(x => (x.id === p.id || x.code === p.code) ? { ...x, ...p } : x) : [...(prev.participants || []), p];
          return { ...prev, participants: nextParts };
        });
      } else if (msg.action === 'SUBMIT_JUDGE_SCORE' && msg.payload) {
        const { participantId, judgeId, marks } = msg.payload;
        setLiveState(prev => ({
          ...prev,
          judgeScores: {
            ...(prev.judgeScores || {}),
            [participantId]: {
              ...((prev.judgeScores || {})[participantId] || {}),
              [judgeId]: marks
            }
          }
        }));
      } else if (msg.action === 'CAST_AUDIENCE_VOTE' && msg.payload) {
        const { participantId, studentId, score } = msg.payload;
        setLiveState(prev => ({
          ...prev,
          votes: {
            ...(prev.votes || {}),
            [participantId]: {
              ...((prev.votes || {})[participantId] || {}),
              [studentId]: score
            }
          }
        }));
      }
    });

    fetchAuthoritativeState().then(s => {
      if (s) {
        setLiveState(prev => {
          const parts = (s.participants && s.participants.length > 0) ? s.participants : prev.participants;
          const jdgs = (s.judges && s.judges.length > 0) ? s.judges : prev.judges;
          const activeId = s.currentId || prev.currentId || parts[0]?.id || 'p1';
          const merged = { 
            ...prev, 
            ...s, 
            participants: parts, 
            judges: jdgs, 
            currentId: activeId,
            pinPosition: s.pinPosition || prev.pinPosition || 'side',
            selectedJudgeIds: (s.selectedJudgeIds && s.selectedJudgeIds.length > 0) ? s.selectedJudgeIds : jdgs.map(j => j.id)
          };
          saveStateToStorage(merged);
          return merged;
        });
      }
    });

    // Also fetch live data from REST endpoints on mount to guarantee fresh enrollment
    Promise.allSettled([
      api.get('/admin/judges'),
      api.get('/participants')
    ]).then(([judgesRes, partsRes]) => {
      setLiveState(prev => {
        let updatedJudges = [...(prev.judges || [])];
        let updatedParts = [...(prev.participants || [])];
        let changed = false;

        if (judgesRes.status === 'fulfilled' && judgesRes.value?.data?.judges?.length > 0) {
          const apiJudges = judgesRes.value.data.judges;
          apiJudges.forEach(aj => {
            const idx = updatedJudges.findIndex(j => j.id === aj.id || (aj.email && j.email && j.email.toLowerCase() === aj.email.toLowerCase()));
            if (idx >= 0) {
              updatedJudges[idx] = { ...updatedJudges[idx], ...aj };
            } else {
              updatedJudges.push(aj);
            }
          });
          changed = true;
        }

        if (partsRes.status === 'fulfilled' && partsRes.value?.data?.participants?.length > 0) {
          const apiParts = partsRes.value.data.participants;
          apiParts.forEach(ap => {
            const code = (ap.participantCode || ap.code || '').toUpperCase();
            const idx = updatedParts.findIndex(p => p.id === ap.id || (code && p.code?.toUpperCase() === code));
            const mapped = {
              id: ap.id,
              name: ap.name,
              code: code,
              token: code,
              act: ap.routineTitle || ap.act || 'Live Performance',
              routineTitle: ap.routineTitle || ap.act || '',
              categoryId: ap.categoryId,
              categoryName: ap.categoryName || '',
              categoryCode: ap.categoryCode || '',
              photo: ap.photo || null,
              performed: Boolean(ap.performed)
            };
            if (idx >= 0) {
              updatedParts[idx] = { ...updatedParts[idx], ...mapped };
            } else {
              updatedParts.push(mapped);
            }
          });
          changed = true;
        }

        if (changed) {
          const allIds = updatedJudges.map(j => j.id);
          const currentSelected = prev.selectedJudgeIds || [];
          const nextSelected = currentSelected.length > 0
            ? currentSelected.filter(id => allIds.includes(id))
            : allIds;
          const nextState = {
            ...prev,
            judges: updatedJudges,
            participants: updatedParts,
            selectedJudgeIds: nextSelected.length > 0 ? nextSelected : allIds
          };
          saveStateToStorage(nextState);
          return nextState;
        }
        return prev;
      });
    }).catch(err => console.warn('[Projector] Initial data load warning:', err));

    return () => {
      unsubSSE();
      unsubBC();
    };
  }, []);

  // Load categories on mount
  useEffect(() => {
    api.get('/admin/categories')
      .then(res => {
        const cats = res.data.categories || [];
        if (cats.length > 0) {
          setCategories(cats);
          if (!selectedCat) {
            setSelectedCat(cats[0].id);
          }
        }
      })
      .catch(() => {
        setCategories(DEFAULT_CATEGORIES);
        if (!selectedCat) setSelectedCat(DEFAULT_CATEGORIES[0].id);
      });
  }, []);

  // Fetch results for the selected category
  const fetchCategoryResults = (catId) => {
    if (!catId) return;
    api.get(`/results?categoryId=${catId}`)
      .then(res => {
        setResults(res.data.results || []);
        setLastRefreshed(new Date());
      })
      .catch(err => console.error('Failed to fetch results', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedCat) {
      fetchCategoryResults(selectedCat);
    }
  }, [selectedCat]);

  // Auto-refresh interval (every 3 seconds)
  useEffect(() => {
    if (!autoRefresh || !selectedCat) return;
    const interval = setInterval(() => {
      fetchCategoryResults(selectedCat);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedCat]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Open standalone presenter window
  const openPresentationWindow = () => {
    const url = `/live/projector`;
    window.open(url, '_blank', 'width=1400,height=900,menubar=no,toolbar=no');
  };

  const updateProjectorSettings = (settings) => {
    const nextState = { ...liveState, ...settings };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', settings);
  };

  const handleStandbyVideo = () => {
    const nextState = {
      ...liveState,
      stageMode: 'video',
      showJudgesOnProjector: false,
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      stageMode: 'video',
      showJudgesOnProjector: false,
      qrSpotlight: false,
      leaderboardRevealed: false
    });
    syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
  };

  const handleShowPerformer = (pid = null) => {
    const pList = (liveState.participants && liveState.participants.length > 0)
      ? liveState.participants
      : DEFAULT_FALLBACK_PARTICIPANTS;
    const targetId = pid || liveState.currentId || pList[0]?.id || 'p1';
    const nextState = {
      ...liveState,
      participants: pList,
      stageMode: 'performer',
      currentId: targetId,
      showJudgesOnProjector: false,
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'SELECT_PARTICIPANT', { id: targetId });
    syncActionToServer('UPDATE_PROJECTOR_SETTINGS', {
      stageMode: 'performer',
      showJudgesOnProjector: false,
      qrSpotlight: false,
      leaderboardRevealed: false
    });
    syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
  };

  const allJudges = (liveState.judges && liveState.judges.length > 0) ? liveState.judges : DEFAULT_FALLBACK_JUDGES;
  const allJudgeIds = allJudges.map(j => j.id);
  const currentSelectedJudgeIds = (Array.isArray(liveState.selectedJudgeIds) && liveState.selectedJudgeIds.length > 0)
    ? liveState.selectedJudgeIds.filter(id => allJudgeIds.includes(id))
    : allJudgeIds;
  const isSoloSpotlight = currentSelectedJudgeIds.length === 1;
  const isAllJudgesSelected = currentSelectedJudgeIds.length === allJudges.length && allJudges.length > 0;

  const handleToggleJudges = () => {
    const nextShowing = !liveState.showJudgesOnProjector;
    const nextMode = nextShowing ? 'judges' : (liveState.currentId ? 'performer' : 'video');
    const nextIds = currentSelectedJudgeIds.length > 0 ? currentSelectedJudgeIds : allJudges.map(j => j.id);
    const nextState = {
      ...liveState,
      showJudgesOnProjector: nextShowing,
      stageMode: nextMode,
      selectedJudgeIds: nextIds,
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      showJudgesOnProjector: nextShowing,
      stageMode: nextMode,
      selectedJudgeIds: nextIds,
      qrSpotlight: false
    });
    if (nextShowing) {
      syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
    }
  };

  const handleShowAllJudges = () => {
    const allIds = allJudges.map(j => j.id);
    const nextState = {
      ...liveState,
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: allIds,
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: allIds,
      qrSpotlight: false
    });
    syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
  };

  const handleSelectJudgeCount = (count) => {
    let nextIds;
    if (count === 'all' || count >= allJudges.length) {
      nextIds = allJudges.map(j => j.id);
    } else {
      nextIds = allJudges.slice(0, count).map(j => j.id);
    }
    const nextState = {
      ...liveState,
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: nextIds,
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: nextIds,
      qrSpotlight: false
    });
    syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
  };

  const handleShowSingleJudge = (judgeId) => {
    const nextState = {
      ...liveState,
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: [judgeId],
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: [judgeId],
      qrSpotlight: false
    });
    syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
  };

  const handleToggleJudgeSelection = (judgeId) => {
    let nextIds;
    if (currentSelectedJudgeIds.includes(judgeId)) {
      nextIds = currentSelectedJudgeIds.filter(id => id !== judgeId);
      if (nextIds.length === 0) {
        nextIds = [judgeId];
      }
    } else {
      nextIds = [...currentSelectedJudgeIds, judgeId];
    }

    const nextState = {
      ...liveState,
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: nextIds,
      qrSpotlight: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      showJudgesOnProjector: true,
      stageMode: 'judges',
      selectedJudgeIds: nextIds,
      qrSpotlight: false
    });
    syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
  };

  const handleStepJudge = (direction) => {
    const list = allJudges;
    if (list.length === 0) return;
    const currId = (currentSelectedJudgeIds.length === 1 ? currentSelectedJudgeIds[0] : null) || list[0]?.id;
    const currIdx = list.findIndex(j => j.id === currId);
    let nextIdx = 0;
    if (direction === 'next') {
      nextIdx = (currIdx + 1) % list.length;
    } else {
      nextIdx = (currIdx - 1 + list.length) % list.length;
    }
    handleShowSingleJudge(list[nextIdx]?.id);
  };

  const handleSetPinPosition = (pos) => {
    const showCode = pos !== 'hidden';
    const nextState = {
      ...liveState,
      pinPosition: pos,
      showEventCode: showCode
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      pinPosition: pos,
      showEventCode: showCode
    });
  };

  const handleToggleQRSpotlight = () => {
    const nextSpotlight = !liveState.qrSpotlight;
    const nextMode = nextSpotlight ? 'qr' : (liveState.currentId ? 'performer' : 'video');
    const nextState = {
      ...liveState,
      qrSpotlight: nextSpotlight,
      showQR: true,
      stageMode: nextMode,
      showJudgesOnProjector: false,
      leaderboardRevealed: false
    };
    broadcastAndSync(nextState, 'UPDATE_PROJECTOR_SETTINGS', {
      qrSpotlight: nextSpotlight,
      showQR: true,
      stageMode: nextMode,
      showJudgesOnProjector: false
    });
    if (nextSpotlight) {
      syncActionToServer('SET_LEADERBOARD_REVEALED', { revealed: false });
    }
  };

  const handleToggleLeaderboard = () => {
    const nextRev = !liveState.leaderboardRevealed;
    const nextMode = nextRev ? 'leaderboard' : (liveState.currentId ? 'performer' : 'video');
    const nextState = {
      ...liveState,
      leaderboardRevealed: nextRev,
      stageMode: nextMode,
      showJudgesOnProjector: false,
      qrSpotlight: false
    };
    broadcastAndSync(nextState, 'SET_LEADERBOARD_REVEALED', { revealed: nextRev });
    if (nextRev) {
      syncActionToServer('UPDATE_PROJECTOR_SETTINGS', {
        showJudgesOnProjector: false,
        qrSpotlight: false
      });
    }
  };

  const handleSetWeights = (judgeVal) => {
    const j = Math.max(0, Math.min(100, judgeVal));
    const newWeights = { judge: j, audience: 100 - j };
    const nextState = { ...liveState, weights: newWeights };
    broadcastAndSync(nextState, 'SET_WEIGHTS', newWeights);
  };

  const handleToggleVoting = () => {
    const next = !liveState.votingOpen;
    const nextState = { ...liveState, votingOpen: next };
    broadcastAndSync(nextState, 'SET_VOTING_OPEN', { open: next });
  };

  const handleRevealScorePart = (type) => {
    const pList = (liveState.participants && liveState.participants.length > 0)
      ? liveState.participants
      : DEFAULT_FALLBACK_PARTICIPANTS;
    const activeId = liveState.currentId || pList[0]?.id || 'p1';
    const curr = liveState.scoreRevealed?.[activeId] || {};
    const updated = { ...curr, [type]: !curr[type] };
    const nextState = {
      ...liveState,
      currentId: activeId,
      scoreRevealed: {
        ...liveState.scoreRevealed,
        [activeId]: updated
      }
    };
    broadcastAndSync(nextState, 'SET_SCORE_REVEALED', {
      participantId: activeId,
      reveals: { [type]: !curr[type] }
    });
  };

  const handleRevealAllScores = () => {
    const pList = (liveState.participants && liveState.participants.length > 0)
      ? liveState.participants
      : DEFAULT_FALLBACK_PARTICIPANTS;
    const activeId = liveState.currentId || pList[0]?.id || 'p1';
    const updated = { judges: true, audience: true, overall: true };
    const nextState = {
      ...liveState,
      currentId: activeId,
      scoreRevealed: {
        ...liveState.scoreRevealed,
        [activeId]: updated
      }
    };
    broadcastAndSync(nextState, 'SET_SCORE_REVEALED', {
      participantId: activeId,
      reveals: updated
    });
  };

  const handleHideAllScores = () => {
    const pList = (liveState.participants && liveState.participants.length > 0)
      ? liveState.participants
      : DEFAULT_FALLBACK_PARTICIPANTS;
    const activeId = liveState.currentId || pList[0]?.id || 'p1';
    const updated = { judges: false, audience: false, overall: false };
    const nextState = {
      ...liveState,
      currentId: activeId,
      scoreRevealed: {
        ...liveState.scoreRevealed,
        [activeId]: updated
      }
    };
    broadcastAndSync(nextState, 'SET_SCORE_REVEALED', {
      participantId: activeId,
      reveals: updated
    });
  };

  const handleStepParticipant = (direction) => {
    const pList = (liveState.participants && liveState.participants.length > 0)
      ? liveState.participants
      : DEFAULT_FALLBACK_PARTICIPANTS;
    const catList = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
    const activeCatObj = liveState.categoryFilter
      ? (catList.find(c => c.id === liveState.categoryFilter || (c.name && c.name.toLowerCase() === (liveState.categoryFilter || '').toLowerCase()) || matchParticipantToCategory({ categoryId: liveState.categoryFilter }, c, catList)) || { id: liveState.categoryFilter })
      : null;

    const activeCatList = sortParticipantsByCode(
      liveState.categoryFilter
        ? pList.filter(p => matchParticipantToCategory(p, activeCatObj || { id: liveState.categoryFilter }, catList))
        : pList
    );
    const pool = activeCatList.length > 0 ? activeCatList : pList;
    if (pool.length === 0) return;
    const currIdx = pool.findIndex(p => p.id === liveState.currentId);
    let nextIdx = 0;
    if (direction === 'next') {
      nextIdx = (currIdx + 1) % pool.length;
    } else {
      nextIdx = (currIdx - 1 + pool.length) % pool.length;
    }
    handleShowPerformer(pool[nextIdx]?.id);
  };

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

  const activeParticipant = (liveState.participants || DEFAULT_FALLBACK_PARTICIPANTS).find(p => p.id === liveState.currentId) || (liveState.participants?.[0] || DEFAULT_FALLBACK_PARTICIPANTS[0]);

  let effectiveStageMode = liveState.stageMode || 'video';
  if (liveState.leaderboardRevealed) {
    effectiveStageMode = 'leaderboard';
  } else if (liveState.showJudgesOnProjector) {
    effectiveStageMode = 'judges';
  } else if (liveState.qrSpotlight) {
    effectiveStageMode = 'qr';
  } else if (liveState.stageMode === 'performer') {
    effectiveStageMode = 'performer';
  }

  let statusBadge = {
    title: "Standby Video Looping Fullscreen",
    sub: "Stage is idle with edge-to-edge looping video. Zero buttons on projector portal.",
    icon: MonitorPlay,
    color: "#29ABE2",
    bg: "#E8F4FD"
  };

  if (liveState.leaderboardRevealed) {
    statusBadge = {
      title: "Category Leaderboard Active on Stage",
      sub: "Projector is broadcasting category rankings and calculated final scores.",
      icon: Trophy,
      color: "#FFD400",
      bg: "#16274D",
      textColor: "#16274D"
    };
  } else if (liveState.showJudgesOnProjector || effectiveStageMode === 'judges') {
    const visibleCount = currentSelectedJudgeIds.length;
    const singleJudgeName = allJudges.find(j => j.id === currentSelectedJudgeIds[0])?.name || "1 Judge";
    const judgeTitle = visibleCount === 1
      ? `Judge Spotlight: ${singleJudgeName}`
      : (visibleCount === 2 ? `Featured Evaluators (2 Judges)` : `Official Judges Panel (${visibleCount} Judges)`);
    statusBadge = {
      title: judgeTitle,
      sub: visibleCount === 1
        ? "Projector is spotlighting this judge individually on center stage."
        : `Projector is showcasing ${visibleCount} official judges with credentials and photos.`,
      icon: Gavel,
      color: "#29ABE2",
      bg: "#E8F4FD"
    };
  } else if (liveState.qrSpotlight) {
    statusBadge = {
      title: `Audience Voting QR Spotlight (Center Stage)`,
      sub: `Projector is displaying center-stage voting QR code.`,
      icon: QrCode,
      color: "#16274D",
      bg: "#FFF9D6",
      textColor: "#FFD400"
    };
  } else if (effectiveStageMode === 'performer' && activeParticipant) {
    const rev = liveState.scoreRevealed?.[activeParticipant.id] || {};
    const scoresList = [rev.judges ? "Judges" : null, rev.audience ? "Audience" : null, rev.overall ? "Final" : null].filter(Boolean);
    statusBadge = {
      title: `[${activeParticipant.code || "ACT"}] ${activeParticipant.name} on Stage`,
      sub: `Act: ${activeParticipant.act} · Photo: ${liveState.showPhotoOnProjector ? "ON" : "OFF"} · Code: ${liveState.showCodeOnProjector ? "ON" : "OFF"} · Scores: ${scoresList.length ? scoresList.join(" + ") : "Hidden"}`,
      icon: Users,
      color: "#1C8A4C",
      bg: "#E8F8F0"
    };
  }

  const currentCategory = categories.find(c => c.id === selectedCat);

  // Slice top N contenders
  const displayResults = topN === 'ALL'
    ? results
    : results.slice(0, Number(topN) || 5);

  const audienceVotingUrl = `${window.location.origin}/audience/categories`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 🎬 MASTER LIVE PROJECTOR SCREEN CONTROLS */}
      <div className="evt-card" style={{ border: "3px solid #16274D", boxShadow: "0 12px 36px rgba(22, 39, 77, 0.18)" }}>
        {/* Header & Status Indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", paddingBottom: 16, borderBottom: "2px solid #E2E8F0" }}>
          <div>
            <div className="evt-eyebrow" style={{ color: "#29ABE2", fontWeight: 800, fontSize: 12.5, letterSpacing: "0.15em" }}>
              STAGE HDMI BROADCAST · LIVE CONTROLLER
            </div>
            <h1 className="evt-h1" style={{ margin: "2px 0 4px", fontSize: 26, display: "flex", alignItems: "center", gap: 10 }}>
              <MonitorPlay size={26} color="#16274D" /> Live Projector Screen Controls
            </h1>
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
          background: statusBadge.bg,
          border: `2px solid ${statusBadge.color || "#C7CEDE"}`,
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
              background: statusBadge.color,
              color: statusBadge.textColor || "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              flexShrink: 0
            }}>
              <statusBadge.icon size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="evt-live-dot" style={{ width: 8, height: 8 }} />
                <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: statusBadge.color }}>
                  Projector Broadcast Status
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#16274D", marginTop: 2 }}>
                {statusBadge.title}
              </div>
              <div className="evt-sub" style={{ fontSize: 12, marginTop: 1 }}>
                {statusBadge.sub}
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
              onClick={() => handleShowPerformer(liveState.currentId)}
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
                {activeParticipant ? `${activeParticipant.name} (${activeParticipant.code})` : "Display active participant"}
              </span>
            </button>

            {/* Show Judges */}
            <button
              className={`evt-btn ${liveState.showJudgesOnProjector ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={handleToggleJudges}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: liveState.showJudgesOnProjector ? 2.5 : 1.5
              }}
              title="Show photos and titles of judges on stage"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <Gavel size={16} /> Judges Panel ({currentSelectedJudgeIds.length}/{allJudges.length})
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                {liveState.showJudgesOnProjector ? `${currentSelectedJudgeIds.length} judge(s) visible` : "Show judge photos & status"}
              </span>
            </button>

            {/* Show QR Spotlight */}
            <button
              className={`evt-btn ${liveState.qrSpotlight ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
              onClick={handleToggleQRSpotlight}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: liveState.qrSpotlight ? 2.5 : 1.5
              }}
              title="Display large voting QR and PIN full screen in center stage"
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
              className={`evt-btn ${liveState.leaderboardRevealed ? 'evt-btn-amber' : 'evt-btn-ghost'}`}
              onClick={handleToggleLeaderboard}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "12px 14px",
                gap: 4,
                textAlign: "left",
                borderWidth: liveState.leaderboardRevealed ? 2.5 : 1.5
              }}
              title="Publish or unpublish category rankings on the projector"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13.5 }}>
                <Trophy size={16} /> Leaderboard
              </div>
              <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
                {liveState.leaderboardRevealed ? "Published on projector" : "Publish top finalists"}
              </span>
            </button>
          </div>

          {/* Judge-by-Judge Showcase Selection Controls */}
          <div style={{
            marginTop: 14,
            padding: "16px 20px",
            background: (liveState.showJudgesOnProjector || effectiveStageMode === 'judges') ? "#EBF5FF" : "#F8FAFC",
            border: (liveState.showJudgesOnProjector || effectiveStageMode === 'judges') ? "2.5px solid #29ABE2" : "2px dashed #CBD5E1",
            borderRadius: 14,
            transition: "all 0.2s ease"
          }}>
            {/* Header: Title, Active Count Badge, Quick Presets */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Gavel size={18} color="#29ABE2" />
                <span style={{ fontWeight: 800, fontSize: 14, color: "#16274D" }}>
                  Judge-by-Judge Presentation Selection
                </span>
                <span style={{ 
                  background: "#16274D", 
                  color: "#FFD400", 
                  fontSize: 11.5, 
                  fontWeight: 900, 
                  padding: "3px 10px", 
                  borderRadius: 12,
                  letterSpacing: "0.04em"
                }}>
                  {currentSelectedJudgeIds.length} of {allJudges.length} Active on Screen
                </span>
              </div>

              {/* Number of Judges Quick Presets & Stepper */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center", background: "#FFFFFF", padding: "3px 6px", borderRadius: 10, border: "1.5px solid #CBD5E1" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#5B6890", paddingRight: 4 }}>Count:</span>
                  <button
                    className={`evt-chip ${currentSelectedJudgeIds.length === 1 ? 'active' : ''}`}
                    onClick={() => handleSelectJudgeCount(1)}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                    title="Show 1 judge individually on stage"
                  >
                    1 Judge
                  </button>
                  {allJudges.length >= 2 && (
                    <button
                      className={`evt-chip ${currentSelectedJudgeIds.length === 2 ? 'active' : ''}`}
                      onClick={() => handleSelectJudgeCount(2)}
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      title="Show 2 judges side-by-side on stage"
                    >
                      2 Judges
                    </button>
                  )}
                  {allJudges.length >= 3 && (
                    <button
                      className={`evt-chip ${currentSelectedJudgeIds.length === 3 ? 'active' : ''}`}
                      onClick={() => handleSelectJudgeCount(3)}
                      style={{ fontSize: 11, padding: "3px 8px" }}
                      title="Show 3 judges on stage"
                    >
                      3 Judges
                    </button>
                  )}
                  <button
                    className={`evt-chip ${isAllJudgesSelected ? 'active' : ''}`}
                    onClick={handleShowAllJudges}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                    title="Show all judges together on stage"
                  >
                    All ({allJudges.length})
                  </button>
                </div>

                <button
                  className="evt-btn evt-btn-ghost"
                  onClick={() => handleStepJudge('prev')}
                  style={{ fontSize: 11, padding: "5px 10px" }}
                  title="Spotlight previous judge individually"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  className="evt-btn evt-btn-ghost"
                  onClick={() => handleStepJudge('next')}
                  style={{ fontSize: 11, padding: "5px 10px" }}
                  title="Spotlight next judge individually"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Quick 1-Click Stepper Strip: Show Judges One by One */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              padding: "8px 12px",
              background: "#FFFFFF",
              borderRadius: 10,
              border: "1.5px solid #E2E8F0",
              marginBottom: 12
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "#16274D", display: "flex", alignItems: "center", gap: 4 }}>
                <Eye size={13} color="#29ABE2" /> Show One-by-One:
              </span>
              {allJudges.map((j, idx) => {
                const isSolo = isSoloSpotlight && currentSelectedJudgeIds[0] === j.id;
                return (
                  <button
                    key={j.id}
                    onClick={() => handleShowSingleJudge(j.id)}
                    style={{
                      background: isSolo ? "#16274D" : "#F1F5F9",
                      color: isSolo ? "#FFD400" : "#334155",
                      border: isSolo ? "2px solid #FFD400" : "1px solid #CBD5E1",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11.5,
                      fontWeight: isSolo ? 900 : 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      boxShadow: isSolo ? "0 2px 6px rgba(22,39,77,0.3)" : "none",
                      transition: "all 0.15s ease"
                    }}
                    title={`Spotlight Judge ${idx + 1}: ${j.name}`}
                  >
                    <span>#{idx + 1}</span>
                    <span>{j.name}</span>
                    {isSolo && <span style={{ fontSize: 10, background: "#FFD400", color: "#16274D", borderRadius: 4, padding: "0 4px" }}>LIVE</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "#5B6890", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <span>
                Select which judge(s) appear on stage: Click the <strong>checkbox</strong> on any judge to include/exclude them, or click <strong>Solo Spotlight</strong> to show them one-by-one.
              </span>
              {currentSelectedJudgeIds.length > 0 && (
                <span style={{ fontWeight: 700, color: "#16274D" }}>
                  Selected: {allJudges.filter(j => currentSelectedJudgeIds.includes(j.id)).map(j => j.name).join(", ")}
                </span>
              )}
            </div>

            {/* Individual Judge Cards with Free Checkboxes & Solo Buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {allJudges.map((j, idx) => {
                const isSelected = currentSelectedJudgeIds.includes(j.id);
                const isOnlyOne = isSelected && currentSelectedJudgeIds.length === 1;

                return (
                  <div
                    key={j.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                      border: isSelected ? (isOnlyOne ? "2.5px solid #FFD400" : "2px solid #16274D") : "1.5px dashed #CBD5E1",
                      borderRadius: 12,
                      padding: "8px 14px",
                      boxShadow: isSelected ? "2.5px 2.5px 0 #16274D" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {/* Custom Checkbox to freely toggle on/off */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleJudgeSelection(j.id);
                      }}
                      style={{
                        background: isSelected ? "#16274D" : "#FFFFFF",
                        color: isSelected ? "#FFD400" : "transparent",
                        border: isSelected ? "2px solid #16274D" : "2px solid #94A3B8",
                        borderRadius: 6,
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 14,
                        flexShrink: 0
                      }}
                      title={isSelected ? `Uncheck to remove ${j.name} from stage` : `Check to include ${j.name} on stage`}
                    >
                      ✓
                    </button>

                    <div style={{ cursor: "pointer" }} onClick={() => handleShowSingleJudge(j.id)} title={`Click to spotlight ${j.name} individually`}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#16274D", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Judge {idx + 1}: {j.name}</span>
                        {isOnlyOne && (
                          <span style={{ background: "#FFD400", color: "#16274D", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 6 }}>
                            SPOTLIGHT
                          </span>
                        )}
                        {isSelected && !isOnlyOne && (
                          <span style={{ background: "#E0F2FE", color: "#0369A1", fontSize: 9.5, fontWeight: 800, padding: "1px 5px", borderRadius: 4 }}>
                            ON STAGE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#5B6890" }}>{j.title || "Panelist"}</div>
                    </div>

                    <button
                      type="button"
                      className="evt-chip"
                      onClick={() => handleShowSingleJudge(j.id)}
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        marginLeft: 4,
                        background: isOnlyOne ? "#16274D" : undefined,
                        color: isOnlyOne ? "#FFD400" : undefined,
                        fontWeight: 700
                      }}
                      title={`Spotlight only Judge ${idx + 1}`}
                    >
                      Solo Spotlight
                    </button>
                  </div>
                );
              })}
            </div>
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

          {/* Category Filter Chips / Tabs */}
          {(() => {
            const rawCategories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
            const categoryList = rawCategories
              .map(c => ({
                ...c,
                id: c.id,
                label: c.label || c.name || c.title || c.code || c.id,
                name: c.name || c.label || c.title || c.code || c.id
              }))
              .filter(c => Boolean(c.id && (c.label || c.name)));

            const participantsList = (liveState.participants && liveState.participants.length > 0)
              ? liveState.participants
              : DEFAULT_FALLBACK_PARTICIPANTS;

            const activeCatObj = liveState.categoryFilter
              ? (categoryList.find(c => 
                  c.id === liveState.categoryFilter || 
                  (c.name && c.name.toLowerCase() === (liveState.categoryFilter || '').toLowerCase()) ||
                  matchParticipantToCategory({ categoryId: liveState.categoryFilter }, c, categoryList)
                ) || { id: liveState.categoryFilter, label: liveState.categoryFilter, name: liveState.categoryFilter })
              : null;
            const activeCatLabel = activeCatObj ? (activeCatObj.name || activeCatObj.label) : "All Acts";

            const displayedParticipants = sortParticipantsByCode(
              participantsList.filter(p => {
                if (!liveState.categoryFilter) return true;
                return matchParticipantToCategory(p, activeCatObj || { id: liveState.categoryFilter }, categoryList);
              })
            );

            return (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#16274D", marginRight: 4 }}>Filter Category:</span>
                  <button
                    className={`evt-chip ${!liveState.categoryFilter ? 'active' : ''}`}
                    onClick={() => {
                      const nextState = { ...liveState, categoryFilter: '' };
                      broadcastAndSync(nextState, 'SET_CATEGORY_FILTER', { categoryId: '' });
                    }}
                    style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    All Acts
                    <span style={{ 
                      background: !liveState.categoryFilter ? "#FFD400" : "#E2E8F0", 
                      color: "#16274D", 
                      fontSize: 10.5, 
                      fontWeight: 900, 
                      padding: "1px 6px", 
                      borderRadius: 8 
                    }}>
                      {participantsList.length}
                    </span>
                  </button>

                  {categoryList.map(cat => {
                    const count = participantsList.filter(p => matchParticipantToCategory(p, cat, categoryList)).length;
                    const isActive = activeCatObj?.id === cat.id;
                    const catTitle = cat.name || cat.label;

                    return (
                      <button
                        key={cat.id}
                        className={`evt-chip ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          const nextFilter = isActive ? '' : cat.id;
                          const nextState = {
                            ...liveState,
                            categoryFilter: nextFilter
                          };
                          broadcastAndSync(nextState, 'SET_CATEGORY_FILTER', { categoryId: nextFilter });
                        }}
                        style={{ padding: "5px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        {catTitle}
                        <span style={{ 
                          background: isActive ? "#FFD400" : (count > 0 ? "#16274D" : "#E2E8F0"), 
                          color: isActive ? "#16274D" : (count > 0 ? "#FFD400" : "#64748B"), 
                          fontSize: 10.5, 
                          fontWeight: 900, 
                          padding: "1px 6px", 
                          borderRadius: 8 
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Participant List by Category (Replaces dropdown) */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    flexWrap: "wrap", 
                    gap: 8, 
                    marginBottom: 10 
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#16274D", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Participants in <strong style={{ color: "#29ABE2" }}>{activeCatLabel}</strong>:</span>
                      <span style={{ background: "#16274D", color: "#FFD400", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 10 }}>
                        {displayedParticipants.length} Acts
                      </span>
                    </div>

                    {/* Standby Video Action Button */}
                    <button
                      className={`evt-btn ${effectiveStageMode === 'video' ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
                      onClick={handleStandbyVideo}
                      style={{ fontSize: 11.5, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                      title="Clear performer and put projector on edge-to-edge looping video"
                    >
                      <MonitorPlay size={13} /> {effectiveStageMode === 'video' ? "Stage on Standby Video" : "Put Stage on Standby Video"}
                    </button>
                  </div>

                  {displayedParticipants.length === 0 ? (
                    <div style={{
                      background: "#FFFFFF",
                      border: "2px dashed #CBD5E1",
                      borderRadius: 12,
                      padding: "24px 20px",
                      textAlign: "center",
                      color: "#64748B",
                      fontSize: 13
                    }}>
                      <p style={{ margin: "0 0 10px 0" }}>
                        No participants registered in <strong>{activeCatLabel}</strong> category yet. Select another category above or choose "All Acts".
                      </p>
                      <button
                        className="evt-btn evt-btn-ghost"
                        onClick={() => {
                          const nextState = { ...liveState, categoryFilter: '' };
                          broadcastAndSync(nextState, 'SET_CATEGORY_FILTER', { categoryId: '' });
                        }}
                        style={{ fontSize: 12, padding: "5px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        Show All Acts ({participantsList.length})
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                      gap: 10
                    }}>
                      {displayedParticipants.map(p => {
                        const isCurrent = liveState.currentId === p.id && effectiveStageMode === 'performer';
                        const pCat = categoryList.find(c => matchParticipantToCategory(p, c));

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleShowPerformer(p.id)}
                            style={{
                              background: isCurrent ? "#FFFDF2" : "#FFFFFF",
                              border: isCurrent ? "2.5px solid #FFD400" : "1.5px solid #CBD5E1",
                              borderRadius: 14,
                              padding: "10px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              cursor: "pointer",
                              boxShadow: isCurrent ? "0 4px 14px rgba(255, 212, 0, 0.35), 2px 2px 0 #16274D" : "0 2px 4px rgba(0,0,0,0.04)",
                              transition: "all 0.15s ease"
                            }}
                            title={`Click to put ${p.name} on stage`}
                          >
                            {/* Left: Thumbnail, Code & Info */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              {/* Thumbnail */}
                              <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: isCurrent ? "2px solid #FFD400" : "2px solid #16274D",
                                background: "#E2E8F0",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}>
                                {p.photo ? (
                                  <img src={p.photo} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <span style={{ fontWeight: 900, color: "#16274D", fontSize: 16 }}>
                                    {p.name?.charAt(0)}
                                  </span>
                                )}
                              </div>

                              {/* Text Details */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span className="evt-mono" style={{
                                    background: "#16274D",
                                    color: "#FFFFFF",
                                    fontSize: 10.5,
                                    fontWeight: 900,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    letterSpacing: "0.05em"
                                  }}>
                                    {p.code || "ACT"}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: 13.5, color: "#16274D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {p.name}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#5B6890", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {p.act} · <span style={{ color: "#29ABE2", fontWeight: 700 }}>{pCat?.label || pCat?.name || p.categoryName || p.categoryId}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Status / Put on stage button */}
                            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                              {isCurrent ? (
                                <span style={{
                                  background: "#FFD400",
                                  color: "#16274D",
                                  fontWeight: 900,
                                  fontSize: 11,
                                  padding: "3px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #16274D",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4
                                }}>
                                  ★ ON STAGE
                                </span>
                              ) : (
                                <button
                                  className="evt-btn evt-btn-ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowPerformer(p.id);
                                  }}
                                  style={{ fontSize: 11, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Play size={11} /> Put on Stage
                                </button>
                              )}

                              {p.performed && (
                                <span style={{ fontSize: 10, color: "#1C8A4C", fontWeight: 700 }}>
                                  ✓ Done
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

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
              className={`evt-btn ${liveState.showPhotoOnProjector ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => updateProjectorSettings({ showPhotoOnProjector: !liveState.showPhotoOnProjector })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Show or hide participant photo portrait on the projector"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={15} /> Participant Photo
              </span>
              <span className={`evt-badge ${liveState.showPhotoOnProjector ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 11 }}>
                {liveState.showPhotoOnProjector ? "SHOWN" : "HIDDEN"}
              </span>
            </button>

            {/* Event Code Toggle */}
            <button
              className={`evt-btn ${liveState.showCodeOnProjector ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => updateProjectorSettings({ showCodeOnProjector: !liveState.showCodeOnProjector })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Show or hide large event code badge (e.g. DAN-07) on the projector"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BadgeCheck size={15} /> Event Code
              </span>
              <span className={`evt-badge ${liveState.showCodeOnProjector ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 11 }}>
                {liveState.showCodeOnProjector ? "SHOWN" : "HIDDEN"}
              </span>
            </button>

            {/* Name & Act Toggle */}
            <button
              className={`evt-btn ${liveState.showNameOnProjector ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => updateProjectorSettings({ showNameOnProjector: !liveState.showNameOnProjector })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Show or hide performer name marquee and description on the projector"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={15} /> Name & Act Title
              </span>
              <span className={`evt-badge ${liveState.showNameOnProjector ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 11 }}>
                {liveState.showNameOnProjector ? "SHOWN" : "HIDDEN"}
              </span>
            </button>

            {/* Live Voting Toggle */}
            <button
              className={`evt-btn ${liveState.votingOpen ? "evt-btn-red" : "evt-btn-teal"}`}
              onClick={handleToggleVoting}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", fontSize: 12.5 }}
              title="Open or close real-time audience voting for current act"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={15} /> {liveState.votingOpen ? "Close Audience Voting" : "Open Audience Voting"}
              </span>
              <span className="evt-badge" style={{ background: liveState.votingOpen ? "#FFF1F0" : "#E8F4FD", color: liveState.votingOpen ? "#EF4136" : "#16274D", fontSize: 11, fontWeight: 800 }}>
                {liveState.votingOpen ? "VOTING LIVE" : "VOTING CLOSED"}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Score Reveals on Projector */}
        <div style={{ marginTop: 20, padding: 18, background: "#F7F9FD", border: "2px solid #C7CEDE", borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
                3. PROJECTOR SCORE REVEALS {activeParticipant ? `FOR [${activeParticipant.code || "ACT"}] ${activeParticipant.name}` : ""}
              </div>
              <div style={{ fontSize: 13, color: "#5B6890", fontWeight: 600 }}>
                Control dramatic score reveals on the big screen:
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={handleRevealAllScores}
                disabled={!liveState.currentId}
                style={{ fontSize: 12, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
                title="Instantly reveal all scores on the projector"
              >
                <Eye size={13} /> Reveal All Scores
              </button>
              <button
                className="evt-btn evt-btn-ghost"
                onClick={handleHideAllScores}
                disabled={!liveState.currentId}
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
              border: `2px solid ${liveState.scoreRevealed[liveState.currentId]?.judges ? "#29ABE2" : "#C7CEDE"}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="evt-eyebrow" style={{ color: "#29ABE2", margin: 0 }}>JUDGES' SCORE</span>
                <span className={`evt-badge ${liveState.scoreRevealed[liveState.currentId]?.judges ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 10.5 }}>
                  {liveState.scoreRevealed[liveState.currentId]?.judges ? "REVEALED ON STAGE" : "HIDDEN"}
                </span>
              </div>
              <button
                className={`evt-btn ${liveState.scoreRevealed[liveState.currentId]?.judges ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
                onClick={() => handleRevealScorePart('judges')}
                disabled={!liveState.currentId}
                style={{ marginTop: "auto", fontSize: 12, padding: "6px 12px", justifyContent: "center" }}
              >
                <Gavel size={14} />
                {liveState.scoreRevealed[liveState.currentId]?.judges ? "Hide Judges on Projector" : "Reveal Judges on Projector"}
              </button>
            </div>

            {/* Audience Score Toggle */}
            <div style={{
              background: "#FFFFFF",
              border: `2px solid ${liveState.scoreRevealed[liveState.currentId]?.audience ? "#FFD400" : "#C7CEDE"}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="evt-eyebrow" style={{ color: "#B8860B", margin: 0 }}>AUDIENCE SCORE</span>
                <span className={`evt-badge ${liveState.scoreRevealed[liveState.currentId]?.audience ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 10.5 }}>
                  {liveState.scoreRevealed[liveState.currentId]?.audience ? "REVEALED ON STAGE" : "HIDDEN"}
                </span>
              </div>
              <button
                className={`evt-btn ${liveState.scoreRevealed[liveState.currentId]?.audience ? 'evt-btn-teal' : 'evt-btn-ghost'}`}
                onClick={() => handleRevealScorePart('audience')}
                disabled={!liveState.currentId}
                style={{ marginTop: "auto", fontSize: 12, padding: "6px 12px", justifyContent: "center" }}
              >
                <Users size={14} />
                {liveState.scoreRevealed[liveState.currentId]?.audience ? "Hide Audience on Projector" : "Reveal Audience on Projector"}
              </button>
            </div>

            {/* Combined Final Score Reveal */}
            <div style={{
              background: "#FFFFFF",
              border: `2px solid ${liveState.scoreRevealed[liveState.currentId]?.overall ? "#FFD400" : "#C7CEDE"}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              boxShadow: liveState.scoreRevealed[liveState.currentId]?.overall ? "0 4px 16px rgba(255,212,0,0.25)" : "none"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="evt-eyebrow" style={{ color: "#16274D", margin: 0 }}>COMBINED FINAL SCORE</span>
                <span className={`evt-badge ${liveState.scoreRevealed[liveState.currentId]?.overall ? "evt-badge-ok" : "evt-badge-wait"}`} style={{ fontSize: 10.5 }}>
                  {liveState.scoreRevealed[liveState.currentId]?.overall ? "REVEALED ON STAGE" : "HIDDEN"}
                </span>
              </div>
              <button
                className={`evt-btn ${liveState.scoreRevealed[liveState.currentId]?.overall ? 'evt-btn-amber' : 'evt-btn-ghost'}`}
                onClick={() => handleRevealScorePart('overall')}
                disabled={!liveState.currentId}
                style={{ marginTop: "auto", fontSize: 12, padding: "6px 12px", justifyContent: "center", fontWeight: 800 }}
              >
                {liveState.scoreRevealed[liveState.currentId]?.overall ? <EyeOff size={14} /> : <Trophy size={14} />}
                {liveState.scoreRevealed[liveState.currentId]?.overall ? "Hide Combined Final Score" : "Reveal Combined Final Score"}
              </button>
            </div>
          </div>
        </div>

        {/* 4. Combined Percentage Ratio System */}
        <div style={{ marginTop: 20, padding: 18, background: "#F7F9FD", border: "2px solid #C7CEDE", borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div>
              <div className="evt-eyebrow" style={{ color: "#16274D", fontWeight: 800 }}>
                4. COMBINED PERCENTAGE RATIO ({liveState.weights?.judge || 70}% JUDGES / {liveState.weights?.audience || 30}% AUDIENCE)
              </div>
              <div style={{ fontSize: 13, color: "#5B6890", fontWeight: 600 }}>
                Configure the evaluation balance applied when computing final scores on the projector:
              </div>
            </div>

            {/* Formula Banner Toggle for Projector */}
            <button
              className={`evt-btn ${liveState.showFormulaBanner ? "evt-btn-teal" : "evt-btn-ghost"}`}
              onClick={() => updateProjectorSettings({ showFormulaBanner: !liveState.showFormulaBanner })}
              style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              title="Show or hide the calculation equation badge on the projector screen"
            >
              <Percent size={14} />
              {liveState.showFormulaBanner ? "Hide Formula Banner on Projector" : "Show Formula Banner on Projector"}
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
              const isActive = (liveState.weights?.judge || 70) === preset.j && (liveState.weights?.audience || 30) === preset.a;
              return (
                <button
                  key={preset.label}
                  className={`evt-chip ${isActive ? 'active' : ''}`}
                  onClick={() => handleSetWeights(preset.j)}
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
                <span style={{ color: "#29ABE2" }}>Judges: {liveState.weights?.judge || 70}%</span>
                <span style={{ color: "#16274D" }}>Audience: {liveState.weights?.audience || 30}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={liveState.weights?.judge || 70}
                onChange={e => handleSetWeights(parseInt(e.target.value, 10) || 0)}
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
                  value={liveState.weights?.judge || 70}
                  onChange={e => handleSetWeights(+e.target.value)}
                  className="evt-input"
                  style={{ width: 75, marginTop: 3, padding: "5px 8px", textAlign: "center", fontSize: 13 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 700, color: "#5B6890" }}>
                Audience %
                <input
                  type="number"
                  value={liveState.weights?.audience || 30}
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
                className={`evt-btn ${liveState.showQR ? "evt-btn-teal" : "evt-btn-ghost"}`}
                onClick={() => updateProjectorSettings({ showQR: !liveState.showQR })}
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <QrCode size={14} /> {liveState.showQR ? "Hide QR Code" : "Show QR Code"}
              </button>

              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className={`evt-chip ${!liveState.qrSpotlight ? 'active' : ''}`}
                  onClick={() => updateProjectorSettings({ qrSpotlight: false })}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  title="Show QR in stage corner so performer remains visible"
                >
                  Corner Dock
                </button>
                <button
                  className={`evt-chip ${liveState.qrSpotlight ? 'active' : ''}`}
                  onClick={() => updateProjectorSettings({ qrSpotlight: true, showQR: true })}
                  style={{ padding: "4px 10px", fontSize: 11 }}
                  title="Show full screen in center stage"
                >
                  Center Spotlight
                </button>
              </div>
            </div>
          </div>



          {liveState.showQR && (
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

      {/* 2. Admin Leaderboard Projection & Stage Preview */}
      <div className="evt-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="evt-eyebrow">STAGE LEADERBOARD & PREVIEW</div>
            <h2 className="evt-h2" style={{ fontSize: 22, margin: '2px 0 4px' }}>Stage Leaderboard & Contender Standings</h2>
            <p className="evt-sub" style={{ margin: 0 }}>
              Live rankings computed with current judging weights ({liveState.weights?.judge || 70}% Judges / {liveState.weights?.audience || 30}% Audience).
            </p>
          </div>

          {/* Quick Projection Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={toggleFullscreen}
              className="evt-btn evt-btn-teal"
              title="Enter Fullscreen Presentation Mode"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (Stage)'}
            </button>

            <button
              onClick={openPresentationWindow}
              className="evt-btn evt-btn-amber"
              title="Pop out in separate presentation monitor window"
            >
              <ExternalLink size={15} /> Open Projector Screen
            </button>

            <button
              onClick={() => setRevealScores(!revealScores)}
              className="evt-btn evt-btn-ghost"
              title="Dramatic score reveal mode"
            >
              {revealScores ? <EyeOff size={15} /> : <Eye size={15} />}
              {revealScores ? 'Hide Scores (Suspense)' : 'Reveal Scores'}
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`evt-btn ${autoRefresh ? 'evt-btn-ok' : 'evt-btn-ghost'}`}
              title="Live auto-polling every 3s"
            >
              <RefreshCw size={14} className={autoRefresh ? 'spin-icon' : ''} />
              {autoRefresh ? 'Live Sync Active' : 'Sync Paused'}
            </button>
          </div>
        </div>

        {/* 2. Top N Selection Chips */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16274D' }}>
              Display Contenders:
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[3, 4, 5, 10, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setTopN(n)}
                  className={`evt-tab ${topN === n ? 'active' : ''}`}
                  style={{ padding: '6px 14px', fontSize: 12.5 }}
                >
                  Top {n}
                </button>
              ))}
              <button
                onClick={() => setTopN('ALL')}
                className={`evt-tab ${topN === 'ALL' ? 'active' : ''}`}
                style={{ padding: '6px 14px', fontSize: 12.5 }}
              >
                All Contenders
              </button>
            </div>
          </div>

          {/* Custom count input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#5B6890', fontWeight: 600 }}>Custom:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={topN === 'ALL' ? '' : topN}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) setTopN(val);
              }}
              placeholder="e.g. 7"
              className="evt-input"
              style={{ width: 80, padding: '5px 8px', fontSize: 13, textAlign: 'center' }}
            />
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#5B6890' }}>
            Last synced: {lastRefreshed.toLocaleTimeString()} · Showing {displayResults.length} of {results.length} participants
          </div>
        </div>

        {/* 3. Category Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`evt-tab ${selectedCat === c.id ? 'active' : ''}`}
            >
              {c.name} {c.code ? `(${c.code})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Live Projector Stage Display Container */}
      <div
        ref={stageRef}
        style={{
          background: 'linear-gradient(135deg, #0B152A 0%, #16274D 50%, #0E1A36 100%)',
          color: '#FFFFFF',
          borderRadius: isFullscreen ? 0 : 20,
          border: isFullscreen ? 'none' : '4px solid #16274D',
          padding: isFullscreen ? '40px 60px' : '32px 36px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5), 8px 8px 0 #16274D',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 600,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Subtle background stage glow & grid */}
        <div style={{
          position: 'absolute',
          top: -150,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 350,
          background: 'radial-gradient(circle, rgba(255, 212, 0, 0.18) 0%, rgba(41, 171, 226, 0.08) 50%, transparent 75%)',
          pointerEvents: 'none'
        }} />

        {/* Stage Header Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, zIndex: 10, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#FFD400',
              color: '#16274D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 212, 0, 0.5)'
            }}>
              <Trophy size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="evt-badge" style={{ background: '#29ABE2', color: '#0E1830', fontWeight: 900, letterSpacing: '0.08em' }}>
                  FTS 2026 OFFICIAL STAGE
                </span>
                <span className="evt-badge" style={{ background: '#FFD400', color: '#16274D', fontWeight: 800 }}>
                  {topN === 'ALL' ? 'FULL LEADERBOARD' : `TOP ${topN} CONTENDERS`}
                </span>
              </div>
              <h2 style={{
                fontFamily: 'Luckiest Guy',
                fontSize: 38,
                color: '#FFD400',
                margin: '4px 0 0',
                letterSpacing: '0.04em',
                lineHeight: 1.1,
                textShadow: '0 3px 12px rgba(0,0,0,0.6)'
              }}>
                {currentCategory?.name || 'Category'}
              </h2>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#94A3B8' }}>
              SCORING CRITERIA
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#CFE3F5' }}>
              85% Judges Score · 15% Audience Share
            </div>
          </div>
        </div>

        {/* Content Layout (Leaderboard + Optional Live QR Dock) */}
        <div style={{ display: 'flex', gap: 24, flex: 1, zIndex: 10, alignItems: 'flex-start' }}>
          {/* Main Contender Podium & Rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayResults.length === 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: 16,
                padding: '60px 20px',
                textAlign: 'center',
                color: '#CFE3F5'
              }}>
                <Trophy size={48} color="#FFD400" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
                <div style={{ fontFamily: 'Luckiest Guy', fontSize: 24, color: '#FFFFFF' }}>
                  Awaiting Scores & Votes
                </div>
                <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 420, margin: '8px auto 0' }}>
                  Judges and audience are currently scoring {currentCategory?.name}. The official standings will reveal live once submitted.
                </p>
              </div>
            )}

            {displayResults.map((r, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              let podiumBadge = null;
              let borderCol = 'rgba(255, 255, 255, 0.15)';
              let bgGradient = 'rgba(255, 255, 255, 0.06)';

              if (isFirst) {
                podiumBadge = { icon: Crown, label: '1ST PLACE', color: '#FFD400', textColor: '#16274D' };
                borderCol = '#FFD400';
                bgGradient = 'linear-gradient(90deg, rgba(255, 212, 0, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)';
              } else if (isSecond) {
                podiumBadge = { icon: Medal, label: '2ND PLACE', color: '#CBD5E1', textColor: '#0F172A' };
                borderCol = '#94A3B8';
                bgGradient = 'linear-gradient(90deg, rgba(203, 213, 225, 0.14) 0%, rgba(255, 255, 255, 0.06) 100%)';
              } else if (isThird) {
                podiumBadge = { icon: Award, label: '3RD PLACE', color: '#FDBA74', textColor: '#7C2D12' };
                borderCol = '#CD7F32';
                bgGradient = 'linear-gradient(90deg, rgba(205, 127, 50, 0.14) 0%, rgba(255, 255, 255, 0.06) 100%)';
              }

              return (
                <div
                  key={r.id || r.participantId}
                  style={{
                    background: bgGradient,
                    border: `2px solid ${borderCol}`,
                    borderRadius: 16,
                    padding: isFirst ? '18px 24px' : '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    boxShadow: isFirst ? '0 8px 24px rgba(255, 212, 0, 0.2)' : 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Rank Display */}
                  <div style={{
                    minWidth: 46,
                    textAlign: 'center',
                    fontFamily: 'Luckiest Guy',
                    fontSize: isFirst ? 32 : 24,
                    color: isFirst ? '#FFD400' : isSecond ? '#CBD5E1' : isThird ? '#FDBA74' : '#94A3B8'
                  }}>
                    #{r.rank}
                  </div>

                  {/* Participant Chest Number Badge */}
                  <div style={{
                    background: '#16274D',
                    border: `2px solid ${borderCol}`,
                    borderRadius: 10,
                    padding: '6px 12px',
                    color: '#FFD400',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 900,
                    fontSize: 15,
                    letterSpacing: '0.06em'
                  }}>
                    {r.participantCode}
                  </div>

                  {/* Performer Name and Act Title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: isFirst ? 20 : 17, fontWeight: 800, color: '#FFFFFF' }}>
                        {r.participantName}
                      </span>
                      {podiumBadge && (
                        <span style={{
                          background: podiumBadge.color,
                          color: podiumBadge.textColor,
                          fontSize: 11,
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: 999,
                          letterSpacing: '0.04em'
                        }}>
                          {podiumBadge.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      Act: {r.act || 'Performance Routine'}
                    </div>
                  </div>

                  {/* Score Breakdown & Final Result */}
                  {revealScores ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Judges (85%)
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#29ABE2' }}>
                          {r.judgeScore}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Audience (15%)
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: '#EF4136' }}>
                          {r.audienceScore}%
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', borderLeft: '2px solid rgba(255, 255, 255, 0.15)', paddingLeft: 18, minWidth: 80 }}>
                        <div style={{ fontSize: 10, color: '#FFD400', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                          TOTAL
                        </div>
                        <div style={{
                          fontFamily: 'Luckiest Guy',
                          fontSize: isFirst ? 30 : 24,
                          color: '#FFFFFF',
                          lineHeight: 1
                        }}>
                          {r.finalScore}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(255, 212, 0, 0.15)',
                      border: '1.5px dashed #FFD400',
                      padding: '6px 14px',
                      borderRadius: 10,
                      color: '#FFD400',
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '0.08em'
                    }}>
                      LOCKED / REVEAL PENDING
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Stage QR Dock (Live Scan to Vote) */}
          {showQR && (
            <div style={{
              width: 260,
              background: 'rgba(255, 255, 255, 0.96)',
              borderRadius: 20,
              border: '4px solid #FFD400',
              padding: '24px 20px',
              color: '#16274D',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 14 }}>
                <QrCode size={18} color="#0061ff" /> SCAN TO VOTE LIVE
              </div>

              <div style={{ background: '#FFFFFF', padding: 10, borderRadius: 14, border: '2px solid #16274D' }}>
                <QRCodeSVG
                  value={audienceVotingUrl}
                  size={160}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#16274D"
                />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: '#5B6890' }}>
                Audience voting opens during category performance. Every vote counts towards the 15% share!
              </div>
            </div>
          )}
        </div>

        {/* Stage Footer Bar */}
        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#8297BC',
          zIndex: 10
        }}>
          <div>Freshmen Talent Search 2026 · Live Projection Engine</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span>Real-Time Standings Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
