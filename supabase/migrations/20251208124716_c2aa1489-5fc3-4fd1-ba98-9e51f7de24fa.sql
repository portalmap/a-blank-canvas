-- 1. Tornar workspace_id opcional na tabela documents
ALTER TABLE public.documents ALTER COLUMN workspace_id DROP NOT NULL;

-- 2. Adicionar coluna de visibilidade
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

-- 3. Adicionar link público único
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS public_link_id UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_public_link ON public.documents(public_link_id);

-- 4. Criar tabela de pastas de documentos
CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  parent_folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Adicionar folder_id na tabela documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;

-- 6. Enable RLS na tabela document_folders
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies para document_folders
CREATE POLICY "Users can view their own folders"
ON public.document_folders FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own folders"
ON public.document_folders FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own folders"
ON public.document_folders FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own folders"
ON public.document_folders FOR DELETE
USING (user_id = auth.uid());

-- 8. Dropar policies antigas de documents que dependem de workspace
DROP POLICY IF EXISTS "Members can create documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view documents with permission" ON public.documents;
DROP POLICY IF EXISTS "Creators and editors can update documents" ON public.documents;
DROP POLICY IF EXISTS "Creators can delete documents" ON public.documents;

-- 9. Criar novas policies para documents (independente de workspace)
CREATE POLICY "Users can create their own documents"
ON public.documents FOR INSERT
WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can view accessible documents"
ON public.documents FOR SELECT
USING (
  -- Criador pode ver
  created_by_user_id = auth.uid()
  -- Documento com link público
  OR visibility = 'link'
  -- Permissão explícita para usuário
  OR EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = documents.id AND dp.user_id = auth.uid()
  )
  -- Permissão via equipe
  OR EXISTS (
    SELECT 1 FROM public.document_permissions dp
    JOIN public.team_members tm ON tm.team_id = dp.team_id
    WHERE dp.document_id = documents.id AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own documents or with editor permission"
ON public.documents FOR UPDATE
USING (
  created_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.document_permissions dp
    WHERE dp.document_id = documents.id 
    AND dp.user_id = auth.uid() 
    AND dp.role = 'editor'
  )
);

CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (created_by_user_id = auth.uid());

-- 10. Atualizar policies de document_tags para funcionar sem workspace
DROP POLICY IF EXISTS "Users can view tags in their workspaces" ON public.document_tags;
DROP POLICY IF EXISTS "Admins can create tags" ON public.document_tags;
DROP POLICY IF EXISTS "Admins can update tags" ON public.document_tags;
DROP POLICY IF EXISTS "Admins can delete tags" ON public.document_tags;

-- Tornar workspace_id opcional em document_tags
ALTER TABLE public.document_tags ALTER COLUMN workspace_id DROP NOT NULL;

-- Adicionar user_id para tags pessoais
ALTER TABLE public.document_tags ADD COLUMN IF NOT EXISTS user_id UUID;

-- Novas policies para document_tags
CREATE POLICY "Users can view their tags"
ON public.document_tags FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create their tags"
ON public.document_tags FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their tags"
ON public.document_tags FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their tags"
ON public.document_tags FOR DELETE
USING (user_id = auth.uid());

-- 11. Trigger para updated_at em document_folders
CREATE TRIGGER update_document_folders_updated_at
BEFORE UPDATE ON public.document_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();