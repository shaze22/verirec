-- Letterhead / professional branding for counselor documents (consent, letters, reports)
ALTER TABLE counselor_profiles ADD COLUMN IF NOT EXISTS logo_data text;            -- base64 data URL (logo)
ALTER TABLE counselor_profiles ADD COLUMN IF NOT EXISTS signature_data text;       -- base64 data URL (signature for letters)
ALTER TABLE counselor_profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE counselor_profiles ADD COLUMN IF NOT EXISTS official_email text;
ALTER TABLE counselor_profiles ADD COLUMN IF NOT EXISTS org_registration_no text;  -- SSM/ROC for private practice
