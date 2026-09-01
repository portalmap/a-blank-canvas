CREATE OR REPLACE FUNCTION public.can_manage_space_template(_user_id uuid, _template_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_templates st
    WHERE st.id = _template_id
      AND (
        st.created_by_user_id = _user_id
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'owner')
        OR public.has_role(_user_id, 'global_owner')
        OR public.is_hub_global_admin(_user_id)
        OR (st.workspace_id IS NOT NULL AND public.is_workspace_admin(_user_id, st.workspace_id))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'owner')
      OR public.has_role(_user_id, 'global_owner')
      OR public.is_hub_global_admin(_user_id)
$$;

-- space_templates: consolidate write policies
DROP POLICY IF EXISTS "Creators can update their templates" ON public.space_templates;
DROP POLICY IF EXISTS "Template creators can update" ON public.space_templates;
DROP POLICY IF EXISTS "Creators can delete their templates" ON public.space_templates;
DROP POLICY IF EXISTS "Template creators can delete" ON public.space_templates;
DROP POLICY IF EXISTS "Workspace members can create templates" ON public.space_templates;
DROP POLICY IF EXISTS "Authenticated users can create global templates" ON public.space_templates;

CREATE POLICY "Creators and admins can update templates"
ON public.space_templates FOR UPDATE TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR public.is_app_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_admin(auth.uid(), workspace_id))
)
WITH CHECK (
  created_by_user_id = auth.uid()
  OR public.is_app_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_admin(auth.uid(), workspace_id))
);

CREATE POLICY "Creators and admins can delete templates"
ON public.space_templates FOR DELETE TO authenticated
USING (
  created_by_user_id = auth.uid()
  OR public.is_app_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_admin(auth.uid(), workspace_id))
);

CREATE POLICY "Members and admins can create templates"
ON public.space_templates FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by_user_id = auth.uid()
  AND (
    public.is_app_admin(auth.uid())
    OR workspace_id IS NULL
    OR public.user_is_workspace_member(auth.uid(), workspace_id)
  )
);

-- child tables
DROP POLICY IF EXISTS "Creators can manage template folders" ON public.space_template_folders;
CREATE POLICY "Creators and admins can manage template folders"
ON public.space_template_folders FOR ALL TO authenticated
USING (public.can_manage_space_template(auth.uid(), template_id))
WITH CHECK (public.can_manage_space_template(auth.uid(), template_id));

DROP POLICY IF EXISTS "Creators can manage template lists" ON public.space_template_lists;
CREATE POLICY "Creators and admins can manage template lists"
ON public.space_template_lists FOR ALL TO authenticated
USING (public.can_manage_space_template(auth.uid(), template_id))
WITH CHECK (public.can_manage_space_template(auth.uid(), template_id));

DROP POLICY IF EXISTS "Creators can manage template tasks" ON public.space_template_tasks;
CREATE POLICY "Creators and admins can manage template tasks"
ON public.space_template_tasks FOR ALL TO authenticated
USING (public.can_manage_space_template(auth.uid(), template_id))
WITH CHECK (public.can_manage_space_template(auth.uid(), template_id));

DROP POLICY IF EXISTS "Creators can manage template automations" ON public.space_template_automations;
CREATE POLICY "Creators and admins can manage template automations"
ON public.space_template_automations FOR ALL TO authenticated
USING (public.can_manage_space_template(auth.uid(), template_id))
WITH CHECK (public.can_manage_space_template(auth.uid(), template_id));