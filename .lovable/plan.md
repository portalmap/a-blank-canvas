
## Plano: Buscar Status Corretos para Lista de Template em Automações

### Problema Raiz
Quando estamos editando automações de template e há uma ação "Mover tarefa" seguida de "Alterar status":

1. O `scopeId` passado é o ID de referência da lista de template (`space_template_lists.id`)
2. O hook `useStatusesForScope` tenta buscar na tabela `lists` com esse ID
3. Como não encontra (é um ID de template, não de lista real), faz fallback para status do workspace
4. Resultado: mostra status errados (do workspace em vez da lista de destino)

### Causa Técnica
O `ActionConfigForm` recebe `isTemplateContext=true` mas não tem acesso ao `status_template_id` da lista de template selecionada. Atualmente passamos apenas:

```tsx
templateLists={lists.map(l => ({ id: l.id, name: l.name, folder_ref_id: l.folder_ref_id }))}
```

Faltou incluir `status_template_id`!

---

### Solução em 3 Partes

#### Parte 1: Expandir interface `TemplateList` para incluir `status_template_id`

Modificar a interface em ambos os arquivos:
- `MultiActionSelector.tsx`
- `ActionConfigForm.tsx`

```typescript
interface TemplateList {
  id: string;
  name: string;
  folder_ref_id?: string | null;
  status_template_id?: string | null; // ← ADICIONAR
}
```

#### Parte 2: Passar `status_template_id` nas props

Em `TemplateAutomationDialog.tsx`, incluir o campo:

```tsx
templateLists={lists.map(l => ({ 
  id: l.id, 
  name: l.name, 
  folder_ref_id: l.folder_ref_id,
  status_template_id: l.status_template_id  // ← ADICIONAR
}))}
```

#### Parte 3: Buscar status do template quando em contexto de template

No `ActionConfigForm.tsx`, adicionar lógica para buscar `status_template_items` quando:
- `isTemplateContext=true`
- `scopeType='list'`
- Existe uma lista de template com `status_template_id`

```typescript
// Buscar lista de template selecionada
const selectedTemplateList = isTemplateContext && scopeType === 'list' && scopeId
  ? templateLists.find(l => l.id === scopeId)
  : null;

// Buscar status do template quando em contexto de template
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
    return data.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
      is_default: s.is_default,
      order_index: s.order_index,
      category: s.category,
    }));
  },
  enabled: !!selectedTemplateList?.status_template_id,
});

// Usar templateStatuses quando disponível, senão usar statuses
const effectiveStatuses = templateStatuses.length > 0 ? templateStatuses : statuses;
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/advanced/MultiActionSelector.tsx` | Adicionar `status_template_id` à interface `TemplateList` |
| `src/components/automations/advanced/ActionConfigForm.tsx` | Adicionar `status_template_id` à interface e lógica de busca de status de template |
| `src/components/settings/TemplateAutomationDialog.tsx` | Incluir `status_template_id` ao mapear `templateLists` |

---

### Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────┐
│  ANTES (Falha)                                                   │
│  ────────                                                        │
│  1. Ação "Mover tarefa" seleciona "Plan. de Criativos"           │
│  2. scopeId = ID de referência do template (não lista real)      │
│  3. useStatusesForScope busca em `lists` table → não encontra    │
│  4. Fallback: retorna status do workspace                        │
│  5. "Alterar status" mostra: Aguardando, A Fazer, Em Progresso...│
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  DEPOIS (Sucesso)                                                │
│  ────────                                                        │
│  1. Ação "Mover tarefa" seleciona "Plan. de Criativos"           │
│  2. scopeId = ID de referência do template                       │
│  3. ActionConfigForm detecta isTemplateContext=true              │
│  4. Encontra templateList com status_template_id                 │
│  5. Busca status_template_items para esse template               │
│  6. "Alterar status" mostra: status da lista "Plan. de Criativos"│
└──────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. Ao adicionar ação "Mover tarefa" e selecionar lista de destino
2. A ação "Alterar status" abaixo mostrará os status configurados para essa lista de template
3. Se a lista de destino não tiver `status_template_id`, usará fallback para status do workspace
4. Funciona tanto para múltiplas ações quanto para ação única
