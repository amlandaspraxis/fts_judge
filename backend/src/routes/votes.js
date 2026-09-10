import express from 'express';
import {
  sendOtp,
  verifyOtp,
  castVote,
  getParticipantVotes
} from '../controllers/votesController.js';
import { loginLimiter } from '../middleware/rateLimitMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/send-otp', loginLimiter, sendOtp);
router.post('/verify-otp', loginLimiter, verifyOtp);
router.post('/cast', authMiddleware, requireRole('AUDIENCE', 'ADMIN'), castVote);
router.get('/participant/:participantId', getParticipantVotes);

export default router;
