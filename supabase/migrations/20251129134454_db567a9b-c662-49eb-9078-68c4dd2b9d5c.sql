-- Force PostgREST schema reload by recreating the lists SELECT policy
-- This ensures the policy is using the latest version

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view accessible lists" ON public.lists;

-- Recreate the policy with exact same logic
CREATE POLICY "Users can view accessible lists" 
ON public.lists 
FOR SELECT 
USING (user_can_access_list(auth.uid(), id));