import bcrypt from 'bcryptjs';

// Pre-hashed default password for test users
const salt = bcrypt.genSaltSync(10);
const defaultPasswordHash = bcrypt.hashSync('password123', salt);
const adminPasswordHash = bcrypt.hashSync('ftsadmin2026', salt);

/**
 * State store implementing the complete Prisma data schema
 */
export const db = {
  users: [
    {
      id: 'usr_admin',
      name: 'Event Admin',
      email: 'admin@admin.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_desk',
      name: 'Registration Desk',
      email: 'helpdesk@event.local',
      passwordHash: defaultPasswordHash,
      role: 'HELP_DESK',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_judge1',
      name: 'Dr. N. Kapoor',
      email: 'judge1@event.local',
      passwordHash: defaultPasswordHash,
      role: 'JUDGE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_judge2',
      name: 'Prof. R. Iyer',
      email: 'judge2@event.local',
      passwordHash: defaultPasswordHash,
      role: 'JUDGE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_audience',
      name: 'Audience Member',
      email: 'audience@event.local',
      passwordHash: defaultPasswordHash,
      role: 'AUDIENCE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
  ],
  events: [
    {
      id: 'evt_fts_2026',
      name: 'Freshmen Talent Search 2026',
      status: 'SETUP', // SETUP | JUDGING_OPEN | VOTING_OPEN | JUDGING_CLOSED | VOTING_CLOSED | RESULTS_LOCKED | RESULTS_PUBLISHED
      judgingOpenAt: null,
      judgingCloseAt: null,
      votingOpenAt: null,
      votingCloseAt: null,
      resultsLocked: false,
      createdAt: new Date().toISOString()
    }
  ],
  categories: [
    { id: 'cat_dancing_superstar', eventId: 'evt_fts_2026', name: 'Dancing superstar', code: 'DAN', prefix: 'DAN', description: 'Dance competition acts', status: 'ACTIVE' },
    { id: 'cat_elocution', eventId: 'evt_fts_2026', name: 'Elocution(public speaking)', code: 'ELO', prefix: 'ELO', description: 'Public speaking & elocution', status: 'ACTIVE' },
    { id: 'cat_fashion_show', eventId: 'evt_fts_2026', name: 'Mr. And mrs freshman (fashion show)', code: 'MMF', prefix: 'MMF', description: 'Fashion show & runway walk', status: 'ACTIVE' },
    { id: 'cat_open_mic', eventId: 'evt_fts_2026', name: 'Open mic', code: 'MIC', prefix: 'MIC', description: 'Open mic performances', status: 'ACTIVE' },
    { id: 'cat_poetry_slam', eventId: 'evt_fts_2026', name: 'Poetry slam', code: 'POE', prefix: 'POE', description: 'Poetry slam & spoken word', status: 'ACTIVE' },
    { id: 'cat_singing_idol', eventId: 'evt_fts_2026', name: 'Singing idol', code: 'SNG', prefix: 'SNG', description: 'Singing competition acts', status: 'ACTIVE' },
    { id: 'cat_special_talent', eventId: 'evt_fts_2026', name: 'Special talent', code: 'SPL', prefix: 'SPL', description: 'Specialized unique talent acts', status: 'ACTIVE' },
    { id: 'cat_dialogue_den', eventId: 'evt_fts_2026', name: 'The dialogue den', code: 'DEN', prefix: 'DEN', description: 'Dramatic dialogues and monologues', status: 'ACTIVE' },
    { id: 'cat_reel_to_reel', eventId: 'evt_fts_2026', name: 'Reel to reel', code: 'REL', prefix: 'REL', description: 'Reel video & cinematic creative acts', status: 'ACTIVE' }
  ],
  participants: [
    {
      id: 'p1',
      eventId: 'evt_fts_2026',
      categoryId: 'cat_dancing_superstar',
      participantCode: 'DAN-07',
      code: 'DAN-07',
      registrationNumber: '2026DNC07',
      name: 'Alex Rivera',
      phoneNumber: '9876500001',
      routineTitle: 'Breakbeat Fusion',
      act: 'Breakbeat Fusion',
      photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
      status: 'ACTIVE',
      performed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p2',
      eventId: 'evt_fts_2026',
      categoryId: 'cat_dancing_superstar',
      participantCode: 'DNC-14',
      code: 'DNC-14',
      registrationNumber: '2026DNC14',
      name: 'Sanya Malhotra',
      phoneNumber: '9876500002',
      routineTitle: 'Classical Kathak Contemporary',
      act: 'Classical Kathak Contemporary',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
      status: 'ACTIVE',
      performed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p3',
      eventId: 'evt_fts_2026',
      categoryId: 'cat_singing_idol',
      participantCode: 'MSC-03',
      code: 'MSC-03',
      registrationNumber: '2026SNG03',
      name: 'Rohan Varma',
      phoneNumber: '9876500003',
      routineTitle: 'Acoustic Indie Rock',
      act: 'Acoustic Indie Rock',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      status: 'ACTIVE',
      performed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'p4',
      eventId: 'evt_fts_2026',
      categoryId: 'cat_open_mic',
      participantCode: 'CMD-09',
      code: 'CMD-09',
      registrationNumber: '2026MIC09',
      name: 'Kavya Deshmukh',
      phoneNumber: '9876500004',
      routineTitle: 'Campus Life Standup',
      act: 'Campus Life Standup',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
      status: 'ACTIVE',
      performed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  judgeAssignments: [
    { id: 'ja_1', judgeId: 'usr_judge1', categoryId: 'cat_dancing_superstar', eventId: 'evt_fts_2026' },
    { id: 'ja_2', judgeId: 'usr_judge1', categoryId: 'cat_singing_idol', eventId: 'evt_fts_2026' },
    { id: 'ja_3', judgeId: 'usr_judge1', categoryId: 'cat_elocution', eventId: 'evt_fts_2026' },
    { id: 'ja_4', judgeId: 'usr_judge2', categoryId: 'cat_dancing_superstar', eventId: 'evt_fts_2026' },
    { id: 'ja_5', judgeId: 'usr_judge2', categoryId: 'cat_open_mic', eventId: 'evt_fts_2026' },
    { id: 'ja_6', judgeId: 'usr_judge2', categoryId: 'cat_fashion_show', eventId: 'evt_fts_2026' }
  ],
  judgeScores: [],
  scores: [],
  scoreHistory: [],
  audienceVotes: [],
  results: [],
  auditLogs: []
};

export default db;
