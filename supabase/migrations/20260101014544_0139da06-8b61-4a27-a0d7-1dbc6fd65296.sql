
-- Remover a FK constraint que força status_id referenciar apenas statuses
-- Isso permite que tasks usem status de status_template_items também
ALTER TABLE tasks DROP CONSTRAINT tasks_status_id_fkey;

-- Adicionar um comentário explicativo
COMMENT ON COLUMN tasks.status_id IS 'ID do status da task. Pode referenciar statuses.id ou status_template_items.id dependendo da configuração da lista.';
