-- Add 'new_comment' to allowed notification types
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'follow_request', 'follow_approved', 'new_star',
    'new_message', 'therapist_alert', 'new_comment'
  ));
