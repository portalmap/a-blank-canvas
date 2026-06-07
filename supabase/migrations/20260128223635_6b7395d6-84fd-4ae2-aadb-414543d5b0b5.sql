-- Add default_workspace_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN default_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;