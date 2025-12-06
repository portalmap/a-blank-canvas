-- Inserir status padrão para workspaces existentes que não têm status
INSERT INTO public.statuses (workspace_id, name, color, is_default, order_index, scope_type)
SELECT 
  w.id,
  s.name,
  s.color,
  s.is_default,
  s.order_index,
  'workspace'::status_scope
FROM workspaces w
CROSS JOIN (VALUES 
  ('A Fazer', '#94a3b8', 0, true),
  ('Em Progresso', '#3b82f6', 1, false),
  ('Concluído', '#22c55e', 2, false)
) AS s(name, color, order_index, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM statuses st WHERE st.workspace_id = w.id
);

-- Criar trigger para criar status padrão automaticamente ao criar workspace
CREATE TRIGGER on_workspace_created_create_default_statuses
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_statuses_for_workspace();