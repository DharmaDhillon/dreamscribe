-- Allow anonymous (logged-out) users to read public entries and the user profiles attached to them
-- This makes /feed work as a public landing page that lures signups

-- ENTRIES — anonymous can read public entries
drop policy if exists "Anonymous can read public entries" on public.entries;
create policy "Anonymous can read public entries"
  on public.entries for select
  using (is_public = true);

-- USERS — anonymous can read basic profile info (used for feed author display)
drop policy if exists "Anonymous can read public user profiles" on public.users;
create policy "Anonymous can read public user profiles"
  on public.users for select
  using (true);

-- STARS — anonymous can read star counts
drop policy if exists "Anonymous can read stars" on public.stars;
create policy "Anonymous can read stars"
  on public.stars for select
  using (true);
