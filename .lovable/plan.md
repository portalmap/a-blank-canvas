

## Plano: Filtrar Status por Lista no TemplateTaskDialog

### Problema Identificado

Atualmente, o `SpaceTemplateEditor` passa **todos** os status de **todos** os templates de status (`allStatusItems`) para o `TemplateTaskDialog`. Isso faz com que o seletor "Atualizar status para:" mostre status duplicados de diferentes listas/templates.

### Análise do Fluxo Atual

```text
SpaceTemplateEditor
    ├── lists[] (cada lista tem status_template_id)
    │   ├── Lista A → status_template_id: "template-1"
    │   └── Lista B → status_template_id: "template-2"
    │
    ├── allStatusItems[] (todos os status de todos os templates)
    │   ├── "Aguardando" (template-1)
    │   ├── "Aguardando" (template-2)  ← DUPLICADO!
    │   ├── "A Fazer" (template-1)
    │   ├── "A Fazer" (template-2)     ← DUPLICADO!
    │   └── ...
    │
    └── TemplateTaskDialog (recebe allStatusItems sem filtro)
```

### Solução Proposta

Passar informação sobre qual lista a tarefa pertence e filtrar os status para mostrar apenas os do template correto.

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/settings/SpaceTemplateEditor.tsx` | Calcular e passar os status filtrados para a lista específica |
| `src/components/settings/TemplateTaskDialog.tsx` | Atualizar interface `StatusTemplateItem` para incluir `template_id` |

---

### Implementação

#### 1. SpaceTemplateEditor.tsx

Atualizar a chamada do `TemplateTaskDialog` para passar apenas os status da lista específica:

```typescript
// Determinar qual lista está sendo usada
const getTargetListTempId = () => {
  if (editingTask) return editingTask.listTempId;
  return pendingListTempId;
};

// Obter os status filtrados para a lista alvo
const getFilteredStatusItems = () => {
  const targetListTempId = getTargetListTempId();
  if (!targetListTempId) return [];
  
  const targetList = lists.find(l => l.tempId === targetListTempId);
  if (!targetList?.status_template_id) return [];
  
  return allStatusItems.filter(item => 
    item.template_id === targetList.status_template_id
  );
};

// Na renderização:
<TemplateTaskDialog
  open={taskDialogOpen}
  onOpenChange={setTaskDialogOpen}
  task={editingTask}
  onSave={handleTaskSave}
  statusTemplateItems={getFilteredStatusItems()}  // ← FILTRADO
  availableTags={workspaceTags}
/>
```

#### 2. TemplateTaskDialog.tsx

Atualizar a interface `StatusTemplateItem` para incluir o campo `template_id` (caso necessário para debug):

```typescript
interface StatusTemplateItem {
  id: string;
  name: string;
  color: string | null;
  template_id?: string;  // OPCIONAL - para consistência
  category?: string;     // OPCIONAL - para filtrar done/active
}
```

---

### Lógica Detalhada

1. Quando o usuário clica em "Adicionar Tarefa" em uma lista:
   - `pendingListTempId` é definido com o ID temporário da lista
   - O sistema busca essa lista no array `lists[]`
   - Obtém o `status_template_id` da lista
   - Filtra `allStatusItems` para mostrar apenas os status desse template

2. Quando o usuário clica para editar uma tarefa existente:
   - `editingTask` contém `listTempId`
   - O sistema busca essa lista no array `lists[]`
   - Mesmo processo de filtragem

---

### Resultado Esperado

**Antes:**
- Seletor mostra: "Aguardando", "Aguardando", "A Fazer", "A Fazer", etc. (duplicados de diferentes listas)

**Depois:**
- Seletor mostra apenas: "Aguardando", "A Fazer", "Concluído" (status específicos da lista onde a tarefa está sendo criada)

---

### Consideração: Lista sem Template de Status

Se a lista não tiver um `status_template_id` definido, o seletor de status ficará vazio. Isso é esperado, pois a lista ainda não tem status configurados.

