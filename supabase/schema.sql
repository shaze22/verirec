-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users NOT NULL,
  title           text NOT NULL,
  profession      text NOT NULL,
  interviewer     text NOT NULL,
  subject_name    text NOT NULL,
  subject_role    text,
  context_notes   text,
  transcript      jsonb DEFAULT '[]'::jsonb,
  flags           jsonb DEFAULT '[]'::jsonb,
  report          jsonb,
  duration        integer DEFAULT 0,
  audio_url       text,
  consent_signed  boolean DEFAULT false,
  consent_data    jsonb,
  hash            text,
  synced          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid REFERENCES auth.users UNIQUE NOT NULL,
  plan                    text DEFAULT 'free',
  status                  text DEFAULT 'active',
  sessions_used           integer DEFAULT 0,
  sessions_limit          integer DEFAULT 3,
  billing_cycle_start     timestamptz DEFAULT now(),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  billplz_bill_id         text,
  next_billing_date       timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create free subscription on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, sessions_limit)
  VALUES (NEW.id, 'free', 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Atomic session increment with limit enforcement
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

-- Reset monthly usage (call via pg_cron on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
    SET sessions_used = 0, billing_cycle_start = now()
    WHERE billing_cycle_start < now() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at auto-trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for audio (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', false);
-- CREATE POLICY "users_own_audio" ON storage.objects FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
