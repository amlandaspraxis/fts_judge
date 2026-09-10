import dbService from '../config/dbService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { castAudienceVote, getAudienceVotingStatus } from '../services/votingService.js';

// Short-TTL in-memory cache for static ballot data (categories and performers)
// Shields database and internal memory layers during simultaneous 4,000-user surges
let cachedCategories = null;
let cachedCategoriesExpiry = 0;
const cachedParticipantsByCategory = new Map();
const CACHE_TTL_MS = 3000; // 3 seconds

export const getAudienceDashboard = async (req, res) => {
  try {
    const audienceId = req.user.id;
    const event = await dbService.getPrimaryEvent();

    const now = Date.now();
    let categories = cachedCategories;
    if (!categories || now >= cachedCategoriesExpiry) {
      categories = await dbService.getCategories();
      cachedCategories = categories;
      cachedCategoriesExpiry = now + CACHE_TTL_MS;
    }

    const { votedParticipantIds, votedCategoryIds, votes } = await getAudienceVotingStatus(audienceId, req);

    return sendSuccess(res, {
      user: req.user,
      eventStatus: event.status,
      votingOpen: event.status === 'VOTING_OPEN',
      categories,
      votedParticipantIds: votedParticipantIds || [],
      votedCategoryIds: votedCategoryIds || [],
      votesCount: votes.length
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getCategories = async (req, res) => {
  try {
    const now = Date.now();
    if (cachedCategories && now < cachedCategoriesExpiry) {
      return sendSuccess(res, { categories: cachedCategories });
    }
    const categories = await dbService.getCategories();
    cachedCategories = categories;
    cachedCategoriesExpiry = now + CACHE_TTL_MS;
    return sendSuccess(res, { categories });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getParticipantsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const now = Date.now();
    const cached = cachedParticipantsByCategory.get(categoryId);
    if (cached && now < cached.expiry) {
      return sendSuccess(res, { participants: cached.data });
    }
    const participants = await dbService.getParticipants(categoryId);
    cachedParticipantsByCategory.set(categoryId, { data: participants, expiry: now + CACHE_TTL_MS });
    return sendSuccess(res, { participants });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getVoteStatus = async (req, res) => {
  try {
    const audienceId = req.user.id;
    const status = await getAudienceVotingStatus(audienceId, req);
    return sendSuccess(res, status);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const submitVote = async (req, res) => {
  try {
    const audienceId = req.user.id;
    const { participantId, categoryId } = req.body;

    const result = await castAudienceVote(audienceId, participantId, categoryId, req);
    if (!result.ok) {
      return sendError(res, result.error, result.status, result.code);
    }
    return sendSuccess(res, { vote: result.vote }, 'Vote recorded successfully and saved to database', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export default {
  getAudienceDashboard,
  getCategories,
  getParticipantsByCategory,
  getVoteStatus,
  submitVote
};
