import { db } from '../config/database.js';
import dbService from '../config/dbService.js';
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

export const getCategories = async (req, res) => {
  try {
    const categories = await dbService.getCategories();
    return sendSuccess(res, { categories });
  } catch {
    return sendSuccess(res, { categories: db.categories });
  }
};

export const createCategory = async (req, res) => {
  const { name, code, prefix, description } = req.body;
  if (!name) return sendError(res, 'Category name is required', 400);

  const catCode = (code || prefix || name.substring(0, 3)).toUpperCase().trim();

  try {
    const category = await dbService.createCategory({
      eventId: db.events?.[0]?.id || 'evt_fts_2026',
      name: name.trim(),
      code: catCode,
      prefix: catCode,
      description: description || '',
      status: 'ACTIVE'
    });

    if (!db.categories.some(c => c.id === category.id)) {
      db.categories.push(category);
    }

    liveEventService.syncCategory(category, 'ADD');
    logAudit(req.user.id, 'ADMIN_CREATED_CATEGORY', 'Category', category.id, null, category, req);
    return sendSuccess(res, { category }, 'Category created', 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const cat = await dbService.updateCategory(id, req.body);
    if (!cat) return sendError(res, 'Category not found', 404);

    const memCat = db.categories.find(c => c.id === id);
    if (memCat) Object.assign(memCat, cat);

    liveEventService.syncCategory(cat, 'UPDATE');
    logAudit(req.user.id, 'ADMIN_UPDATED_CATEGORY', 'Category', cat.id, null, cat, req);
    return sendSuccess(res, { category: cat }, 'Category updated');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await dbService.deleteCategory(id);
    const index = db.categories.findIndex(c => c.id === id);
    if (index !== -1) db.categories.splice(index, 1);

    liveEventService.syncCategory({ id }, 'REMOVE');
    logAudit(req.user.id, 'ADMIN_DELETED_CATEGORY', 'Category', id, null, null, req);
    return sendSuccess(res, {}, 'Category deleted');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
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

  const existing = await dbService.findUserByEmail(email);
  if (existing) return sendError(res, 'Email already in use', 409);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password || 'judge123', salt);

  const judgesList = await dbService.getUsers('JUDGE');
  const accessCode = (code || String(4821 + judgesList.length)).trim().toUpperCase();

  try {
    const judge = await dbService.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'JUDGE',
      status: 'ACTIVE'
    });
    judge.code = accessCode;
    judge.accessCode = accessCode;
    judge.photo = photo || null;
    judge.title = title || 'Official Judge & Evaluator';

    if (!db.users.some(u => u.id === judge.id)) {
      db.users.push(judge);
    }

    if (Array.isArray(assignedCategories)) {
      for (const catId of assignedCategories) {
        await dbService.createJudgeAssignment({
          judgeId: judge.id,
          categoryId: catId,
          eventId: db.events?.[0]?.id || 'evt_fts_2026'
        });
      }
    }

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
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const updateJudge = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, status, assignedCategories, photo, title, code } = req.body;

  try {
    const judge = await dbService.findUserById(id);
    if (!judge) return sendError(res, 'Judge not found', 404);

    const old = { ...judge };
    const updates = {};

    if (email && email.trim().toLowerCase() !== judge.email.toLowerCase()) {
      const duplicate = await dbService.findUserByEmail(email);
      if (duplicate && duplicate.id !== id) return sendError(res, 'Email already in use by another account', 409);
      updates.email = email.trim().toLowerCase();
    }

    if (name && name.trim()) updates.name = name.trim();
    if (status) updates.status = status;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    await dbService.updateUser(id, updates);

    const memJudge = db.users.find(u => u.id === id);
    if (memJudge) {
      Object.assign(memJudge, updates);
      if (code) {
        memJudge.code = code.trim().toUpperCase();
        memJudge.accessCode = memJudge.code;
      }
      if (photo !== undefined) memJudge.photo = photo;
      if (title !== undefined) memJudge.title = title;
      memJudge.updatedAt = new Date().toISOString();
    }

    if (Array.isArray(assignedCategories)) {
      await dbService.deleteJudgeAssignment(id);
      for (const catId of assignedCategories) {
        await dbService.createJudgeAssignment({
          judgeId: id,
          categoryId: catId,
          eventId: db.events?.[0]?.id || 'evt_fts_2026'
        });
      }
    }

    liveEventService.syncJudge({
      id,
      name: updates.name || judge.name,
      email: updates.email || judge.email,
      code: code || judge.code,
      accessCode: code || judge.code,
      photo: photo !== undefined ? photo : judge.photo,
      title: title !== undefined ? title : judge.title,
      status: updates.status || judge.status,
      assignedCategories: Array.isArray(assignedCategories) ? assignedCategories : undefined
    }, 'UPDATE');

    logAudit(req.user.id, 'ADMIN_UPDATED_JUDGE', 'User', id, old, updates, req);
    return sendSuccess(res, { judge: { id, name: updates.name || judge.name, email: updates.email || judge.email, status: updates.status || judge.status } }, 'Judge updated successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const deleteJudge = async (req, res) => {
  const { id } = req.params;
  try {
    await dbService.deleteUser(id);
    await dbService.deleteJudgeAssignment(id);

    const userIdx = db.users.findIndex(u => u.id === id && u.role === 'JUDGE');
    if (userIdx !== -1) db.users.splice(userIdx, 1);
    if (db.judgeAssignments) {
      db.judgeAssignments = db.judgeAssignments.filter(ja => ja.judgeId !== id);
    }

    liveEventService.syncJudge({ id }, 'REMOVE');
    logAudit(req.user.id, 'ADMIN_DELETED_JUDGE', 'User', id, null, null, req);
    return sendSuccess(res, { id }, 'Judge deleted successfully');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

export const assignJudge = async (req, res) => {
  const { judgeId, categoryId } = req.body;
  if (!judgeId || !categoryId) return sendError(res, 'judgeId and categoryId are required', 400);

  try {
    const assignment = await dbService.createJudgeAssignment({
      judgeId,
      categoryId,
      eventId: db.events?.[0]?.id || 'evt_fts_2026'
    });

    if (!db.judgeAssignments.some(ja => ja.id === assignment.id)) {
      db.judgeAssignments.push(assignment);
    }

    const allAssigned = (await dbService.getJudgeAssignments())
      .filter(ja => ja.judgeId === judgeId)
      .map(ja => ja.categoryId);
    liveEventService.syncJudge({ id: judgeId, assignedCategories: allAssigned }, 'UPDATE');

    logAudit(req.user.id, 'ADMIN_ASSIGNED_JUDGE', 'JudgeAssignment', assignment.id, null, assignment, req);
    return sendSuccess(res, { assignment }, 'Judge assigned to category', 201);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
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

export const updateEventState = async (req, res) => {
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

  // Authoritative real-time sync with Live Event Service and Supabase
  try {
    await dbService.updateEventState(status);
  } catch {}
  try {
    liveEventService.dispatch('SET_EVENT_STATUS', { status });
  } catch {}

  logAudit(req.user.id, 'ADMIN_CHANGED_EVENT_STATUS', 'Event', event.id, { status: old }, { status }, req);
  return sendSuccess(res, { event }, `Event state updated to ${status}`);
};

export const getAuditTrail = async (req, res) => {
  return sendSuccess(res, { auditLogs: await getAuditLogs() });
};
