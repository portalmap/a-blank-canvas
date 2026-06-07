-- Adicionar colunas de atribuição na tabela chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS assignee_id uuid,
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_by uuid;