-- Adicionar constraint unique para evitar duplicatas
ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_workspace_user_unique 
UNIQUE (workspace_id, user_id);