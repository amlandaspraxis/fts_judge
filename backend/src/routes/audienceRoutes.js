import express from 'express';
import {
  getAudienceDashboard,
  getCategories,
  getParticipantsByCategory,
  getVoteStatus,
  submitVote
} from '../controllers/audienceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { validateAudienceVote } from '../validators/voteValidator.js';

const router = express.Router();

router.use(authMiddleware, requireRole('AUDIENCE'));

router.get('/dashboard', getAudienceDashboard);
router.get('/categories', getCategories);
router.get('/participants/:categoryId', getParticipantsByCategory);
router.get('/vote-status', getVoteStatus);
router.post('/votes', validate(validateAudienceVote), submitVote);
router.post('/vote', validate(validateAudienceVote), submitVote);

export default router;
