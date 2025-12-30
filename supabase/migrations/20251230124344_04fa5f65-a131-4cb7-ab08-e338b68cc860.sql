-- Add category column to statuses table
ALTER TABLE statuses 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'active';

-- Update existing statuses based on their names
UPDATE statuses SET category = 'not_started' 
WHERE category IS NULL OR category = 'active' AND (
  LOWER(name) LIKE '%fazer%' OR 
  LOWER(name) LIKE '%todo%' OR 
  LOWER(name) LIKE '%to do%' OR
  LOWER(name) LIKE '%pendente%' OR
  LOWER(name) LIKE '%aguardando%' OR
  LOWER(name) LIKE '%backlog%'
);

UPDATE statuses SET category = 'in_progress' 
WHERE category = 'active' AND (
  LOWER(name) LIKE '%progresso%' OR 
  LOWER(name) LIKE '%andamento%' OR 
  LOWER(name) LIKE '%progress%' OR
  LOWER(name) LIKE '%revisão%' OR
  LOWER(name) LIKE '%review%' OR
  LOWER(name) LIKE '%working%'
);

UPDATE statuses SET category = 'done' 
WHERE category = 'active' AND (
  LOWER(name) LIKE '%conclu%' OR 
  LOWER(name) LIKE '%feito%' OR 
  LOWER(name) LIKE '%done%' OR 
  LOWER(name) LIKE '%complete%' OR
  LOWER(name) LIKE '%finalizado%' OR
  LOWER(name) LIKE '%aprovado%' OR
  LOWER(name) LIKE '%closed%'
);

-- Also update status_template_items table to support 4 categories
-- The category column already exists, just need to ensure it supports all 4 values