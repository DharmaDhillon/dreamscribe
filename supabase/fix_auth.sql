-- ═══════════════════════════════════════════════════
-- FIX 1: Drop and recreate the users insert policy
-- to allow authenticated users to insert their own row
-- ═══════════════════════════════════════════════════

drop policy if exists "Users can insert own profile" on public.users;

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- ═══════════════════════════════════════════════════
-- FIX 2: Create a trigger that auto-creates a
-- public.users row when someone signs up via auth.
-- This ensures the row always exists even if the
-- client-side insert fails.
-- ═══════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, display_name, role, is_therapist_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'user',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════
-- FIX 3: Manually create the user row for any
-- auth.users that already exist but don't have a
-- public.users row (like your failed signup)
-- ═══════════════════════════════════════════════════

insert into public.users (id, email, username, display_name, role, is_therapist_verified)
select
  id,
  email,
  split_part(email, '@', 1),
  split_part(email, '@', 1),
  'user',
  false
from auth.users
where id not in (select id from public.users)
on conflict (id) do nothing;
