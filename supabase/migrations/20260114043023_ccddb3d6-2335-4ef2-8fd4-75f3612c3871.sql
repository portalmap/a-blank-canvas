-- PARTE 1: Corrigir tarefas com status_id de lista diferente
-- Atualizar para o status default da lista correta

WITH tasks_to_fix AS (
  SELECT 
    t.id as task_id,
    t.list_id,
    t.status_id as old_status_id,
    s.scope_id as wrong_list_id,
    (
      SELECT id FROM statuses 
      WHERE scope_type = 'list' 
      AND scope_id = t.list_id 
      AND is_default = true 
      LIMIT 1
    ) as correct_status_id
  FROM tasks t
  JOIN statuses s ON s.id = t.status_id
  WHERE s.scope_type = 'list' AND s.scope_id != t.list_id
)
UPDATE tasks t
SET status_id = ttf.correct_status_id
FROM tasks_to_fix ttf
WHERE t.id = ttf.task_id
AND ttf.correct_status_id IS NOT NULL;

-- PARTE 2: Corrigir lista "Gabrielle Barcaló" - atribuir template
UPDATE lists 
SET status_template_id = '9e960267-f7c6-4dbe-b54c-25f1e0c04315',
    status_source = 'template'
WHERE id = 'c9ff1f7e-e758-4af8-aad3-cf751fec49fa'
AND status_template_id IS NULL;

-- PARTE 3: Sincronizar statuses do template para lista Gabrielle
-- Só inserir se ainda não existem statuses para essa lista
INSERT INTO statuses (
  workspace_id, scope_type, scope_id, name, color, 
  order_index, is_default, template_id, template_item_id, 
  category, inherit_from_parent
)
SELECT 
  'b233069a-1f45-42de-9d1d-e67f32b9cf54',
  'list',
  'c9ff1f7e-e758-4af8-aad3-cf751fec49fa',
  sti.name,
  sti.color,
  sti.order_index,
  sti.is_default,
  '9e960267-f7c6-4dbe-b54c-25f1e0c04315',
  sti.id,
  sti.category,
  true
FROM status_template_items sti
WHERE sti.template_id = '9e960267-f7c6-4dbe-b54c-25f1e0c04315'
AND NOT EXISTS (
  SELECT 1 FROM statuses 
  WHERE scope_type = 'list' 
  AND scope_id = 'c9ff1f7e-e758-4af8-aad3-cf751fec49fa'
);