import express from 'express';
import {
  getParticipants,
  getRegistrations,
  registerParticipant,
  enrollParticipant
} from '../controllers/participantsController.js';

const router = express.Router();

router.get('/', getParticipants);
router.get('/registrations', getRegistrations);
router.post('/register', registerParticipant);
router.post('/enroll', enrollParticipant);

export default router;
