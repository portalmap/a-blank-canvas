
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id);

-- Update RLS policies for document_folders to consider workspace
DROP POLICY IF EXISTS "Users can view their own folders" ON document_folders;
DROP POLICY IF EXISTS "Users can create their own folders" ON document_folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON document_folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON document_folders;

CREATE POLICY "Users can view their own folders" ON document_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folders" ON document_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON document_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON document_folders FOR DELETE USING (auth.uid() = user_id);
