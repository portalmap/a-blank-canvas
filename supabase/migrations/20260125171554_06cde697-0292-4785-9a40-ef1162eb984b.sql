-- Add status_template_id column to space_template_lists
ALTER TABLE space_template_lists 
ADD COLUMN status_template_id uuid REFERENCES status_templates(id) ON DELETE SET NULL;