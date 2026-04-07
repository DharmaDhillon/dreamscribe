-- Audit log of when each user acknowledged the Terms of Service and Privacy Policy
create table if not exists public.terms_acknowledgments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  terms_version text not null,
  privacy_version text not null,
  acknowledged_at timestamptz default now(),
  user_agent text,
  context text default 'signup'
);

create index if not exists idx_terms_user on public.terms_acknowledgments(user_id);
create index if not exists idx_terms_acknowledged_at on public.terms_acknowledgments(acknowledged_at desc);

alter table public.terms_acknowledgments enable row level security;

-- Users can read their own acknowledgments
create policy "Users can read own acknowledgments"
  on public.terms_acknowledgments for select
  using (auth.uid() = user_id);

-- Anyone authenticated can insert their own acknowledgment
create policy "Users can insert own acknowledgment"
  on public.terms_acknowledgments for insert
  with check (auth.uid() = user_id);
