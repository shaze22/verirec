-- Enable Supabase Realtime for client portal messages (live updates for portal & counselor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'portal_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE portal_messages;
  END IF;
END $$;
