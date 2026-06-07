-- Adicionar colunas de rastreamento de origem na tabela task_assignees
ALTER TABLE task_assignees 
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS source_id uuid;

-- Comentário para documentação
COMMENT ON COLUMN task_assignees.source_type IS 'Tipo do escopo de origem da automação (workspace, space, folder, list)';
COMMENT ON COLUMN task_assignees.source_id IS 'ID do escopo de origem da automação';