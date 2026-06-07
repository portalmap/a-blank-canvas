-- Fix task_assignees.user_id to reference profiles.id instead of auth.users.id
-- This allows Supabase to resolve the join with profiles in api-gateway

-- 1. Drop the existing FK that points to auth.users
ALTER TABLE task_assignees 
DROP CONSTRAINT IF EXISTS task_assignees_user_id_fkey;

-- 2. Create new FK pointing to profiles.id
ALTER TABLE task_assignees
ADD CONSTRAINT task_assignees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;