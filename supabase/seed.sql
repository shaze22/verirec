-- Test seed data — run AFTER schema.sql
-- Replace 'YOUR_TEST_USER_UUID' with a real user UUID from auth.users

-- Example subscription upgrade to starter
-- UPDATE subscriptions SET plan = 'starter', sessions_limit = 20 WHERE user_id = 'YOUR_TEST_USER_UUID';

-- Example session
-- INSERT INTO sessions (user_id, title, profession, interviewer, subject_name, subject_role)
-- VALUES ('YOUR_TEST_USER_UUID', 'Sesi Kaunseling #1', 'counselor', 'Dr. Ahmad', 'Encik Razif', 'Klien');
