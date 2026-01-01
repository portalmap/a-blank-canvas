-- Add template_item_id column to track statuses derived from templates
ALTER TABLE public.statuses 
ADD COLUMN IF NOT EXISTS template_item_id UUID REFERENCES status_template_items(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_statuses_template_item_id ON public.statuses(template_item_id);

-- Create function to sync status template items to statuses table when template is applied
CREATE OR REPLACE FUNCTION public.sync_template_statuses_for_list(
  p_list_id UUID,
  p_template_id UUID,
  p_workspace_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing synced statuses for this list
  DELETE FROM statuses 
  WHERE scope_type = 'list' 
    AND scope_id = p_list_id 
    AND template_item_id IS NOT NULL;

  -- Insert new statuses from template items
  INSERT INTO statuses (
    workspace_id,
    scope_type,
    scope_id,
    name,
    color,
    is_default,
    order_index,
    category,
    template_id,
    template_item_id
  )
  SELECT 
    p_workspace_id,
    'list',
    p_list_id,
    sti.name,
    sti.color,
    COALESCE(sti.is_default, false),
    COALESCE(sti.order_index, 0),
    sti.category,
    p_template_id,
    sti.id
  FROM status_template_items sti
  WHERE sti.template_id = p_template_id
  ORDER BY sti.order_index;
END;
$$;