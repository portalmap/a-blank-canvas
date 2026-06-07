
-- Fase 1: Migração do Banco de Dados para Sistema de Documentos Completo

-- Adicionar novos campos à tabela documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS emoji text,
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS is_wiki boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Criar tabela de páginas de documentos (hierarquia)
CREATE TABLE IF NOT EXISTS public.document_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  parent_page_id uuid REFERENCES public.document_pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer DEFAULT 0,
  is_protected boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de tags de documentos
CREATE TABLE IF NOT EXISTS public.document_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Criar tabela de relação documento-tag
CREATE TABLE IF NOT EXISTS public.document_tag_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.document_tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, tag_id)
);

-- Criar tabela de contribuidores de documentos
CREATE TABLE IF NOT EXISTS public.document_contributors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'contributor' CHECK (role IN ('owner', 'contributor')),
  last_contributed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Criar tabela de favoritos de documentos (por usuário)
CREATE TABLE IF NOT EXISTS public.document_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Enable RLS em todas as novas tabelas
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_favorites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para document_pages
CREATE POLICY "Users can view pages of accessible documents"
ON public.document_pages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_pages.document_id
  AND (
    d.created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), d.workspace_id)
    OR EXISTS (
      SELECT 1 FROM document_permissions dp
      WHERE dp.document_id = d.id AND dp.user_id = auth.uid()
    )
  )
));

CREATE POLICY "Users can create pages in accessible documents"
ON public.document_pages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_pages.document_id
  AND (
    d.created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), d.workspace_id)
    OR EXISTS (
      SELECT 1 FROM document_permissions dp
      WHERE dp.document_id = d.id AND dp.user_id = auth.uid() AND dp.role = 'editor'
    )
  )
));

CREATE POLICY "Users can update pages they have access to"
ON public.document_pages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_pages.document_id
  AND (
    d.created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), d.workspace_id)
    OR EXISTS (
      SELECT 1 FROM document_permissions dp
      WHERE dp.document_id = d.id AND dp.user_id = auth.uid() AND dp.role = 'editor'
    )
  )
));

CREATE POLICY "Users can delete pages they have access to"
ON public.document_pages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_pages.document_id
  AND (
    d.created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), d.workspace_id)
  )
));

-- Políticas RLS para document_tags
CREATE POLICY "Users can view tags in their workspaces"
ON public.document_tags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = document_tags.workspace_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Admins can create tags"
ON public.document_tags FOR INSERT
WITH CHECK (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update tags"
ON public.document_tags FOR UPDATE
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete tags"
ON public.document_tags FOR DELETE
USING (user_is_workspace_admin(auth.uid(), workspace_id));

-- Políticas RLS para document_tag_relations
CREATE POLICY "Users can view tag relations"
ON public.document_tag_relations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM documents d
  JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
  WHERE d.id = document_tag_relations.document_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Users can add tags to their documents"
ON public.document_tag_relations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_tag_relations.document_id
  AND (
    d.created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), d.workspace_id)
    OR EXISTS (
      SELECT 1 FROM document_permissions dp
      WHERE dp.document_id = d.id AND dp.user_id = auth.uid() AND dp.role = 'editor'
    )
  )
));

CREATE POLICY "Users can remove tags from their documents"
ON public.document_tag_relations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_tag_relations.document_id
  AND (
    d.created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), d.workspace_id)
  )
));

-- Políticas RLS para document_contributors
CREATE POLICY "Users can view contributors of accessible documents"
ON public.document_contributors FOR SELECT
USING (EXISTS (
  SELECT 1 FROM documents d
  JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
  WHERE d.id = document_contributors.document_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Document owners can manage contributors"
ON public.document_contributors FOR ALL
USING (EXISTS (
  SELECT 1 FROM documents d
  WHERE d.id = document_contributors.document_id
  AND (d.created_by_user_id = auth.uid() OR user_is_workspace_admin(auth.uid(), d.workspace_id))
));

-- Políticas RLS para document_favorites
CREATE POLICY "Users can view their own favorites"
ON public.document_favorites FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites"
ON public.document_favorites FOR INSERT
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM documents d
  JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
  WHERE d.id = document_favorites.document_id AND wm.user_id = auth.uid()
));

CREATE POLICY "Users can remove their favorites"
ON public.document_favorites FOR DELETE
USING (user_id = auth.uid());

-- Trigger para atualizar updated_at em document_pages
CREATE TRIGGER update_document_pages_updated_at
BEFORE UPDATE ON public.document_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON public.documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON public.documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_is_wiki ON public.documents(is_wiki);
CREATE INDEX IF NOT EXISTS idx_document_pages_document ON public.document_pages(document_id);
CREATE INDEX IF NOT EXISTS idx_document_pages_parent ON public.document_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_workspace ON public.document_tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_relations_document ON public.document_tag_relations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tag_relations_tag ON public.document_tag_relations(tag_id);
CREATE INDEX IF NOT EXISTS idx_document_contributors_document ON public.document_contributors(document_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_user ON public.document_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_document_favorites_document ON public.document_favorites(document_id);
