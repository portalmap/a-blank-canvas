
# Corrigir Restricoes do Convidado (Guest)

## Problema Raiz

O bug principal esta no `WorkspaceContext.tsx`. Quando o sistema valida a membership do workspace, ele so aceita os roles `['admin', 'member']`. Isso faz com que guests e limited_members tenham o workspace **removido** do estado. Sem workspace ativo, o `useUserRole` nao consegue detectar que o usuario e guest (retorna `isGuest: false`), e todas as restricoes da sidebar e rotas ficam desativadas.

Fluxo do bug:
1. Guest faz login -> workspace carrega do localStorage
2. `validateWorkspaceMembership` roda -> ve que o role e `guest`
3. Como `guest` nao esta em `['admin', 'member']`, limpa o workspace
4. Sem workspace, `useUserRole` retorna `isGuest: false`
5. Sidebar mostra tudo, rotas nao bloqueiam

O "flash" que voce ve (workspace aparece e some) e exatamente esse comportamento.

## Alteracoes

### 1. `src/contexts/WorkspaceContext.tsx` - Aceitar todos os roles validos

**Linha 97** - No `loadDefaultWorkspace`, incluir `guest` e `limited_member` na lista de roles aceitos:
- De: `['admin', 'member']`
- Para: `['admin', 'member', 'limited_member', 'guest']`

**Linha 153** - No `validateWorkspaceMembership`, mesma correcao:
- De: `['admin', 'member']`
- Para: `['admin', 'member', 'limited_member', 'guest']`

### 2. `src/components/settings/UserManagement.tsx` - Remover "Gerenciar Permissoes de Spaces" para guests

**Linha 452** - Alterar a condicao `canManagePermissions` para excluir usuarios com role `guest`:
- De: `canManagePermissions={canEdit && !member.isGlobalOwner}`
- Para: `canManagePermissions={canEdit && !member.isGlobalOwner && member.role !== 'guest'}`

Isso remove a opcao "Gerenciar Permissoes de Spaces" do menu de acoes para convidados, ja que eles so veem tarefas atribuidas e nao precisam de acesso a spaces.

## Resultado Esperado

- Guest faz login -> workspace permanece ativo
- `useUserRole` detecta corretamente `isGuest: true`
- Sidebar mostra apenas "Inicio" e "Tudo"
- Rotas bloqueadas redirecionam para /
- No painel de usuarios, convidados nao tem a opcao de gerenciar permissoes de Spaces
