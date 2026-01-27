
## Plano: Funcionalidade de Aplicar Automações em Todos os Spaces

### Contexto

Você tem um template "MAP | " com 7-8 automações configuradas (transferências entre listas como Criativos → Designer, Tráfego Pago → Social Media, etc.). Os 25 spaces existentes foram criados **antes** dessas automações serem configuradas no template, portanto eles não têm nenhuma automação aplicada.

---

### Solução Proposta

Criar uma funcionalidade "Aplicar Automações do Template em Spaces Existentes" que:
1. Busca todos os spaces que seguem o padrão do template
2. Para cada space, encontra as listas/pastas correspondentes
3. Cria as automações remapeando os IDs do template para os IDs reais

---

### Funcionamento

```text
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO DE APLICAÇÃO                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Buscar automações do template "MAP | "                      │
│     └─> 7 automações encontradas                                │
│                                                                 │
│  2. Para cada space "MAP | [Cliente]":                          │
│     ├─> Buscar folders (ex: "Tarefas & Demandas | Accerth")     │
│     ├─> Buscar lists (ex: "Plan. de Criativos | Accerth")       │
│     └─> Criar mapa: nome_template → id_real                     │
│                                                                 │
│  3. Para cada automação do template:                            │
│     ├─> Resolver list_ref_id → list_id real                     │
│     ├─> Resolver target_list_id no action_config                │
│     └─> Inserir automação com IDs remapeados                    │
│                                                                 │
│  Resultado: 7 × 25 = 175 automações criadas                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Mapeamento de Listas

O sistema vai mapear baseado no **prefixo do nome**:

| Template List               | Space "MAP \| Accerth"              |
|-----------------------------|-------------------------------------|
| `Plan. de Criativos \| `    | `Plan. de Criativos \| Accerth`     |
| `Tráfego Pago \| `          | `Tráfego Pago \| Accerth`           |
| `Designer/Edição de Vídeo \| ` | `Designer/Edição de Vídeo \| Accerth` |
| `Plan. Social Media \| `    | `Plan. Social Media \| Accerth`     |

---

### Implementação Técnica

#### 1. Novo Hook: `useApplyTemplateAutomationsToSpaces`

Arquivo: `src/hooks/useSpaceTemplates.ts`

```typescript
export const useApplyTemplateAutomationsToSpaces = () => {
  return useMutation({
    mutationFn: async ({ 
      templateId, 
      workspaceId, 
      spaceIds 
    }: { 
      templateId: string; 
      workspaceId: string; 
      spaceIds: string[] 
    }) => {
      // 1. Buscar template folders e lists
      const { data: templateFolders } = await supabase
        .from('space_template_folders')
        .select('id, name')
        .eq('template_id', templateId);
        
      const { data: templateLists } = await supabase
        .from('space_template_lists')
        .select('id, name, folder_ref_id')
        .eq('template_id', templateId);
        
      // 2. Buscar automações do template
      const { data: templateAutomations } = await supabase
        .from('space_template_automations')
        .select('*')
        .eq('template_id', templateId)
        .eq('enabled', true);
        
      // 3. Para cada space selecionado
      for (const spaceId of spaceIds) {
        // Buscar estrutura real do space
        const { data: realFolders } = await supabase
          .from('folders')
          .select('id, name')
          .eq('space_id', spaceId);
          
        const { data: realLists } = await supabase
          .from('lists')
          .select('id, name, folder_id')
          .or(`space_id.eq.${spaceId},folder_id.in.(${realFolders?.map(f => f.id).join(',')})`);
          
        // Criar mapas de correspondência
        const folderIdMap = createFolderMap(templateFolders, realFolders);
        const listIdMap = createListMap(templateLists, realLists);
        
        // 4. Criar automações remapeadas
        for (const automation of templateAutomations) {
          const remappedAutomation = remapAutomation(
            automation, 
            folderIdMap, 
            listIdMap, 
            spaceId, 
            workspaceId
          );
          
          await supabase.from('automations').insert(remappedAutomation);
        }
      }
    }
  });
};
```

#### 2. Lógica de Mapeamento por Nome

```typescript
function createListMap(templateLists, realLists) {
  const map = {};
  
  for (const templateList of templateLists) {
    // Nome do template: "Plan. de Criativos | "
    // Nome real: "Plan. de Criativos | Accerth"
    const baseNamePattern = templateList.name; // Já termina com " | "
    
    const matchingList = realLists.find(
      l => l.name.startsWith(baseNamePattern)
    );
    
    if (matchingList) {
      map[templateList.id] = matchingList.id;
    }
  }
  
  return map;
}
```

#### 3. Remapeamento de action_config

```typescript
function remapAutomation(automation, folderIdMap, listIdMap, spaceId, workspaceId) {
  // Clonar config para não modificar original
  const remappedConfig = JSON.parse(JSON.stringify(automation.action_config));
  
  // Remapear target_list_id em ações "move_task"
  if (remappedConfig.actions) {
    remappedConfig.actions = remappedConfig.actions.map(action => {
      if (action.type === 'move_task' && action.config?.target_list_id) {
        action.config.target_list_id = listIdMap[action.config.target_list_id];
      }
      return action;
    });
  }
  
  // Determinar scope_id real
  let scopeId = spaceId;
  if (automation.scope_type === 'list' && automation.list_ref_id) {
    scopeId = listIdMap[automation.list_ref_id];
  } else if (automation.scope_type === 'folder' && automation.folder_ref_id) {
    scopeId = folderIdMap[automation.folder_ref_id];
  }
  
  return {
    workspace_id: workspaceId,
    description: automation.description,
    trigger: automation.trigger,
    action_type: automation.action_type,
    action_config: remappedConfig,
    scope_type: automation.scope_type,
    scope_id: scopeId,
    enabled: true,
  };
}
```

---

### Interface do Usuário

#### Opção A: Botão nas Configurações do Template

Em `SpaceTemplateSettings.tsx`, adicionar um botão "Aplicar automações em spaces existentes" que abre um dialog para selecionar quais spaces receberão as automações.

#### Opção B: Página de Automações

Adicionar um botão na página `/automations` que permite importar automações de um template para spaces selecionados.

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useSpaceTemplates.ts` | Adicionar hook `useApplyTemplateAutomationsToSpaces` |
| `src/components/settings/SpaceTemplateSettings.tsx` | Botão "Aplicar automações em spaces" |
| `src/components/settings/ApplyTemplateAutomationsDialog.tsx` | **NOVO** - Dialog para selecionar spaces |

---

### Considerações Importantes

1. **Duplicação**: Se o usuário rodar a aplicação mais de uma vez, vai criar automações duplicadas. Pode ser útil verificar se uma automação similar já existe antes de inserir.

2. **Status IDs**: As automações do template referenciam status de template. Quando aplicar em spaces reais, precisamos mapear para os status reais da lista (ou usar status do workspace se a lista herda).

3. **Tags**: Os IDs de tags no action_config precisam existir no workspace. Se as automações usam tags específicas, elas precisam estar criadas.

---

### Resultado Esperado

1. Botão para "Aplicar automações do template em spaces existentes"
2. Dialog mostrando todos os 25 spaces "MAP | [Cliente]"
3. Seleção múltipla (ou "Aplicar em todos")
4. Clique em "Aplicar" cria 7 automações × 25 spaces = 175 automações
5. Cada space passa a ter suas automações funcionando

---

### Complexidade Adicional: Status IDs

As automações do template referenciam status de `status_template_items`. Quando aplicamos em spaces reais, precisamos:
1. Verificar se a lista real usa o mesmo template de status
2. Se sim, mapear os status_template_item IDs para status reais (ou usar os mesmos IDs se a lista usa `status_source: 'template'`)
3. Se a lista tem status customizados, pode não haver correspondência

Essa parte pode precisar de uma abordagem mais sofisticada dependendo de como os status estão configurados nos spaces existentes.
