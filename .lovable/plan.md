
## Plano: Buscar Status da Lista Selecionada no Gatilho de Template

### Problema Identificado

Na linha 414 do `TemplateAutomationDialog.tsx`, o `TriggerSelector` está recebendo:

```tsx
scopeType="workspace"  // ❌ FIXO - sempre workspace
```

Quando deveria receber o escopo dinâmico baseado na seleção do usuário (`scopeType` e `scopeId`). Além disso, como estamos em contexto de template, precisamos buscar os status de `status_template_items` em vez de status reais de listas.

### Solução em 3 Partes

#### Parte 1: Atualizar Interface do `TriggerSelector`

Adicionar props para contexto de template:

```typescript
interface TriggerSelectorProps {
  // ... props existentes ...
  isTemplateContext?: boolean;
  templateLists?: TemplateList[];
}

interface TemplateList {
  id: string;
  name: string;
  folder_ref_id?: string | null;
  status_template_id?: string | null;
}
```

#### Parte 2: Atualizar Interface do `TriggerInlineConfig`

Adicionar as mesmas props:

```typescript
interface TriggerInlineConfigProps {
  // ... props existentes ...
  isTemplateContext?: boolean;
  templateLists?: TemplateList[];
}
```

#### Parte 3: Implementar Lógica de Status de Template

No `TriggerInlineConfig`, adicionar lógica similar ao `ActionConfigForm`:

```typescript
// Buscar lista de template selecionada
const selectedTemplateList = isTemplateContext && scopeType === 'list' && scopeId
  ? templateLists.find(l => l.id === scopeId)
  : null;

// Buscar status do template
const { data: templateStatuses = [] } = useQuery({
  queryKey: ['template-status-items', selectedTemplateList?.status_template_id],
  queryFn: async () => {
    if (!selectedTemplateList?.status_template_id) return [];
    
    const { data, error } = await supabase
      .from('status_template_items')
      .select('*')
      .eq('template_id', selectedTemplateList.status_template_id)
      .order('order_index');

    if (error) throw error;
    return data.map(s => ({ id: s.id, name: s.name, color: s.color, category: s.category }));
  },
  enabled: !!selectedTemplateList?.status_template_id,
});

// Usar status do template quando disponível
const effectiveStatuses = isTemplateContext && templateStatuses.length > 0 
  ? templateStatuses 
  : statuses;
```

#### Parte 4: Atualizar `TemplateAutomationDialog`

Passar o escopo dinâmico e informações de template:

```tsx
<TriggerSelector
  selectedTrigger={selectedTrigger}
  onSelectTrigger={(id) => {
    setSelectedTrigger(id);
    setActiveStep('action');
  }}
  workspaceId={workspaceId}
  scopeType={scopeType === 'space' ? 'workspace' : scopeType}  // ✅ Dinâmico
  scopeId={scopeType === 'list' ? listRefId : scopeType === 'folder' ? folderRefId : undefined}  // ✅ Dinâmico
  config={actionConfig}
  onConfigChange={setActionConfig}
  isTemplateContext={true}  // ✅ NOVO
  templateLists={lists.map(l => ({  // ✅ NOVO
    id: l.id, 
    name: l.name, 
    folder_ref_id: l.folder_ref_id,
    status_template_id: l.status_template_id
  }))}
/>
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/advanced/TriggerSelector.tsx` | Adicionar props `isTemplateContext` e `templateLists` e repassar ao `TriggerInlineConfig` |
| `src/components/automations/advanced/TriggerInlineConfig.tsx` | Adicionar props de template e lógica para buscar `status_template_items` |
| `src/components/settings/TemplateAutomationDialog.tsx` | Passar escopo dinâmico e informações de template ao `TriggerSelector` |

---

### Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────┐
│  ANTES (Problema)                                                │
│  ────────────────                                                │
│  1. Usuário seleciona escopo "Lista: Plan. de Criativos"         │
│  2. TriggerSelector recebe scopeType="workspace" (fixo)          │
│  3. TriggerInlineConfig busca status do workspace                │
│  4. Mostra: Aguardando, A Fazer, Em Progresso... (errado!)       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  DEPOIS (Solução)                                                │
│  ────────────────                                                │
│  1. Usuário seleciona escopo "Lista: Plan. de Criativos"         │
│  2. TriggerSelector recebe scopeType="list" + scopeId            │
│  3. TriggerInlineConfig detecta isTemplateContext=true           │
│  4. Busca lista template → encontra status_template_id           │
│  5. Busca status_template_items para esse template               │
│  6. Mostra: status configurados para "Plan. de Criativos" ✓     │
└──────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. Ao criar automação de template e selecionar uma lista específica
2. O gatilho "Alterações de status" mostrará os status dessa lista
3. Se a lista tiver um `status_template_id`, buscará os status desse template
4. Se não tiver, usará fallback para status do workspace
5. Consistência com o comportamento já implementado em `ActionConfigForm`
