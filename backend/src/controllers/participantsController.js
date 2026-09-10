import { memoryStore } from '../config/db.js';

export const getParticipants = (req, res) => {
  const { categoryId } = req.query;
  let list = memoryStore.participants;
  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId);
  }
  res.json({ success: true, count: list.length, participants: list });
};

export const getRegistrations = (req, res) => {
  res.json({ success: true, count: memoryStore.registrations.length, registrations: memoryStore.registrations });
};

export const registerParticipant = (req, res) => {
  const { name, categoryId, codeNumber } = req.body;
  if (!name || !categoryId || !codeNumber) {
    return res.status(400).json({ success: false, message: "name, categoryId, and codeNumber are required" });
  }

  const category = memoryStore.categories.find(c => c.id === categoryId);
  const prefix = category?.prefix || "GEN";
  const code = `${prefix}${codeNumber}`.toUpperCase();

  const duplicate = memoryStore.registrations.find(r => r.code === code);
  if (duplicate) {
    return res.status(409).json({ success: false, message: `Code ${code} is already issued to ${duplicate.name}` });
  }

  const registration = {
    id: `reg_${Date.now()}`,
    name: name.trim(),
    categoryId,
    code,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  memoryStore.registrations.unshift(registration);
  res.status(201).json({ success: true, registration });
};

export const enrollParticipant = (req, res) => {
  const { code, act, photo } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: "Code is required" });
  }

  const cleanCode = code.trim().toUpperCase();
  const reg = memoryStore.registrations.find(r => r.code === cleanCode);

  if (!reg) {
    return res.status(404).json({ success: false, message: `Code ${cleanCode} not found in registration desk.` });
  }

  reg.status = 'enrolled';

  let participant = memoryStore.participants.find(p => p.code === cleanCode);
  if (participant) {
    participant.act = act || participant.act;
    if (photo) participant.photo = photo;
  } else {
    participant = {
      id: `p_${Date.now()}`,
      name: reg.name,
      code: reg.code,
      act: act || "General Performance",
      categoryId: reg.categoryId,
      photo: photo || null,
      enrolledAt: new Date().toISOString()
    };
    memoryStore.participants.push(participant);
  }

  res.json({ success: true, participant });
};
