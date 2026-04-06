
# Arquivar Spaces + Tela de Arquivados

## Resumo

Adicionar coluna `archived_at` na tabela `spaces`, ativar o botão "Arquivar" no menu do Space, e criar uma tela de Spaces arquivados acessível pelo menu de 3 pontos do Workspace. Na tela de arquivados, admins podem restaurar ou excluir definitivamente.

## Alterações

### 1. Migration SQL
- Adicionar coluna `archived_at timestamptz DEFAULT NULL` na tabela `spaces`
- Criar função `archive_space(p_space_id uuid)` que seta `archived_at = now()`
- Criar função `restore_space(p_space_id uuid)` que seta `archived_at = NULL`

### 2. `src/hooks/useSpaces.ts`
- Filtrar spaces com `archived_at IS NULL` no `useSpaces` (para não mostrar arquivados na sidebar/listagem)
- Criar hook `useArchivedSpaces(workspaceId)` que busca spaces com `archived_at IS NOT NULL`
- Criar mutation `useArchiveSpace` (update `archived_at = now()`)
- Criar mutation `useRestoreSpace` (update `archived_at = null`)

### 3. `src/components/workspace/SpaceTreeItem.tsx`
- Substituir o `toast.info('Função em desenvolvimento')` do botão "Arquivar" por chamada real ao `useArchiveSpace`
- Adicionar confirmação antes de arquivar

### 4. `src/components/AppSidebar.tsx`
- No menu de 3 pontos do workspace (onde já tem "Trocar", "Novo", "Renomear", etc.), adicionar item "Spaces Arquivados" visível para admins
- Ao clicar, navegar para `/archived-spaces`

### 5. Criar `src/pages/ArchivedSpaces.tsx`
- Página listando todos os spaces arquivados do workspace ativo
- Para cada space: nome, cor, data de arquivamento
- Botões "Restaurar" e "Excluir definitivamente" — visíveis apenas para admin/proprietário
- Confirmação antes de excluir definitivamente

### 6. `src/App.tsx`
- Adicionar rota `/archived-spaces` protegida (admin only)

### 7. `src/pages/SpacesView.tsx`
- Garantir que a listagem de spaces também filtre `archived_at IS NULL` (caso use query direta)

## Resultado
- Botão "Arquivar" no menu do Space funciona de verdade
- Menu do workspace ganha opção "Spaces Arquivados"
- Tela dedicada para ver, restaurar ou excluir permanentemente spaces arquivados
- Acesso restrito a admin/proprietário
- ~6 arquivos editados/criados + 1 migration SQL
