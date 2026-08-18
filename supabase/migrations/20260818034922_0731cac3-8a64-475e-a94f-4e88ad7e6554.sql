CREATE OR REPLACE FUNCTION public.update_user_avatar_as_admin(target_user_id uuid, new_avatar_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can update avatars';
  END IF;

  UPDATE public.profiles
  SET avatar_url = new_avatar_url,
      avatar_path = NULL,
      avatar_origem = 'local',
      updated_at = now()
  WHERE id = target_user_id;

  RETURN true;
END;
$$;