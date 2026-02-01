

## Plano: Adicionar Filtros na Página de Automações

### Objetivo

Implementar um sistema de filtros na página de Automações que permita ao usuário filtrar por:
- **Escopo**: Todas as Automações, Spaces, Pastas ou Listas
- **Seleção específica**: Ao selecionar um tipo de escopo, poder escolher um item específico ou "todos"
- **Nome da Automação**: Busca textual pelo nome/descrição

---

### Componentes a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/automations/AutomationsFilters.tsx` | **CRIAR** - Novo componente de filtros |
| `src/pages/Automations.tsx` | **MODIFICAR** - Adicionar estado de filtros e passar para a lista |
| `src/components/automations/AutomationsList.tsx` | **MODIFICAR** - Receber filtros e aplicar filtragem |

---

### Design da Interface

A barra de filtros ficará acima da lista de automações com:

1. **Select de Escopo**: Dropdown com opções:
   - Todos (padrão)
   - Spaces
   - Pastas
   - Listas

2. **Select Condicional de Item**: Aparece quando um escopo específico é selecionado:
   - Se "Spaces" → mostra lista de Spaces do workspace
   - Se "Pastas" → mostra lista de Pastas do workspace
   - Se "Listas" → mostra lista de Listas do workspace
   - Cada um tem opção "Todos" para ver todos daquele tipo

3. **Campo de Busca por Nome**: Input de texto para filtrar pelo nome/descrição da automação

---

### Seção Técnica

#### Interface de Filtros

```typescript
interface AutomationsFilterState {
  scopeType: 'all' | 'space' | 'folder' | 'list';
  scopeId: string | null;   // null = todos do tipo
  searchTerm: string;
}
```

#### Componente AutomationsFilters

```typescript
// src/components/automations/AutomationsFilters.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';

interface AutomationsFiltersProps {
  workspaceId: string;
  filters: AutomationsFilterState;
  onChange: (filters: AutomationsFilterState) => void;
}

export function AutomationsFilters({ workspaceId, filters, onChange }: AutomationsFiltersProps) {
  const { data: spaces = [] } = useSpaces(workspaceId);
  const { data: folders = [] } = useFoldersForWorkspace(workspaceId);
  const { data: lists = [] } = useListsForWorkspace(workspaceId);
  
  // Lógica para mostrar select condicional de item
  // ...
}
```

#### Lógica de Filtragem no AutomationsList

```typescript
const filteredAutomations = useMemo(() => {
  if (!automations) return [];
  
  return automations.filter(automation => {
    // Filtro por tipo de escopo
    if (filters.scopeType !== 'all') {
      if (automation.scope_type !== filters.scopeType) return false;
      
      // Filtro por item específico
      if (filters.scopeId && automation.scope_id !== filters.scopeId) return false;
    }
    
    // Filtro por nome/descrição
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const description = automation.description?.toLowerCase() || '';
      if (!description.includes(searchLower)) return false;
    }
    
    return true;
  });
}, [automations, filters]);
```

---

### Fluxo de Dados

```text
Automations.tsx
├── Estado: filters (scopeType, scopeId, searchTerm)
├── AutomationsFilters (workspaceId, filters, onChange)
│   ├── Busca Spaces, Folders, Lists do workspace
│   └── Atualiza estado ao selecionar filtros
└── AutomationsList (workspaceId, filters)
    └── Filtra automations localmente baseado nos filtros
```

---

### Resultado Esperado

1. **Por padrão**: Mostra "Todas as Automações" sem filtros
2. **Ao selecionar "Spaces"**: 
   - Mostra segundo select com todos os Spaces + opção "Todos os Spaces"
   - Filtra para mostrar apenas automações com `scope_type === 'space'`
3. **Ao selecionar um Space específico**:
   - Filtra para mostrar apenas automações daquele Space específico
4. **Busca por nome**:
   - Filtra em tempo real pelo texto da descrição da automação
5. **Contador atualizado**: "Todas as Automações (X)" mostra o total filtrado

