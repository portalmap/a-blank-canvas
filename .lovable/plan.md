
## Plano: Preservar Automações ao Atualizar Templates

### Problema Identificado

O hook `useUpdateSpaceTemplate` utiliza uma estratégia de "deletar e recriar" para atualizar a estrutura do template (pastas, listas, tarefas). Como a tabela `space_template_automations` possui chaves estrangeiras com `ON DELETE CASCADE` para `space_template_folders` e `space_template_lists`, todas as automações são **excluídas automaticamente** quando a estrutura é atualizada.

### Fluxo Atual (Problemático)

```text
1. Usuário edita template
2. Hook deleta todas as pastas/listas
3. CASCADE delete remove todas as automações ❌
4. Novas pastas/listas são criadas com novos UUIDs
5. Automações perdidas permanentemente
```

### Fluxo Corrigido

```text
1. Usuário edita template
2. Hook busca automações existentes
3. Hook busca estrutura atual (pastas/listas) para criar mapa de nomes
4. Hook deleta pastas/listas (cascade exclui automações temporariamente)
5. Novas pastas/listas são criadas com novos UUIDs
6. Hook remapeia automações: nome antigo → novo UUID
7. Hook reinsere automações com novos IDs
8. Automações preservadas ✓
```

---

### Mudanças Técnicas

#### 1. Modificar `useUpdateSpaceTemplate` em `src/hooks/useSpaceTemplates.ts`

Antes da exclusão (linha 259), adicionar:

```typescript
// 1. Buscar automações existentes
const { data: existingAutomations } = await supabase
  .from('space_template_automations')
  .select('*')
  .eq('template_id', id);

// 2. Buscar estrutura atual para mapear nomes
const { data: existingFolders } = await supabase
  .from('space_template_folders')
  .select('id, name')
  .eq('template_id', id);

const { data: existingLists } = await supabase
  .from('space_template_lists')
  .select('id, name, folder_ref_id')
  .eq('template_id', id);

// 3. Criar mapa: ID antigo → nome
const folderIdToName: Record<string, string> = {};
existingFolders?.forEach(f => { folderIdToName[f.id] = f.name; });

const listIdToName: Record<string, string> = {};
existingLists?.forEach(l => { listIdToName[l.id] = l.name; });
```

Após a criação das novas pastas/listas, adicionar:

```typescript
// 4. Criar mapa reverso: nome → novo ID
const folderNameToNewId: Record<string, string> = {};
createdFolders?.forEach(f => { folderNameToNewId[f.name] = f.id; });

const listNameToNewId: Record<string, string> = {};
createdLists?.forEach(l => { listNameToNewId[l.name] = l.id; });

// 5. Remapear e reinserir automações
if (existingAutomations && existingAutomations.length > 0) {
  const remappedAutomations = existingAutomations.map(automation => {
    // Remapear folder_ref_id
    let newFolderRefId: string | null = null;
    if (automation.folder_ref_id && folderIdToName[automation.folder_ref_id]) {
      const folderName = folderIdToName[automation.folder_ref_id];
      newFolderRefId = folderNameToNewId[folderName] || null;
    }

    // Remapear list_ref_id
    let newListRefId: string | null = null;
    if (automation.list_ref_id && listIdToName[automation.list_ref_id]) {
      const listName = listIdToName[automation.list_ref_id];
      newListRefId = listNameToNewId[listName] || null;
    }

    return {
      template_id: id,
      description: automation.description,
      trigger: automation.trigger,
      action_type: automation.action_type,
      action_config: automation.action_config,
      scope_type: automation.scope_type,
      folder_ref_id: newFolderRefId,
      list_ref_id: newListRefId,
      enabled: automation.enabled,
    };
  }).filter(a => {
    // Filtrar automações que perderam referência
    // (lista/pasta foi removida do template)
    if (a.scope_type === 'list' && !a.list_ref_id) return false;
    if (a.scope_type === 'folder' && !a.folder_ref_id) return false;
    return true;
  });

  if (remappedAutomations.length > 0) {
    await supabase
      .from('space_template_automations')
      .insert(remappedAutomations);
  }
}
```

---

### Considerações Especiais

#### Automações com Escopo "Space"
- Não têm `list_ref_id` nem `folder_ref_id`
- Devem ser preservadas diretamente sem remapeamento

#### Listas/Pastas Renomeadas
- Se o nome da lista/pasta foi alterado, a automação não será remapeada
- Isso é comportamento esperado (a automação era para uma entidade que não existe mais)

#### IDs dentro de `action_config`
- Algumas automações referenciam listas no `action_config` (ex: "mover para lista X")
- Esses IDs também precisam ser remapeados

```typescript
// Dentro da função de remapeamento:
const remappedActionConfig = JSON.parse(JSON.stringify(automation.action_config));

// Remapear target_list_id em ações "move_task"
if (remappedActionConfig.actions) {
  remappedActionConfig.actions = remappedActionConfig.actions.map(action => {
    if (action.type === 'move_task' && action.config?.target_list_id) {
      const oldListId = action.config.target_list_id;
      if (listIdToName[oldListId]) {
        const listName = listIdToName[oldListId];
        action.config.target_list_id = listNameToNewId[listName] || oldListId;
      }
    }
    return action;
  });
}
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useSpaceTemplates.ts` | Adicionar lógica de preservação e remapeamento de automações no `useUpdateSpaceTemplate` |

---

### Resultado Esperado

1. Usuário edita template e salva
2. Automações existentes são capturadas antes da exclusão
3. Novas pastas/listas são criadas
4. Automações são remapeadas para novos IDs baseado nos nomes
5. Automações são reinseridas
6. Toast de sucesso: "Template atualizado com sucesso!"
7. Automações preservadas e funcionando ✓

---

### Limitações Conhecidas

1. Se uma pasta/lista for **renomeada E** tiver automações, essas automações serão perdidas
   - Solução futura: usar um campo `ref_key` estável ao invés de depender apenas do nome

2. Automações com escopo "space" que referenciam listas específicas no `action_config` precisam do remapeamento adicional descrito acima
