import express from 'express';
import {
  getJudgeDashboard,
  getAssignedCategories,
  getParticipantsForJudge,
  getMyScores,
  submitScore,
  updateScore,
  getHistoryForScore
} from '../controllers/judgeController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { validateJudgeScore } from '../validators/scoreValidator.js';

const router = express.Router();

router.use(authMiddleware, requireRole('JUDGE'));

router.get('/dashboard', getJudgeDashboard);
router.get('/categories', getAssignedCategories);
router.get('/participants', getParticipantsForJudge);
router.get('/scores', getMyScores);

router.post('/scores', validate(validateJudgeScore), submitScore);
router.post('/score', validate(validateJudgeScore), submitScore);
router.put('/scores/:id', updateScore);
router.put('/score/:id', updateScore);
router.get('/scores/:id/history', getHistoryForScore);
router.get('/score/:id/history', getHistoryForScore);

export default router;
