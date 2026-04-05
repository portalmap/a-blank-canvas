
-- Create a temporary function to fix automations with template status IDs
CREATE OR REPLACE FUNCTION public.fix_template_status_ids_in_automations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auto_record RECORD;
  config jsonb;
  new_config jsonb;
  real_id uuid;
  template_item_id_val text;
  arr jsonb;
  new_arr jsonb;
  i int;
  action_item jsonb;
  action_config_item jsonb;
  updated_count int := 0;
BEGIN
  FOR auto_record IN
    SELECT a.id, a.action_config
    FROM automations a
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(
        COALESCE(a.action_config->'trigger_config'->'from_status_ids', '[]'::jsonb)
      ) val
      WHERE EXISTS (SELECT 1 FROM status_template_items sti WHERE sti.id = val::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(
        COALESCE(a.action_config->'trigger_config'->'to_status_ids', '[]'::jsonb)
      ) val
      WHERE EXISTS (SELECT 1 FROM status_template_items sti WHERE sti.id = val::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        COALESCE(a.action_config->'actions', '[]'::jsonb)
      ) act
      WHERE EXISTS (
        SELECT 1 FROM status_template_items sti 
        WHERE sti.id = (act->'config'->>'status_id')::uuid
      )
    )
  LOOP
    new_config := auto_record.action_config;
    
    -- Fix trigger_config.from_status_ids
    IF new_config->'trigger_config'->'from_status_ids' IS NOT NULL THEN
      arr := new_config->'trigger_config'->'from_status_ids';
      new_arr := '[]'::jsonb;
      FOR i IN 0..jsonb_array_length(arr)-1 LOOP
        template_item_id_val := arr->>i;
        SELECT s.id INTO real_id
        FROM statuses s
        WHERE s.template_item_id = template_item_id_val::uuid
        AND s.scope_id = (
          SELECT a2.scope_id FROM automations a2 WHERE a2.id = auto_record.id
        )
        LIMIT 1;
        
        IF real_id IS NULL THEN
          -- Fallback: any status with this template_item_id
          SELECT s.id INTO real_id
          FROM statuses s
          WHERE s.template_item_id = template_item_id_val::uuid
          LIMIT 1;
        END IF;
        
        IF real_id IS NOT NULL THEN
          new_arr := new_arr || to_jsonb(real_id::text);
        ELSE
          new_arr := new_arr || to_jsonb(template_item_id_val);
        END IF;
      END LOOP;
      new_config := jsonb_set(new_config, '{trigger_config,from_status_ids}', new_arr);
    END IF;
    
    -- Fix trigger_config.to_status_ids
    IF new_config->'trigger_config'->'to_status_ids' IS NOT NULL THEN
      arr := new_config->'trigger_config'->'to_status_ids';
      new_arr := '[]'::jsonb;
      FOR i IN 0..jsonb_array_length(arr)-1 LOOP
        template_item_id_val := arr->>i;
        SELECT s.id INTO real_id
        FROM statuses s
        WHERE s.template_item_id = template_item_id_val::uuid
        AND s.scope_id = (
          SELECT a2.scope_id FROM automations a2 WHERE a2.id = auto_record.id
        )
        LIMIT 1;
        
        IF real_id IS NULL THEN
          SELECT s.id INTO real_id
          FROM statuses s
          WHERE s.template_item_id = template_item_id_val::uuid
          LIMIT 1;
        END IF;
        
        IF real_id IS NOT NULL THEN
          new_arr := new_arr || to_jsonb(real_id::text);
        ELSE
          new_arr := new_arr || to_jsonb(template_item_id_val);
        END IF;
      END LOOP;
      new_config := jsonb_set(new_config, '{trigger_config,to_status_ids}', new_arr);
    END IF;
    
    -- Fix actions[].config.status_id
    IF new_config->'actions' IS NOT NULL THEN
      arr := new_config->'actions';
      new_arr := '[]'::jsonb;
      FOR i IN 0..jsonb_array_length(arr)-1 LOOP
        action_item := arr->i;
        IF action_item->'config'->>'status_id' IS NOT NULL THEN
          template_item_id_val := action_item->'config'->>'status_id';
          
          -- For set_status after move_task, try target_list_id first
          SELECT s.id INTO real_id
          FROM statuses s
          WHERE s.template_item_id = template_item_id_val::uuid
          LIMIT 1;
          
          IF real_id IS NOT NULL THEN
            action_item := jsonb_set(action_item, '{config,status_id}', to_jsonb(real_id::text));
          END IF;
        END IF;
        new_arr := new_arr || jsonb_build_array(action_item);
      END LOOP;
      new_config := jsonb_set(new_config, '{actions}', new_arr);
    END IF;
    
    -- Update if changed
    IF new_config IS DISTINCT FROM auto_record.action_config THEN
      UPDATE automations SET action_config = new_config WHERE id = auto_record.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Execute the fix
SELECT fix_template_status_ids_in_automations();

-- Drop the temporary function
DROP FUNCTION public.fix_template_status_ids_in_automations();
