CREATE OR REPLACE FUNCTION public.resync_template_statuses(
  p_template_id uuid,
  p_reassign jsonb DEFAULT '{}'::jsonb,
  p_removed_item_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope RECORD;
  v_status RECORD;
  v_dup RECORD;
  v_keep uuid;
  v_item RECORD;
  v_target_item uuid;
  v_target_status uuid;
  v_has_tasks boolean;
  v_max_order int;
BEGIN
  FOR v_scope IN
    SELECT 'list'::status_scope AS scope_type, l.id AS scope_id, l.workspace_id
    FROM public.lists l
    WHERE l.status_source = 'template' AND l.status_template_id = p_template_id
    UNION ALL
    SELECT 'folder'::status_scope, f.id, sp.workspace_id
    FROM public.folders f
    JOIN public.spaces sp ON sp.id = f.space_id
    WHERE f.status_source = 'template' AND f.status_template_id = p_template_id
    UNION ALL
    SELECT 'space'::status_scope, s.id, s.workspace_id
    FROM public.spaces s
    WHERE s.status_source = 'template' AND s.status_template_id = p_template_id
  LOOP
    -- 0. Unifica duplicidades de vínculo
    FOR v_dup IN
      SELECT st.template_item_id AS item_id
      FROM public.statuses st
      WHERE st.scope_type = v_scope.scope_type
        AND st.scope_id = v_scope.scope_id
        AND st.template_item_id IS NOT NULL
      GROUP BY st.template_item_id
      HAVING count(*) > 1
    LOOP
      SELECT id INTO v_keep
      FROM public.statuses
      WHERE scope_type = v_scope.scope_type
        AND scope_id = v_scope.scope_id
        AND template_item_id = v_dup.item_id
      ORDER BY created_at NULLS LAST, id
      LIMIT 1;

      UPDATE public.tasks t SET status_id = v_keep
      WHERE t.status_id IN (
        SELECT id FROM public.statuses
        WHERE scope_type = v_scope.scope_type
          AND scope_id = v_scope.scope_id
          AND template_item_id = v_dup.item_id
          AND id <> v_keep
      );

      DELETE FROM public.statuses
      WHERE scope_type = v_scope.scope_type
        AND scope_id = v_scope.scope_id
        AND template_item_id = v_dup.item_id
        AND id <> v_keep;
    END LOOP;

    -- 1. Religa etapas sem vínculo, casando por nome normalizado
    FOR v_item IN
      SELECT sti.id, sti.name
      FROM public.status_template_items sti
      WHERE sti.template_id = p_template_id
        AND NOT EXISTS (
          SELECT 1 FROM public.statuses s2
          WHERE s2.scope_type = v_scope.scope_type
            AND s2.scope_id = v_scope.scope_id
            AND s2.template_item_id = sti.id
        )
      ORDER BY sti.order_index, sti.id
    LOOP
      SELECT st.id INTO v_target_status
      FROM public.statuses st
      WHERE st.scope_type = v_scope.scope_type
        AND st.scope_id = v_scope.scope_id
        AND st.template_item_id IS NULL
        AND public.norm_status_name(st.name) = public.norm_status_name(v_item.name)
      ORDER BY st.created_at NULLS LAST, st.id
      LIMIT 1;

      IF v_target_status IS NOT NULL THEN
        UPDATE public.statuses
        SET template_item_id = v_item.id,
            template_id = p_template_id
        WHERE id = v_target_status;
        v_target_status := NULL;
      END IF;
    END LOOP;

    -- 2. Propaga os dados do modelo
    UPDATE public.statuses st
    SET name = sti.name,
        color = sti.color,
        is_default = COALESCE(sti.is_default, false),
        order_index = COALESCE(sti.order_index, 0),
        category = sti.category,
        template_id = p_template_id
    FROM public.status_template_items sti
    WHERE st.template_item_id = sti.id
      AND sti.template_id = p_template_id
      AND st.scope_type = v_scope.scope_type
      AND st.scope_id = v_scope.scope_id;

    -- 3. Cria as etapas que faltam
    INSERT INTO public.statuses (
      workspace_id, scope_type, scope_id, name, color,
      is_default, order_index, category, template_id, template_item_id
    )
    SELECT v_scope.workspace_id, v_scope.scope_type, v_scope.scope_id, sti.name, sti.color,
           COALESCE(sti.is_default, false), COALESCE(sti.order_index, 0), sti.category,
           p_template_id, sti.id
    FROM public.status_template_items sti
    WHERE sti.template_id = p_template_id
      AND NOT EXISTS (
        SELECT 1 FROM public.statuses s2
        WHERE s2.scope_type = v_scope.scope_type
          AND s2.scope_id = v_scope.scope_id
          AND s2.template_item_id = sti.id
      );

    -- 4. Etapas cujo item saiu do modelo
    FOR v_status IN
      SELECT st.id, st.name, st.template_item_id
      FROM public.statuses st
      WHERE st.scope_type = v_scope.scope_type
        AND st.scope_id = v_scope.scope_id
        AND st.template_item_id IS NOT NULL
        AND (
          st.template_item_id = ANY(p_removed_item_ids)
          OR NOT EXISTS (
            SELECT 1 FROM public.status_template_items sti
            WHERE sti.id = st.template_item_id AND sti.template_id = p_template_id
          )
        )
    LOOP
      v_target_item := NULLIF(p_reassign->>v_status.template_item_id::text, '')::uuid;

      v_target_status := NULL;
      IF v_target_item IS NOT NULL THEN
        SELECT s2.id INTO v_target_status
        FROM public.statuses s2
        WHERE s2.scope_type = v_scope.scope_type
          AND s2.scope_id = v_scope.scope_id
          AND s2.template_item_id = v_target_item
        LIMIT 1;
      END IF;

      SELECT EXISTS (SELECT 1 FROM public.tasks t WHERE t.status_id = v_status.id)
        INTO v_has_tasks;

      IF v_has_tasks THEN
        IF v_target_status IS NULL THEN
          RAISE EXCEPTION 'Não é possível excluir a etapa "%": existem tarefas nela. Escolha uma etapa de destino para transferir as tarefas.', v_status.name;
        END IF;
        UPDATE public.tasks SET status_id = v_target_status WHERE status_id = v_status.id;
      END IF;

      DELETE FROM public.statuses WHERE id = v_status.id;
    END LOOP;

    -- 5. Etapas extras sem vínculo
    SELECT COALESCE(max(COALESCE(order_index, 0)), 0) INTO v_max_order
    FROM public.statuses
    WHERE scope_type = v_scope.scope_type
      AND scope_id = v_scope.scope_id
      AND template_item_id IS NOT NULL;

    DELETE FROM public.statuses st
    WHERE st.scope_type = v_scope.scope_type
      AND st.scope_id = v_scope.scope_id
      AND st.template_item_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.status_id = st.id);

    UPDATE public.statuses st
    SET order_index = v_max_order + 1,
        is_default = false
    WHERE st.scope_type = v_scope.scope_type
      AND st.scope_id = v_scope.scope_id
      AND st.template_item_id IS NULL
      AND COALESCE(st.order_index, 0) <= v_max_order;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resync_template_statuses(uuid, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resync_template_statuses(uuid, jsonb, uuid[]) TO authenticated;