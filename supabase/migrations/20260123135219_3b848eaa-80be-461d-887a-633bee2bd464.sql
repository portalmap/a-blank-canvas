-- Adicionar colunas de edição na tabela chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;

-- Criar política RLS para UPDATE (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'Users can update their own messages'
  ) THEN
    CREATE POLICY "Users can update their own messages"
    ON public.chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());
  END IF;
END $$;