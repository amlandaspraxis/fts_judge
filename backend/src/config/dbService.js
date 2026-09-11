import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const defaultStudentPasswordHash = bcrypt.hashSync('password123', 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl && process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/postgres\.([a-z0-9]+):/i);
  if (match && match[1]) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export let supabaseTablesReady = isSupabaseConfigured;
export const useSupabase = () => isSupabaseConfigured && Boolean(supabase) && supabaseTablesReady;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

if (isSupabaseConfigured) {
  console.log(`✅ [Database] Supabase client successfully initialized (${supabaseUrl}).`);
} else {
  console.log('ℹ️  [Database] Supabase credentials not provided in .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Running with persistent in-memory database adapter.');
  if (supabaseUrl && !supabaseKey) {
    console.warn(`⚠️  [Database] Supabase project detected (${supabaseUrl}), but SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is missing in backend/.env.`);
  }
}

import { db as memoryDb } from './database.js';


// Auto-seed Supabase on startup if configured and empty
async function initSupabaseSeed() {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: existingUsers, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.warn('ℹ️  [Database] Supabase schema not yet migrated (' + (error.message || error.code) + '). Using high-performance in-memory database adapter.');
      supabaseTablesReady = false;
      return;
    }
    supabaseTablesReady = true;
    if (!existingUsers || existingUsers.length === 0) {
      console.log('🌱 [Database] Seeding initial data into Supabase tables...');
      
      // Seed event
      await supabase.from('events').upsert({
        id: 'evt_fts_2026',
        name: 'Freshmen Talent Search 2026',
        status: 'SETUP',
        pin: '4821',
        judge_weight: 0.85,
        audience_weight: 0.15
      });

      // Seed users with encrypted passwords
      await supabase.from('users').upsert(
        memoryDb.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: u.passwordHash,
          role: u.role,
          status: u.status
        }))
      );

      // Seed categories
      await supabase.from('categories').upsert(
        memoryDb.categories.map(c => ({
          id: c.id,
          event_id: c.eventId,
          name: c.name,
          code: c.code,
          prefix: c.prefix,
          description: c.description,
          status: c.status
        }))
      );

      // Seed judge assignments
      await supabase.from('judge_assignments').upsert(
        memoryDb.judgeAssignments.map(j => ({
          id: j.id,
          judge_id: j.judgeId,
          category_id: j.categoryId,
          event_id: j.eventId
        }))
      );

      // Seed initial participants
      if (memoryDb.participants && memoryDb.participants.length > 0) {
        await supabase.from('participants').upsert(
          memoryDb.participants.map(p => ({
            id: p.id,
            event_id: p.eventId || 'evt_fts_2026',
            category_id: p.categoryId,
            participant_code: p.participantCode || p.code,
            registration_number: p.registrationNumber || p.regNo || p.id,
            name: p.name,
            phone_number: p.phoneNumber || p.phone || '0000000000',
            routine_title: p.routineTitle || p.act || 'Performance',
            act: p.act || p.routineTitle || 'Performance',
            status: p.status || 'ACTIVE'
          }))
        );
      }

      console.log('✅ [Database] Supabase initial seed completed successfully.');
    } else {
      // Ensure participants (like p1) are synced if users existed but participants table is missing rows
      const { data: existingParts } = await supabase.from('participants').select('id').limit(1);
      if (!existingParts || existingParts.length === 0) {
        if (memoryDb.participants && memoryDb.participants.length > 0) {
          await supabase.from('participants').upsert(
            memoryDb.participants.map(p => ({
              id: p.id,
              event_id: p.eventId || 'evt_fts_2026',
              category_id: p.categoryId,
              participant_code: p.participantCode || p.code,
              registration_number: p.registrationNumber || p.regNo || p.id,
              name: p.name,
              phone_number: p.phoneNumber || p.phone || '0000000000',
              routine_title: p.routineTitle || p.act || 'Performance',
              act: p.act || p.routineTitle || 'Performance',
              status: p.status || 'ACTIVE'
            }))
          );
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [Database] Seed check notice:', err.message);
  }
}

// Kick off async initialization check
initSupabaseSeed();

// ----------------------------------------------------------------------------
// HIGH-CONCURRENCY IN-MEMORY INDEXES (4,000+ Concurrent Audience Scale)
// ----------------------------------------------------------------------------
const audienceVoteIndex = {
  // Key: `${eventId}:${participantId}` -> { audienceIds: Map, ips: Map, devices: Map, phones: Map, regNos: Map }
  participants: new Map(),
  byAudienceId: new Map(), // audienceId -> Set<participantId>
  byIp: new Map(),         // ipAddress -> Set<participantId>
  byDevice: new Map(),     // deviceFingerprint -> Set<participantId>
  byPhone: new Map(),      // phone -> Set<participantId>
  byRegNo: new Map(),      // regNo -> Set<participantId>
};

function indexAudienceVote(vote) {
  if (!vote || !vote.participantId) return;
  const eventId = vote.eventId || 'evt_fts_2026';
  const partKey = `${eventId}:${vote.participantId}`;

  if (!audienceVoteIndex.participants.has(partKey)) {
    audienceVoteIndex.participants.set(partKey, {
      audienceIds: new Map(),
      ips: new Map(),
      devices: new Map(),
      phones: new Map(),
      regNos: new Map()
    });
  }

  const partIdx = audienceVoteIndex.participants.get(partKey);
  if (vote.audienceId) partIdx.audienceIds.set(vote.audienceId, vote);
  if (vote.ipAddress) partIdx.ips.set(vote.ipAddress, vote);
  if (vote.deviceFingerprint) partIdx.devices.set(vote.deviceFingerprint, vote);
  if (vote.phone) partIdx.phones.set(vote.phone, vote);
  if (vote.regNo) partIdx.regNos.set(vote.regNo.toUpperCase(), vote);

  const addLookup = (map, key, val) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(val);
  };

  addLookup(audienceVoteIndex.byAudienceId, vote.audienceId, vote.participantId);
  addLookup(audienceVoteIndex.byIp, vote.ipAddress, vote.participantId);
  addLookup(audienceVoteIndex.byDevice, vote.deviceFingerprint, vote.participantId);
  addLookup(audienceVoteIndex.byPhone, vote.phone, vote.participantId);
  if (vote.regNo) addLookup(audienceVoteIndex.byRegNo, vote.regNo.toUpperCase(), vote.participantId);
}

// Synchronize initial memory store votes if any
if (Array.isArray(memoryDb.audienceVotes)) {
  memoryDb.audienceVotes.forEach(indexAudienceVote);
}

// ----------------------------------------------------------------------------
// DB SERVICE METHODS (Unified Async Layer for Supabase & In-Memory)
// ----------------------------------------------------------------------------

export const dbService = {
  // --- USERS ---
  async findUserByEmail(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          passwordHash: data.password_hash,
          role: data.role,
          status: data.status,
          createdAt: data.created_at
        };
      }
      return null;
    }
    return memoryDb.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
  },

  async findUserById(id) {
    if (useSupabase()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            passwordHash: data.password_hash,
            role: data.role,
            status: data.status,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        // Fall back to memoryDb
      }
    }
    return memoryDb.users.find(u => u.id === id) || null;
  },

  async getUsers(role = null) {
    if (useSupabase()) {
      let query = supabase.from('users').select('*');
      if (role) query = query.eq('role', role);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.password_hash,
        role: u.role,
        status: u.status,
        createdAt: u.created_at
      }));
    }
    let list = memoryDb.users;
    if (role) list = list.filter(u => u.role === role);
    return [...list];
  },

  async createUser(userData) {
    const id = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash || defaultStudentPasswordHash,
      role: userData.role,
      status: userData.status || 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    if (useSupabase()) {
      const { error } = await supabase.from('users').upsert({
        id: record.id,
        name: record.name,
        email: record.email,
        password_hash: record.passwordHash,
        role: record.role,
        status: record.status
      }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      return record;
    }

    memoryDb.users.push(record);
    return record;
  },

  async updateUser(id, updates) {
    if (useSupabase()) {
      const payload = { updated_at: new Date().toISOString() };
      if (updates.name) payload.name = updates.name.trim();
      if (updates.email) payload.email = updates.email.trim().toLowerCase();
      if (updates.passwordHash) payload.password_hash = updates.passwordHash;
      if (updates.status) payload.status = updates.status;
      if (updates.role) payload.role = updates.role;

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    const u = memoryDb.users.find(user => user.id === id);
    if (!u) return null;
    if (updates.name) u.name = updates.name.trim();
    if (updates.email) u.email = updates.email.trim().toLowerCase();
    if (updates.passwordHash) u.passwordHash = updates.passwordHash;
    if (updates.status) u.status = updates.status;
    return u;
  },

  async deleteUser(id) {
    if (useSupabase()) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
    const idx = memoryDb.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      memoryDb.users.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deleteJudgeAssignment(judgeId, categoryId = null) {
    if (useSupabase()) {
      let query = supabase.from('judge_assignments').delete().eq('judge_id', judgeId);
      if (categoryId) query = query.eq('category_id', categoryId);
      const { error } = await query;
      if (error) throw new Error(error.message);
      return true;
    }
    if (memoryDb.judgeAssignments) {
      memoryDb.judgeAssignments = memoryDb.judgeAssignments.filter(
        ja => ja.judgeId !== judgeId || (categoryId && ja.categoryId !== categoryId)
      );
    }
    return true;
  },

  // --- EVENTS ---
  async getPrimaryEvent() {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          status: data.status,
          pin: data.pin,
          judgeWeight: Number(data.judge_weight),
          audienceWeight: Number(data.audience_weight),
          judgingOpenAt: data.judging_open_at,
          judgingCloseAt: data.judging_close_at,
          votingOpenAt: data.voting_open_at,
          votingCloseAt: data.voting_close_at,
          resultsLocked: Boolean(data.results_locked),
          createdAt: data.created_at
        };
      }
    }
    return memoryDb.events[0];
  },

  async updateEventState(status, additionalUpdates = {}) {
    if (useSupabase()) {
      const event = await this.getPrimaryEvent();
      const payload = {
        status,
        updated_at: new Date().toISOString()
      };
      if (additionalUpdates.judgingOpenAt) payload.judging_open_at = additionalUpdates.judgingOpenAt;
      if (additionalUpdates.judgingCloseAt) payload.judging_close_at = additionalUpdates.judgingCloseAt;
      if (additionalUpdates.votingOpenAt) payload.voting_open_at = additionalUpdates.votingOpenAt;
      if (additionalUpdates.votingCloseAt) payload.voting_close_at = additionalUpdates.votingCloseAt;
      if (additionalUpdates.resultsLocked !== undefined) payload.results_locked = additionalUpdates.resultsLocked;
      if (additionalUpdates.judgeWeight !== undefined) payload.judge_weight = additionalUpdates.judgeWeight;
      if (additionalUpdates.audienceWeight !== undefined) payload.audience_weight = additionalUpdates.audienceWeight;

      const { data, error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', event.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        ...event,
        ...payload
      };
    }

    const event = memoryDb.events[0];
    event.status = status;
    Object.assign(event, additionalUpdates);
    return event;
  },

  // --- CATEGORIES ---
  async getCategories() {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data || []).map(c => ({
        id: c.id,
        eventId: c.event_id,
        name: c.name,
        code: c.code,
        prefix: c.prefix,
        description: c.description,
        status: c.status,
        createdAt: c.created_at
      }));
    }
    return [...memoryDb.categories];
  },

  async getCategoryById(id) {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          eventId: data.event_id,
          name: data.name,
          code: data.code,
          prefix: data.prefix,
          description: data.description,
          status: data.status
        };
      }
      return null;
    }
    return memoryDb.categories.find(c => c.id === id) || null;
  },

  async createCategory(catData) {
    const id = catData.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const category = {
      id,
      eventId: catData.eventId || 'evt_fts_2026',
      name: catData.name.trim(),
      code: catData.code.trim().toUpperCase(),
      prefix: (catData.prefix || catData.code).trim().toUpperCase(),
      description: catData.description || '',
      status: catData.status || 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    if (useSupabase()) {
      const { error } = await supabase.from('categories').insert({
        id: category.id,
        event_id: category.eventId,
        name: category.name,
        code: category.code,
        prefix: category.prefix,
        description: category.description,
        status: category.status
      });
      if (error) throw new Error(error.message);
      return category;
    }

    memoryDb.categories.push(category);
    return category;
  },

  async updateCategory(id, updates) {
    if (useSupabase()) {
      const payload = {};
      if (updates.name) payload.name = updates.name.trim();
      if (updates.code) payload.code = updates.code.trim().toUpperCase();
      if (updates.prefix) payload.prefix = updates.prefix.trim().toUpperCase();
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status) payload.status = updates.status;
      payload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        eventId: data.event_id,
        name: data.name,
        code: data.code,
        prefix: data.prefix,
        description: data.description,
        status: data.status
      };
    }

    const cat = memoryDb.categories.find(c => c.id === id);
    if (!cat) return null;
    if (updates.name) cat.name = updates.name.trim();
    if (updates.code) cat.code = updates.code.trim().toUpperCase();
    if (updates.prefix) cat.prefix = updates.prefix.trim().toUpperCase();
    if (updates.description !== undefined) cat.description = updates.description;
    if (updates.status) cat.status = updates.status;
    return cat;
  },

  async deleteCategory(id) {
    if (useSupabase()) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }
    const idx = memoryDb.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      memoryDb.categories.splice(idx, 1);
      return true;
    }
    return false;
  },

  // --- PARTICIPANTS ---
  async getParticipants(categoryId = null) {
    if (useSupabase()) {
      let query = supabase.from('participants').select('*').order('created_at', { ascending: true });
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []).map(p => ({
        id: p.id,
        eventId: p.event_id,
        categoryId: p.category_id,
        participantCode: p.participant_code,
        registrationNumber: p.registration_number,
        name: p.name,
        phoneNumber: p.phone_number,
        routineTitle: p.routine_title,
        act: p.act,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    }
    let list = memoryDb.participants;
    if (categoryId) list = list.filter(p => p.categoryId === categoryId);
    return [...list];
  },

  async getParticipantById(id) {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          eventId: data.event_id,
          categoryId: data.category_id,
          participantCode: data.participant_code,
          registrationNumber: data.registration_number,
          name: data.name,
          phoneNumber: data.phone_number,
          routineTitle: data.routine_title,
          act: data.act,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
      return null;
    }
    return memoryDb.participants.find(p => p.id === id) || null;
  },

  async findParticipantByCode(code, eventId = 'evt_fts_2026') {
    const cleanCode = code.trim().toUpperCase();
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('participant_code', cleanCode)
        .limit(1);
      if (!error && data && data.length > 0) {
        return data[0];
      }
      return null;
    }
    return memoryDb.participants.find(p => p.participantCode.toUpperCase() === cleanCode) || null;
  },

  async findParticipantByRegNumber(regNumber, eventId = 'evt_fts_2026') {
    const cleanReg = regNumber.trim().toUpperCase();
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('registration_number', cleanReg)
        .limit(1);
      if (!error && data && data.length > 0) {
        return data[0];
      }
      return null;
    }
    return memoryDb.participants.find(p => p.registrationNumber && p.registrationNumber.toUpperCase() === cleanReg) || null;
  },

  async createParticipant(partData) {
    const id = partData.id || `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const routine = (partData.routineTitle || partData.act || '').trim();
    const participant = {
      id,
      eventId: partData.eventId || 'evt_fts_2026',
      categoryId: partData.categoryId,
      participantCode: partData.participantCode.trim().toUpperCase(),
      registrationNumber: partData.registrationNumber.trim().toUpperCase(),
      name: partData.name.trim(),
      phoneNumber: (partData.phoneNumber || '').trim(),
      routineTitle: routine,
      act: routine,
      status: partData.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (useSupabase()) {
      const { error } = await supabase.from('participants').insert({
        id: participant.id,
        event_id: participant.eventId,
        category_id: participant.categoryId,
        participant_code: participant.participantCode,
        registration_number: participant.registrationNumber,
        name: participant.name,
        phone_number: participant.phoneNumber,
        routine_title: participant.routineTitle,
        act: participant.act,
        status: participant.status
      });
      if (error) throw new Error(error.message);
      return participant;
    }

    memoryDb.participants.push(participant);
    return participant;
  },

  async updateParticipant(id, updates) {
    if (useSupabase()) {
      const payload = { updated_at: new Date().toISOString() };
      if (updates.name) payload.name = updates.name.trim();
      if (updates.phoneNumber) payload.phone_number = updates.phoneNumber.trim();
      if (updates.routineTitle || updates.act) {
        payload.routine_title = (updates.routineTitle || updates.act).trim();
        payload.act = payload.routine_title;
      }
      if (updates.status) payload.status = updates.status;

      const { data, error } = await supabase
        .from('participants')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        eventId: data.event_id,
        categoryId: data.category_id,
        participantCode: data.participant_code,
        registrationNumber: data.registration_number,
        name: data.name,
        phoneNumber: data.phone_number,
        routineTitle: data.routine_title,
        act: data.act,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    const part = memoryDb.participants.find(p => p.id === id);
    if (!part) return null;
    if (updates.name) part.name = updates.name.trim();
    if (updates.phoneNumber) part.phoneNumber = updates.phoneNumber.trim();
    if (updates.routineTitle || updates.act) {
      part.routineTitle = (updates.routineTitle || updates.act).trim();
      part.act = part.routineTitle;
    }
    if (updates.status) part.status = updates.status;
    part.updatedAt = new Date().toISOString();
    return part;
  },

  async deleteParticipant(id) {
    if (useSupabase()) {
      const { error } = await supabase.from('participants').delete().eq('id', id);
      if (error) throw new Error(error.message);
      const memIdx = memoryDb.participants.findIndex(p => p.id === id);
      if (memIdx !== -1) memoryDb.participants.splice(memIdx, 1);
      return true;
    }
    const idx = memoryDb.participants.findIndex(p => p.id === id);
    if (idx !== -1) {
      memoryDb.participants.splice(idx, 1);
      return true;
    }
    return false;
  },

  // --- JUDGE ASSIGNMENTS ---
  async getJudgeAssignments() {
    if (useSupabase()) {
      const { data, error } = await supabase.from('judge_assignments').select('*');
      if (error) throw new Error(error.message);
      return (data || []).map(ja => ({
        id: ja.id,
        judgeId: ja.judge_id,
        categoryId: ja.category_id,
        eventId: ja.event_id,
        createdAt: ja.created_at
      }));
    }
    return [...memoryDb.judgeAssignments];
  },

  async createJudgeAssignment(assignmentData) {
    const id = assignmentData.id || `ja_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assignment = {
      id,
      judgeId: assignmentData.judgeId,
      categoryId: assignmentData.categoryId,
      eventId: assignmentData.eventId || 'evt_fts_2026',
      createdAt: new Date().toISOString()
    };

    if (useSupabase()) {
      const { error } = await supabase.from('judge_assignments').insert({
        id: assignment.id,
        judge_id: assignment.judgeId,
        category_id: assignment.categoryId,
        event_id: assignment.eventId
      });
      if (error) throw new Error(error.message);
      return assignment;
    }

    memoryDb.judgeAssignments.push(assignment);
    return assignment;
  },

  // --- JUDGE SCORES ---
  async getJudgeScores() {
    if (useSupabase()) {
      const { data, error } = await supabase.from('judge_scores').select('*');
      if (error) throw new Error(error.message);
      return (data || []).map(s => ({
        id: s.id,
        judgeId: s.judge_id,
        participantId: s.participant_id,
        categoryId: s.category_id,
        score: Number(s.score),
        revisionCount: s.revision_count,
        locked: Boolean(s.locked),
        submittedAt: s.submitted_at,
        updatedAt: s.updated_at
      }));
    }
    return [...memoryDb.judgeScores];
  },

  async findJudgeScore(judgeId, participantId) {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('judge_scores')
        .select('*')
        .eq('judge_id', judgeId)
        .eq('participant_id', participantId)
        .maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          judgeId: data.judge_id,
          participantId: data.participant_id,
          categoryId: data.category_id,
          score: Number(data.score),
          revisionCount: data.revision_count,
          locked: Boolean(data.locked),
          submittedAt: data.submitted_at,
          updatedAt: data.updated_at
        };
      }
      return null;
    }
    return memoryDb.judgeScores.find(s => s.judgeId === judgeId && s.participantId === participantId) || null;
  },

  async createJudgeScore(scoreData) {
    const id = scoreData.id || `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const scoreRecord = {
      id,
      judgeId: scoreData.judgeId,
      participantId: scoreData.participantId,
      categoryId: scoreData.categoryId,
      score: Number(scoreData.score),
      revisionCount: 0,
      locked: false,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (useSupabase()) {
      const { error } = await supabase.from('judge_scores').upsert({
        id: scoreRecord.id,
        judge_id: scoreRecord.judgeId,
        participant_id: scoreRecord.participantId,
        category_id: scoreRecord.categoryId,
        score: scoreRecord.score,
        revision_count: 0,
        locked: false
      }, { onConflict: 'judge_id,participant_id' });
      if (error) throw new Error(error.message);
      return scoreRecord;
    }

    memoryDb.judgeScores.push(scoreRecord);
    return scoreRecord;
  },

  async updateJudgeScore(id, updates) {
    if (useSupabase()) {
      const payload = {
        updated_at: new Date().toISOString()
      };
      if (updates.score !== undefined) payload.score = Number(updates.score);
      if (updates.revisionCount !== undefined) payload.revision_count = updates.revisionCount;
      if (updates.locked !== undefined) payload.locked = updates.locked;

      const { data, error } = await supabase
        .from('judge_scores')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        judgeId: data.judge_id,
        participantId: data.participant_id,
        categoryId: data.category_id,
        score: Number(data.score),
        revisionCount: data.revision_count,
        locked: Boolean(data.locked),
        submittedAt: data.submitted_at,
        updatedAt: data.updated_at
      };
    }

    const s = memoryDb.judgeScores.find(item => item.id === id);
    if (!s) return null;
    if (updates.score !== undefined) s.score = Number(updates.score);
    if (updates.revisionCount !== undefined) s.revisionCount = updates.revisionCount;
    if (updates.locked !== undefined) s.locked = updates.locked;
    s.updatedAt = new Date().toISOString();
    return s;
  },

  // --- SCORE HISTORY ---
  async createScoreHistory(historyData) {
    const id = historyData.id || `sh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const entry = {
      id,
      scoreId: historyData.scoreId,
      oldScore: Number(historyData.oldScore),
      newScore: Number(historyData.newScore),
      changedBy: historyData.changedBy,
      reason: historyData.reason || 'Score revised',
      changedAt: new Date().toISOString()
    };

    if (useSupabase()) {
      const { error } = await supabase.from('score_history').insert({
        id: entry.id,
        score_id: entry.scoreId,
        old_score: entry.oldScore,
        new_score: entry.newScore,
        changed_by: entry.changedBy,
        reason: entry.reason
      });
      if (error) throw new Error(error.message);
      return entry;
    }

    memoryDb.scoreHistory.push(entry);
    return entry;
  },

  async getScoreHistory(scoreId) {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('score_history')
        .select('*')
        .eq('score_id', scoreId)
        .order('changed_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(h => ({
        id: h.id,
        scoreId: h.score_id,
        oldScore: Number(h.old_score),
        newScore: Number(h.new_score),
        changedBy: h.changed_by,
        reason: h.reason,
        changedAt: h.changed_at
      }));
    }
    return memoryDb.scoreHistory.filter(h => h.scoreId === scoreId);
  },

  // --- AUDIENCE VOTES ---
  async getAudienceVotes() {
    if (useSupabase()) {
      const { data, error } = await supabase.from('audience_votes').select('*');
      if (error) throw new Error(error.message);
      return (data || []).map(v => ({
        id: v.id,
        audienceId: v.audience_id,
        participantId: v.participant_id,
        categoryId: v.category_id,
        eventId: v.event_id,
        ipAddress: v.ip_address || '127.0.0.1',
        deviceFingerprint: v.device_fingerprint || null,
        phone: v.phone || null,
        regNo: v.reg_no || null,
        submittedAt: v.submitted_at
      }));
    }
    return [...memoryDb.audienceVotes];
  },

  async findAudienceVote(audienceId, participantId, eventId = 'evt_fts_2026') {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('audience_votes')
        .select('*')
        .eq('audience_id', audienceId)
        .eq('participant_id', participantId)
        .eq('event_id', eventId)
        .maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          audienceId: data.audience_id,
          participantId: data.participant_id,
          categoryId: data.category_id,
          eventId: data.event_id,
          ipAddress: data.ip_address || '127.0.0.1',
          deviceFingerprint: data.device_fingerprint || null,
          phone: data.phone || null,
          regNo: data.reg_no || null,
          submittedAt: data.submitted_at
        };
      }
      return null;
    }
    return memoryDb.audienceVotes.find(
      v => v.audienceId === audienceId && (v.participantId === participantId || v.categoryId === participantId) && v.eventId === eventId
    ) || null;
  },

  async findAudienceVoteByCriteria({ audienceId, ipAddress, deviceFingerprint, phone, regNo, participantId, eventId = 'evt_fts_2026' }) {
    // 1. O(1) in-memory index lookup for sub-millisecond response times under heavy load
    const partKey = `${eventId || 'evt_fts_2026'}:${participantId}`;
    const partIdx = audienceVoteIndex.participants.get(partKey);

    if (partIdx) {
      if (audienceId && partIdx.audienceIds.has(audienceId)) return partIdx.audienceIds.get(audienceId);
      if (ipAddress && partIdx.ips.has(ipAddress)) return partIdx.ips.get(ipAddress);
      if (deviceFingerprint && partIdx.devices.has(deviceFingerprint)) return partIdx.devices.get(deviceFingerprint);
      if (phone && partIdx.phones.has(phone)) return partIdx.phones.get(phone);
      if (regNo && partIdx.regNos.has(regNo.toUpperCase())) return partIdx.regNos.get(regNo.toUpperCase());
    }

    // 2. Fallback linear search across persisted votes
    const allVotes = await this.getAudienceVotes();
    return allVotes.find(v => {
      if (v.participantId !== participantId || (eventId && v.eventId !== eventId)) return false;

      // 1. Account / User ID match
      if (audienceId && v.audienceId === audienceId) return true;

      // 2. IP address match for this participant
      if (ipAddress && v.ipAddress && v.ipAddress === ipAddress) return true;

      // 3. Device fingerprint match for this participant
      if (deviceFingerprint && v.deviceFingerprint && v.deviceFingerprint === deviceFingerprint) return true;

      // 4. Phone match for this participant
      if (phone && v.phone && v.phone === phone) return true;

      // 5. Registration / Student ID match for this participant
      if (regNo && v.regNo && v.regNo.toUpperCase() === regNo.toUpperCase()) return true;

      return false;
    }) || null;
  },

  async getVotedParticipantIdsForClient({ audienceId, ipAddress, deviceFingerprint, phone, regNo, eventId = 'evt_fts_2026' }) {
    const votedParticipants = new Set();

    // Fast indexed set union
    if (audienceId && audienceVoteIndex.byAudienceId.has(audienceId)) {
      for (const pid of audienceVoteIndex.byAudienceId.get(audienceId)) votedParticipants.add(pid);
    }
    if (ipAddress && audienceVoteIndex.byIp.has(ipAddress)) {
      for (const pid of audienceVoteIndex.byIp.get(ipAddress)) votedParticipants.add(pid);
    }
    if (deviceFingerprint && audienceVoteIndex.byDevice.has(deviceFingerprint)) {
      for (const pid of audienceVoteIndex.byDevice.get(deviceFingerprint)) votedParticipants.add(pid);
    }
    if (phone && audienceVoteIndex.byPhone.has(phone)) {
      for (const pid of audienceVoteIndex.byPhone.get(phone)) votedParticipants.add(pid);
    }
    if (regNo && audienceVoteIndex.byRegNo.has(regNo.toUpperCase())) {
      for (const pid of audienceVoteIndex.byRegNo.get(regNo.toUpperCase())) votedParticipants.add(pid);
    }

    if (votedParticipants.size > 0) {
      return Array.from(votedParticipants);
    }

    const allVotes = await this.getAudienceVotes();
    for (const v of allVotes) {
      if (eventId && v.eventId !== eventId) continue;
      let matched = false;

      if (audienceId && v.audienceId === audienceId) matched = true;
      else if (ipAddress && v.ipAddress && v.ipAddress === ipAddress) matched = true;
      else if (deviceFingerprint && v.deviceFingerprint && v.deviceFingerprint === deviceFingerprint) matched = true;
      else if (phone && v.phone && v.phone === phone) matched = true;
      else if (regNo && v.regNo && v.regNo.toUpperCase() === regNo.toUpperCase()) matched = true;

      if (matched) {
        votedParticipants.add(v.participantId);
      }
    }

    return Array.from(votedParticipants);
  },

  async getVotedCategoryIdsForClient({ audienceId, ipAddress, deviceFingerprint, phone, regNo, eventId = 'evt_fts_2026' }) {
    const allVotes = await this.getAudienceVotes();
    const votedCategories = new Set();

    for (const v of allVotes) {
      if (eventId && v.eventId !== eventId) continue;
      let matched = false;

      if (audienceId && v.audienceId === audienceId) matched = true;
      else if (ipAddress && v.ipAddress && v.ipAddress === ipAddress) matched = true;
      else if (deviceFingerprint && v.deviceFingerprint && v.deviceFingerprint === deviceFingerprint) matched = true;
      else if (phone && v.phone && v.phone === phone) matched = true;
      else if (regNo && v.regNo && v.regNo.toUpperCase() === regNo.toUpperCase()) matched = true;

      if (matched) {
        votedCategories.add(v.categoryId);
      }
    }

    return Array.from(votedCategories);
  },

  async createAudienceVote(voteData) {
    const id = voteData.id || `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const vote = {
      id,
      audienceId: voteData.audienceId,
      participantId: voteData.participantId,
      categoryId: voteData.categoryId,
      eventId: voteData.eventId || 'evt_fts_2026',
      ipAddress: voteData.ipAddress || '127.0.0.1',
      deviceFingerprint: voteData.deviceFingerprint || null,
      phone: voteData.phone || null,
      regNo: voteData.regNo || null,
      submittedAt: new Date().toISOString()
    };

    if (useSupabase()) {
      // Ensure the voter user exists in `users` table to satisfy foreign key constraint
      try {
        const { data: userExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', vote.audienceId)
          .maybeSingle();

        if (!userExists) {
          const userEmail = voteData.email || (vote.regNo ? `${vote.regNo.toLowerCase()}@student.local` : `${vote.audienceId}@student.local`);
          await supabase.from('users').upsert({
            id: vote.audienceId,
            name: vote.regNo ? `Student (${vote.regNo})` : `Student (${vote.audienceId})`,
            email: userEmail,
            password_hash: defaultStudentPasswordHash,
            role: 'AUDIENCE',
            status: 'ACTIVE'
          });
        }
      } catch (uErr) {
        console.warn('⚠️ [Database] Notice verifying audience user:', uErr.message);
      }

      // Ensure participant exists in `participants` table
      try {
        const { data: partExists } = await supabase
          .from('participants')
          .select('id')
          .eq('id', vote.participantId)
          .maybeSingle();

        if (!partExists) {
          const localPart = memoryDb.participants?.find(p => p.id === vote.participantId);
          if (localPart) {
            await supabase.from('participants').upsert({
              id: localPart.id,
              event_id: localPart.eventId || vote.eventId,
              category_id: localPart.categoryId || vote.categoryId,
              participant_code: localPart.participantCode || localPart.code || 'PERF',
              registration_number: localPart.registrationNumber || localPart.regNo || 'REG',
              name: localPart.name || 'Performer',
              phone_number: localPart.phoneNumber || localPart.phone || '0000000000',
              routine_title: localPart.routineTitle || localPart.act || 'Performance',
              act: localPart.act || localPart.routineTitle || 'Performance',
              status: localPart.status || 'ACTIVE'
            });
          }
        }
      } catch (pErr) {
        console.warn('⚠️ [Database] Notice verifying participant:', pErr.message);
      }

      const { error } = await supabase.from('audience_votes').insert({
        id: vote.id,
        audience_id: vote.audienceId,
        participant_id: vote.participantId,
        category_id: vote.categoryId,
        event_id: vote.eventId,
        ip_address: vote.ipAddress,
        device_fingerprint: vote.deviceFingerprint,
        phone: vote.phone,
        reg_no: vote.regNo
      });
      if (error) throw new Error(error.message);
      indexAudienceVote(vote);
      return vote;
    }

    memoryDb.audienceVotes.push(vote);
    indexAudienceVote(vote);
    return vote;
  },

  // --- AUDIT LOGS ---
  async createAuditLog(logData) {
    const id = logData.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const entry = {
      id,
      userId: logData.userId || null,
      action: logData.action,
      entityType: logData.entityType,
      entityId: logData.entityId || null,
      oldValue: logData.oldValue ? (typeof logData.oldValue === 'string' ? logData.oldValue : JSON.stringify(logData.oldValue)) : null,
      newValue: logData.newValue ? (typeof logData.newValue === 'string' ? logData.newValue : JSON.stringify(logData.newValue)) : null,
      ipAddress: logData.ipAddress || '127.0.0.1',
      userAgent: logData.userAgent || 'System',
      createdAt: new Date().toISOString()
    };

    if (useSupabase()) {
      try {
        await supabase.from('audit_logs').insert({
          id: entry.id,
          user_id: entry.userId,
          action: entry.action,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          old_value: entry.oldValue,
          new_value: entry.newValue,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent
        });
      } catch (err) {
        console.warn('Audit log write error to Supabase:', err.message);
      }
      return entry;
    }

    memoryDb.auditLogs.unshift(entry);
    return entry;
  },

  async getAuditLogs(limit = 100) {
    if (useSupabase()) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data || []).map(l => ({
        id: l.id,
        userId: l.user_id,
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        oldValue: l.old_value,
        newValue: l.new_value,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        createdAt: l.created_at
      }));
    }
    return memoryDb.auditLogs.slice(0, limit);
  }
};

export default dbService;
