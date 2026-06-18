-- Fix C3: rate_limits table had no RLS — any authenticated user could read/reset other users' rate limits
-- Applied to live DB: 2026-06-18
-- Rate limits are a server-side mechanism only — users can view their own but NOT modify

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop both versions in case of re-run
DROP POLICY IF EXISTS "users_own_rate_limits" ON rate_limits;
DROP POLICY IF EXISTS "users_read_own_rate_limits" ON rate_limits;

-- Users can only SELECT their own rate limit status — no insert/update/delete
CREATE POLICY "users_read_own_rate_limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Server-side modification is via supabaseAdmin (service_role), which bypasses RLS entirely
