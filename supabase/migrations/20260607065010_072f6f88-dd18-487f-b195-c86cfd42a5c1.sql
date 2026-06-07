
ALTER TABLE public.workspaces DISABLE TRIGGER on_workspace_created;

DO $$
DECLARE v_uid uuid; v_wid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email='victorborges@assessoriamap.com.br';
  INSERT INTO public.workspaces (name, description, created_by_user_id)
  VALUES ('Workspace Principal', 'Workspace inicial', v_uid)
  RETURNING id INTO v_wid;
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_wid, v_uid, 'admin')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role='admin';
END $$;

ALTER TABLE public.workspaces ENABLE TRIGGER on_workspace_created;
