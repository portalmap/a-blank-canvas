-- Criar função para deletar usuário completamente do sistema
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é global_owner
  IF NOT is_global_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only global owners can delete users';
  END IF;
  
  -- Verificar se não está tentando deletar a si mesmo
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own user account';
  END IF;
  
  -- Verificar se o alvo não é um global_owner
  IF is_global_owner(target_user_id) THEN
    RAISE EXCEPTION 'Cannot delete a global owner';
  END IF;
  
  -- Deletar o usuário (cascateia para profiles, workspace_members, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN true;
END;
$$;