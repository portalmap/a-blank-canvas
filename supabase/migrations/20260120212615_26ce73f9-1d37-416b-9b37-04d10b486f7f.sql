-- Função que sincroniza completed_at com o status
CREATE OR REPLACE FUNCTION public.sync_task_completed_at()
RETURNS TRIGGER AS $$
DECLARE
  new_status_category TEXT;
BEGIN
  -- Obter a categoria do novo status
  SELECT category INTO new_status_category
  FROM statuses
  WHERE id = NEW.status_id;
  
  -- Se o novo status é 'done' e completed_at está vazio, preencher
  IF new_status_category = 'done' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  -- Se o novo status NÃO é 'done' e completed_at está preenchido, limpar
  ELSIF new_status_category IS DISTINCT FROM 'done' AND NEW.completed_at IS NOT NULL THEN
    NEW.completed_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para executar a função em INSERT e UPDATE de status_id
DROP TRIGGER IF EXISTS trigger_sync_task_completed_at ON tasks;
CREATE TRIGGER trigger_sync_task_completed_at
  BEFORE INSERT OR UPDATE OF status_id
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_completed_at();

-- Atualizar tarefas existentes que já estão concluídas mas sem completed_at
UPDATE tasks
SET completed_at = COALESCE(tasks.updated_at, NOW())
WHERE status_id IN (SELECT id FROM statuses WHERE category = 'done')
  AND completed_at IS NULL;