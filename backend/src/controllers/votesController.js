import { memoryStore } from '../config/db.js';
import { otpService } from '../services/otpService.js';

export const sendOtp = (req, res) => {
  const { studentId, phone } = req.body;
  if (!studentId || !phone || phone.trim().length < 10) {
    return res.status(400).json({ success: false, message: "Valid studentId and 10-digit phone required" });
  }

  otpService.createOtp(studentId);

  res.json({
    success: true,
    message: "OTP sent successfully"
  });
};

export const verifyOtp = (req, res) => {
  const { studentId, otp } = req.body;
  if (!studentId || !otp) {
    return res.status(400).json({ success: false, message: "studentId and otp are required" });
  }

  const result = otpService.verifyOtp(studentId, otp);
  if (result.valid) {
    res.json({ success: true, message: "Verification successful" });
  } else {
    res.status(result.status || 401).json({ success: false, message: result.message, code: result.code });
  }
};

import { extractClientIp } from '../utils/ipUtils.js';

export const castVote = async (req, res) => {
  const { participantId, studentId, score } = req.body;
  if (!participantId || !studentId || score === undefined) {
    return res.status(400).json({ success: false, message: "participantId, studentId, and score are required" });
  }

  if (!memoryStore.event.votingOpen) {
    return res.status(403).json({ success: false, message: "Voting is currently closed for this performance" });
  }

  const numericScore = Number(score);
  if (isNaN(numericScore) || numericScore < 1 || numericScore > 10) {
    return res.status(400).json({ success: false, message: "Score must be an integer between 1 and 10" });
  }

  const clientIp = extractClientIp(req);
  const deviceId = req.body.deviceId || req.body.deviceFingerprint || req.headers['x-device-id'] || null;

  // Locate participant to determine category
  const participant = (memoryStore.participants || []).find(p => p.id === participantId);
  const categoryId = req.body.categoryId || participant?.categoryId || 'general';

  // Initialize tracking stores per participant
  if (!memoryStore.participantVotes) {
    memoryStore.participantVotes = {};
  }
  if (!memoryStore.participantVotes[participantId]) {
    memoryStore.participantVotes[participantId] = {
      users: new Set(),
      ips: new Set(),
      devices: new Set()
    };
  }

  const partRecord = memoryStore.participantVotes[participantId];

  // 1. Check if user/studentId already voted for this participant
  if (partRecord.users.has(studentId) || (req.user?.id && partRecord.users.has(req.user.id))) {
    return res.status(409).json({
      success: false,
      code: 'ALREADY_VOTED',
      message: "You have already voted for this participant. Each person is allowed to vote only once per participant."
    });
  }

  // 2. Check if IP already voted for this participant
  if (clientIp && partRecord.ips.has(clientIp)) {
    return res.status(409).json({
      success: false,
      code: 'ALREADY_VOTED',
      message: "You have already voted for this participant. Each person is allowed to vote only once per participant."
    });
  }

  // 3. Check if device already voted for this participant
  if (deviceId && partRecord.devices.has(deviceId)) {
    return res.status(409).json({
      success: false,
      code: 'ALREADY_VOTED',
      message: "You have already voted for this participant. Each person is allowed to vote only once per participant."
    });
  }

  if (!memoryStore.audienceVotes[participantId]) {
    memoryStore.audienceVotes[participantId] = {};
  }

  if (memoryStore.audienceVotes[participantId][studentId] !== undefined) {
    return res.status(409).json({
      success: false,
      code: 'ALREADY_VOTED',
      message: "You have already voted for this participant. Each person is allowed to vote only once per participant."
    });
  }

  // Record vote
  memoryStore.audienceVotes[participantId][studentId] = numericScore;
  partRecord.users.add(studentId);
  if (req.user?.id) partRecord.users.add(req.user.id);
  if (clientIp) partRecord.ips.add(clientIp);
  if (deviceId) partRecord.devices.add(deviceId);

  const allScores = Object.values(memoryStore.audienceVotes[participantId]);
  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  res.json({
    success: true,
    message: "Vote recorded successfully",
    voteCount: allScores.length,
    average: Number(avg.toFixed(2))
  });
};

export const getParticipantVotes = (req, res) => {
  const { participantId } = req.params;
  const votes = memoryStore.audienceVotes[participantId] || {};
  const allScores = Object.values(votes);
  const avg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

  res.json({
    success: true,
    count: allScores.length,
    average: avg ? Number(avg.toFixed(2)) : null,
    votes
  });
};
