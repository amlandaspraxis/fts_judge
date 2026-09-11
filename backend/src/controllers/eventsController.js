import { memoryStore } from '../config/db.js';
import dbService from '../config/dbService.js';

export const getEventStatus = (req, res) => {
  try {
    const currentPart = memoryStore.participants.find(p => p.id === memoryStore.event.currentParticipantId) || null;
    res.json({
      success: true,
      event: memoryStore.event,
      categories: memoryStore.categories,
      criteria: memoryStore.criteria,
      currentParticipant: currentPart
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPin = (req, res) => {
  const { pin } = req.body;
  if (pin === memoryStore.event.pin) {
    res.json({ success: true, message: "PIN verified" });
  } else {
    res.status(401).json({ success: false, message: "Invalid Event PIN" });
  }
};

export const updateEventControls = (req, res) => {
  const { currentParticipantId, votingOpen, revealAudience, revealJudges, revealFinal } = req.body;
  if (currentParticipantId !== undefined) memoryStore.event.currentParticipantId = currentParticipantId;
  if (votingOpen !== undefined) {
    memoryStore.event.votingOpen = Boolean(votingOpen);
    const status = votingOpen ? 'VOTING_OPEN' : 'JUDGING_OPEN';
    dbService.updateEventState(status).catch(e => console.warn('[EventsController] Supabase event state sync notice:', e.message));
  }
  if (revealAudience !== undefined) memoryStore.event.revealAudience = Boolean(revealAudience);
  if (revealJudges !== undefined) memoryStore.event.revealJudges = Boolean(revealJudges);
  if (revealFinal !== undefined) memoryStore.event.revealFinal = Boolean(revealFinal);

  res.json({
    success: true,
    event: memoryStore.event
  });
};
