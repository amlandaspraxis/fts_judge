import express from 'express';
import { getEventStatus, verifyPin, updateEventControls } from '../controllers/eventsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { loginLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.get('/status', getEventStatus);
router.post('/verify-pin', loginLimiter, verifyPin);
router.patch('/controls', authMiddleware, requireRole('ADMIN'), updateEventControls);

export default router;
