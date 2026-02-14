# Adicionar "Novo Space" ao Menu de 3 Pontinhos do Workspace

## O que sera feito

Adicionar a opcao "Novo Space" no dropdown menu de acoes do workspace na sidebar, entre "Novo Workspace" e "Renomear". Ao clicar, abre o `CreateSpaceDialog` ja existente.

## Regras de Permissao

- **Admin / Global Owner / Owner**: pode criar spaces
- **Member**: NAO pode criar spaces
- **Limited Member**: NAO pode criar spaces (conforme regra existente - nao pode modificar estrutura organizacional)
- **Guest**: NAO ve a secao Principal, entao nao se aplica

## Alteracao

### `src/components/AppSidebar.tsx`

1. Importar `CreateSpaceDialog` de `@/components/spaces/CreateSpaceDialog`
2. Adicionar estado `isCreateSpaceOpen` (useState boolean)
3. Adicionar item no dropdown menu apos "Novo Workspace":
  - Icone: `FolderPlus` (importar do lucide-react) ou `Plus`
  - Texto: "Novo Space"
  - Condicional: visivel apenas se NAO for `limited_member` (verificar via `userRole`)
4. Renderizar `CreateSpaceDialog` com `workspaceId={activeWorkspace.id}` junto aos outros dialogs no final do componente

Posicao no menu:

```
Trocar Workspace
Novo Workspace (se canCreate)
Novo Space (se nao for limited_member)
Renomear (se admin)
---
Definir como Padrao
---
Detalhes do Workspace (se admin)
```

Nenhuma alteracao no banco de dados necessaria.