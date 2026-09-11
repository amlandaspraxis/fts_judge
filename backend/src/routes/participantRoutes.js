import express from 'express';
import {
  getParticipants,
  registerParticipant,
  updateParticipant,
  deleteParticipant,
  searchParticipants
} from '../controllers/participantController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { validateParticipantRegistration } from '../validators/participantValidator.js';

import dbService from '../config/dbService.js';
import { sendSuccess } from '../utils/response.js';

const router = express.Router();

// Help Desk and Admin have access to participant registration & search
router.use(authMiddleware, requireRole('ADMIN', 'HELP_DESK'));

router.get('/categories', async (req, res) => {
  try {
    const categories = await dbService.getCategories();
    return sendSuccess(res, { categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/', getParticipants);
router.get('/search', searchParticipants);
router.post('/register', validate(validateParticipantRegistration), registerParticipant);
router.put('/:id', updateParticipant);
router.delete('/:id', deleteParticipant);

export default router;
