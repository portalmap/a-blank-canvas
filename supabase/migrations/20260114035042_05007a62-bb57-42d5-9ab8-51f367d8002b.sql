-- Adicionar política para UPDATE na tabela task_activities
-- Permitir que usuários atualizem atividades que eles próprios criaram
CREATE POLICY "Users can update their own activities" 
ON public.task_activities 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());