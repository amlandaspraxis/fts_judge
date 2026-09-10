import dbService from '../config/dbService.js';
import { logAudit } from './auditService.js';

export const calculateResultsForCategory = async (categoryId) => {
  const event = await dbService.getPrimaryEvent();
  const allParticipants = await dbService.getParticipants(categoryId);
  const allVotes = await dbService.getAudienceVotes();
  const allScores = await dbService.getJudgeScores();

  const categoryVotes = allVotes.filter(v => v.categoryId === categoryId);
  const totalAudienceVotes = categoryVotes.length;

  const results = allParticipants.map(participant => {
    // 1. Judge component (average of scores submitted for this participant)
    const scores = allScores.filter(s => s.participantId === participant.id);
    const judgeAvg = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      : 0;

    // 2. Audience component (proportional vote share normalized out of 100)
    const partVotes = categoryVotes.filter(v => v.participantId === participant.id).length;
    const audienceScore = totalAudienceVotes > 0
      ? (partVotes / totalAudienceVotes) * 100
      : 0;

    // 3. Formula: Final Score = (Judge Score * 0.85) + (Audience Score * 0.15)
    const judgeWeight = event?.judgeWeight || 0.85;
    const audienceWeight = event?.audienceWeight || 0.15;
    const finalScore = Number(((judgeAvg * judgeWeight) + (audienceScore * audienceWeight)).toFixed(2));

    return {
      id: `res_${categoryId}_${participant.id}`,
      eventId: event?.id || 'evt_fts_2026',
      categoryId,
      participantId: participant.id,
      participantCode: participant.participantCode,
      participantName: participant.name,
      act: participant.act,
      judgeScore: Number(judgeAvg.toFixed(2)),
      audienceScore: Number(audienceScore.toFixed(2)),
      audienceVotesCount: partVotes,
      judgeWeight,
      audienceWeight,
      finalScore,
      calculatedAt: new Date().toISOString()
    };
  });

  // 4. Rank sorting: Final Score descending; tie-break: Higher Judge Score wins
  results.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    return b.judgeScore - a.judgeScore;
  });

  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results;
};

export const getAllResults = async () => {
  const categories = await dbService.getCategories();
  const categorizedResults = {};
  for (const cat of categories) {
    categorizedResults[cat.id] = await calculateResultsForCategory(cat.id);
  }
  return categorizedResults;
};

export const lockResults = async (adminId, req = null) => {
  const event = await dbService.updateEventState('RESULTS_LOCKED', { resultsLocked: true });
  await logAudit(adminId, 'ADMIN_LOCKED_RESULTS', 'Event', event.id, null, { status: 'RESULTS_LOCKED' }, req);
  return { ok: true, event };
};

export const publishResults = async (adminId, req = null) => {
  const event = await dbService.updateEventState('RESULTS_PUBLISHED');
  await logAudit(adminId, 'ADMIN_PUBLISHED_RESULTS', 'Event', event.id, null, { status: 'RESULTS_PUBLISHED' }, req);
  return { ok: true, event };
};
