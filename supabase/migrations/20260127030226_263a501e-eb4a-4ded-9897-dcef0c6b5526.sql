-- Adicionar novos campos à tabela space_template_tasks
ALTER TABLE public.space_template_tasks
ADD COLUMN start_date_offset INTEGER,
ADD COLUMN due_date_offset INTEGER,
ADD COLUMN status_template_item_id UUID REFERENCES public.status_template_items(id) ON DELETE SET NULL,
ADD COLUMN estimated_time INTEGER,
ADD COLUMN is_milestone BOOLEAN DEFAULT false,
ADD COLUMN tag_names TEXT[];