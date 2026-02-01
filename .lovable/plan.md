

## Plano: Corrigir Automações do Template para Assumir o Novo Space Criado

### Problema Identificado

Quando um Space é criado a partir de um template, as automações são copiadas diretamente **sem remapear os IDs internos** para os novos IDs criados. Isso causa:

1. **`scope_id`** incorreto - A automação fica com referência a um scope (lista/pasta/space) que não corresponde ao novo Space
2. **`action_config.trigger_config.from_status_ids` e `to_status_ids`** - Referências a IDs de status do template
3. **`action_config.actions[].config.target_list_id`** - Referências a listas do template
4. **`action_config.actions[].config.status_id`** - Referências a status do template

### Análise do Código Atual

No arquivo `src/hooks/useSpaceTemplates.ts`:

**Linhas 790-830 (problema):** O `action_config` é copiado diretamente sem remapeamento:
```typescript
await supabase.from('automations').insert({
  // ...
  action_config: automation.action_config,  // ← IDs não remapeados!
  // ...
});
```

**Linhas 905-955:** Existe uma função `remapAutomation` que faz parte do trabalho, mas:
- Não é usada no fluxo de criação de Space
- Não remapeia status IDs (from_status_ids, to_status_ids, status_id nas ações)
- Só remapeia `target_list_id`

---

### Solução Proposta

#### 1. Criar um mapeamento de status template → status reais

Quando uma lista é criada com `status_template_id`, o sistema cria status reais. Precisamos criar um mapa de `status_template_item_id` → `real_status_id`.

#### 2. Expandir a função de remapeamento

Criar uma nova função `remapTemplateAutomation` que remapeia:
- `trigger_config.from_status_ids` e `to_status_ids`
- `actions[].config.status_id` 
- `actions[].config.target_list_id`
- `conditions[].value` (se forem referências de status)

#### 3. Usar a função no fluxo de criação de Space

Substituir a cópia direta pelo remapeamento completo.

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useSpaceTemplates.ts` | Expandir lógica de remapeamento e usá-la na criação de Space |

---

### Seção Técnica

#### Fluxo de Mapeamento de Status

Quando uma lista é criada com `status_template_id`, os status são criados automaticamente via trigger/lógica do banco. Precisamos:

1. Buscar os status criados para cada lista
2. Criar um mapa `status_template_item_id → real_status_id` baseado no nome do status

#### Nova Função de Remapeamento

```typescript
function remapTemplateAutomationConfig(
  actionConfig: Record<string, any>,
  listIdMap: Record<string, string>,
  statusIdMap: Record<string, string>
): Record<string, any> {
  const remapped = JSON.parse(JSON.stringify(actionConfig));

  // 1. Remap trigger_config status IDs
  if (remapped.trigger_config) {
    if (remapped.trigger_config.from_status_ids) {
      remapped.trigger_config.from_status_ids = remapped.trigger_config.from_status_ids
        .map((id: string) => statusIdMap[id])
        .filter(Boolean);
    }
    if (remapped.trigger_config.to_status_ids) {
      remapped.trigger_config.to_status_ids = remapped.trigger_config.to_status_ids
        .map((id: string) => statusIdMap[id])
        .filter(Boolean);
    }
  }

  // 2. Remap actions
  if (remapped.actions && Array.isArray(remapped.actions)) {
    remapped.actions = remapped.actions.map((action: any) => {
      if (action.config) {
        // Remap target_list_id
        if (action.config.target_list_id && listIdMap[action.config.target_list_id]) {
          action.config.target_list_id = listIdMap[action.config.target_list_id];
        }
        // Remap status_id
        if (action.config.status_id && statusIdMap[action.config.status_id]) {
          action.config.status_id = statusIdMap[action.config.status_id];
        }
      }
      return action;
    });
  }

  return remapped;
}
```

#### Criar Mapa de Status

```typescript
// Após criar todas as listas, buscar os status criados
const statusIdMap: Record<string, string> = {};

// Buscar status de cada lista criada
for (const [templateListId, realListId] of Object.entries(listIdMap)) {
  const templateList = listsResult.data?.find(l => l.id === templateListId);
  if (templateList?.status_template_id) {
    // Buscar status items do template
    const { data: templateStatusItems } = await supabase
      .from('status_template_items')
      .select('id, name')
      .eq('template_id', templateList.status_template_id);

    // Buscar status reais da lista
    const { data: realStatuses } = await supabase
      .from('statuses')
      .select('id, name')
      .eq('scope_type', 'list')
      .eq('scope_id', realListId);

    // Mapear por nome
    templateStatusItems?.forEach(templateStatus => {
      const realStatus = realStatuses?.find(s => s.name === templateStatus.name);
      if (realStatus) {
        statusIdMap[templateStatus.id] = realStatus.id;
      }
    });
  }
}
```

#### Atualizar Criação de Automações

```typescript
// Substituir linhas 797-830
if (templateAutomations && templateAutomations.length > 0) {
  for (const automation of templateAutomations) {
    let scopeType: 'workspace' | 'space' | 'folder' | 'list';
    let scopeId: string;

    if (automation.scope_type === 'space') {
      scopeType = 'space';
      scopeId = space.id;
    } else if (automation.scope_type === 'folder' && automation.folder_ref_id) {
      scopeType = 'folder';
      scopeId = folderIdMap[automation.folder_ref_id];
    } else if (automation.scope_type === 'list' && automation.list_ref_id) {
      scopeType = 'list';
      scopeId = listIdMap[automation.list_ref_id];
    } else {
      scopeType = 'space';
      scopeId = space.id;
    }

    if (!scopeId) continue;

    // REMAP the action_config
    const remappedConfig = remapTemplateAutomationConfig(
      automation.action_config || {},
      listIdMap,
      statusIdMap
    );

    await supabase.from('automations').insert({
      workspace_id: workspaceId,
      description: automation.description,
      trigger: automation.trigger,
      action_type: automation.action_type,
      action_config: remappedConfig,
      scope_type: scopeType,
      scope_id: scopeId,
      enabled: true,
    });
  }
}
```

---

### Resultado Esperado

1. Ao criar um Space a partir de um template:
   - Automações recebem referências aos IDs reais (Space, Pasta, Lista)
   - Status IDs no trigger_config são remapeados para os status reais da lista
   - Ações de "mover tarefa" apontam para as listas corretas do novo Space
   - Ações de "alterar status" usam os status corretos das listas

2. Ao abrir uma automação para edição:
   - Todos os campos mostram as opções corretas do escopo atual
   - Seleções pré-existentes aparecem corretamente

