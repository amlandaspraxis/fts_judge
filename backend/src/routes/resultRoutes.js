import express from 'express';
import {
  getResults,
  lockResults,
  publishResults,
  exportResults,
  exportResultsCsv,
  exportVotesCsv
} from '../controllers/resultController.js';
import { authMiddleware, optionalAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Viewing results is allowed for Admin, or anyone if published
router.get('/', optionalAuth, getResults);

// Results locking and publishing is strictly Admin
router.post('/lock', authMiddleware, requireRole('ADMIN'), lockResults);
router.post('/publish', authMiddleware, requireRole('ADMIN'), publishResults);

// Export endpoints are strictly Admin
router.get('/export', authMiddleware, requireRole('ADMIN'), exportResults);
router.get('/export/csv', authMiddleware, requireRole('ADMIN'), exportResultsCsv);
router.get('/votes/csv', authMiddleware, requireRole('ADMIN'), exportVotesCsv);

export default router;
