-- Track where consent was signed: counselor device (in_person) vs client portal
ALTER TABLE client_consents ADD COLUMN IF NOT EXISTS signed_via text NOT NULL DEFAULT 'in_person';
