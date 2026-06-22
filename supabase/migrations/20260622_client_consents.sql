-- Pre-session informed consent (in-person, counselor-read, client-signed)
-- Episode-level consent + per-session re-affirmations. Tamper-sealed via server SHA-256.

CREATE TABLE IF NOT EXISTS client_consents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id   uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),          -- counselor
  version      text NOT NULL,                                    -- consent document version
  language     text NOT NULL DEFAULT 'ms',                       -- 'ms' | 'en'
  full_name    text NOT NULL,                                    -- signer's full name (typed)
  ic_number    text,
  is_guardian  boolean NOT NULL DEFAULT false,                   -- signed by guardian (minor)
  guardian_name text,
  guardian_relationship text,
  clauses      jsonb NOT NULL DEFAULT '{}'::jsonb,               -- {clauseKey: true} acknowledgments
  signature_data text NOT NULL,                                  -- base64 PNG of drawn signature
  signed_at    timestamptz NOT NULL,
  hash         text NOT NULL,                                    -- server-computed SHA-256 seal
  user_agent   text,
  status       text NOT NULL DEFAULT 'active',                   -- active | withdrawn | superseded
  withdrawn_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_consents_subject ON client_consents(subject_id);
CREATE INDEX IF NOT EXISTS idx_client_consents_user ON client_consents(user_id);

CREATE TABLE IF NOT EXISTS consent_reaffirmations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id   uuid NOT NULL REFERENCES client_consents(id) ON DELETE CASCADE,
  subject_id   uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  session_id   uuid REFERENCES sessions(id) ON DELETE SET NULL,
  affirmed_at  timestamptz NOT NULL DEFAULT now(),
  hash         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_reaffirm_consent ON consent_reaffirmations(consent_id);

ALTER TABLE client_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_reaffirmations ENABLE ROW LEVEL SECURITY;

-- Counselor owns their clients' consents (full access)
DROP POLICY IF EXISTS cc_owner_all ON client_consents;
CREATE POLICY cc_owner_all ON client_consents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Portal client may read their own consent record(s)
DROP POLICY IF EXISTS cc_client_read ON client_consents;
CREATE POLICY cc_client_read ON client_consents FOR SELECT
  USING (EXISTS (SELECT 1 FROM subjects s WHERE s.id = client_consents.subject_id AND s.portal_user_id = auth.uid()));

DROP POLICY IF EXISTS cr_owner_all ON consent_reaffirmations;
CREATE POLICY cr_owner_all ON consent_reaffirmations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS cr_client_read ON consent_reaffirmations;
CREATE POLICY cr_client_read ON consent_reaffirmations FOR SELECT
  USING (EXISTS (SELECT 1 FROM subjects s WHERE s.id = consent_reaffirmations.subject_id AND s.portal_user_id = auth.uid()));
