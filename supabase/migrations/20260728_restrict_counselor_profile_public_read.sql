-- Applied to production 2026-07-28 (migration 20260728075443).
-- `public_read_profile USING (true)` let anyone with the anon key read every
-- counselor's phone, clinic address, telegram_chat_id and, once uploaded, their
-- logo and handwritten signature image.
-- The public booking page does not need it: it reads through the SECURITY DEFINER
-- function get_counselor_by_booking_code(). The only cross-user reader left is a
-- portal client fetching their own counselor's letterhead and payment link.
drop policy if exists public_read_profile on counselor_profiles;

create policy portal_client_read_counselor on counselor_profiles
for select to authenticated
using (
  exists (
    select 1 from subjects s
    where s.user_id = counselor_profiles.user_id
      and (s.portal_user_id = auth.uid() or s.email = auth.email())
  )
);
