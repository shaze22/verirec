-- ============================================================
-- VeriRec — Full Database Schema
-- Safe to run on a fresh Supabase project (idempotent)
-- Last updated: 2026-05-28
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Subscriptions (must exist before sessions due to trigger)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid REFERENCES auth.users UNIQUE NOT NULL,
  plan                   text DEFAULT 'free',
  status                 text DEFAULT 'active',
  sessions_used          integer DEFAULT 0,
  sessions_limit         integer DEFAULT 2,
  billing_cycle_start    timestamptz DEFAULT now(),
  stripe_customer_id     text,
  stripe_subscription_id text,
  next_billing_date      timestamptz,
  warning_sent           boolean DEFAULT false,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_subscriptions" ON subscriptions;
CREATE POLICY "users_own_subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Subjects (reusable interviewee profiles)
CREATE TABLE IF NOT EXISTS subjects (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  name       text NOT NULL,
  ic_number  text,
  phone      text,
  email      text,
  address    text,
  notes      text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_subjects" ON subjects;
CREATE POLICY "users_own_subjects" ON subjects
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Cases (group multiple sessions under one case file)
CREATE TABLE IF NOT EXISTS cases (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  title       text NOT NULL,
  case_number text,
  profession  text,
  status      text DEFAULT 'active',
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_cases" ON cases;
CREATE POLICY "users_own_cases" ON cases
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  subject_id       uuid REFERENCES subjects(id) ON DELETE SET NULL,
  case_id          uuid REFERENCES cases(id) ON DELETE SET NULL,
  title            text NOT NULL,
  profession       text NOT NULL,
  interviewer      text NOT NULL,
  subject_name     text NOT NULL,
  subject_role     text,
  context_notes    text,
  transcript       jsonb DEFAULT '[]'::jsonb,
  flags            jsonb DEFAULT '[]'::jsonb,
  report           jsonb,
  duration         integer DEFAULT 0,
  audio_url        text,
  share_token      text UNIQUE,
  case_number      text,
  witness_officer  text,
  consent_signed   boolean DEFAULT false,
  consent_data     jsonb,
  hash             text,
  synced           boolean DEFAULT true,
  status           text DEFAULT 'active',
  recording_status text DEFAULT 'draft',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_sessions" ON sessions;
CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON sessions(share_token);

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS teams (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id   uuid REFERENCES auth.users NOT NULL,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id    uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES auth.users NOT NULL,
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE,
  email      text NOT NULL,
  role       text DEFAULT 'interviewer',
  status     text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, email)
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_owner_all" ON teams;
CREATE POLICY "team_owner_all" ON teams FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "team_members_owner_all" ON team_members;
CREATE POLICY "team_members_owner_all" ON team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM teams WHERE id = team_members.team_id AND owner_id = auth.uid())
);
DROP POLICY IF EXISTS "team_members_self_read" ON team_members;
CREATE POLICY "team_members_self_read" ON team_members FOR SELECT
  USING (email = (auth.jwt() ->> 'email'));
DROP POLICY IF EXISTS "team_members_self_accept" ON team_members;
CREATE POLICY "team_members_self_accept" ON team_members FOR UPDATE
  USING  (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));

CREATE INDEX IF NOT EXISTS idx_team_members_user  ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SUPPORTING TABLES
-- ============================================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  action        text NOT NULL,
  resource_type text,
  resource_id   uuid,
  resource_name text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_audit_logs" ON audit_logs;
CREATE POLICY "users_own_audit_logs" ON audit_logs FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- Consent logs (PDPA — never delete, insert open to all)
CREATE TABLE IF NOT EXISTS consent_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users,
  anon_id    text,
  decision   text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consent_insert_any" ON consent_logs;
DROP POLICY IF EXISTS "consent_select_own" ON consent_logs;
CREATE POLICY "consent_insert_any" ON consent_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "consent_select_own" ON consent_logs FOR SELECT
  USING (auth.uid() = user_id AND user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_consent_logs_user ON consent_logs(user_id);

-- Audio library
CREATE TABLE IF NOT EXISTS audio_library (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  session_id   uuid REFERENCES sessions(id) ON DELETE SET NULL,
  subject_id   uuid REFERENCES subjects(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  file_name    text NOT NULL,
  duration     integer DEFAULT 0,
  file_size    bigint DEFAULT 0,
  mime_type    text DEFAULT 'audio/webm',
  title        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE audio_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_audio_library" ON audio_library;
CREATE POLICY "users_own_audio_library" ON audio_library FOR ALL USING (auth.uid() = user_id);

-- Question templates
CREATE TABLE IF NOT EXISTS question_templates (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  profession text NOT NULL,
  name       text NOT NULL,
  questions  jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_templates" ON question_templates;
CREATE POLICY "users_own_templates" ON question_templates FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER question_templates_updated_at
  BEFORE UPDATE ON question_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id    uuid REFERENCES auth.users NOT NULL,
  referred_email text NOT NULL,
  referred_id    uuid REFERENCES auth.users,
  status         text DEFAULT 'pending',
  bonus_given    boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrers_own_referrals" ON referrals;
CREATE POLICY "referrers_own_referrals" ON referrals FOR ALL USING (auth.uid() = referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Scheduled sessions
CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  title        text NOT NULL,
  profession   text NOT NULL,
  subject_name text,
  scheduled_at timestamptz NOT NULL,
  notes        text,
  status       text DEFAULT 'upcoming',
  session_id   uuid REFERENCES sessions(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_scheduled" ON scheduled_sessions;
CREATE POLICY "users_own_scheduled" ON scheduled_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_sessions(user_id, scheduled_at);

CREATE TRIGGER scheduled_sessions_updated_at
  BEFORE UPDATE ON scheduled_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL,
  endpoint     text NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer DEFAULT 1,
  UNIQUE(user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits ON rate_limits(user_id, endpoint, window_start);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Atomic session count increment with limit enforcement
CREATE OR REPLACE FUNCTION increment_sessions(uid uuid)
RETURNS jsonb AS $$
DECLARE
  sub subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE user_id = uid FOR UPDATE;
  IF sub.sessions_limit != -1 AND sub.sessions_used >= sub.sessions_limit THEN
    RETURN jsonb_build_object(
      'error', 'limit_reached',
      'used', sub.sessions_used,
      'limit', sub.sessions_limit
    );
  END IF;
  UPDATE subscriptions
    SET sessions_used = sessions_used + 1, updated_at = now()
    WHERE user_id = uid;
  RETURN jsonb_build_object('ok', true, 'used', sub.sessions_used + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly session usage (called by pg_cron on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
    SET sessions_used = 0, billing_cycle_start = now()
    WHERE billing_cycle_start < now() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Team members can read sessions from their team owner
CREATE OR REPLACE FUNCTION get_team_sessions(uid uuid)
RETURNS SETOF sessions AS $$
BEGIN
  RETURN QUERY
  SELECT s.* FROM sessions s
  WHERE s.user_id IN (
    SELECT t.owner_id FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = uid AND tm.status = 'active'
  )
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- AUTH TRIGGER — auto-create free subscription on signup
-- IMPORTANT: SET search_path = public required so the trigger
-- can find the subscriptions table when firing from auth schema
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, sessions_limit)
  VALUES (NEW.id, 'free', 2)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE (run separately in Supabase Dashboard → Storage)
-- 1. Create bucket "recordings" (private)
-- 2. Run these policies in SQL Editor:
--
-- CREATE POLICY "users_upload_recordings" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "users_read_recordings" ON storage.objects
--   FOR SELECT USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "users_delete_recordings" ON storage.objects
--   FOR DELETE USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
-- ============================================================
