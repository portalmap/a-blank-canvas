CREATE POLICY "task_attachments_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_delete_authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments');