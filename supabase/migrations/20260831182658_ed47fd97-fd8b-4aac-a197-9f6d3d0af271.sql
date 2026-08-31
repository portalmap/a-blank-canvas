-- chat-attachments
DROP POLICY IF EXISTS "chat_attachments_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "chat_attachments_delete_owner_or_admin" ON storage.objects;

CREATE POLICY "chat_attachments_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_delete_owner_or_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_system_admin(auth.uid()))
  );

-- stickers
DROP POLICY IF EXISTS "stickers_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "stickers_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "stickers_delete_admin" ON storage.objects;

CREATE POLICY "stickers_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stickers');

CREATE POLICY "stickers_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stickers' AND is_system_admin(auth.uid()));

CREATE POLICY "stickers_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stickers' AND is_system_admin(auth.uid()));

-- feed-attachments
DROP POLICY IF EXISTS "feed_attachments_read_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "feed_attachments_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "feed_attachments_delete_owner_or_admin" ON storage.objects;

CREATE POLICY "feed_attachments_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feed-attachments');

CREATE POLICY "feed_attachments_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feed-attachments');

CREATE POLICY "feed_attachments_delete_owner_or_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'feed-attachments'
    AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_system_admin(auth.uid()))
  );