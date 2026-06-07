-- Criar função para Proprietário Global buscar todos os usuários
CREATE OR REPLACE FUNCTION public.get_all_users_for_global_owner()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas proprietários globais podem executar
  IF NOT is_global_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only global owners can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Criar perfil para o usuário atual se não existir
INSERT INTO public.profiles (id, full_name)
VALUES ('472e91d2-b8a4-4dda-8f52-8d1a5fafc6b2', 'Proprietário Global')
ON CONFLICT (id) DO NOTHING;