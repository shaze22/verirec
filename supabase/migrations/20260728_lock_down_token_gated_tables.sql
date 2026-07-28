-- Applied to production 2026-07-28 (migration 20260728075434).
-- Public token-gated pages used anon SELECT/UPDATE policies with USING (true), so
-- anyone holding the (public) anon key could read and modify every row without a
-- token. Replace direct table access with SECURITY DEFINER functions that resolve
-- exactly one row by its secret token.
-- NOTE: counselor_consent_requests.token and counselor_session_acks.token are uuid,
-- the rest are text — compared as ::text so a malformed token returns no row
-- instead of raising an invalid-input error.

-- ── client_assessments (PHQ-9 / GAD-7 / DASS-21 results) ──────────────────
create or replace function public.get_assessment_by_token(p_token text)
returns table (id uuid, test_type text, subject_name text, status text, expires_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.test_type, a.subject_name, a.status, a.expires_at
  from client_assessments a where a.token::text = p_token limit 1;
$$;

create or replace function public.submit_assessment(
  p_token text, p_answers jsonb, p_scores jsonb, p_interpretation text
) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare updated int;
begin
  update client_assessments
     set status = 'completed', answers = p_answers, scores = p_scores,
         interpretation = p_interpretation, completed_at = now()
   where token::text = p_token and status = 'pending' and expires_at > now();
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ── counselor_consent_requests ────────────────────────────────────────────
create or replace function public.get_counselor_consent_by_token(p_token text)
returns table (id uuid, subject_name text, counselor_name text, purpose text,
               consent_given boolean, expires_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.subject_name, c.counselor_name, c.purpose, c.consent_given, c.expires_at
  from counselor_consent_requests c where c.token::text = p_token limit 1;
$$;

create or replace function public.submit_counselor_consent(p_token text)
returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare updated int;
begin
  update counselor_consent_requests
     set consent_given = true, consented_at = now()
   where token::text = p_token and consent_given = false and expires_at > now();
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ── counselor_session_acks ────────────────────────────────────────────────
create or replace function public.get_counselor_ack_by_token(p_token text)
returns table (id uuid, client_name text, session_summary text, acknowledged boolean,
               expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.client_name, a.session_summary, a.acknowledged, a.expires_at, a.created_at
  from counselor_session_acks a where a.token::text = p_token limit 1;
$$;

create or replace function public.submit_counselor_ack(p_token text, p_corrections text)
returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare updated int;
begin
  update counselor_session_acks
     set acknowledged = true, acknowledged_at = now(),
         corrections = nullif(btrim(coalesce(p_corrections, '')), '')
   where token::text = p_token and acknowledged = false and expires_at > now();
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ── consent_requests (verirec.app pre-session consent) ────────────────────
create or replace function public.get_consent_request_by_token(p_token text)
returns table (id uuid, subject_name text, purpose text, interviewer_name text,
               consent_given boolean, expires_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id, c.subject_name, c.purpose, c.interviewer_name, c.consent_given, c.expires_at
  from consent_requests c where c.token::text = p_token limit 1;
$$;

create or replace function public.submit_consent_request(p_token text)
returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare updated int;
begin
  update consent_requests
     set consent_given = true, consented_at = now()
   where token::text = p_token and consent_given = false and expires_at > now();
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ── statement_acknowledgements (+ the session it refers to) ───────────────
-- The page also needs the transcript, which anon could never read (and asked for
-- a column name that does not exist), so the statement portal showed nothing.
create or replace function public.get_statement_by_token(p_token text)
returns table (id uuid, session_id uuid, subject_name text, acknowledged boolean,
               expires_at timestamptz, session_title text, session_profession text,
               session_subject_name text, session_interviewer text, session_transcript jsonb,
               session_hash text, session_created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select a.id, a.session_id, a.subject_name, a.acknowledged, a.expires_at,
         s.title, s.profession, s.subject_name, s.interviewer,
         s.transcript, s.hash, s.created_at
  from statement_acknowledgements a
  left join sessions s on s.id = a.session_id
  where a.token::text = p_token limit 1;
$$;

create or replace function public.submit_statement_ack(p_token text, p_corrections text)
returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare updated int;
begin
  update statement_acknowledgements
     set acknowledged = true, acknowledged_at = now(),
         corrections = nullif(btrim(coalesce(p_corrections, '')), '')
   where token::text = p_token and acknowledged = false and expires_at > now();
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ── client_intake_forms ───────────────────────────────────────────────────
create or replace function public.get_intake_form_by_token(p_token text)
returns table (id uuid, subject_name text, status text, expires_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.id, f.subject_name, f.status, f.expires_at
  from client_intake_forms f where f.token::text = p_token limit 1;
$$;

create or replace function public.submit_intake_form(p_token text, p_answers jsonb)
returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare updated int;
begin
  update client_intake_forms
     set status = 'completed', completed_at = now(), form_answers = p_answers
   where token::text = p_token and status <> 'completed' and expires_at > now();
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- ── Grants: only these functions are reachable anonymously ────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'get_assessment_by_token(text)', 'submit_assessment(text,jsonb,jsonb,text)',
    'get_counselor_consent_by_token(text)', 'submit_counselor_consent(text)',
    'get_counselor_ack_by_token(text)', 'submit_counselor_ack(text,text)',
    'get_consent_request_by_token(text)', 'submit_consent_request(text)',
    'get_statement_by_token(text)', 'submit_statement_ack(text,text)',
    'get_intake_form_by_token(text)', 'submit_intake_form(text,jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public', fn);
    execute format('grant execute on function public.%s to anon, authenticated', fn);
  end loop;
end $$;

-- ── Drop the wide-open table policies ─────────────────────────────────────
drop policy if exists ca_public_select               on client_assessments;
drop policy if exists ca_public_complete             on client_assessments;
drop policy if exists public_read_by_token           on counselor_consent_requests;
drop policy if exists public_update_by_token         on counselor_consent_requests;
drop policy if exists public_read_by_token           on counselor_session_acks;
drop policy if exists public_update_by_token         on counselor_session_acks;
drop policy if exists consent_requests_public_select on consent_requests;
drop policy if exists consent_requests_public_update on consent_requests;
drop policy if exists ack_public_select              on statement_acknowledgements;
drop policy if exists ack_public_update              on statement_acknowledgements;
drop policy if exists public_read_intake_form        on client_intake_forms;
drop policy if exists public_submit_intake_form      on client_intake_forms;
