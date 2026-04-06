-- Comments table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  entry_id uuid references public.entries(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

create index idx_comments_entry on public.comments(entry_id);
create index idx_comments_user on public.comments(user_id);

alter table public.comments enable row level security;

-- Anyone authenticated can read comments on public entries
create policy "Anyone can read comments on public entries"
  on public.comments for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.entries e
      where e.id = comments.entry_id
      and e.is_public = true
    )
  );

-- Users can also read their own comments
create policy "Users can read own comments"
  on public.comments for select
  using (auth.uid() = user_id);

-- Authenticated users can comment
create policy "Users can insert comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- Users can delete their own comments
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);
