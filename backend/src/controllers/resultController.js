import { getAllResults, calculateResultsForCategory, lockResults as lockService, publishResults as pubService } from '../services/resultService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import dbService from '../config/dbService.js';

/**
 * Reusable CSV Sanitization function (CWE-1236 / CSV Formula Injection)
 * Safely neutralizes formula trigger characters (=, +, -, @, \t, \r, \n)
 * by prepending a single quote (') and escaping double quotes.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Check for dangerous leading characters that spreadsheet engines interpret as formulas or commands
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r', '\n'];
  const firstChar = str.length > 0 ? str.charAt(0) : '';

  if (dangerousPrefixes.includes(firstChar)) {
    str = `'${str}`;
  }

  // Escape any existing double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Helper to strip internal notes / evaluator details for public results view
 */
function sanitizePublicResults(results = []) {
  return results.map(r => ({
    rank: r.rank,
    participantId: r.participantId,
    participantCode: r.participantCode,
    participantName: r.participantName,
    act: r.act,
    judgeScore: r.judgeScore,
    judgeWeightedScore: r.judgeWeightedScore,
    audienceScore: r.audienceScore,
    audienceWeightedScore: r.audienceWeightedScore,
    finalScore: r.finalScore
  }));
}

export const getResults = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const event = await dbService.getPrimaryEvent();

    const isPublished = (event && event.status === 'RESULTS_PUBLISHED');
    const isAdmin = (req.user && req.user.role === 'ADMIN');

    // If event is not published, strictly require ADMIN authorization
    if (!isPublished && !isAdmin) {
      return sendError(res, 'Competition results have not been published yet.', 403, 'RESULTS_UNPUBLISHED');
    }

    if (categoryId) {
      const results = await calculateResultsForCategory(categoryId);
      const safeResults = isPublished && !isAdmin ? sanitizePublicResults(results) : results;
      return sendSuccess(res, {
        categoryId,
        results: safeResults,
        resultsLocked: event?.resultsLocked || false,
        eventStatus: event?.status || 'SETUP'
      });
    }

    const all = await getAllResults();
    let safeAll = all;
    if (isPublished && !isAdmin) {
      safeAll = {};
      for (const catId of Object.keys(all)) {
        safeAll[catId] = sanitizePublicResults(all[catId]);
      }
    }

    return sendSuccess(res, {
      results: safeAll,
      resultsLocked: event?.resultsLocked || false,
      eventStatus: event?.status || 'SETUP'
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const lockResults = async (req, res) => {
  try {
    const result = await lockService(req.user.id, req);
    return sendSuccess(res, { event: result.event }, 'Results officially locked. No further alterations permitted.');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const publishResults = async (req, res) => {
  try {
    const result = await pubService(req.user.id, req);
    return sendSuccess(res, { event: result.event }, 'Results publicly published.');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const exportResults = async (req, res) => {
  try {
    const all = await getAllResults();
    const event = await dbService.getPrimaryEvent();
    const votes = await dbService.getAudienceVotes();
    const categories = await dbService.getCategories();
    const participants = await dbService.getParticipants();
    const users = await dbService.getUsers();

    return sendSuccess(res, {
      exportedAt: new Date().toISOString(),
      event,
      results: all,
      votes: votes.map(v => {
        const cat = categories.find(c => c.id === v.categoryId);
        const part = participants.find(p => p.id === v.participantId);
        const user = users.find(u => u.id === v.audienceId);
        return {
          ...v,
          categoryName: cat?.name || v.categoryId,
          categoryCode: cat?.code || cat?.prefix || '',
          participantCode: part?.participantCode || '',
          participantName: part?.name || '',
          registrationNumber: part?.registrationNumber || '',
          voterName: user?.name || 'Audience User',
          voterEmail: user?.email || ''
        };
      })
    }, 'Results exported successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const exportResultsCsv = async (req, res) => {
  try {
    const all = await getAllResults();
    const categories = await dbService.getCategories();
    const participants = await dbService.getParticipants();
    const rows = [];

    // Header row
    rows.push([
      'Rank',
      'Category Name',
      'Category Code',
      'Chest Number',
      'Performer Name',
      'Registration Number',
      'Phone Number',
      'Act / Routine',
      'Judge Score (0-100)',
      'Judge Weight (85%)',
      'Audience Votes Count',
      'Audience Score (%)',
      'Audience Weight (15%)',
      'Final Calculated Score'
    ]);

    for (const catId of Object.keys(all)) {
      const category = categories.find(c => c.id === catId);
      const results = all[catId] || [];
      for (const r of results) {
        const participant = participants.find(p => p.id === r.participantId);
        rows.push([
          r.rank,
          sanitizeCsvCell(category?.name || catId),
          sanitizeCsvCell(category?.code || category?.prefix || ''),
          sanitizeCsvCell(r.participantCode),
          sanitizeCsvCell(r.participantName),
          sanitizeCsvCell(participant?.registrationNumber || ''),
          sanitizeCsvCell(participant?.phoneNumber || ''),
          sanitizeCsvCell(r.act || ''),
          r.judgeScore,
          '85%',
          r.audienceVotesCount,
          `${r.audienceScore}%`,
          '15%',
          r.finalScore
        ]);
      }
    }

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fts_competition_results.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const exportVotesCsv = async (req, res) => {
  try {
    const votes = await dbService.getAudienceVotes();
    const categories = await dbService.getCategories();
    const participants = await dbService.getParticipants();
    const users = await dbService.getUsers();
    const rows = [];

    // Header row
    rows.push([
      'Vote ID',
      'Category Name',
      'Category Code',
      'Performer Chest Number',
      'Performer Name',
      'Performer Registration Number',
      'Voter User ID',
      'Voter Name',
      'Voter Email',
      'Vote Timestamp'
    ]);

    for (const v of votes) {
      const cat = categories.find(c => c.id === v.categoryId);
      const part = participants.find(p => p.id === v.participantId);
      const user = users.find(u => u.id === v.audienceId);

      rows.push([
        sanitizeCsvCell(v.id),
        sanitizeCsvCell(cat?.name || v.categoryId),
        sanitizeCsvCell(cat?.code || cat?.prefix || ''),
        sanitizeCsvCell(part?.participantCode || ''),
        sanitizeCsvCell(part?.name || ''),
        sanitizeCsvCell(part?.registrationNumber || ''),
        sanitizeCsvCell(v.audienceId),
        sanitizeCsvCell(user?.name || 'Audience Member'),
        sanitizeCsvCell(user?.email || 'N/A'),
        sanitizeCsvCell(new Date(v.submittedAt).toLocaleString())
      ]);
    }

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fts_audience_votes.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
