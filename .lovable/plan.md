

# Adicionar Menu de Acoes no Workspace da Sidebar

## O que sera feito

Substituir o botao de "trocar workspace" (icone de setas) na sidebar por um menu de "3 pontinhos" (MoreHorizontal) com as seguintes opcoes:

- **Trocar Workspace** - disponivel para todos
- **Novo Workspace** - apenas para usuarios com permissao (global_owner, owner, admin global)
- **Renomear Workspace** - apenas para admins do workspace
- **Definir como Padrao / Remover Padrao** - disponivel para todos
- **Detalhes do Workspace** - navega para a pagina de workspaces (apenas admins)

## Regras de Permissao

- Guest: ve apenas "Trocar Workspace" e "Definir como Padrao" (mas guest nao ve a secao Principal, entao na pratica nao afeta)
- Member / Limited Member: "Trocar Workspace" e "Definir como Padrao"
- Admin do workspace: todas as opcoes
- Global Owner / Owner / Admin global: todas as opcoes + "Novo Workspace"

## Alteracoes Tecnicas

### 1. `src/components/AppSidebar.tsx`

- Importar `MoreHorizontal` do lucide-react e `DropdownMenu` do radix
- Importar `useCanCreateWorkspace`, `useDefaultWorkspace`, `useSetDefaultWorkspace`
- Importar `WorkspaceEditDialog` e adicionar estado para controlar o dialog de edicao
- Substituir o botao `ArrowLeftRight` (linha 233-239) por um `DropdownMenu` com icone `MoreHorizontal`
- Itens do menu:
  - "Trocar Workspace" -> chama `clearActiveWorkspace()`
  - "Novo Workspace" -> abre dialog de criacao (condicional: `canCreate`)
  - "Renomear" -> abre `WorkspaceEditDialog` (condicional: `isAdmin`)
  - "Definir como Padrao" / "Remover Padrao" -> toggle via `setDefaultWorkspace`
- Adicionar dialog de criacao de workspace inline (reutilizando a logica do WorkspaceOverview)
- Adicionar `WorkspaceEditDialog` para renomear

### 2. Nenhuma alteracao no banco de dados

Todas as permissoes ja existem. O `useCanCreateWorkspace` verifica roles globais e o `useUserRole` verifica o role no workspace.

