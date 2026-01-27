

## Plano: Adicionar Seletor de Etiquetas nos Gatilhos de Tag

### Situação Atual
Os gatilhos "Etiqueta adicionada" (`on_tag_added`) e "Tag removida" (`on_tag_removed`) não têm configuração inline. Quando selecionados, o gatilho é configurado sem especificar qual etiqueta deve ativar a automação.

### Solução Proposta

Criar um seletor de etiquetas similar ao `StatusMultiSelect`, permitindo ao usuário selecionar quais etiquetas específicas devem disparar a automação.

### UI Proposta

```text
┌─────────────────────────────────────────────────────┐
│  Gatilho                                             │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ 🏷️ Etiqueta adicionada                       ✓ ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Etiquetas                                          │
│  ┌─────────────────────────────────────────────────┐│
│  │ Qualquer etiqueta                            ▼ ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  (ou com seleção):                                  │
│  ┌─────────────────────────────────────────────────┐│
│  │ 🔴 Urgente  🔵 Revisão                       ▼ ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

### Mudanças Necessárias

#### 1. Criar `TagMultiSelect.tsx`

Novo componente inspirado no `StatusMultiSelect`, com as seguintes características:
- Popover com lista de tags do workspace
- Checkbox para seleção múltipla
- Busca/filtro por nome
- Botão "Marcar tudo" / "Limpar"
- Badge com cor da tag para itens selecionados

```typescript
// TagMultiSelect.tsx
interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface TagMultiSelectProps {
  label: string;
  placeholder?: string;
  tags: TagItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}
```

#### 2. Atualizar `TriggerInlineConfig.tsx`

Adicionar casos para `on_tag_added` e `on_tag_removed`:

```typescript
import { useTaskTags } from '@/hooks/useTaskTags';
import { TagMultiSelect } from './TagMultiSelect';

// Dentro do componente:
const { data: tags = [] } = useTaskTags(workspaceId);

// No switch:
case 'on_tag_added':
case 'on_tag_removed': {
  const tagIds: string[] = triggerConfig.tag_ids || [];

  const handleTagChange = (ids: string[]) => {
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        tag_ids: ids.length > 0 ? ids : null,
      },
    });
  };

  return (
    <TagMultiSelect
      label={triggerId === 'on_tag_added' ? 'Etiquetas' : 'Etiquetas removidas'}
      placeholder="Qualquer etiqueta"
      tags={tags}
      selectedIds={tagIds}
      onSelectionChange={handleTagChange}
    />
  );
}
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/automations/advanced/TagMultiSelect.tsx` | Criar | Componente de seleção múltipla de tags |
| `src/components/automations/advanced/TriggerInlineConfig.tsx` | Modificar | Adicionar cases para `on_tag_added` e `on_tag_removed` |

---

### Estrutura de Dados Salva

O `trigger_config` será salvo assim:

**Qualquer etiqueta (nenhuma selecionada):**
```json
{ "trigger_config": {} }
```

**Etiquetas específicas:**
```json
{ 
  "trigger_config": { 
    "tag_ids": ["uuid-tag-1", "uuid-tag-2"] 
  } 
}
```

---

### Resultado Esperado

1. Usuário seleciona gatilho "Etiqueta adicionada"
2. Aparece seletor de etiquetas abaixo do gatilho selecionado
3. Se nenhuma etiqueta for selecionada: dispara para qualquer etiqueta
4. Se etiquetas específicas forem selecionadas: dispara apenas quando uma delas for adicionada
5. Mesmo comportamento para "Tag removida"

