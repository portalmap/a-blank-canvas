-- Criar bucket para anexos de tarefas
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Política para usuários autenticados fazerem upload
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' AND
  auth.role() = 'authenticated'
);

-- Política para visualização pública dos anexos
CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

-- Política para usuários deletarem seus próprios anexos
CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);