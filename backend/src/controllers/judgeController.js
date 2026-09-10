import dbService from '../config/dbService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { submitOrUpdateScore, getScoreHistory } from '../services/scoringService.js';

export const getJudgeDashboard = async (req, res) => {
  try {
    const judgeId = req.user.id;
    const event = await dbService.getPrimaryEvent();
    const assignments = await dbService.getJudgeAssignments();
    const categories = await dbService.getCategories();
    const participants = await dbService.getParticipants();
    const scores = await dbService.getJudgeScores();

    const assignedCategoryIds = assignments.filter(ja => ja.judgeId === judgeId).map(a => a.categoryId);
    const assignedCats = categories.filter(c => assignedCategoryIds.includes(c.id));
    const assignedParts = participants.filter(p => assignedCategoryIds.includes(p.categoryId));
    const myScores = scores.filter(s => s.judgeId === judgeId);

    return sendSuccess(res, {
      judge: req.user,
      eventStatus: event.status,
      judgingOpen: event.status === 'JUDGING_OPEN',
      assignedCategories: assignedCats,
      totalParticipants: assignedParts.length,
      scoredCount: myScores.length,
      pendingCount: assignedParts.length - myScores.length
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getAssignedCategories = async (req, res) => {
  try {
    const judgeId = req.user.id;
    const assignments = await dbService.getJudgeAssignments();
    const categories = await dbService.getCategories();

    const assignedCategoryIds = assignments.filter(ja => ja.judgeId === judgeId).map(a => a.categoryId);
    const assignedCats = categories.filter(c => assignedCategoryIds.includes(c.id));
    return sendSuccess(res, { categories: assignedCats });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getParticipantsForJudge = async (req, res) => {
  try {
    const judgeId = req.user.id;
    const { categoryId } = req.query;
    const assignments = await dbService.getJudgeAssignments();
    const allParticipants = await dbService.getParticipants();
    const scores = await dbService.getJudgeScores();

    const assignedCategoryIds = assignments.filter(ja => ja.judgeId === judgeId).map(a => a.categoryId);

    let list = allParticipants.filter(p => assignedCategoryIds.includes(p.categoryId));
    if (categoryId) {
      if (!assignedCategoryIds.includes(categoryId)) {
        return sendError(res, 'You are not assigned to this category', 403, 'UNASSIGNED_CATEGORY');
      }
      list = list.filter(p => p.categoryId === categoryId);
    }

    const enhancedList = list.map(p => {
      const existingScore = scores.find(s => s.judgeId === judgeId && s.participantId === p.id);
      return {
        ...p,
        myScore: existingScore ? existingScore.score : null,
        revisionCount: existingScore ? existingScore.revisionCount : 0,
        locked: existingScore ? existingScore.locked : false,
        scoreId: existingScore ? existingScore.id : null
      };
    });

    return sendSuccess(res, { participants: enhancedList });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getMyScores = async (req, res) => {
  try {
    const judgeId = req.user.id;
    const scores = await dbService.getJudgeScores();
    const participants = await dbService.getParticipants();
    const categories = await dbService.getCategories();

    const myScores = scores
      .filter(s => s.judgeId === judgeId)
      .map(s => {
        const part = participants.find(p => p.id === s.participantId);
        const cat = categories.find(c => c.id === s.categoryId);
        return {
          ...s,
          participantName: part?.name,
          participantCode: part?.participantCode,
          categoryName: cat?.name
        };
      });
    return sendSuccess(res, { scores: myScores });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const submitScore = async (req, res) => {
  try {
    const judgeId = req.user.id;
    const { participantId, categoryId, score } = req.body;

    const result = await submitOrUpdateScore(judgeId, participantId, categoryId, score, null, req);
    if (!result.ok) {
      return sendError(res, result.error, result.status, result.code);
    }
    return sendSuccess(res, { score: result.score }, 'Score submitted successfully and saved to database', result.status);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateScore = async (req, res) => {
  try {
    const judgeId = req.user.id;
    const { id } = req.params;
    const { score, reason } = req.body;

    const scores = await dbService.getJudgeScores();
    const existingScore = scores.find(s => s.id === id);
    if (!existingScore) {
      return sendError(res, 'Score record not found', 404);
    }
    if (existingScore.judgeId !== judgeId) {
      return sendError(res, 'Cannot modify another judge’s score', 403, 'FORBIDDEN');
    }

    const result = await submitOrUpdateScore(
      judgeId,
      existingScore.participantId,
      existingScore.categoryId,
      score,
      reason,
      req
    );
    if (!result.ok) {
      return sendError(res, result.error, result.status, result.code);
    }
    return sendSuccess(res, { score: result.score }, 'Score modified and permanently locked in database', 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getHistoryForScore = async (req, res) => {
  try {
    const { id } = req.params;
    const scores = await dbService.getJudgeScores();
    const score = scores.find(s => s.id === id);
    if (!score) {
      return sendError(res, 'Score record not found', 404, 'NOT_FOUND');
    }

    // Access control: only the judge who submitted the score OR an Admin may view history
    const isOwner = (score.judgeId === req.user?.id);
    const isAdmin = (req.user?.role === 'ADMIN');

    if (!isOwner && !isAdmin) {
      return sendError(res, 'You are not authorized to view this score history.', 403, 'FORBIDDEN');
    }

    const history = await getScoreHistory(id);
    return sendSuccess(res, { history });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
