import express from 'express';
import {
  getJudges,
  judgeLogin,
  submitJudgeScores,
  getParticipantJudgeScores
} from '../controllers/judgesController.js';
import { loginLimiter } from '../middleware/rateLimitMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', getJudges);
router.post('/login', loginLimiter, judgeLogin);
router.post('/scores', authMiddleware, requireRole('JUDGE', 'ADMIN'), submitJudgeScores);
router.get('/scores/:participantId', authMiddleware, requireRole('JUDGE', 'ADMIN'), getParticipantJudgeScores);

export default router;
