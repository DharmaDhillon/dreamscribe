-- Ember AI Agent insights table
create table public.ember_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  scope text not null check (scope in ('personal', 'global')),
  insight_type text not null,
  title text not null,
  body text not null,
  data jsonb default '{}',
  created_at timestamptz default now()
);

-- user_id is null for global insights
create index idx_ember_user on public.ember_insights(user_id);
create index idx_ember_scope on public.ember_insights(scope);
create index idx_ember_created on public.ember_insights(created_at desc);

alter table public.ember_insights enable row level security;

-- Users can read their own personal insights
create policy "Users can read own ember insights"
  on public.ember_insights for select
  using (auth.uid() = user_id);

-- Everyone authenticated can read global insights
create policy "Anyone can read global ember insights"
  on public.ember_insights for select
  using (scope = 'global' and auth.role() = 'authenticated');

-- Service role inserts (backend only)
create policy "Service can insert ember insights"
  on public.ember_insights for insert
  with check (true);

-- Service role can delete old insights
create policy "Service can delete ember insights"
  on public.ember_insights for delete
  using (true);
