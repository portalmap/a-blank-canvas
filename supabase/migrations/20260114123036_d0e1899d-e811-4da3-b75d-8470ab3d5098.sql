-- Remover política de UPDATE atual que só permite autor
DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;

-- Criar nova política que permite autor OU assignee atualizar o comentário
CREATE POLICY "Users can update comments they authored or are assigned to"
ON task_comments
FOR UPDATE
USING (
  author_id = auth.uid() 
  OR assignee_id = auth.uid()
);