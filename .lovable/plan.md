

# Liberar Wikis para todos os membros do workspace

## Problema

Atualmente, documentos wiki so sao visiveis para o criador. Membros, administradores e proprietarios do workspace nao conseguem visualizar wikis criadas por outros usuarios.

## Causa raiz

1. Documentos sao criados sem `workspace_id` (sempre `null`)
2. A politica RLS de SELECT so permite ver documentos proprios, com permissao explicita, ou com link publico
3. A funcao `user_can_access_document` nao verifica se o usuario e membro do workspace para wikis

## Solucao

### 1. Banco de dados (migracao SQL)

Atualizar a funcao `user_can_access_document` para incluir uma verificacao: se o documento e uma wiki e tem `workspace_id`, qualquer membro do workspace pode visualizar.

```sql
CREATE OR REPLACE FUNCTION user_can_access_document(_user_id uuid, _document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents WHERE id = _document_id AND created_by_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM document_permissions WHERE document_id = _document_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM document_permissions dp
    JOIN team_members tm ON tm.team_id = dp.team_id
    WHERE dp.document_id = _document_id AND tm.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM documents WHERE id = _document_id AND visibility = 'link'
  ) OR EXISTS (
    -- Wikis sao visiveis para todos os membros do workspace
    SELECT 1 FROM documents d
    JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = _document_id
      AND d.is_wiki = true
      AND wm.user_id = _user_id
  );
$$;
```

Tambem atualizar os documentos wiki existentes para terem `workspace_id` preenchido (usando o workspace do criador):

```sql
UPDATE documents d
SET workspace_id = (
  SELECT wm.workspace_id FROM workspace_members wm
  WHERE wm.user_id = d.created_by_user_id
  LIMIT 1
)
WHERE d.is_wiki = true AND d.workspace_id IS NULL;
```

### 2. Codigo: Salvar `workspace_id` ao criar documentos

Alterar `useDocuments.ts` para incluir `workspace_id` do workspace ativo ao criar documentos. Isso garante que novos wikis sejam associados ao workspace e acessiveis por todos os membros.

- Importar `useWorkspace` no hook
- Passar `workspace_id: activeWorkspace?.id` no `insert` do `createDocument`

### 3. Codigo: Filtrar wikis por workspace

Atualizar a query de wikis em `useDocuments.ts` para, quando o filtro for `wikis`, nao filtrar por `created_by_user_id` -- a RLS ja garante que o usuario so vera wikis do seu workspace.

## Resultado

- Qualquer membro do workspace vera todas as wikis do workspace
- Documentos privados continuam visiveis apenas para o criador
- Novos documentos serao associados ao workspace ativo
