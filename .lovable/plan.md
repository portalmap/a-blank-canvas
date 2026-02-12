
# Corrigir Visibilidade de Pastas e Documentos Wiki

## Problema

As pastas Wiki e os documentos sumiram porque o hook `useDocumentFolders` filtra por `user_id = auth.uid()`. Isso faz com que apenas o criador das pastas as veja. Os dados estao intactos no banco (4 pastas wiki e 20+ documentos wiki).

O hook `useDocuments` tambem nao filtra por `workspace_id`, o que pode causar vazamento de dados entre workspaces (um usuario vendo documentos de outro workspace).

## Alteracoes

### 1. `src/hooks/useDocuments.ts` - Corrigir query de pastas

No `useDocumentFolders` (linha 352-366):
- Remover o filtro `.eq('user_id', user.id)` 
- Adicionar filtro `.eq('workspace_id', activeWorkspace.id)` para buscar todas as pastas do workspace ativo
- Importar `useWorkspace` e usar `activeWorkspace`
- Ajustar a queryKey para incluir `activeWorkspace?.id`

Resultado: todos os membros do workspace verao as pastas wiki (e as pastas de documentos do workspace).

### 2. `src/hooks/useDocuments.ts` - Filtrar documentos por workspace

No `useDocuments` (linhas 72-96):
- Adicionar `.eq('workspace_id', activeWorkspace.id)` na query base de documentos
- Isso garante que documentos de outros workspaces nao aparecem
- Ajustar a queryKey para incluir `activeWorkspace?.id`

### 3. `src/hooks/useDocuments.ts` - Corrigir createFolder

No `createFolder` (linha 370-392):
- Adicionar `workspace_id: activeWorkspace?.id` ao insert, pois a pasta precisa estar vinculada ao workspace

## Resumo tecnico

```text
// useDocumentFolders - ANTES:
.eq('user_id', user.id)

// useDocumentFolders - DEPOIS:
.eq('workspace_id', activeWorkspace.id)

// useDocuments query - ADICIONAR:
.eq('workspace_id', activeWorkspace.id)
```

Nenhuma alteracao no banco de dados e necessaria. Os dados ja existem com `workspace_id` preenchido e as RLS policies ja validam acesso por workspace.
