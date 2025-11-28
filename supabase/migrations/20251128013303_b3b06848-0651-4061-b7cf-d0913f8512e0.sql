-- Adicionar coluna created_by se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Função para adicionar o criador como membro do workspace
CREATE OR REPLACE FUNCTION public.add_workspace_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir o criador como membro owner do workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  -- Atualizar created_by_user_id e owner_user_id
  NEW.created_by_user_id := auth.uid();
  NEW.owner_user_id := auth.uid();
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar ANTES da inserção de workspace
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  BEFORE INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.add_workspace_creator_as_member();