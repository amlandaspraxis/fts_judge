import dbService from '../config/dbService.js';
import { logAudit } from './auditService.js';

export const submitOrUpdateScore = async (judgeId, participantId, categoryId, score, reason = null, req = null) => {
  const event = await dbService.getPrimaryEvent();
  if (!event || event.status !== 'JUDGING_OPEN') {
    return { ok: false, status: 403, error: 'Judging is currently closed.', code: 'JUDGING_CLOSED' };
  }

  // 1. Check judge assignment to category
  const assignments = await dbService.getJudgeAssignments();
  const assignment = assignments.find(
    ja => ja.judgeId === judgeId && ja.categoryId === categoryId
  );
  if (!assignment) {
    return { ok: false, status: 403, error: 'You are not assigned to judge this category.', code: 'UNASSIGNED_CATEGORY' };
  }

  // 2. Check participant belongs to category
  const participant = await dbService.getParticipantById(participantId);
  if (!participant || participant.categoryId !== categoryId) {
    return { ok: false, status: 404, error: 'Participant not found in this category.', code: 'PARTICIPANT_NOT_FOUND' };
  }

  const numericScore = Number(score);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
    return { ok: false, status: 400, error: 'Score must be a valid number between 0 and 100.', code: 'INVALID_SCORE' };
  }

  // 3. Find existing score
  const existingScore = await dbService.findJudgeScore(judgeId, participantId);

  if (!existingScore) {
    // Brand new submission (revisionCount = 0)
    const newScore = await dbService.createJudgeScore({
      judgeId,
      participantId,
      categoryId,
      score: numericScore
    });

    await logAudit(judgeId, 'JUDGE_SUBMITTED_SCORE', 'JudgeScore', newScore.id, null, { score: numericScore }, req);
    return { ok: true, score: newScore, status: 201 };
  }

  // 4. One-Time Edit Enforcement
  if (existingScore.revisionCount >= 1 || existingScore.locked) {
    return {
      ok: false,
      status: 403,
      error: 'You have already used your one permitted score modification. Score is permanently locked.',
      code: 'SCORE_EDIT_LIMIT_REACHED'
    };
  }

  // Record history
  await dbService.createScoreHistory({
    scoreId: existingScore.id,
    oldScore: existingScore.score,
    newScore: numericScore,
    changedBy: judgeId,
    reason: reason || 'One-time score modification'
  });

  const oldScoreVal = existingScore.score;
  const updatedScore = await dbService.updateJudgeScore(existingScore.id, {
    score: numericScore,
    revisionCount: 1,
    locked: true
  });

  await logAudit(judgeId, 'JUDGE_MODIFIED_SCORE', 'JudgeScore', existingScore.id, { score: oldScoreVal }, { score: numericScore }, req);

  return { ok: true, score: updatedScore, status: 200, modified: true };
};

export const getJudgeScoresForParticipant = async (participantId) => {
  const all = await dbService.getJudgeScores();
  return all.filter(s => s.participantId === participantId);
};

export const getScoreHistory = async (scoreId) => {
  return await dbService.getScoreHistory(scoreId);
};
