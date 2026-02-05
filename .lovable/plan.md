
# Correção: Filtro "Mostrar tarefas concluídas" não funciona

## Problema Identificado

O filtro "Mostrar tarefas concluídas" existe na interface, mas **não está sendo aplicado** na filtragem de tarefas no card "Atribuídas a mim".

O `filteredTasks` em `MyTasksCard.tsx` aplica filtros de:
- Busca (searchTerm)
- Status (filters.statuses)
- Prioridade (filters.priorities)

Mas **ignora** o `filters.showCompleted`.

## Lógica Esperada

- `showCompleted = false` (padrão): Ocultar tarefas concluídas
- `showCompleted = true`: Mostrar todas as tarefas

## Solução

Adicionar verificação do `showCompleted` no `filteredTasks` em `MyTasksCard.tsx`:

```typescript
const filteredTasks = useMemo(() => {
  return tasks.filter((task) => {
    // Filtro de tarefas concluídas
    if (!filters.showCompleted && task.status?.category === 'done') {
      return false;
    }
    
    // Search filter
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (filters.statuses.length > 0 && task.status) {
      if (!filters.statuses.includes(task.status.id)) return false;
    }
    
    // Priority filter
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) return false;
    }
    
    return true;
  });
}, [tasks, searchTerm, filters]);
```

## Detalhes Técnicos

### Problema: O hook não retorna `category` do status

O `useMyAssignedTasks` busca apenas `id`, `name`, `color` do status. Preciso adicionar `category` para identificar tarefas concluídas.

### Alterações Necessárias

1. **`src/hooks/useMyAssignedTasks.ts`**
   - Incluir `category` na query do status
   - Atualizar interface `MyAssignedTask` para incluir `category`

2. **`src/components/home/MyTasksCard.tsx`**
   - Adicionar filtro `showCompleted` no `filteredTasks`
   - Verificar `task.status?.category === 'done'` para identificar concluídas

## Resultado Esperado

- Com "Mostrar tarefas concluídas" desmarcado: tarefas com status categoria "done" são ocultadas
- Com "Mostrar tarefas concluídas" marcado: todas as tarefas aparecem
