

## Plano: Filtro Hierárquico de Automações

### Problema Identificado

O filtro atual verifica apenas `automation.scope_type === filters.scopeType`, mas:

1. **Todas as automações existentes** têm `scope_type: list`
2. **Nenhuma automação** tem `scope_type: space` ou `scope_type: folder`
3. Quando o usuário filtra por "Spaces", o sistema procura automações onde `scope_type === 'space'` → **não encontra nada**

As automações estão vinculadas às **listas**, mas as listas pertencem a Spaces e Pastas. O filtro precisa ser **hierárquico**.

---

### Solução

Modificar a lógica de filtragem para:

1. **Filtrar por Space**: Mostrar automações de listas/pastas que **pertencem** a esse Space
2. **Filtrar por Pasta**: Mostrar automações de listas que **pertencem** a essa Pasta
3. **Filtrar por Lista**: Mostrar automações diretamente dessa Lista

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/AutomationsFilters.tsx` | Extrair Spaces/Pastas que **contêm** automações (via hierarquia) |
| `src/components/automations/AutomationsList.tsx` | Filtro hierárquico (verificar se lista/pasta pertence ao Space/Pasta selecionado) |

---

### Seção Técnica

#### Lógica no AutomationsFilters

Ao invés de extrair IDs diretamente de `scope_type`, precisamos:

```typescript
// Extrair Spaces que CONTÊM listas com automações
const spacesWithAutomations = useMemo(() => {
  const spaceIds = new Set<string>();
  
  automations.forEach(auto => {
    if (auto.scope_type === 'list' && auto.scope_id) {
      const list = lists.find(l => l.id === auto.scope_id);
      if (list?.space_id) spaceIds.add(list.space_id);
    }
    if (auto.scope_type === 'folder' && auto.scope_id) {
      const folder = folders.find(f => f.id === auto.scope_id);
      if (folder?.space_id) spaceIds.add(folder.space_id);
    }
    if (auto.scope_type === 'space' && auto.scope_id) {
      spaceIds.add(auto.scope_id);
    }
  });
  
  return Array.from(spaceIds);
}, [automations, lists, folders]);

// Similar para Pastas
const foldersWithAutomations = useMemo(() => {
  const folderIds = new Set<string>();
  
  automations.forEach(auto => {
    if (auto.scope_type === 'list' && auto.scope_id) {
      const list = lists.find(l => l.id === auto.scope_id);
      if (list?.folder_id) folderIds.add(list.folder_id);
    }
    if (auto.scope_type === 'folder' && auto.scope_id) {
      folderIds.add(auto.scope_id);
    }
  });
  
  return Array.from(folderIds);
}, [automations, lists]);
```

#### Lógica no AutomationsList

```typescript
const filteredAutomations = useMemo(() => {
  if (!automations) return [];

  return automations.filter((automation) => {
    // Filtro hierárquico por Space
    if (filters?.scopeType === 'space') {
      // Verificar se a automação pertence (direta ou indiretamente) ao Space
      if (!filters.scopeId) {
        // "Todos os Spaces" - mostrar todas
        return true;
      }
      
      // Verificar hierarquia: automação de lista → lista.space_id === filtro
      if (automation.scope_type === 'list') {
        const list = lists.find(l => l.id === automation.scope_id);
        if (list?.space_id !== filters.scopeId) return false;
      } else if (automation.scope_type === 'folder') {
        const folder = folders.find(f => f.id === automation.scope_id);
        if (folder?.space_id !== filters.scopeId) return false;
      } else if (automation.scope_type === 'space') {
        if (automation.scope_id !== filters.scopeId) return false;
      }
    }

    // Filtro hierárquico por Pasta
    if (filters?.scopeType === 'folder') {
      if (!filters.scopeId) return true;
      
      if (automation.scope_type === 'list') {
        const list = lists.find(l => l.id === automation.scope_id);
        if (list?.folder_id !== filters.scopeId) return false;
      } else if (automation.scope_type === 'folder') {
        if (automation.scope_id !== filters.scopeId) return false;
      } else {
        return false; // Automação de Space não pertence a pasta
      }
    }

    // Filtro direto por Lista
    if (filters?.scopeType === 'list') {
      if (!filters.scopeId) return automation.scope_type === 'list';
      if (automation.scope_id !== filters.scopeId) return false;
    }

    // Filtro por busca
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!automation.description?.toLowerCase().includes(searchLower)) return false;
    }

    return true;
  });
}, [automations, filters, lists, folders]);
```

---

### Fluxo de Dados Atualizado

```text
AutomationsFilters
├── Recebe: automations, lists, folders
├── Calcula: spacesWithAutomations (via hierarquia)
├── Calcula: foldersWithAutomations (via hierarquia)
└── Dropdown mostra apenas itens que CONTÊM automações

AutomationsList
├── Recebe: filters, lists, folders
├── Filtra por hierarquia:
│   ├── Space → automações de listas/pastas DENTRO do Space
│   ├── Pasta → automações de listas DENTRO da Pasta
│   └── Lista → automações diretamente da Lista
└── Exibe resultado filtrado
```

---

### Resultado Esperado

1. **Filtrar por "Spaces"**: Mostra "MAP | Empresa Teste" no dropdown (porque tem listas com automações)
2. **Selecionar "MAP | Empresa Teste"**: Mostra as 7 automações que são de listas dentro desse Space
3. **Filtrar por "Pastas"**: Mostra a pasta que contém as listas com automações
4. **Filtrar por "Listas"**: Mostra as 4 listas específicas que têm automações

