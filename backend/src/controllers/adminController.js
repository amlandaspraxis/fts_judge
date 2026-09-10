import { db } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit, getAuditLogs } from '../services/auditService.js';
import { liveEventService } from '../services/liveEventService.js';
import bcrypt from 'bcryptjs';

export const getDashboard = async (req, res) => {
  const event = db.events[0];
  const auditLogs = (await getAuditLogs()).slice(0, 5);
  const liveNow = db.participants.find(p => p.status === 'PERFORMING') || db.participants[0] || null;
  const upNext = db.participants.filter(p => p.id !== liveNow?.id).slice(0, 3);
  const liveState = liveEventService.getState();

  // Aggregate audience voters from db.users and live votes
  const uniqueVoterKeys = new Set([
    ...((db.users || []).filter(u => u.role === 'AUDIENCE').map(u => u.studentId || u.regNo || u.email || u.id)),
    ...((db.audienceVotes || []).map(v => v.studentId || v.audienceId))
  ]);
  const totalAudience = Math.max((db.users || []).filter(u => u.role === 'AUDIENCE').length, uniqueVoterKeys.size);

  return sendSuccess(res, {
    totalParticipants: db.participants.length,
    totalJudges: db.users.filter(u => u.role === 'JUDGE').length,
    totalAudience,
    categoriesCount: db.categories.length,
    eventStatus: event.status,
    judgingOpen: event.status === 'JUDGING_OPEN',
    votingOpen: event.status === 'VOTING_OPEN' || liveState.votingOpen,
    resultsLocked: event.resultsLocked || liveState.resultsLocked,
    event,
    liveNow: liveNow ? {
      ...liveNow,
      categoryName: db.categories.find(c => c.id === liveNow.categoryId)?.name || 'General'
    } : null,
    upNext: upNext.map(p => ({
      ...p,
      categoryName: db.categories.find(c => c.id === p.categoryId)?.name || 'General'
    })),
    recentActivity: auditLogs,
    systemHealth: {
      status: 'HEALTHY',
      apiServer: 'ONLINE',
      realtimeSync: 'ACTIVE',
      uptimeSeconds: Math.floor(process.uptime()),
      dbRecords: (db.participants || []).length + (db.users || []).length + (db.judgeScores || []).length
    }
  });
};

export const getCategories = (req, res) => {
  return sendSuccess(res, { categories: db.categories });
};

export const createCategory = (req, res) => {
  const { name, code, prefix, description } = req.body;
  if (!name) return sendError(res, 'Category name is required', 400);

  const catCode = (code || prefix || name.substring(0, 3)).toUpperCase().trim();

  const category = {
    id: `cat_${Date.now()}`,
    eventId: db.events[0].id,
    name: name.trim(),
    code: catCode,
    prefix: catCode,
    description: description || '',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  db.categories.push(category);
  // Authoritative real-time sync with Live Projector & multi-portals
  liveEventService.syncCategory(category, 'ADD');

  logAudit(req.user.id, 'ADMIN_CREATED_CATEGORY', 'Category', category.id, null, category, req);
  return sendSuccess(res, { category }, 'Category created', 201);
};

export const updateCategory = (req, res) => {
  const { id } = req.params;
  const cat = db.categories.find(c => c.id === id);
  if (!cat) return sendError(res, 'Category not found', 404);

  const old = { ...cat };
  if (req.body.name) cat.name = req.body.name;
  if (req.body.code || req.body.prefix) {
    const newCode = (req.body.code || req.body.prefix).toUpperCase().trim();
    cat.code = newCode;
    cat.prefix = newCode;
  }
  if (req.body.description !== undefined) cat.description = req.body.description;
  if (req.body.status) cat.status = req.body.status;

  // Propagate update to Live Projector & Real-time State
  liveEventService.syncCategory(cat, 'UPDATE');

  logAudit(req.user.id, 'ADMIN_UPDATED_CATEGORY', 'Category', cat.id, old, cat, req);
  return sendSuccess(res, { category: cat }, 'Category updated');
};

export const deleteCategory = (req, res) => {
  const { id } = req.params;
  const index = db.categories.findIndex(c => c.id === id);
  if (index === -1) return sendError(res, 'Category not found', 404);

  const deleted = db.categories.splice(index, 1)[0];
  // Propagate deletion to Live Projector & Real-time State
  liveEventService.syncCategory({ id }, 'REMOVE');

  logAudit(req.user.id, 'ADMIN_DELETED_CATEGORY', 'Category', id, deleted, null, req);
  return sendSuccess(res, {}, 'Category deleted');
};

export const getJudges = (req, res) => {
  const judges = db.users
    .filter(u => u.role === 'JUDGE')
    .map((u, idx) => {
      const assignedCategories = (db.judgeAssignments || [])
        .filter(ja => ja.judgeId === u.id)
        .map(ja => ja.categoryId);
      const scoresSubmitted = (db.judgeScores || []).filter(s => s.judgeId === u.id).length;
      const code = u.code || u.accessCode || String(4821 + idx);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        code,
        accessCode: code,
        title: u.title || 'Official Judge & Evaluator',
        photo: u.photo || null,
        status: u.status || 'ACTIVE',
        createdAt: u.createdAt,
        assignedCategories,
        assignedCount: assignedCategories.length,
        scoresSubmitted,
        lastActive: 'Active'
      };
    });
  return sendSuccess(res, { judges });
};

export const createJudge = async (req, res) => {
  const { name, email, password, assignedCategories, photo, title, code } = req.body;
  if (!name || !email) return sendError(res, 'Name and email are required', 400);

  const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) return sendError(res, 'Email already in use', 409);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password || 'judge123', salt);

  const judgeIndex = db.users.filter(u => u.role === 'JUDGE').length;
  const accessCode = (code || String(4821 + judgeIndex)).trim().toUpperCase();

  const judge = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    code: accessCode,
    accessCode: accessCode,
    photo: photo || null,
    title: title || 'Official Judge & Evaluator',
    passwordHash,
    role: 'JUDGE',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  db.users.push(judge);

  if (Array.isArray(assignedCategories)) {
    assignedCategories.forEach(catId => {
      db.judgeAssignments.push({
        id: `ja_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        judgeId: judge.id,
        categoryId: catId,
        eventId: db.events?.[0]?.id || 'evt_fts_2026',
        createdAt: new Date().toISOString()
      });
    });
  }

  // Authoritative real-time sync with Live Projector & multi-portals
  liveEventService.syncJudge({
    id: judge.id,
    name: judge.name,
    email: judge.email,
    code: accessCode,
    accessCode: accessCode,
    photo: judge.photo,
    title: judge.title,
    assignedCategories: Array.isArray(assignedCategories) ? assignedCategories : [],
    status: judge.status
  }, 'ADD');

  logAudit(req.user.id, 'ADMIN_CREATED_JUDGE', 'User', judge.id, null, { name: judge.name, email: judge.email, code: accessCode }, req);
  return sendSuccess(res, { judge: { id: judge.id, name: judge.name, email: judge.email, code: accessCode } }, 'Judge account created', 201);
};

export const updateJudge = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, status, assignedCategories, photo, title, code } = req.body;

  const judge = db.users.find(u => u.id === id && u.role === 'JUDGE');
  if (!judge) return sendError(res, 'Judge not found', 404);

  const old = { ...judge };

  if (email && email.trim().toLowerCase() !== judge.email.toLowerCase()) {
    const duplicate = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== id);
    if (duplicate) return sendError(res, 'Email already in use by another account', 409);
    judge.email = email.trim().toLowerCase();
  }

  if (name && name.trim()) {
    judge.name = name.trim();
  }

  if (status) {
    judge.status = status;
  }

  if (photo !== undefined) {
    judge.photo = photo;
  }

  if (title !== undefined) {
    judge.title = title;
  }

  if (code) {
    judge.code = code.trim().toUpperCase();
    judge.accessCode = judge.code;
  }

  if (password && password.trim()) {
    const salt = await bcrypt.genSalt(10);
    judge.passwordHash = await bcrypt.hash(password.trim(), salt);
  }

  judge.updatedAt = new Date().toISOString();

  // Update category assignments if provided
  if (Array.isArray(assignedCategories)) {
    db.judgeAssignments = (db.judgeAssignments || []).filter(ja => ja.judgeId !== id);
    assignedCategories.forEach(catId => {
      db.judgeAssignments.push({
        id: `ja_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        judgeId: id,
        categoryId: catId,
        eventId: db.events?.[0]?.id || 'evt_fts_2026',
        createdAt: new Date().toISOString()
      });
    });
  }

  // Propagate update to Live Projector & Real-time State
  liveEventService.syncJudge({
    id: judge.id,
    name: judge.name,
    email: judge.email,
    code: judge.code,
    accessCode: judge.accessCode,
    photo: judge.photo,
    title: judge.title,
    status: judge.status,
    assignedCategories: Array.isArray(assignedCategories) ? assignedCategories : undefined
  }, 'UPDATE');

  logAudit(req.user.id, 'ADMIN_UPDATED_JUDGE', 'User', judge.id, old, { name: judge.name, email: judge.email, status: judge.status }, req);
  return sendSuccess(res, { judge: { id: judge.id, name: judge.name, email: judge.email, status: judge.status } }, 'Judge updated successfully');
};

export const deleteJudge = (req, res) => {
  const { id } = req.params;
  const userIdx = db.users.findIndex(u => u.id === id && u.role === 'JUDGE');
  if (userIdx === -1) return sendError(res, 'Judge not found', 404);

  const deletedUser = db.users.splice(userIdx, 1)[0];

  // Clean up any judge assignments
  if (db.judgeAssignments) {
    db.judgeAssignments = db.judgeAssignments.filter(ja => ja.judgeId !== id);
  }

  // Propagate deletion to Live Projector & Real-time State
  liveEventService.syncJudge({ id }, 'REMOVE');

  logAudit(req.user.id, 'ADMIN_DELETED_JUDGE', 'User', id, deletedUser, null, req);
  return sendSuccess(res, { id }, 'Judge deleted successfully');
};

export const assignJudge = (req, res) => {
  const { judgeId, categoryId } = req.body;
  if (!judgeId || !categoryId) return sendError(res, 'judgeId and categoryId are required', 400);

  const existing = db.judgeAssignments.find(ja => ja.judgeId === judgeId && ja.categoryId === categoryId);
  if (existing) return sendError(res, 'Judge is already assigned to this category', 409);

  const assignment = {
    id: `ja_${Date.now()}`,
    judgeId,
    categoryId,
    eventId: db.events[0].id,
    createdAt: new Date().toISOString()
  };

  db.judgeAssignments.push(assignment);

  // Authoritative sync to Live Event Service so judge assigned categories update live
  const allAssigned = db.judgeAssignments
    .filter(ja => ja.judgeId === judgeId)
    .map(ja => ja.categoryId);
  liveEventService.syncJudge({ id: judgeId, assignedCategories: allAssigned }, 'UPDATE');

  logAudit(req.user.id, 'ADMIN_ASSIGNED_JUDGE', 'JudgeAssignment', assignment.id, null, assignment, req);
  return sendSuccess(res, { assignment }, 'Judge assigned to category', 201);
};

export const getAudienceUsers = (req, res) => {
  // Aggregate from db.users where role === 'AUDIENCE'
  const audienceMap = new Map();

  (db.users || [])
    .filter(u => u.role === 'AUDIENCE')
    .forEach(u => {
      const reg = u.studentId || u.regNo || u.email || u.id;
      audienceMap.set(reg, {
        id: u.id,
        name: u.name || `Student (${reg})`,
        email: u.email || '',
        studentId: u.studentId || u.regNo || '',
        phone: u.phone || u.phoneNumber || '',
        status: u.status || 'ACTIVE',
        createdAt: u.createdAt || new Date().toISOString(),
        votesCast: (db.audienceVotes || []).filter(v => v.audienceId === u.id || v.studentId === reg || v.audienceId === reg).length
      });
    });

  // Also include any voters recorded in db.audienceVotes who might not yet be in db.users
  (db.audienceVotes || []).forEach(v => {
    const voterKey = v.studentId || v.audienceId;
    if (voterKey && !audienceMap.has(voterKey)) {
      audienceMap.set(voterKey, {
        id: v.audienceId || `usr_${voterKey}`,
        name: `Student (${voterKey})`,
        email: v.email || `${voterKey.toLowerCase()}@student.local`,
        studentId: voterKey,
        phone: v.phone || '',
        status: 'ACTIVE',
        createdAt: v.submittedAt || new Date().toISOString(),
        votesCast: (db.audienceVotes || []).filter(av => av.audienceId === v.audienceId || av.studentId === voterKey).length
      });
    }
  });

  const audience = Array.from(audienceMap.values());
  return sendSuccess(res, { audience, count: audience.length });
};

export const updateEventState = (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    'SETUP', 'JUDGING_OPEN', 'VOTING_OPEN', 'JUDGING_CLOSED',
    'VOTING_CLOSED', 'RESULTS_LOCKED', 'RESULTS_PUBLISHED'
  ];
  if (!validStatuses.includes(status)) {
    return sendError(res, `Invalid event status. Allowed: ${validStatuses.join(', ')}`, 400);
  }

  const event = db.events[0];
  const old = event.status;
  event.status = status;

  if (status === 'JUDGING_OPEN' && !event.judgingOpenAt) event.judgingOpenAt = new Date().toISOString();
  if (status === 'JUDGING_CLOSED') event.judgingCloseAt = new Date().toISOString();
  if (status === 'VOTING_OPEN') {
    if (!event.votingOpenAt) event.votingOpenAt = new Date().toISOString();
    try {
      liveEventService.dispatch('SET_VOTING_OPEN', { open: true });
    } catch {}
  }
  if (status === 'VOTING_CLOSED') {
    event.votingCloseAt = new Date().toISOString();
    try {
      liveEventService.dispatch('SET_VOTING_OPEN', { open: false });
    } catch {}
  }
  if (status === 'RESULTS_LOCKED') event.resultsLocked = true;
  if (status === 'RESULTS_PUBLISHED') {
    try {
      liveEventService.dispatch('SET_LEADERBOARD_REVEALED', { revealed: true });
    } catch {}
  }

  // Authoritative real-time sync with Live Event Service
  try {
    liveEventService.dispatch('SET_EVENT_STATUS', { status });
  } catch {}

  logAudit(req.user.id, 'ADMIN_CHANGED_EVENT_STATUS', 'Event', event.id, { status: old }, { status }, req);
  return sendSuccess(res, { event }, `Event state updated to ${status}`);
};

export const getAuditTrail = async (req, res) => {
  return sendSuccess(res, { auditLogs: await getAuditLogs() });
};
