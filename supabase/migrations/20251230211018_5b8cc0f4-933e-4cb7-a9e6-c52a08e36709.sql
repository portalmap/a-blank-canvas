-- Fix infinite recursion in dashboards RLS policies

-- 1. Drop all existing policies on dashboards table
DROP POLICY IF EXISTS "Members can create dashboards" ON dashboards;
DROP POLICY IF EXISTS "Users can view dashboards with permission" ON dashboards;
DROP POLICY IF EXISTS "Creators and editors can update dashboards" ON dashboards;
DROP POLICY IF EXISTS "Creators can delete dashboards" ON dashboards;

-- 2. Create SELECT policy - members can view workspace dashboards
CREATE POLICY "Users can view workspace dashboards" ON dashboards
  FOR SELECT
  USING (user_is_workspace_member(auth.uid(), workspace_id));

-- 3. Create INSERT policy - members can create dashboards
CREATE POLICY "Members can create dashboards" ON dashboards
  FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND user_is_workspace_member(auth.uid(), workspace_id)
  );

-- 4. Create UPDATE policy - creators or admins can update
CREATE POLICY "Creators can update dashboards" ON dashboards
  FOR UPDATE
  USING (
    created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), workspace_id)
  );

-- 5. Create DELETE policy - creators or admins can delete
CREATE POLICY "Creators can delete dashboards" ON dashboards
  FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    OR user_is_workspace_admin(auth.uid(), workspace_id)
  );