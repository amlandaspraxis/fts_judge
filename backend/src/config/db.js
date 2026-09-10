import dbService, { supabase, isSupabaseConfigured } from './dbService.js';
import dotenv from 'dotenv';

dotenv.config();

export { supabase, isSupabaseConfigured, dbService };

export const INITIAL_JUDGES = [
  { 
    id: "j1", 
    name: "Dr. N. Kapoor", 
    code: "4821",
    accessCode: "4821", 
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", 
    title: "Senior Faculty & Performing Arts Chair" 
  },
  { 
    id: "j2", 
    name: "Prof. R. Iyer", 
    code: "4822",
    accessCode: "4822", 
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80", 
    title: "Dean of Cultural Affairs" 
  },
  { 
    id: "j3", 
    name: "Elena Rostova", 
    code: "4823",
    accessCode: "4823", 
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", 
    title: "National Choreography Lead" 
  }
];

export const INITIAL_PARTICIPANTS = [
  {
    id: "p1",
    name: "Alex Rivera",
    code: "DAN-07",
    act: "Breakbeat Fusion",
    categoryId: "dance",
    photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
    performed: false
  },
  {
    id: "p2",
    name: "Sanya Malhotra",
    code: "DNC-14",
    act: "Classical Kathak Contemporary",
    categoryId: "dance",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    performed: false
  },
  {
    id: "p3",
    name: "Rohan Varma",
    code: "MSC-03",
    act: "Acoustic Indie Rock",
    categoryId: "singing",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    performed: false
  },
  {
    id: "p4",
    name: "Kavya Deshmukh",
    code: "CMD-09",
    act: "Campus Life Standup",
    categoryId: "comedy",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    performed: false
  }
];

// In-Memory Seed / Fallback Store
export const memoryStore = {
  event: {
    name: "FTS Star Hunt 2026",
    pin: process.env.EVENT_PIN || "4821",
    judge_weight: 70,
    audience_weight: 30,
    currentParticipantId: "p1",
    votingOpen: false,
    revealAudience: false,
    revealJudges: false,
    revealFinal: false
  },
  categories: [
    { id: "dance", label: "Dance", prefix: "DNC" },
    { id: "singing", label: "Singing / Music", prefix: "MSC" },
    { id: "comedy", label: "Comedy", prefix: "CMD" },
    { id: "band", label: "Band", prefix: "BND" },
    { id: "drama", label: "Drama / Theatre", prefix: "DRM" },
    { id: "poetry", label: "Poetry / Spoken Word", prefix: "PTY" },
  ],
  registrations: [],
  participants: [...INITIAL_PARTICIPANTS],
  judges: [...INITIAL_JUDGES],
  criteria: [
    { id: "c1", label: "Performance", max_marks: 10 },
    { id: "c2", label: "Creativity", max_marks: 10 },
    { id: "c3", label: "Technique", max_marks: 10 },
    { id: "c4", label: "Stage Presence", max_marks: 10 },
  ],
  judgeScores: {
    p1: {
      j1: { c1: 9, c2: 8, c3: 9, c4: 9 },
      j2: { c1: 8, c2: 9, c3: 8, c4: 9 },
      j3: { c1: 9, c2: 9, c3: 8, c4: 9 }
    },
    p2: {
      j1: { c1: 8, c2: 8, c3: 8, c4: 8 },
      j2: { c1: 9, c2: 8, c3: 9, c4: 8 }
    }
  },
  audienceVotes: {
    p1: { aud_1: 9, aud_2: 10, aud_3: 8, aud_4: 9, aud_5: 9 },
    p2: { aud_1: 8, aud_2: 9, aud_3: 8 },
    p3: { aud_1: 9, aud_2: 9, aud_3: 10 }
  }
};

export default dbService;
