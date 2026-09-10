/**
 * Database Seed Script
 * Prepares baseline event, categories, and initial admin / help desk / judge / audience accounts.
 */

import bcrypt from 'bcryptjs';

export async function getSeedData() {
  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('password123', salt);
  const adminPassword = await bcrypt.hash('ftsadmin2026', salt);

  return {
    users: [
      {
        id: 'usr_admin_1',
        name: 'System Administrator',
        email: 'admin@admin.com',
        passwordHash: adminPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      },
      {
        id: 'usr_desk_1',
        name: 'Registration Desk Officer',
        email: 'helpdesk@event.local',
        passwordHash: defaultPassword,
        role: 'HELP_DESK',
        status: 'ACTIVE'
      },
      {
        id: 'usr_judge_1',
        name: 'Judge Dr. Kapoor',
        email: 'judge1@event.local',
        passwordHash: defaultPassword,
        role: 'JUDGE',
        status: 'ACTIVE'
      },
      {
        id: 'usr_judge_2',
        name: 'Judge Prof. Iyer',
        email: 'judge2@event.local',
        passwordHash: defaultPassword,
        role: 'JUDGE',
        status: 'ACTIVE'
      },
      {
        id: 'usr_aud_1',
        name: 'Student Audience Member',
        email: 'student@event.local',
        passwordHash: defaultPassword,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    ],
    event: {
      id: 'evt_fts_2026',
      name: 'Freshmen Talent Search 2026',
      status: 'SETUP',
      resultsLocked: false
    },
    categories: [
      { id: 'cat_dance', name: 'Dance', description: 'Classical, Contemporary, and Hip-hop' },
      { id: 'cat_singing', name: 'Singing / Music', description: 'Solo Vocals, Instrumental, Bands' },
      { id: 'cat_comedy', name: 'Comedy', description: 'Stand-up and Skit performances' },
      { id: 'cat_band', name: 'Band', description: 'Group music performances' },
      { id: 'cat_drama', name: 'Drama / Theatre', description: 'Monologues and theatrical scenes' },
      { id: 'cat_poetry', name: 'Poetry / Spoken Word', description: 'Original recitations & slam poetry' }
    ]
  };
}

export default getSeedData;
