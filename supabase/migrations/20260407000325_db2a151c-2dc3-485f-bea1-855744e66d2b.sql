
-- =============================================
-- 1. Restringir webhook_endpoints SELECT para admins
-- =============================================
DROP POLICY IF EXISTS "Workspace members can view webhook endpoints" ON webhook_endpoints;
CREATE POLICY "Only admins can view webhook endpoints"
  ON webhook_endpoints FOR SELECT TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- =============================================
-- 2. Tornar buckets de anexos privados
-- =============================================
UPDATE storage.buckets SET public = false WHERE id = 'task-attachments';
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Dropar políticas SELECT públicas existentes
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;

-- Criar novas políticas SELECT restritas a autenticados
CREATE POLICY "Authenticated users can view task attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can view chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');
