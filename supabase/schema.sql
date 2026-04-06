-- ═══════════════════════════════════════════════════
-- DreamScribe — Complete Supabase Schema
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ── THERAPISTS (created first to avoid circular FK) ──
create table public.therapists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  license_number text not null,
  license_type text not null,
  practice_name text,
  state text,
  is_approved boolean default false,
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- ── USERS (extends auth.users) ──
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  username text unique not null,
  display_name text,
  avatar_archetype text default 'The Seeker',
  bio text,
  role text default 'user' check (role in ('user', 'therapist', 'admin')),
  therapist_id uuid references public.therapists(id),
  is_therapist_verified boolean default false,
  created_at timestamptz default now()
);

-- Now add the FK from therapists → users
alter table public.therapists
  add constraint therapists_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

-- ── ENTRIES ──
create table public.entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  entry_type text not null check (entry_type in ('dream', 'daily')),
  audio_url text,
  transcript text,
  duration_seconds integer,
  is_public boolean default false,
  star_count integer default 0,
  mood_label text,
  amygdala_score numeric,
  dlpfc_score numeric,
  dmn_score numeric,
  stg_score numeric,
  acc_score numeric,
  fatigue_score numeric,
  peak_moment_time text,
  peak_moment_quote text,
  calm_moment_time text,
  calm_moment_quote text,
  claude_insight text,
  cross_analysis_id uuid,
  created_at timestamptz default now()
);

-- ── CROSS ANALYSES ──
create table public.cross_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  dream_entry_id uuid references public.entries(id),
  daily_entry_id uuid references public.entries(id),
  claude_cross_insight text,
  created_at timestamptz default now()
);

-- ── STARS ──
create table public.stars (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  entry_id uuid references public.entries(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, entry_id)
);

-- ── FOLLOWS ──
create table public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  status text default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(follower_id, following_id)
);

-- ── MESSAGES ──
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- ── NOTIFICATIONS ──
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in (
    'follow_request', 'follow_approved', 'new_star',
    'new_message', 'therapist_alert'
  )),
  from_user_id uuid references public.users(id),
  entry_id uuid references public.entries(id),
  message_text text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ── MNEMO FLAGS ──
create table public.mnemo_flags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  therapist_id uuid references public.therapists(id),
  flag_type text not null,
  flag_message text not null,
  entry_ids uuid[],
  severity text default 'low'
    check (severity in ('low', 'medium', 'high')),
  created_at timestamptz default now(),
  is_resolved boolean default false,
  resolved_at timestamptz
);

-- ═══════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════

create index idx_entries_user_id on public.entries(user_id);
create index idx_entries_created_at on public.entries(created_at desc);
create index idx_entries_public on public.entries(is_public) where is_public = true;
create index idx_stars_entry_id on public.stars(entry_id);
create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);
create index idx_messages_sender on public.messages(sender_id);
create index idx_messages_receiver on public.messages(receiver_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_mnemo_flags_therapist on public.mnemo_flags(therapist_id);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.therapists enable row level security;
alter table public.entries enable row level security;
alter table public.cross_analyses enable row level security;
alter table public.stars enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.mnemo_flags enable row level security;

-- ── USERS policies ──
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can read other public profiles"
  on public.users for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- ── THERAPISTS policies ──
create policy "Therapists can read own record"
  on public.therapists for select
  using (auth.uid() = user_id);

create policy "Therapists can insert own record"
  on public.therapists for insert
  with check (auth.uid() = user_id);

create policy "Therapists can update own record"
  on public.therapists for update
  using (auth.uid() = user_id);

-- ── ENTRIES policies ──
create policy "Users can read own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Anyone authenticated can read public entries"
  on public.entries for select
  using (is_public = true and auth.role() = 'authenticated');

create policy "Therapists can read assigned client entries"
  on public.entries for select
  using (
    exists (
      select 1 from public.users u
      join public.therapists t on u.therapist_id = t.id
      where u.id = entries.user_id
        and t.user_id = auth.uid()
        and t.is_approved = true
    )
  );

create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- ── CROSS ANALYSES policies ──
create policy "Users can read own cross analyses"
  on public.cross_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own cross analyses"
  on public.cross_analyses for insert
  with check (auth.uid() = user_id);

-- ── STARS policies ──
create policy "Anyone authenticated can read stars"
  on public.stars for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own stars"
  on public.stars for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own stars"
  on public.stars for delete
  using (auth.uid() = user_id);

-- ── FOLLOWS policies ──
create policy "Users can read own follows"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "Users can insert follow requests"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can update follows they received"
  on public.follows for update
  using (auth.uid() = following_id);

-- ── MESSAGES policies ──
create policy "Users can read own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can update own received messages"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- ── NOTIFICATIONS policies ──
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "System can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

-- ── MNEMO FLAGS policies ──
create policy "Therapists can read flags for their clients"
  on public.mnemo_flags for select
  using (
    exists (
      select 1 from public.therapists t
      where t.id = mnemo_flags.therapist_id
        and t.user_id = auth.uid()
        and t.is_approved = true
    )
  );

create policy "System can insert mnemo flags"
  on public.mnemo_flags for insert
  with check (auth.role() = 'authenticated');

create policy "Therapists can update their flags"
  on public.mnemo_flags for update
  using (
    exists (
      select 1 from public.therapists t
      where t.id = mnemo_flags.therapist_id
        and t.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
  values ('audio-entries', 'audio-entries', false);

-- Authenticated users can upload their own audio
create policy "Users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'audio-entries'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own audio files
create policy "Users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'audio-entries'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Therapists can read assigned client audio
create policy "Therapists can read client audio"
  on storage.objects for select
  using (
    bucket_id = 'audio-entries'
    and auth.role() = 'authenticated'
    and exists (
      select 1 from public.users u
      join public.therapists t on u.therapist_id = t.id
      where u.id = ((storage.foldername(name))[1])::uuid
        and t.user_id = auth.uid()
        and t.is_approved = true
    )
  );

-- Users can delete their own audio
create policy "Users can delete own audio"
  on storage.objects for delete
  using (
    bucket_id = 'audio-entries'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
