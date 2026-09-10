import dbService from '../config/dbService.js';
import { logAudit } from './auditService.js';
import { extractClientIp } from '../utils/ipUtils.js';

// Granular per-participant lock map to allow parallel voting across participants
// while strictly serializing concurrent votes targeting the exact same performer.
const participantLocks = new Map();

function withParticipantLock(participantId, fn) {
  const key = String(participantId || 'default');
  const currentLock = participantLocks.get(key) || Promise.resolve();
  const next = currentLock.then(fn, fn);
  participantLocks.set(key, next.catch(() => {}));
  next.finally(() => {
    if (participantLocks.get(key) === next) {
      participantLocks.delete(key);
    }
  });
  return next;
}

/**
 * Cast an authoritative audience vote with multi-signal duplicate protection per participant:
 * 1. Account / User ID + participant
 * 2. Client Public IP address + participant
 * 3. Device / Browser Fingerprint + participant
 * 4. Phone number + participant
 * 5. Registration / Student ID + participant
 * 
 * Audience members can vote for each participant once under any category.
 */
export const castAudienceVote = async (audienceId, participantId, categoryId, req = null, options = {}) => {
  return withParticipantLock(participantId, async () => {
    const event = await dbService.getPrimaryEvent();
    if (!event || event.status !== 'VOTING_OPEN') {
      return { ok: false, status: 403, error: 'Audience voting is currently closed.', code: 'VOTING_CLOSED' };
    }

    // 1. Verify participant belongs to category
    const participant = await dbService.getParticipantById(participantId);
    if (!participant || (categoryId && participant.categoryId !== categoryId)) {
      return { ok: false, status: 404, error: 'Participant not found in this category.', code: 'PARTICIPANT_NOT_FOUND' };
    }

    const targetCategoryId = categoryId || participant.categoryId;

    // 2. Extract multi-signal identifiers
    const ipAddress = options.ipAddress || extractClientIp(req);
    const deviceFingerprint = options.deviceFingerprint || 
      req?.body?.deviceFingerprint || 
      req?.body?.deviceId || 
      req?.headers?.['x-device-id'] || 
      req?.headers?.['x-device-fingerprint'] || 
      null;

    const phone = options.phone || req?.user?.phone || req?.body?.phone || null;
    const regNo = options.regNo || req?.user?.studentId || req?.user?.regNo || req?.body?.regNo || null;

    // 3. Multi-signal check per participant: User, IP, Device, Phone, RegNo
    const existingVote = await dbService.findAudienceVoteByCriteria({
      audienceId,
      ipAddress,
      deviceFingerprint,
      phone,
      regNo,
      participantId,
      eventId: event.id
    });

    if (existingVote) {
      return {
        ok: false,
        status: 409,
        error: 'You have already voted for this participant. Each person is allowed to vote only once per participant.',
        code: 'ALREADY_VOTED'
      };
    }

    // 4. Atomically persist vote with all audit and security signals
    const vote = await dbService.createAudienceVote({
      audienceId,
      participantId,
      categoryId: targetCategoryId,
      eventId: event.id,
      ipAddress,
      deviceFingerprint,
      phone,
      regNo
    });

    // 5. Tamper-evident audit trail log
    await logAudit(
      audienceId, 
      'AUDIENCE_SUBMITTED_VOTE', 
      'AudienceVote', 
      vote.id, 
      null, 
      { participantId, categoryId: targetCategoryId, ipAddress, deviceFingerprint }, 
      req
    );

    return { ok: true, vote, status: 201 };
  });
};

/**
 * Retrieve voting status for an audience member, checking across their account,
 * their current public IP, and their device fingerprint per participant.
 */
export const getAudienceVotingStatus = async (audienceId, req = null) => {
  const event = await dbService.getPrimaryEvent();
  const allVotes = await dbService.getAudienceVotes();

  const ipAddress = extractClientIp(req);
  const deviceFingerprint = req?.headers?.['x-device-id'] || 
    req?.headers?.['x-device-fingerprint'] || 
    req?.query?.deviceId || 
    null;
  const phone = req?.user?.phone || null;
  const regNo = req?.user?.studentId || req?.user?.regNo || null;

  const votedParticipantIds = await dbService.getVotedParticipantIdsForClient({
    audienceId,
    ipAddress,
    deviceFingerprint,
    phone,
    regNo,
    eventId: event?.id
  });

  const votedCategoryIds = await dbService.getVotedCategoryIdsForClient({
    audienceId,
    ipAddress,
    deviceFingerprint,
    phone,
    regNo,
    eventId: event?.id
  });

  const userVotes = allVotes.filter(v => 
    (v.audienceId === audienceId || (ipAddress && v.ipAddress === ipAddress)) && 
    v.eventId === event?.id
  );

  return {
    votedParticipantIds,
    votedCategoryIds,
    votes: userVotes
  };
};

export const getCategoryVoteCounts = async (categoryId) => {
  const allVotes = await dbService.getAudienceVotes();
  const votesInCategory = allVotes.filter(v => v.categoryId === categoryId);
  const counts = {};
  for (const v of votesInCategory) {
    counts[v.participantId] = (counts[v.participantId] || 0) + 1;
  }
  return {
    totalVotes: votesInCategory.length,
    counts
  };
};

export default {
  castAudienceVote,
  getAudienceVotingStatus,
  getCategoryVoteCounts
};
