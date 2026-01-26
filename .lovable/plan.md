
## Plano: Botão de Duplicar Automação do Template

### Objetivo
Adicionar um botão de duplicar que cria um clone idêntico da automação com:
- Nome/descrição com prefixo "CLONE - " para fácil identificação
- Estado desativado (`enabled: false`) para evitar execuções duplicadas

---

### Mudanças Necessárias

#### 1. Criar Hook `useDuplicateTemplateAutomation` em `useTemplateAutomations.ts`

```typescript
export const useDuplicateTemplateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ automation }: { automation: TemplateAutomation }) => {
      // Criar descrição com prefixo CLONE
      const cloneDescription = automation.description 
        ? `CLONE - ${automation.description}` 
        : 'CLONE';

      const { data, error } = await supabase
        .from('space_template_automations')
        .insert({
          template_id: automation.template_id,
          description: cloneDescription,
          trigger: automation.trigger,
          action_type: automation.action_type,
          action_config: automation.action_config,
          scope_type: automation.scope_type,
          folder_ref_id: automation.folder_ref_id,
          list_ref_id: automation.list_ref_id,
          enabled: false, // SEMPRE desativado
        })
        .select()
        .single();

      if (error) throw error;
      return { data, templateId: automation.template_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ 
        queryKey: ['template-automations', result.templateId] 
      });
      toast.success('Automação duplicada! (desativada)');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar automação');
      console.error(error);
    },
  });
};
```

---

#### 2. Adicionar Botão de Duplicar em `TemplateAutomationsSection.tsx`

**Importar ícone e hook:**
```typescript
import { Copy } from 'lucide-react';
import { 
  useDuplicateTemplateAutomation,
  // ... outros hooks existentes
} from '@/hooks/useTemplateAutomations';
```

**Usar o hook:**
```typescript
const duplicateAutomation = useDuplicateTemplateAutomation();

const handleDuplicate = (automation: TemplateAutomation) => {
  duplicateAutomation.mutate({ automation });
};
```

**Adicionar botão na linha de ações (entre Edit e Delete):**
```tsx
<div className="flex items-center gap-1">
  <Button 
    variant="ghost" 
    size="icon" 
    className="h-8 w-8"
    onClick={() => handleEdit(automation)}
  >
    <Edit className="h-4 w-4" />
  </Button>
  {/* NOVO BOTÃO */}
  <Button 
    variant="ghost" 
    size="icon" 
    className="h-8 w-8"
    onClick={() => handleDuplicate(automation)}
    disabled={duplicateAutomation.isPending}
  >
    <Copy className="h-4 w-4" />
  </Button>
  <Button 
    variant="ghost" 
    size="icon" 
    className="h-8 w-8 text-destructive hover:text-destructive"
    onClick={() => setDeleteConfirmId(automation.id)}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

---

### Visualização na Interface

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🔘 Automação de transferência do Tráfego Pago > Designer                            │
│    [Alterações de status] → [Mover tarefa] | ☰ Tráfego Pago                        │
│                                                              [✏️] [📋] [🗑️]        │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                                                 ↑
                                                          Novo botão

Após clicar em duplicar:

┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ⚪ CLONE - Automação de transferência do Tráfego Pago > Designer    (desativado)   │
│    [Alterações de status] → [Mover tarefa] | ☰ Tráfego Pago                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useTemplateAutomations.ts` | Adicionar hook `useDuplicateTemplateAutomation` |
| `src/components/settings/TemplateAutomationsSection.tsx` | Adicionar botão de duplicar e handler |

---

### Comportamento

1. Usuário clica no botão de duplicar (ícone de cópia)
2. Sistema cria nova automação com:
   - Descrição: `CLONE - [descrição original]`
   - Mesmas configurações (trigger, action, scope, etc.)
   - `enabled: false` (desativada)
3. Toast de confirmação: "Automação duplicada! (desativada)"
4. Lista atualiza automaticamente mostrando o clone com visual esmaecido (desativado)
