-- Criar função segura para criar spaces (contorna problemas de RLS)
CREATE OR REPLACE FUNCTION public.create_space_secure(
  p_workspace_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_color text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_space_id uuid;
  v_has_permission boolean := false;
BEGIN
  -- Obter o usuário atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se tem permissão via workspace_members
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = v_user_id
    AND role IN ('admin', 'member')
  ) INTO v_has_permission;
  
  -- Ou verificar via user_roles global
  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id
      AND role IN ('global_owner', 'owner', 'admin')
    ) INTO v_has_permission;
  END IF;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Sem permissão para criar space neste workspace';
  END IF;
  
  -- Criar o space
  INSERT INTO spaces (workspace_id, name, description, color)
  VALUES (p_workspace_id, p_name, p_description, p_color)
  RETURNING id INTO v_space_id;
  
  RETURN v_space_id;
END;
$$;