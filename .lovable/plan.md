

## Plano: Filtrar por Itens que Possuem Automações

### Problema Identificado

O filtro atual busca **todos** os Spaces, Pastas e Listas do workspace usando os hooks `useSpaces`, `useFoldersForWorkspace` e `useListsForWorkspace`. 

O correto é mostrar **apenas** os itens que já possuem automações associadas, extraindo esses dados diretamente da lista de automações.

---

### Solução

Modificar o `AutomationsFilters.tsx` para:
1. Receber a lista de automações como prop
2. Extrair os IDs únicos de `scope_id` agrupados por `scope_type`
3. Buscar os nomes apenas dos itens que possuem automações
4. Exibir no dropdown apenas esses itens

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/AutomationsFilters.tsx` | Receber automations e filtrar itens |
| `src/pages/Automations.tsx` | Passar automations para o filtro |

---

### Seção Técnica

#### Lógica de Extração

```typescript
// Extrair IDs únicos de automações por tipo de escopo
const automationScopeIds = useMemo(() => {
  if (!automations) return { spaces: [], folders: [], lists: [] };
  
  const spaces = new Set<string>();
  const folders = new Set<string>();
  const lists = new Set<string>();
  
  automations.forEach(auto => {
    if (auto.scope_id) {
      if (auto.scope_type === 'space') spaces.add(auto.scope_id);
      if (auto.scope_type === 'folder') folders.add(auto.scope_id);
      if (auto.scope_type === 'list') lists.add(auto.scope_id);
    }
  });
  
  return {
    spaces: Array.from(spaces),
    folders: Array.from(folders),
    lists: Array.from(lists),
  };
}, [automations]);
```

#### Filtragem dos Itens

```typescript
// Filtrar apenas itens que possuem automações
const getItemsForScope = () => {
  switch (filters.scopeType) {
    case 'space':
      return spaces
        .filter(s => automationScopeIds.spaces.includes(s.id))
        .map(s => ({ id: s.id, name: s.name }));
    case 'folder':
      return folders
        .filter(f => automationScopeIds.folders.includes(f.id))
        .map(f => ({ id: f.id, name: f.name }));
    case 'list':
      return lists
        .filter(l => automationScopeIds.lists.includes(l.id))
        .map(l => ({ id: l.id, name: l.name }));
    default:
      return [];
  }
};
```

#### Interface Atualizada

```typescript
interface AutomationsFiltersProps {
  workspaceId: string;
  filters: AutomationsFilterState;
  onChange: (filters: AutomationsFilterState) => void;
  automations?: Automation[];  // Nova prop
}
```

---

### Fluxo Atualizado

```text
Automations.tsx
├── useAutomations(workspaceId) → automations
├── AutomationsFilters
│   ├── Recebe: automations
│   ├── Extrai scope_ids únicos por tipo
│   ├── Busca nomes dos itens (spaces, folders, lists)
│   └── Filtra dropdown para mostrar apenas itens com automações
└── AutomationsList
    └── Aplica filtros na lista
```

---

### Resultado Esperado

1. **Ao selecionar "Spaces"**: Mostra apenas Spaces que possuem automações
2. **Ao selecionar "Pastas"**: Mostra apenas Pastas que possuem automações
3. **Ao selecionar "Listas"**: Mostra apenas Listas que possuem automações
4. **Se não houver automações de um tipo**: Não mostra itens no dropdown (ou mostra mensagem)

