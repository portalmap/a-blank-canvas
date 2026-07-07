
CREATE OR REPLACE FUNCTION public.sync_hub_role_to_app_roles(_user_id uuid, _role_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target app_role;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Map Hub role slug to local app_role (only global roles; workspace roles are managed via workspace_members).
  v_target := CASE _role_slug
    WHEN 'administrador_global' THEN 'global_owner'::app_role
    WHEN 'administrador'        THEN 'admin'::app_role
    ELSE NULL
  END;

  -- Remove entradas gerenciadas pelo Hub que não correspondem mais ao slug atual.
  -- Nunca removemos 'owner' (papel técnico interno, não emitido pelo Hub).
  DELETE FROM public.user_roles
  WHERE user_id = _user_id
    AND role IN ('global_owner'::app_role, 'admin'::app_role)
    AND (v_target IS NULL OR role <> v_target);

  IF v_target IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, v_target)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Backfill: sincroniza usuários já existentes que tenham role_slug definido.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, role_slug FROM public.profiles WHERE role_slug IS NOT NULL LOOP
    PERFORM public.sync_hub_role_to_app_roles(r.id, r.role_slug);
  END LOOP;
END $$;
