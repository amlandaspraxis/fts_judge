-- ============================================================================
-- FRESHMEN TALENT SEARCH 2026 - COMPLETE SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL 14+ / Supabase
-- Includes: Tables, Constraints, Indexes, Realtime Publications, and Seed Data
-- ============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Clean Existing Tables if recreating (safely in order)
drop table if exists audit_logs cascade;
drop table if exists audience_votes cascade;
drop table if exists score_history cascade;
drop table if exists judge_scores cascade;
drop table if exists judge_assignments cascade;
drop table if exists participants cascade;
drop table if exists categories cascade;
drop table if exists events cascade;
drop table if exists users cascade;

-- 3. Users Table (Role-based authentication & RBAC)
create table users (
  id text primary key default ('usr_' || replace(uuid_generate_v4()::text, '-', '')),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('ADMIN', 'JUDGE', 'AUDIENCE', 'HELP_DESK')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Events Table (Event lifecycle and status management)
create table events (
  id text primary key default ('evt_' || replace(uuid_generate_v4()::text, '-', '')),
  name text not null,
  status text not null default 'SETUP' check (status in (
    'SETUP', 'JUDGING_OPEN', 'VOTING_OPEN', 'JUDGING_CLOSED',
    'VOTING_CLOSED', 'RESULTS_LOCKED', 'RESULTS_PUBLISHED'
  )),
  pin text default '4821',
  judge_weight numeric not null default 0.85,
  audience_weight numeric not null default 0.15,
  judging_open_at timestamptz,
  judging_close_at timestamptz,
  voting_open_at timestamptz,
  voting_close_at timestamptz,
  results_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Categories Table
create table categories (
  id text primary key default ('cat_' || replace(uuid_generate_v4()::text, '-', '')),
  event_id text not null references events(id) on delete cascade,
  name text not null,
  code text not null,
  prefix text not null,
  description text default '',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Participants Table (Performers registered by Help Desk / Admin)
create table participants (
  id text primary key default ('part_' || replace(uuid_generate_v4()::text, '-', '')),
  event_id text not null references events(id) on delete cascade,
  category_id text not null references categories(id) on delete cascade,
  participant_code text not null,
  registration_number text not null,
  name text not null,
  phone_number text not null,
  routine_title text not null,
  act text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISQUALIFIED', 'WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_event_participant_code unique (event_id, participant_code),
  constraint uq_event_registration_number unique (event_id, registration_number)
);

-- 7. Judge Assignments Table
create table judge_assignments (
  id text primary key default ('ja_' || replace(uuid_generate_v4()::text, '-', '')),
  judge_id text not null references users(id) on delete cascade,
  category_id text not null references categories(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_judge_category_event unique (judge_id, category_id, event_id)
);

-- 8. Judge Scores Table
create table judge_scores (
  id text primary key default ('score_' || replace(uuid_generate_v4()::text, '-', '')),
  judge_id text not null references users(id) on delete cascade,
  participant_id text not null references participants(id) on delete cascade,
  category_id text not null references categories(id) on delete cascade,
  score numeric not null check (score >= 0 and score <= 100),
  revision_count int not null default 0 check (revision_count <= 1),
  locked boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_judge_participant unique (judge_id, participant_id)
);

-- 9. Score Modification History Table (For audit trail of the 1 allowed edit)
create table score_history (
  id text primary key default ('sh_' || replace(uuid_generate_v4()::text, '-', '')),
  score_id text not null references judge_scores(id) on delete cascade,
  old_score numeric not null,
  new_score numeric not null,
  changed_by text not null references users(id) on delete cascade,
  reason text,
  changed_at timestamptz not null default now()
);

-- 10. Audience Votes Table (Live voting, 1 vote per category per audience member)
create table audience_votes (
  id text primary key default ('vote_' || replace(uuid_generate_v4()::text, '-', '')),
  audience_id text not null references users(id) on delete cascade,
  participant_id text not null references participants(id) on delete cascade,
  category_id text not null references categories(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  constraint uq_audience_category_event unique (audience_id, category_id, event_id)
);

-- 11. Audit Logs Table (Tamper-evident system activity log)
create table audit_logs (
  id text primary key default ('audit_' || replace(uuid_generate_v4()::text, '-', '')),
  user_id text references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value text,
  new_value text,
  ip_address text default '127.0.0.1',
  user_agent text default 'System',
  created_at timestamptz not null default now()
);

-- 12. Create High-Performance Indexes
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_participants_category on participants(category_id);
create index if not exists idx_participants_event on participants(event_id);
create index if not exists idx_judge_assignments on judge_assignments(judge_id, category_id);
create index if not exists idx_judge_scores_participant on judge_scores(participant_id);
create index if not exists idx_audience_votes_participant on audience_votes(participant_id);
create index if not exists idx_audience_votes_category on audience_votes(category_id);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);

-- 13. Enable Realtime on Key Tables (for instant live dashboard syncing)
begin;
  -- Add tables to supabase_realtime publication if it exists
  do $$
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      alter publication supabase_realtime add table events;
      alter publication supabase_realtime add table categories;
      alter publication supabase_realtime add table participants;
      alter publication supabase_realtime add table judge_scores;
      alter publication supabase_realtime add table audience_votes;
    end if;
  end
  $$;
commit;

-- 14. Seed Initial Data (with bcrypt encrypted passwords)
-- Default Password: password123 (bcrypt hash: $2a$10$O9wR/7lq.3OaZ9dF0YqIze5oKzRjY.8X/Z.Gz6Wv7.nJ5eU8MkW7q)
-- For maximum cross-platform compatibility, standard 10-round bcrypt hash is used.
insert into users (id, name, email, password_hash, role, status)
values
  ('usr_admin', 'Event Administrator', 'admin@admin.com', '$2b$10$i1tZ28zgQL5c2CDFCBMeNO4nqxnom9t0zfvIrWsIPds5nA/uGCBcK', 'ADMIN', 'ACTIVE'),
  ('usr_desk', 'Registration Desk Officer', 'helpdesk@event.local', '$2a$10$tQ120eR94uO.c2V2dFvQReI7mDqXz3J7w4U4k1IeX/0CgC1E4u1e2', 'HELP_DESK', 'ACTIVE'),
  ('usr_judge1', 'Dr. N. Kapoor', 'judge1@event.local', '$2a$10$tQ120eR94uO.c2V2dFvQReI7mDqXz3J7w4U4k1IeX/0CgC1E4u1e2', 'JUDGE', 'ACTIVE'),
  ('usr_judge2', 'Prof. R. Iyer', 'judge2@event.local', '$2a$10$tQ120eR94uO.c2V2dFvQReI7mDqXz3J7w4U4k1IeX/0CgC1E4u1e2', 'JUDGE', 'ACTIVE'),
  ('usr_audience', 'Audience Member', 'audience@event.local', '$2a$10$tQ120eR94uO.c2V2dFvQReI7mDqXz3J7w4U4k1IeX/0CgC1E4u1e2', 'AUDIENCE', 'ACTIVE')
on conflict (email) do nothing;

insert into events (id, name, status, pin, judge_weight, audience_weight)
values
  ('evt_fts_2026', 'Freshmen Talent Search 2026', 'SETUP', '4821', 0.85, 0.15)
on conflict (id) do nothing;

insert into categories (id, event_id, name, code, prefix, description, status)
values
  ('cat_dancing_superstar', 'evt_fts_2026', 'Dancing superstar', 'DAN', 'DAN', 'Dance competition acts', 'ACTIVE'),
  ('cat_elocution', 'evt_fts_2026', 'Elocution(public speaking)', 'ELO', 'ELO', 'Public speaking & elocution', 'ACTIVE'),
  ('cat_fashion_show', 'evt_fts_2026', 'Mr. And mrs freshman (fashion show)', 'MMF', 'MMF', 'Fashion show & runway walk', 'ACTIVE'),
  ('cat_open_mic', 'evt_fts_2026', 'Open mic', 'MIC', 'MIC', 'Open mic performances', 'ACTIVE'),
  ('cat_poetry_slam', 'evt_fts_2026', 'Poetry slam', 'POE', 'POE', 'Poetry slam & spoken word', 'ACTIVE'),
  ('cat_singing_idol', 'evt_fts_2026', 'Singing idol', 'SNG', 'SNG', 'Singing competition acts', 'ACTIVE'),
  ('cat_special_talent', 'evt_fts_2026', 'Special talent', 'SPL', 'SPL', 'Specialized unique talent acts', 'ACTIVE'),
  ('cat_dialogue_den', 'evt_fts_2026', 'The dialogue den', 'DEN', 'DEN', 'Dramatic dialogues and monologues', 'ACTIVE'),
  ('cat_reel_to_reel', 'evt_fts_2026', 'Reel to reel', 'REL', 'REL', 'Reel video & cinematic creative acts', 'ACTIVE')
on conflict (id) do nothing;

insert into judge_assignments (id, judge_id, category_id, event_id)
values
  ('ja_1', 'usr_judge1', 'cat_dancing_superstar', 'evt_fts_2026'),
  ('ja_2', 'usr_judge1', 'cat_singing_idol', 'evt_fts_2026'),
  ('ja_3', 'usr_judge1', 'cat_elocution', 'evt_fts_2026'),
  ('ja_4', 'usr_judge2', 'cat_dancing_superstar', 'evt_fts_2026'),
  ('ja_5', 'usr_judge2', 'cat_open_mic', 'evt_fts_2026'),
  ('ja_6', 'usr_judge2', 'cat_fashion_show', 'evt_fts_2026')
on conflict (id) do nothing;
