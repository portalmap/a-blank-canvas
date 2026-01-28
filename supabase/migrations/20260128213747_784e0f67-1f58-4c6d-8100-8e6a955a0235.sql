-- Add recurrence columns to space_template_tasks
ALTER TABLE space_template_tasks 
ADD COLUMN IF NOT EXISTS start_date_recurrence JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS due_date_recurrence JSONB DEFAULT NULL;