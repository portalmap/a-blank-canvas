-- 1. Criar função para verificar se usuário é criador do documento
CREATE OR REPLACE FUNCTION public.is_document_creator(_user_id uuid, _document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents WHERE id = _document_id AND created_by_user_id = _user_id
  );
$$;

-- 2. Criar função para verificar se usuário pode acessar documento
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
  );
$$;

-- 3. Dropar policies problemáticas de documents
DROP POLICY IF EXISTS "Users can view accessible documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents or with editor permission" ON documents;

-- 4. Recriar policies de documents sem recursão
CREATE POLICY "Users can view accessible documents"
ON documents FOR SELECT
USING (
  created_by_user_id = auth.uid()
  OR visibility = 'link'
  OR user_can_access_document(auth.uid(), id)
);

CREATE POLICY "Users can update accessible documents"
ON documents FOR UPDATE
USING (
  created_by_user_id = auth.uid()
  OR user_can_access_document(auth.uid(), id)
);

-- 5. Dropar policies problemáticas de document_permissions
DROP POLICY IF EXISTS "Document creators can manage permissions" ON document_permissions;
DROP POLICY IF EXISTS "Users can view document permissions" ON document_permissions;

-- 6. Recriar policies de document_permissions sem recursão
CREATE POLICY "Document creators can manage permissions"
ON document_permissions FOR ALL
USING (is_document_creator(auth.uid(), document_id));

CREATE POLICY "Users can view their permissions"
ON document_permissions FOR SELECT
USING (user_id = auth.uid() OR is_document_creator(auth.uid(), document_id));