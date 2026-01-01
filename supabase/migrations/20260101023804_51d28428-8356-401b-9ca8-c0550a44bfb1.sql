
-- Migrar tarefas que usam status_template_items para usar statuses do workspace
-- Template 857a3b08-9a04-4df5-80c9-b1a1fb216409: "A Fazer" (a302b5fe...) -> workspace "A Fazer" (eeadd3bc...)
-- Template b7246826-30f8-48a2-b848-aa710339e0a9: "A Fazer" (f5fb5e8d...) -> workspace "A Fazer" (eeadd3bc...)

UPDATE tasks 
SET status_id = 'eeadd3bc-a4f8-44ee-8598-aef020007643'
WHERE status_id IN ('a302b5fe-246f-4ddc-9744-526b61c65633', 'f5fb5e8d-f029-4a7e-8b75-7eaf33b955ad');

-- Restaurar a foreign key constraint
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_id_fkey 
FOREIGN KEY (status_id) REFERENCES statuses(id);

-- Atualizar o comentário
COMMENT ON COLUMN tasks.status_id IS 'ID do status da task. Referencia statuses.id.';
