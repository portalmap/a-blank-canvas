
-- Criar bucket chat-attachments (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);

-- Política de SELECT: leitura pública
CREATE POLICY "Public read access for chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Política de INSERT: apenas usuários autenticados
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Política de DELETE: apenas o dono do arquivo
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
