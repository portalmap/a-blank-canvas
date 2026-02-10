
CREATE OR REPLACE FUNCTION public.user_can_access_document(_user_id uuid, _document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents WHERE id = _document_id AND created_by_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM document_permissions WHERE document_id = _document_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM document_permissions dp
    JOIN team_members tm ON tm.team_id = dp.team_id
    WHERE dp.document_id = _document_id AND tm.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM documents WHERE id = _document_id AND visibility = 'link'
  ) OR EXISTS (
    -- Wikis são visíveis para todos os membros do workspace
    SELECT 1 FROM documents d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = _document_id
      AND d.is_wiki = true
      AND wm.user_id = _user_id
  );
$$;
