

# Corrigir Criação de Canais Personalizados

## Causa Raiz

As duas políticas de INSERT na tabela `chat_channels` estão marcadas como **RESTRICTIVE**. No PostgreSQL, políticas restritivas funcionam como filtros adicionais, mas o acesso só é concedido se pelo menos uma política **PERMISSIVE** for aprovada primeiro. Como não existe nenhuma política permissiva de INSERT, todos os usuários (incluindo Lucas) recebem erro ao tentar criar canais.

## Correção

Remover as duas políticas de INSERT restritivas e criar uma única política **PERMISSIVE** que consolida a lógica:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Members can create channels" ON chat_channels;
DROP POLICY IF EXISTS "Workspace members can create custom channels" ON chat_channels;

-- Criar política permissiva consolidada
CREATE POLICY "Members can create channels"
ON chat_channels FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
  )
);
```

Esta política permite que qualquer membro do workspace crie canais (de qualquer tipo), desde que o `created_by_user_id` seja o próprio usuário autenticado. Nenhuma alteração de código é necessária.
