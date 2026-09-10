import { memoryStore } from '../config/db.js';

export const getJudges = (req, res) => {
  const safeJudges = memoryStore.judges.map(({ id, name }) => ({ id, name }));
  res.json({ success: true, judges: safeJudges });
};

export const judgeLogin = (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: "Judge code is required" });
  }

  const judge = memoryStore.judges.find(j => j.code.toLowerCase() === code.trim().toLowerCase());
  if (!judge) {
    return res.status(401).json({ success: false, message: "Invalid judge access code" });
  }

  res.json({
    success: true,
    judge: { id: judge.id, name: judge.name }
  });
};

export const submitJudgeScores = (req, res) => {
  const { judgeId, participantId, marks } = req.body;
  if (!judgeId || !participantId || !marks) {
    return res.status(400).json({ success: false, message: "judgeId, participantId, and marks are required" });
  }

  const judge = memoryStore.judges.find(j => j.id === judgeId);
  if (!judge) {
    return res.status(404).json({ success: false, message: "Judge not found" });
  }

  if (!memoryStore.judgeScores[participantId]) {
    memoryStore.judgeScores[participantId] = {};
  }

  memoryStore.judgeScores[participantId][judgeId] = marks;

  res.json({
    success: true,
    message: "Score submitted successfully",
    scores: memoryStore.judgeScores[participantId]
  });
};

export const getParticipantJudgeScores = (req, res) => {
  const { participantId } = req.params;
  const scores = memoryStore.judgeScores[participantId] || {};
  res.json({ success: true, scores });
};
