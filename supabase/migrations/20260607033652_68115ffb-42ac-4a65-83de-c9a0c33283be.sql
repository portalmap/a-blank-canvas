DO $$
DECLARE v_ws uuid;
BEGIN
  ALTER TABLE workspaces DISABLE TRIGGER USER;
  INSERT INTO workspaces (name) VALUES ('Workspace Padrão') RETURNING id INTO v_ws;
  ALTER TABLE workspaces ENABLE TRIGGER USER;
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_ws, '6989a3bc-27c5-4b63-bf52-c4394c111de6', 'admin')
  ON CONFLICT DO NOTHING;
END $$;