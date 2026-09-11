import dbService from '../config/dbService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAudit } from '../services/auditService.js';

export const getParticipants = async (req, res) => {
  try {
    const { categoryId, query } = req.query;
    let list = await dbService.getParticipants(categoryId || null);
    const categories = await dbService.getCategories();

    if (query) {
      const q = query.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.participantCode.toLowerCase().includes(q) ||
        (p.registrationNumber && p.registrationNumber.toLowerCase().includes(q))
      );
    }

    const enhancedList = list.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return {
        ...p,
        categoryName: cat?.name || 'Unassigned',
        categoryCode: cat?.code || cat?.prefix || ''
      };
    });

    return sendSuccess(res, { participants: enhancedList, count: enhancedList.length });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const registerParticipant = async (req, res) => {
  try {
    const { name, categoryId, registrationNumber, phoneNumber, routineTitle, act, participantCode } = req.body;

    const event = await dbService.getPrimaryEvent();
    const category = await dbService.getCategoryById(categoryId);
    if (!category) {
      return sendError(res, 'Selected category does not exist', 400, 'INVALID_CATEGORY');
    }

    // Must be manually provided by the Help Desk user
    if (!participantCode || !participantCode.trim()) {
      return sendError(res, 'Participant Code / Chest Number must be manually entered', 400, 'CHEST_NUMBER_REQUIRED');
    }

    const code = participantCode.trim().toUpperCase();

    // Validate uniqueness of participant_code within the event
    const duplicateCode = await dbService.findParticipantByCode(code, event.id);
    if (duplicateCode) {
      return sendError(
        res,
        `Participant Code / Chest Number "${code}" is already assigned to ${duplicateCode.name} (${duplicateCode.registrationNumber || 'No Reg No'})`,
        409,
        'DUPLICATE_CHEST_NUMBER'
      );
    }

    // Validate uniqueness of registration_number within the event
    const regNum = (registrationNumber || '').trim().toUpperCase();
    if (!regNum) {
      return sendError(res, 'Registration number is required', 400, 'REG_NUMBER_REQUIRED');
    }

    const duplicateReg = await dbService.findParticipantByRegNumber(regNum, event.id);
    if (duplicateReg) {
      return sendError(
        res,
        `Registration Number "${regNum}" is already registered for ${duplicateReg.name}`,
        409,
        'DUPLICATE_REGISTRATION_NUMBER'
      );
    }

    const routine = (routineTitle || act || '').trim();

    const participant = await dbService.createParticipant({
      eventId: event.id,
      categoryId,
      participantCode: code,
      registrationNumber: regNum,
      name: name.trim(),
      phoneNumber: (phoneNumber || '').trim(),
      routineTitle: routine,
      act: routine,
      status: 'ACTIVE'
    });

    await logAudit(
      req.user.id,
      'HELP_DESK_REGISTERED_PARTICIPANT',
      'Participant',
      participant.id,
      null,
      {
        name: participant.name,
        participantCode: participant.participantCode,
        registrationNumber: participant.registrationNumber,
        categoryName: category.name,
        categoryCode: category.code || category.prefix
      },
      req
    );

    return sendSuccess(res, {
      participant: {
        ...participant,
        categoryName: category.name,
        categoryCode: category.code || category.prefix
      }
    }, 'Participant registered successfully and saved to database', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await dbService.getParticipantById(id);
    if (!part) return sendError(res, 'Participant not found', 404);

    const old = { ...part };
    const updated = await dbService.updateParticipant(id, req.body);

    await logAudit(req.user.id, 'UPDATED_PARTICIPANT', 'Participant', part.id, old, updated, req);
    return sendSuccess(res, { participant: updated }, 'Participant updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const searchParticipants = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return sendSuccess(res, { participants: [] });

    const query = q.toLowerCase().trim();
    const all = await dbService.getParticipants();
    const categories = await dbService.getCategories();

    const matches = all.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.participantCode.toLowerCase().includes(query) ||
        (p.registrationNumber && p.registrationNumber.toLowerCase().includes(query)) ||
        (p.phoneNumber && p.phoneNumber.includes(query))
    );

    const enhanced = matches.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return {
        ...p,
        categoryName: cat?.name || 'Unassigned',
        categoryCode: cat?.code || cat?.prefix || ''
      };
    });

    return sendSuccess(res, { participants: enhanced, count: enhanced.length });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await dbService.getParticipantById(id);
    if (!part) return sendError(res, 'Participant not found', 404);

    await dbService.deleteParticipant(id);
    await logAudit(req.user.id, 'DELETED_PARTICIPANT', 'Participant', id, part, null, req);
    return sendSuccess(res, { id }, 'Participant deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

