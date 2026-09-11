import { memoryStore, INITIAL_JUDGES, INITIAL_PARTICIPANTS } from '../config/db.js';
import { db } from '../config/database.js';
import dbService from '../config/dbService.js';

/**
 * Authoritative Live Event Service
 * Manages live competition state, server-side validations,
 * and Server-Sent Events (SSE) broadcasting across all devices.
 */

// Initial Criteria matching specification
const DEFAULT_CRITERIA = [
  { id: "c1", label: "Performance", max_marks: 10 },
  { id: "c2", label: "Creativity", max_marks: 10 },
  { id: "c3", label: "Technique", max_marks: 10 },
  { id: "c4", label: "Stage Presence", max_marks: 10 },
];

const DEFAULT_CATEGORIES = [
  { id: "dance", label: "Dance", prefix: "DNC" },
  { id: "singing", label: "Singing / Music", prefix: "MSC" },
  { id: "comedy", label: "Comedy", prefix: "CMD" },
  { id: "band", label: "Band", prefix: "BND" },
  { id: "drama", label: "Drama / Theatre", prefix: "DRM" },
  { id: "poetry", label: "Poetry / Spoken Word", prefix: "PTY" },
];

export function formatLiveCategory(c) {
  const prefix = (c.prefix || c.code || c.id?.replace(/^cat_/, '') || 'GEN').toUpperCase();
  const label = c.label || c.name || prefix;
  return {
    id: c.id,
    label: label,
    name: label,
    prefix: prefix,
    code: prefix,
    description: c.description || '',
    status: c.status || 'ACTIVE'
  };
}

export function formatLiveJudge(u, index = 0) {
  const code = u.code || u.accessCode || String(4821 + index);
  return {
    id: u.id,
    name: u.name,
    email: u.email || '',
    code: code,
    accessCode: code,
    photo: u.photo || null,
    title: u.title || 'Official Judge & Evaluator',
    assignedCategories: u.assignedCategories || [],
    status: u.status || 'ACTIVE'
  };
}

export function formatLiveParticipant(p) {
  const cat = db.categories?.find(c => c.id === p.categoryId);
  const code = (p.participantCode || p.code || p.token || 'ACT').toUpperCase();
  return {
    id: p.id,
    name: p.name,
    code: code,
    token: code,
    act: p.routineTitle || p.act || cat?.name || 'Live Performance',
    routineTitle: p.routineTitle || p.act || '',
    categoryId: p.categoryId,
    categoryName: cat?.name || p.categoryName || 'General',
    categoryCode: cat?.code || cat?.prefix || p.categoryCode || '',
    phone: p.phoneNumber || p.phone || '',
    phoneNumber: p.phoneNumber || p.phone || '',
    regNo: (p.registrationNumber || p.regNo || '').toUpperCase(),
    registrationNumber: (p.registrationNumber || p.regNo || '').toUpperCase(),
    photo: p.photo || null,
    performed: Boolean(p.performed)
  };
}

class LiveEventService {
  constructor() {
    this.sseClients = new Set();

    // Collect initial categories from db.categories
    const initialCategoriesList = (db.categories && db.categories.length > 0)
      ? db.categories.map(formatLiveCategory)
      : [...DEFAULT_CATEGORIES];

    // Collect judges from INITIAL_JUDGES and db.users
    const initialJudgesList = [...INITIAL_JUDGES];
    if (db.users) {
      db.users.filter(u => u.role === 'JUDGE').forEach((u, idx) => {
        if (!initialJudgesList.some(j => j.id === u.id || (j.name.toLowerCase() === u.name.toLowerCase()))) {
          initialJudgesList.push(formatLiveJudge(u, initialJudgesList.length));
        }
      });
    }

    // Collect participants from INITIAL_PARTICIPANTS and db.participants
    const initialParticipantsList = [...INITIAL_PARTICIPANTS];
    if (db.participants) {
      db.participants.forEach(p => {
        if (!initialParticipantsList.some(part => part.id === p.id || part.code === (p.participantCode || p.code))) {
          initialParticipantsList.push(formatLiveParticipant(p));
        }
      });
    }

    this.state = {
      event: {
        name: "Freshmen Talent Search 2026",
        pin: process.env.EVENT_PIN || "4821",
        judge_weight: 70,
        audience_weight: 30
      },
      categories: initialCategoriesList,
      criteria: DEFAULT_CRITERIA,
      participants: initialParticipantsList,
      judges: initialJudgesList,
      registrations: [],
      currentId: initialParticipantsList[0]?.id || "p1",
      votingOpen: false,
      scoreRevealed: {}, // { [participantId]: { audience: bool, judges: bool, overall: bool } }
      leaderboardRevealed: false,
      categoryFilter: initialCategoriesList[0]?.id || "dance",
      weights: { judge: 70, audience: 30 },
      leaderboardLimits: {},
      showEventCode: false,
      pinPosition: 'hidden', // 'side' | 'center' | 'hidden'
      showJudgesOnProjector: false,
      selectedJudgeIds: initialJudgesList.map(j => j.id), // judge IDs to display on stage
      qrSpotlight: false,
      stageMode: 'video', // 'video' (idle/standby video loop) | 'performer' | 'judges' | 'qr' | 'leaderboard'
      showPhotoOnProjector: true,
      showCodeOnProjector: true,
      showNameOnProjector: true,
      showFormulaBanner: true,
      votes: memoryStore.audienceVotes || {}, // { [participantId]: { [studentId]: score } }
      judgeScores: memoryStore.judgeScores || {}, // { [participantId]: { [judgeId]: marks } }
      lastUndoAction: null
    };

    // Keep memoryStore synchronized
    this.syncToMemoryStore();
  }

  syncToMemoryStore() {
    memoryStore.event.currentParticipantId = this.state.currentId;
    memoryStore.event.votingOpen = this.state.votingOpen;
    memoryStore.event.pin = this.state.event.pin;
    memoryStore.categories = this.state.categories;
    memoryStore.participants = this.state.participants;
    memoryStore.judges = this.state.judges;
    memoryStore.registrations = this.state.registrations;
    memoryStore.audienceVotes = this.state.votes;
    memoryStore.judgeScores = this.state.judgeScores;
  }

  getState() {
    // Dynamically guarantee any categories from db.categories are present
    if (db.categories) {
      db.categories.forEach(c => {
        const formatted = formatLiveCategory(c);
        const idx = this.state.categories.findIndex(cat => cat.id === c.id);
        if (idx >= 0) {
          this.state.categories[idx] = { ...this.state.categories[idx], ...formatted };
        } else {
          this.state.categories.push(formatted);
        }
      });
    }

    // Dynamically guarantee any newly added judge from db.users is present
    if (db.users) {
      db.users.filter(u => u.role === 'JUDGE').forEach(u => {
        const assigned = (db.judgeAssignments || [])
          .filter(ja => ja.judgeId === u.id)
          .map(ja => ja.categoryId);
        const exists = this.state.judges.find(j => j.id === u.id || (u.email && j.email && j.email.toLowerCase() === u.email.toLowerCase()));
        if (!exists) {
          const formatted = formatLiveJudge(u, this.state.judges.length);
          formatted.assignedCategories = assigned;
          this.state.judges.push(formatted);
          if (!this.state.selectedJudgeIds.includes(formatted.id)) {
            this.state.selectedJudgeIds.push(formatted.id);
          }
        } else if (assigned.length > 0) {
          exists.assignedCategories = assigned;
        }
      });
    }

    // Dynamically guarantee any participant from db.participants is present
    if (db.participants) {
      db.participants.forEach(p => {
        const code = (p.participantCode || p.code || '').toUpperCase();
        const exists = this.state.participants.find(part => part.id === p.id || (code && part.code === code));
        if (!exists) {
          const formatted = formatLiveParticipant(p);
          this.state.participants.push(formatted);
        }
      });
    }

    this.syncToMemoryStore();
    return this.state;
  }

  /**
   * Sanitized Public Event State Representation
   * Guarantees event.pin, judge codes, access codes, and private credentials are NEVER exposed.
   */
  getPublicState() {
    const rawState = this.getState();

    // 1. Sanitize event: strictly omit PIN and private configuration
    const publicEvent = {
      name: rawState.event?.name || "Freshmen Talent Search 2026",
      judge_weight: rawState.event?.judge_weight ?? 70,
      audience_weight: rawState.event?.audience_weight ?? 30
    };

    // 2. Sanitize categories
    const publicCategories = (rawState.categories || []).map(c => ({
      id: c.id,
      label: c.label || c.name,
      name: c.label || c.name,
      prefix: c.prefix || c.code || 'GEN',
      code: c.code || c.prefix || 'GEN',
      description: c.description || '',
      status: c.status || 'ACTIVE'
    }));

    // 3. Sanitize criteria
    const publicCriteria = (rawState.criteria || []).map(crit => ({
      id: crit.id,
      label: crit.label,
      max_marks: crit.max_marks
    }));

    // 4. Sanitize participants: omit phones and registration numbers
    const publicParticipants = (rawState.participants || []).map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || p.participantCode || '',
      token: p.token || p.code || '',
      act: p.act || p.routineTitle || '',
      routineTitle: p.routineTitle || p.act || '',
      categoryId: p.categoryId,
      categoryName: p.categoryName || '',
      categoryCode: p.categoryCode || '',
      photo: p.photo || null,
      performed: Boolean(p.performed)
    }));

    // 5. Sanitize judges: strictly omit code, accessCode, email, and private credentials
    const publicJudges = (rawState.judges || []).map(j => ({
      id: j.id,
      name: j.name,
      photo: j.photo || null,
      title: j.title || 'Official Evaluator',
      assignedCategories: j.assignedCategories || [],
      status: j.status || 'ACTIVE'
    }));

    // 6. Sanitize score sheets: only expose revealed scores for live projector/audience
    const sanitizedJudgeScores = {};
    const sanitizedVotes = {};
    const revealedMap = rawState.scoreRevealed || {};
    const isLeaderboardRevealed = Boolean(rawState.leaderboardRevealed);

    for (const participantId of Object.keys(revealedMap)) {
      const reveals = revealedMap[participantId] || {};
      if (reveals.judges || reveals.overall || isLeaderboardRevealed) {
        if (rawState.judgeScores && rawState.judgeScores[participantId]) {
          sanitizedJudgeScores[participantId] = rawState.judgeScores[participantId];
        }
      }
      if (reveals.audience || reveals.overall || isLeaderboardRevealed) {
        if (rawState.votes && rawState.votes[participantId]) {
          sanitizedVotes[participantId] = rawState.votes[participantId];
        }
      }
    }

    return {
      event: publicEvent,
      categories: publicCategories,
      criteria: publicCriteria,
      participants: publicParticipants,
      judges: publicJudges,
      currentId: rawState.currentId,
      votingOpen: Boolean(rawState.votingOpen),
      scoreRevealed: rawState.scoreRevealed || {},
      leaderboardRevealed: isLeaderboardRevealed,
      categoryFilter: rawState.categoryFilter,
      weights: rawState.weights || { judge: 70, audience: 30 },
      leaderboardLimits: rawState.leaderboardLimits || {},
      showEventCode: Boolean(rawState.showEventCode),
      pinPosition: rawState.pinPosition || 'hidden',
      showJudgesOnProjector: Boolean(rawState.showJudgesOnProjector),
      selectedJudgeIds: rawState.selectedJudgeIds || [],
      qrSpotlight: Boolean(rawState.qrSpotlight),
      stageMode: rawState.stageMode || 'video',
      showPhotoOnProjector: rawState.showPhotoOnProjector !== false,
      showCodeOnProjector: rawState.showCodeOnProjector !== false,
      showNameOnProjector: rawState.showNameOnProjector !== false,
      showFormulaBanner: rawState.showFormulaBanner !== false,
      judgeScores: sanitizedJudgeScores,
      votes: sanitizedVotes
    };
  }

  /**
   * Synchronize category changes from Admin portal to Live OS and memoryStore
   */
  syncCategory(cat, action = 'ADD') {
    const act = action.toUpperCase();
    const formatted = formatLiveCategory(cat);

    if (act === 'ADD' || act === 'ADD_CATEGORY') {
      const idx = this.state.categories.findIndex(c => c.id === formatted.id);
      if (idx >= 0) {
        this.state.categories[idx] = { ...this.state.categories[idx], ...formatted };
      } else {
        this.state.categories.push(formatted);
      }
      this.syncToMemoryStore();
      this.broadcast('ADD_CATEGORY', { category: formatted });
    } else if (act === 'UPDATE' || act === 'UPDATE_CATEGORY') {
      this.state.categories = this.state.categories.map(c => c.id === formatted.id ? { ...c, ...formatted } : c);
      this.syncToMemoryStore();
      this.broadcast('UPDATE_CATEGORY', { category: formatted });
    } else if (act === 'REMOVE' || act === 'REMOVE_CATEGORY' || act === 'DELETE' || act === 'DELETE_CATEGORY') {
      this.state.categories = this.state.categories.filter(c => c.id !== formatted.id);
      this.syncToMemoryStore();
      this.broadcast('REMOVE_CATEGORY', { id: formatted.id });
    }
    return this.state;
  }

  /**
   * Register or update an audience member from verified OTP or live session
   */
  registerAudienceUser(session) {
    if (!session) return null;
    const cleanRegNo = (session.regNo || session.studentId || '').trim().toUpperCase();
    const cleanEmail = (session.email || '').trim().toLowerCase();
    const cleanPhone = (session.phone || '').trim();
    if (!cleanRegNo && !cleanEmail) return null;

    if (db.users) {
      let existing = db.users.find(u => 
        (cleanRegNo && (u.studentId === cleanRegNo || u.regNo === cleanRegNo || u.id === `usr_${cleanRegNo}`)) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
      );

      if (!existing) {
        const newUser = {
          id: `usr_${cleanRegNo || Date.now()}`,
          name: `Student (${cleanRegNo || cleanEmail})`,
          email: cleanEmail || `${cleanRegNo.toLowerCase()}@student.local`,
          studentId: cleanRegNo,
          regNo: cleanRegNo,
          phone: cleanPhone,
          phoneNumber: cleanPhone,
          role: 'AUDIENCE',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        this.broadcast('AUDIENCE_UPDATE', { audience: newUser });

        // Asynchronously persist audience user to Supabase
        dbService.createUser({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          passwordHash: '$2a$10$tQ120eR94uO.c2V2dFvQReI7mDqXz3J7w4U4k1IeX/0CgC1E4u1e2',
          role: 'AUDIENCE',
          status: 'ACTIVE'
        }).catch(e => console.warn('[LiveEvent] Audience user Supabase sync notice:', e.message));

        return newUser;
      } else {
        if (cleanPhone && !existing.phone) existing.phone = cleanPhone;
        if (cleanEmail && !existing.email) existing.email = cleanEmail;
        if (cleanRegNo && !existing.studentId) {
          existing.studentId = cleanRegNo;
          existing.regNo = cleanRegNo;
        }
        return existing;
      }
    }
    return null;
  }

  /**
   * Synchronize and broadcast a judge event directly from admin controller
   */
  syncJudge(judge, action = 'ADD') {
    const act = action.toUpperCase();
    if (act === 'ADD' || act === 'ADD_JUDGE') {
      const formatted = formatLiveJudge(judge, this.state.judges.length);
      const existingIdx = this.state.judges.findIndex(j => j.id === judge.id || (judge.email && j.email && j.email.toLowerCase() === judge.email.toLowerCase()));
      if (existingIdx >= 0) {
        this.state.judges[existingIdx] = { ...this.state.judges[existingIdx], ...formatted };
      } else {
        this.state.judges.push(formatted);
      }
      if (!this.state.selectedJudgeIds.includes(formatted.id)) {
        this.state.selectedJudgeIds.push(formatted.id);
      }
      this.syncToMemoryStore();
      this.broadcast('ADD_JUDGE', { judge: formatted });
    } else if (act === 'UPDATE' || act === 'UPDATE_JUDGE') {
      this.state.judges = this.state.judges.map(j => {
        if (j.id === judge.id || (judge.email && j.email && j.email.toLowerCase() === judge.email.toLowerCase())) {
          return { ...j, ...judge };
        }
        return j;
      });
      this.syncToMemoryStore();
      this.broadcast('UPDATE_JUDGE', { judge });
    } else if (act === 'REMOVE' || act === 'REMOVE_JUDGE') {
      this.state.judges = this.state.judges.filter(j => j.id !== judge.id);
      this.state.selectedJudgeIds = this.state.selectedJudgeIds.filter(id => id !== judge.id);
      this.syncToMemoryStore();
      this.broadcast('REMOVE_JUDGE', { id: judge.id });
    }
    return this.state;
  }

  /**
   * Synchronize and broadcast a participant event directly from participant controller
   */
  syncParticipant(part, action = 'ADD') {
    const act = action.toUpperCase();
    if (act === 'ADD' || act === 'ADD_PARTICIPANT') {
      const formatted = formatLiveParticipant(part);
      const existingIdx = this.state.participants.findIndex(p => p.id === part.id || p.code === formatted.code);
      if (existingIdx >= 0) {
        this.state.participants[existingIdx] = { ...this.state.participants[existingIdx], ...formatted };
      } else {
        this.state.participants.push(formatted);
      }
      if (!this.state.registrations.some(r => r.code === formatted.code)) {
        this.state.registrations.unshift({
          id: `reg_${formatted.id}`,
          name: formatted.name,
          categoryId: formatted.categoryId,
          categoryCode: formatted.categoryCode,
          categoryName: formatted.categoryName,
          code: formatted.code,
          token: formatted.token,
          phone: formatted.phone,
          regNo: formatted.regNo,
          photo: formatted.photo,
          status: 'enrolled',
          createdAt: new Date().toISOString()
        });
      }
      this.syncToMemoryStore();
      this.broadcast('ADD_PARTICIPANT', { participant: formatted });
    } else if (act === 'UPDATE' || act === 'UPDATE_PARTICIPANT') {
      this.state.participants = this.state.participants.map(p => p.id === part.id ? { ...p, ...part } : p);
      if (db.participants) {
        const dbPart = db.participants.find(p => p.id === part.id);
        if (dbPart) Object.assign(dbPart, part);
      }
      this.syncToMemoryStore();
      this.broadcast('UPDATE_PARTICIPANT', { participant: part });
    } else if (act === 'REMOVE' || act === 'REMOVE_PARTICIPANT') {
      this.state.participants = this.state.participants.filter(p => p.id !== part.id && p.code !== part.code);
      if (db.participants) {
        db.participants = db.participants.filter(p => p.id !== part.id);
      }
      if (this.state.currentId === part.id) {
        this.state.currentId = this.state.participants[0]?.id || null;
      }
      this.syncToMemoryStore();
      this.broadcast('REMOVE_PARTICIPANT', { id: part.id });
    }
    return this.state;
  }

  /**
   * Subscribe an HTTP response object as an SSE client
   */
  addClient(res) {
    try {
      res.socket?.setNoDelay?.(true);
      res.socket?.setKeepAlive?.(true, 15000);
    } catch {}

    this.sseClients.add(res);

    // Send initial snapshot using sanitized public state
    const initialPayload = JSON.stringify({
      type: 'INIT_STATE',
      state: this.getPublicState(),
      timestamp: Date.now()
    });
    
    try {
      res.write(`data: ${initialPayload}\n\n`);
    } catch {
      this.sseClients.delete(res);
      return;
    }

    const cleanup = () => {
      this.sseClients.delete(res);
    };

    res.on('close', cleanup);
    res.on('finish', cleanup);
    res.on('error', cleanup);
  }

  /**
   * Broadcast state changes to all connected SSE clients
   */
  broadcast(action, payload) {
    this.syncToMemoryStore();

    // Sanitize payload if it contains sensitive judge credentials
    let safePayload = payload;
    if (payload && payload.judge) {
      const j = payload.judge;
      safePayload = {
        ...payload,
        judge: {
          id: j.id,
          name: j.name,
          photo: j.photo || null,
          title: j.title || 'Official Evaluator',
          assignedCategories: j.assignedCategories || [],
          status: j.status || 'ACTIVE'
        }
      };
    }

    const data = JSON.stringify({
      type: 'ACTION',
      action,
      payload: safePayload,
      state: this.getPublicState(),
      timestamp: Date.now()
    });
    const message = `data: ${data}\n\n`;

    const clients = Array.from(this.sseClients);
    const total = clients.length;
    if (total === 0) return;

    // Fast synchronous dispatch for <= 500 connections
    if (total <= 500) {
      for (let i = 0; i < total; i++) {
        const client = clients[i];
        if (client.destroyed || !client.writable || client.writableEnded) {
          this.sseClients.delete(client);
          continue;
        }
        try {
          client.write(message);
        } catch {
          this.sseClients.delete(client);
        }
      }
      return;
    }

    // Micro-tick chunked dispatch for 4,000+ connections to keep event loop latency < 10ms
    const CHUNK_SIZE = 500;
    let index = 0;
    const sendChunk = () => {
      const limit = Math.min(index + CHUNK_SIZE, total);
      for (; index < limit; index++) {
        const client = clients[index];
        if (client.destroyed || !client.writable || client.writableEnded) {
          this.sseClients.delete(client);
          continue;
        }
        try {
          client.write(message);
        } catch {
          this.sseClients.delete(client);
        }
      }
      if (index < total) {
        setImmediate(sendChunk);
      }
    };
    sendChunk();
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat() {
    const heartbeatMsg = ': heartbeat\n\n';
    for (const client of this.sseClients) {
      if (client.destroyed || !client.writable || client.writableEnded) {
        this.sseClients.delete(client);
        continue;
      }
      try {
        client.write(heartbeatMsg);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Execute authoritative action
   */
  dispatch(action, payload) {
    switch (action) {
      case 'SELECT_PARTICIPANT': {
        this.state.currentId = payload.id;
        this.state.stageMode = payload.id ? 'performer' : 'video';
        this.state.showJudgesOnProjector = false;
        this.state.qrSpotlight = false;
        this.state.leaderboardRevealed = false;
        this.state.votingOpen = false;
        memoryStore.event.currentParticipantId = payload.id;
        memoryStore.event.votingOpen = false;
        if (db.events && db.events[0]) {
          db.events[0].status = 'JUDGING_OPEN';
        }
        break;
      }

      case 'SET_VOTING_OPEN': {
        const isOpen = Boolean(payload.open);
        this.state.votingOpen = isOpen;
        memoryStore.event.votingOpen = isOpen;
        if (db.events && db.events[0]) {
          db.events[0].status = isOpen ? 'VOTING_OPEN' : 'JUDGING_OPEN';
          if (isOpen && !db.events[0].votingOpenAt) db.events[0].votingOpenAt = new Date().toISOString();
        }
        break;
      }

      case 'SET_EVENT_STATUS': {
        const { status } = payload;
        if (status) {
          if (db.events && db.events[0]) {
            db.events[0].status = status;
          }
          if (status === 'VOTING_OPEN') {
            this.state.votingOpen = true;
            memoryStore.event.votingOpen = true;
          } else if (['VOTING_CLOSED', 'SETUP', 'RESULTS_LOCKED', 'RESULTS_PUBLISHED', 'JUDGING_CLOSED'].includes(status)) {
            this.state.votingOpen = false;
            memoryStore.event.votingOpen = false;
          }
          if (status === 'RESULTS_LOCKED') {
            this.state.resultsLocked = true;
            if (db.events && db.events[0]) db.events[0].resultsLocked = true;
          }
          if (status === 'RESULTS_PUBLISHED') {
            this.state.leaderboardRevealed = true;
          }
          dbService.updateEventState(status).catch(e => console.warn('[LiveEvent] Event status Supabase sync error:', e.message));
        }
        break;
      }

      case 'ADD_CATEGORY': {
        this.syncCategory(payload.category || payload, 'ADD');
        break;
      }

      case 'UPDATE_CATEGORY': {
        this.syncCategory(payload.category || payload, 'UPDATE');
        break;
      }

      case 'REMOVE_CATEGORY':
      case 'DELETE_CATEGORY': {
        this.syncCategory(payload.category || payload, 'REMOVE');
        break;
      }

      case 'TOGGLE_PERFORMED': {
        const participant = this.state.participants.find(p => p.id === payload.id);
        if (participant) {
          this.state.lastUndoAction = {
            id: payload.id,
            name: participant.name,
            wasPerformed: participant.performed,
            timestamp: Date.now()
          };
          participant.performed = !participant.performed;
        }
        break;
      }

      case 'UNDO_MARK_DONE': {
        if (this.state.lastUndoAction) {
          const participant = this.state.participants.find(p => p.id === this.state.lastUndoAction.id);
          if (participant) {
            participant.performed = this.state.lastUndoAction.wasPerformed;
          }
          this.state.lastUndoAction = null;
        }
        break;
      }

      case 'SET_SCORE_REVEALED': {
        this.state.scoreRevealed = {
          ...this.state.scoreRevealed,
          [payload.participantId]: {
            ...(this.state.scoreRevealed[payload.participantId] || {}),
            ...payload.reveals
          }
        };
        break;
      }

      case 'SET_LEADERBOARD_REVEALED': {
        this.state.leaderboardRevealed = Boolean(payload.revealed);
        if (payload.revealed && db.events && db.events[0]) {
          db.events[0].status = 'RESULTS_PUBLISHED';
        }
        break;
      }

      case 'SET_CATEGORY_FILTER': {
        this.state.categoryFilter = payload.categoryId;
        break;
      }

      case 'SET_WEIGHTS': {
        const judge = Math.max(0, Math.min(100, Number(payload.judge) || 70));
        this.state.weights = { judge, audience: 100 - judge };
        memoryStore.event.judge_weight = judge;
        memoryStore.event.audience_weight = 100 - judge;
        if (db.events && db.events[0]) {
          db.events[0].judge_weight = judge;
          db.events[0].audience_weight = 100 - judge;
        }
        dbService.updateEventState(this.state.event.status || 'SETUP', { judgeWeight: judge, audienceWeight: 100 - judge }).catch(e => console.warn('[LiveEvent] Weights Supabase sync error:', e.message));
        break;
      }

      case 'SET_LEADERBOARD_LIMIT': {
        this.state.leaderboardLimits = {
          ...this.state.leaderboardLimits,
          [payload.categoryId]: payload.limit
        };
        break;
      }

      case 'UPDATE_PROJECTOR_SETTINGS': {
        if (payload.showQR !== undefined) this.state.showQR = Boolean(payload.showQR);
        if (payload.showEventCode !== undefined) this.state.showEventCode = Boolean(payload.showEventCode);
        if (payload.pinPosition !== undefined) this.state.pinPosition = payload.pinPosition;
        if (payload.showJudgesOnProjector !== undefined) this.state.showJudgesOnProjector = Boolean(payload.showJudgesOnProjector);
        if (payload.selectedJudgeIds !== undefined) this.state.selectedJudgeIds = Array.isArray(payload.selectedJudgeIds) ? payload.selectedJudgeIds : [];
        if (payload.qrSpotlight !== undefined) this.state.qrSpotlight = Boolean(payload.qrSpotlight);
        if (payload.stageMode !== undefined) this.state.stageMode = payload.stageMode;
        if (payload.showPhotoOnProjector !== undefined) this.state.showPhotoOnProjector = Boolean(payload.showPhotoOnProjector);
        if (payload.showCodeOnProjector !== undefined) this.state.showCodeOnProjector = Boolean(payload.showCodeOnProjector);
        if (payload.showNameOnProjector !== undefined) this.state.showNameOnProjector = Boolean(payload.showNameOnProjector);
        if (payload.showFormulaBanner !== undefined) this.state.showFormulaBanner = Boolean(payload.showFormulaBanner);
        break;
      }

      case 'SET_PIN_POSITION': {
        this.state.pinPosition = payload.position;
        this.state.showEventCode = payload.position !== 'hidden';
        break;
      }

      case 'SET_SELECTED_JUDGES': {
        this.state.selectedJudgeIds = Array.isArray(payload.judgeIds) ? payload.judgeIds : [];
        break;
      }

      case 'ADD_PARTICIPANT': {
        const pData = payload.participant || payload;
        const cat = this.state.categories.find(c => c.id === pData.categoryId);
        const prefix = pData.categoryCode || cat?.prefix || "GEN";
        const code = (pData.code || pData.token || pData.participantCode || `${prefix}${Math.floor(10 + Math.random() * 90)}`).trim().toUpperCase();
        const newP = {
          id: pData.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: pData.name.trim(),
          act: pData.act?.trim() || pData.routineTitle?.trim() || cat?.label || "Live Performance",
          routineTitle: pData.routineTitle?.trim() || pData.act?.trim() || "",
          categoryId: pData.categoryId,
          categoryCode: prefix,
          categoryName: cat?.label || cat?.name || prefix,
          code: code,
          token: pData.token ? pData.token.trim().toUpperCase() : code,
          phone: pData.phone || pData.phoneNumber || "",
          phoneNumber: pData.phoneNumber || pData.phone || "",
          regNo: (pData.regNo || pData.registrationNumber || "").trim().toUpperCase(),
          registrationNumber: (pData.registrationNumber || pData.regNo || "").trim().toUpperCase(),
          photo: pData.photo || null,
          performed: Boolean(pData.performed)
        };
        
        const existingIdx = this.state.participants.findIndex(p => p.id === newP.id || p.code === newP.code);
        if (existingIdx >= 0) {
          this.state.participants[existingIdx] = { ...this.state.participants[existingIdx], ...newP };
        } else {
          this.state.participants.push(newP);
        }

        // Keep db.participants in sync
        if (db.participants) {
          const dbIdx = db.participants.findIndex(p => p.id === newP.id || p.participantCode?.toUpperCase() === code);
          if (dbIdx >= 0) {
            db.participants[dbIdx] = { ...db.participants[dbIdx], ...newP, participantCode: code };
          } else {
            db.participants.push({
              id: newP.id,
              eventId: db.events?.[0]?.id || 'evt_fts_2026',
              categoryId: newP.categoryId,
              participantCode: code,
              registrationNumber: newP.regNo,
              name: newP.name,
              phoneNumber: newP.phone,
              routineTitle: newP.act,
              act: newP.act,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Persist to Supabase
        dbService.createParticipant({
          id: newP.id,
          eventId: db.events?.[0]?.id || 'evt_fts_2026',
          categoryId: newP.categoryId,
          participantCode: code,
          registrationNumber: newP.regNo,
          name: newP.name,
          phoneNumber: newP.phone,
          routineTitle: newP.act,
          act: newP.act,
          status: 'ACTIVE'
        }).catch(e => console.warn('[LiveEvent] Create participant Supabase sync error:', e.message));
        break;
      }

      case 'UPDATE_PARTICIPANT': {
        const id = payload.id;
        const fields = payload.fields || payload;
        this.state.participants = this.state.participants.map(p =>
          p.id === id ? { ...p, ...fields } : p
        );
        if (db.participants) {
          const dbPart = db.participants.find(p => p.id === id);
          if (dbPart) Object.assign(dbPart, fields);
        }
        dbService.updateParticipant(id, fields).catch(e => console.warn('[LiveEvent] Update participant Supabase sync error:', e.message));
        break;
      }

      case 'REMOVE_PARTICIPANT': {
        const id = payload.id || payload;
        this.state.participants = this.state.participants.filter(p => p.id !== id);
        if (db.participants) {
          db.participants = db.participants.filter(p => p.id !== id);
        }
        if (this.state.currentId === id) {
          this.state.currentId = this.state.participants[0]?.id || null;
        }
        dbService.deleteParticipant(id).catch(e => console.warn('[LiveEvent] Delete participant Supabase sync error:', e.message));
        break;
      }

      case 'ADD_JUDGE': {
        const jData = payload.judge || payload;
        const code = (jData.code || jData.accessCode || String(4821 + this.state.judges.length)).trim().toUpperCase();
        const newJ = {
          id: jData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: jData.name.trim(),
          email: jData.email || '',
          code: code,
          accessCode: code,
          photo: jData.photo || null,
          title: jData.title || 'Official Judge & Evaluator',
          assignedCategories: jData.assignedCategories || [],
          status: jData.status || 'ACTIVE'
        };

        const existingIdx = this.state.judges.findIndex(j => j.id === newJ.id || (newJ.email && j.email && j.email.toLowerCase() === newJ.email.toLowerCase()));
        if (existingIdx >= 0) {
          this.state.judges[existingIdx] = { ...this.state.judges[existingIdx], ...newJ };
        } else {
          this.state.judges.push(newJ);
        }

        // Always auto-select newly added judge so they appear on stage panel
        if (!this.state.selectedJudgeIds.includes(newJ.id)) {
          this.state.selectedJudgeIds.push(newJ.id);
        }

        // Keep db.users in sync
        if (db.users) {
          const dbIdx = db.users.findIndex(u => u.id === newJ.id || (newJ.email && u.email?.toLowerCase() === newJ.email.toLowerCase()));
          if (dbIdx >= 0) {
            db.users[dbIdx] = { ...db.users[dbIdx], ...newJ, role: 'JUDGE' };
          } else {
            db.users.push({
              id: newJ.id,
              name: newJ.name,
              email: newJ.email || `${newJ.name.toLowerCase().replace(/\s+/g, '')}@event.local`,
              role: 'JUDGE',
              status: 'ACTIVE',
              createdAt: new Date().toISOString()
            });
          }
        }

        // Persist to Supabase
        dbService.createUser({
          id: newJ.id,
          name: newJ.name,
          email: newJ.email || `${newJ.name.toLowerCase().replace(/\s+/g, '')}@event.local`,
          passwordHash: '$2a$10$tQ120eR94uO.c2V2dFvQReI7mDqXz3J7w4U4k1IeX/0CgC1E4u1e2',
          role: 'JUDGE',
          status: 'ACTIVE'
        }).catch(e => console.warn('[LiveEvent] Create judge Supabase sync error:', e.message));
        break;
      }

      case 'UPDATE_JUDGE': {
        const id = payload.id;
        const fields = payload.fields || payload;
        this.state.judges = this.state.judges.map(j =>
          j.id === id ? { ...j, ...fields } : j
        );
        if (db.users) {
          const dbUser = db.users.find(u => u.id === id && u.role === 'JUDGE');
          if (dbUser) Object.assign(dbUser, fields);
        }
        dbService.updateUser(id, fields).catch(e => console.warn('[LiveEvent] Update judge Supabase sync error:', e.message));
        break;
      }

      case 'REMOVE_JUDGE': {
        const id = payload.id || payload;
        this.state.judges = this.state.judges.filter(j => j.id !== id);
        this.state.selectedJudgeIds = this.state.selectedJudgeIds.filter(judgeId => judgeId !== id);
        if (db.users) {
          db.users = db.users.filter(u => u.id !== id);
        }
        dbService.deleteUser(id).catch(e => console.warn('[LiveEvent] Delete judge Supabase sync error:', e.message));
        break;
      }

      case 'GENERATE_REGISTRATION_CODE': {
        const { name, categoryId, categoryCode, codeNumber, phone, regNo, token, autoEnroll, act } = payload;
        const cat = this.state.categories.find(c => c.id === categoryId);
        const prefix = categoryCode || cat?.prefix || "GEN";
        const cleanNumber = String(codeNumber || "").trim().toUpperCase();
        const rawToken = String(token || (cleanNumber ? `${prefix}${cleanNumber}` : `${prefix}${Math.floor(10 + Math.random() * 90)}`)).trim().toUpperCase();
        const code = rawToken;

        const existing = this.state.registrations.find(r => r.code === code || (token && r.token === rawToken));
        if (existing) {
          throw new Error(`Token/Code ${code} is already issued to ${existing.name}.`);
        }

        const reg = {
          id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          categoryId,
          categoryCode: prefix,
          categoryName: cat?.label || prefix,
          code,
          token: rawToken,
          phone: phone ? String(phone).trim() : "",
          regNo: regNo ? String(regNo).trim().toUpperCase() : "",
          status: autoEnroll ? 'enrolled' : 'pending',
          createdAt: new Date().toISOString()
        };
        this.state.registrations.unshift(reg);

        // Also add or sync participant directly so they appear in Admin live console ready to perform
        const existingPart = this.state.participants.find(p => p.code === code);
        if (!existingPart) {
          const newParticipant = {
            id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: name.trim(),
            act: act?.trim() || cat?.label || "Live Performance",
            routineTitle: act?.trim() || cat?.label || "Live Performance",
            categoryId,
            categoryCode: prefix,
            categoryName: cat?.label || prefix,
            code,
            token: rawToken,
            phone: phone ? String(phone).trim() : "",
            regNo: regNo ? String(regNo).trim().toUpperCase() : "",
            photo: null,
            performed: false
          };
          this.state.participants.push(newParticipant);

          // Keep db.participants in sync
          if (db.participants && !db.participants.some(p => p.participantCode === code)) {
            db.participants.push({
              id: newParticipant.id,
              eventId: db.events?.[0]?.id || 'evt_fts_2026',
              categoryId,
              participantCode: code,
              registrationNumber: regNo || '',
              name: name.trim(),
              phoneNumber: phone || '',
              routineTitle: newParticipant.act,
              act: newParticipant.act,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
        break;
      }

      case 'CLAIM_REGISTRATION': {
        const { code, act, photo } = payload;
        const cleanCode = code.trim().toUpperCase();
        const reg = this.state.registrations.find(r => r.code === cleanCode);
        if (!reg) {
          throw new Error(`Code ${cleanCode} does not match a registered participant.`);
        }

        reg.status = 'enrolled';
        let p = this.state.participants.find(part => part.code === cleanCode);
        if (p) {
          if (act) p.act = act;
          if (photo) p.photo = photo;
        } else {
          p = {
            id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: reg.name,
            code: reg.code,
            act: act || "General Performance",
            categoryId: reg.categoryId,
            photo: photo || null,
            performed: false
          };
          this.state.participants.push(p);
        }
        break;
      }

      case 'SUBMIT_JUDGE_SCORE': {
        const { participantId, judgeId, marks, score } = payload;
        if (!this.state.judgeScores[participantId]) {
          this.state.judgeScores[participantId] = {};
        }
        const judgeMarks = marks || score || {};
        this.state.judgeScores[participantId][judgeId] = judgeMarks;

        // Sync to memoryStore
        if (!memoryStore.judgeScores[participantId]) {
          memoryStore.judgeScores[participantId] = {};
        }
        memoryStore.judgeScores[participantId][judgeId] = judgeMarks;

        const totalNum = typeof judgeMarks === 'number'
          ? judgeMarks
          : Object.values(judgeMarks).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);
        const part = db.participants?.find(p => p.id === participantId) || this.state.participants.find(p => p.id === participantId);
        const catId = part?.categoryId || this.state.categoryFilter || 'cat_dancing_superstar';

        // Sync to db.judgeScores
        if (db.judgeScores) {
          const existingIdx = db.judgeScores.findIndex(s => s.judgeId === judgeId && s.participantId === participantId);
          if (existingIdx >= 0) {
            db.judgeScores[existingIdx].score = totalNum;
            db.judgeScores[existingIdx].marks = judgeMarks;
            db.judgeScores[existingIdx].updatedAt = new Date().toISOString();
          } else {
            db.judgeScores.push({
              id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              judgeId,
              participantId,
              categoryId: catId,
              score: totalNum,
              marks: judgeMarks,
              revisionCount: 0,
              locked: false,
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Persist to Supabase
        dbService.createJudgeScore({
          judgeId,
          participantId,
          categoryId: catId,
          score: totalNum
        }).catch(e => console.warn('[LiveEvent] Judge score Supabase sync error:', e.message));
        break;
      }

      case 'CAST_AUDIENCE_VOTE': {
        const { participantId, studentId, score } = payload;
        if (!this.state.votingOpen && payload.force !== true) {
          throw new Error("Voting is currently closed for this performance.");
        }
        if (!this.state.votes[participantId]) {
          this.state.votes[participantId] = {};
        }
        const numericScore = Math.max(1, Math.min(10, Number(score) || 7));
        this.state.votes[participantId][studentId] = numericScore;

        // Sync to memoryStore
        if (!memoryStore.audienceVotes[participantId]) {
          memoryStore.audienceVotes[participantId] = {};
        }
        memoryStore.audienceVotes[participantId][studentId] = numericScore;

        const voterId = studentId || `aud_${Date.now()}`;
        const part = db.participants?.find(p => p.id === participantId) || this.state.participants.find(p => p.id === participantId);
        const catId = part?.categoryId || this.state.categoryFilter || 'cat_dancing_superstar';

        // Sync to db.audienceVotes
        if (db.audienceVotes) {
          const existing = db.audienceVotes.find(v => (v.audienceId === voterId || v.studentId === voterId) && v.participantId === participantId);
          if (!existing) {
            db.audienceVotes.push({
              id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              audienceId: voterId,
              studentId: voterId,
              participantId,
              categoryId: catId,
              eventId: db.events?.[0]?.id || 'evt_fts_2026',
              score: numericScore,
              submittedAt: new Date().toISOString()
            });
          } else {
            existing.score = numericScore;
          }
        }

        // Persist to Supabase
        dbService.createAudienceVote({
          audienceId: voterId,
          participantId,
          categoryId: catId,
          eventId: db.events?.[0]?.id || 'evt_fts_2026',
          score: numericScore,
          regNo: studentId
        }).catch(e => console.warn('[LiveEvent] Audience vote Supabase sync error:', e.message));
        break;
      }

      case 'SYNC_FULL_STATE': {
        // Full state merge from admin client
        const incoming = payload.state || payload;
        if (incoming && typeof incoming === 'object') {
          Object.assign(this.state, incoming);
        }
        break;
      }

      case 'CLEAR_ALL_DATA': {
        this.state.participants = [];
        this.state.judges = [];
        this.state.registrations = [];
        this.state.currentId = null;
        this.state.votingOpen = false;
        this.state.scoreRevealed = {};
        this.state.leaderboardRevealed = false;
        this.state.votes = {};
        this.state.judgeScores = {};
        this.state.lastUndoAction = null;
        break;
      }

      default:
        console.warn(`[LiveEventService] Unknown action: ${action}`);
    }

    this.broadcast(action, payload);
    return this.state;
  }
}

export const liveEventService = new LiveEventService();

// Set up periodic heartbeat (every 25 seconds)
const heartbeatInterval = setInterval(() => {
  liveEventService.sendHeartbeat();
}, 25000);
if (heartbeatInterval?.unref) {
  heartbeatInterval.unref();
}

export default liveEventService;
