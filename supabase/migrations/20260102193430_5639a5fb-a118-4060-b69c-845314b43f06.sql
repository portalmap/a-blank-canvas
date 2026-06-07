-- 1. Criar função SECURITY DEFINER para verificar membros do canal (evita recursão)
CREATE OR REPLACE FUNCTION public.user_is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_channel_members
    WHERE channel_id = _channel_id
    AND user_id = _user_id
  )
$$;

-- 2. Remover política problemática que causa recursão
DROP POLICY IF EXISTS "Users can view custom channels as members" ON chat_channels;

-- 3. Recriar política usando a função SECURITY DEFINER (sem recursão)
CREATE POLICY "Users can view custom channels as members"
ON chat_channels FOR SELECT
USING (
  type = 'custom' 
  AND public.user_is_channel_member(auth.uid(), id)
);