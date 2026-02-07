
# Adicionar badge do Space no card de automacao

## Objetivo

Exibir uma badge/tag com o nome do Space ao qual cada automacao pertence, facilitando a organizacao visual na listagem de automacoes.

## Como vai funcionar

Cada card de automacao vai mostrar uma nova badge colorida com o nome do Space, ao lado da badge de escopo (Lista, Pasta, Space, Workspace) que ja existe.

A resolucao do Space depende do tipo de escopo da automacao:
- **Workspace**: sem Space (nao exibe badge)
- **Space**: o `scope_id` e o proprio Space
- **Folder**: busca o `space_id` do folder
- **List**: busca o `space_id` da list

## Alteracoes

### 1. `src/components/automations/AutomationsList.tsx`

- Importar e carregar os Spaces do workspace usando `useSpaces`
- Passar os dados de `spaces`, `lists` e `folders` como props para cada `AutomationCard`

### 2. `src/components/automations/AutomationCard.tsx`

- Receber as novas props: `spaces`, `lists`, `folders`
- Adicionar logica para resolver o nome do Space a partir do `scope_type` e `scope_id`:
  - Se `scope_type === 'space'`: buscar o space com `id === scope_id`
  - Se `scope_type === 'folder'`: buscar o folder, depois o space com `id === folder.space_id`
  - Se `scope_type === 'list'`: buscar a list, depois o space com `id === list.space_id`
  - Se `scope_type === 'workspace'`: nao exibir badge de Space
- Renderizar uma badge adicional com o nome do Space (e icone LayoutGrid), usando uma cor suave para diferenciar das demais badges

### Visual esperado

Cada card ficara assim:
```
[Zap] Automacao de transferencia...  [= Lista]  [# Space Name]
       Alteracoes de status -> Mover tarefa
```

A nova badge do Space aparece ao lado da badge de escopo existente, com estilo visual distinto (ex: fundo azul claro com texto azul).
