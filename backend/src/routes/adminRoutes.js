import express from 'express';
import {
  getDashboard,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getJudges,
  createJudge,
  updateJudge,
  deleteJudge,
  assignJudge,
  getAudienceUsers,
  updateEventState,
  getAuditTrail
} from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/categories', authMiddleware, requireRole('ADMIN', 'HELP_DESK'), getCategories);

router.use(authMiddleware, requireRole('ADMIN'));

router.get('/dashboard', getDashboard);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/judges', getJudges);
router.post('/judges', createJudge);
router.put('/judges/:id', updateJudge);
router.delete('/judges/:id', deleteJudge);
router.post('/judge-assignments', assignJudge);

router.get('/audience', getAudienceUsers);

router.post('/event/state', updateEventState);
router.get('/audit-logs', getAuditTrail);

export default router;
