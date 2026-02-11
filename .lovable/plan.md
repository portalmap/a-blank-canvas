
# Tornar Pastas de Documentos Visiveis para o Workspace

## Problema

As pastas de documentos (`document_folders`) estao configuradas como **pessoais** - tanto as politicas de seguranca (RLS) quanto o codigo filtram por `user_id`. Isso significa que apenas o criador da pasta consegue ve-la. As pastas precisam ser visiveis para todos os membros do workspace (exceto convidados, que nao acessam o modulo de Documentos).

Alem disso, as pastas existentes no banco nao tem `workspace_id` preenchido (todas estao `null`).

## Alteracoes

### 1. Migracao no banco de dados

- Atualizar as 4 pastas existentes para terem o `workspace_id` correto (associar ao workspace existente do criador)
- Substituir as 4 politicas RLS atuais (baseadas em `user_id`) por novas politicas baseadas em `workspace_id` + membership no workspace:
  - **SELECT**: Permitir leitura para quem e membro do workspace da pasta (excluindo role `guest`)
  - **INSERT**: Permitir criacao para membros do workspace (exceto `guest`)
  - **UPDATE**: Permitir edicao para membros do workspace (exceto `guest`)
  - **DELETE**: Permitir exclusao apenas para `admin` e `member` (nao `limited_member` nem `guest`)

### 2. `src/hooks/useDocuments.ts` - useDocumentFolders

Alterar a query de `document_folders` para:
- Filtrar por `workspace_id` do workspace ativo (em vez de `user_id`)
- Ao criar pasta, incluir o `workspace_id` do workspace ativo

Mudanca principal:
```text
// DE:
.eq('user_id', user.id)

// PARA:
.eq('workspace_id', activeWorkspace.id)
```

E ao criar:
```text
// Adicionar workspace_id ao insert
workspace_id: activeWorkspace.id
```

### 3. Nenhuma alteracao na sidebar ou componentes visuais

A sidebar (`DocsHubSidebar`) ja renderiza as pastas que recebe via props. Uma vez que o hook retorne as pastas do workspace, elas aparecerao automaticamente para todos os membros.

## Detalhes tecnicos

Migracao SQL:
```text
-- Preencher workspace_id nas pastas existentes (buscar do workspace do criador)
UPDATE document_folders df
SET workspace_id = wm.workspace_id
FROM workspace_members wm
WHERE wm.user_id = df.user_id
  AND df.workspace_id IS NULL;

-- Remover politicas antigas
DROP POLICY "Users can view their own folders" ON document_folders;
DROP POLICY "Users can create their own folders" ON document_folders;
DROP POLICY "Users can update their own folders" ON document_folders;
DROP POLICY "Users can delete their own folders" ON document_folders;

-- Novas politicas baseadas em workspace
CREATE POLICY "Workspace members can view folders"
ON document_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = document_folders.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role != 'guest'
  )
);

-- INSERT, UPDATE, DELETE com logica similar
```

Alteracao no hook `useDocumentFolders`:
```text
// Importar useWorkspace
const { activeWorkspace } = useWorkspace();

// Query: filtrar por workspace
.eq('workspace_id', activeWorkspace.id)

// Create: incluir workspace_id
insert({ ..., workspace_id: activeWorkspace.id })
```
