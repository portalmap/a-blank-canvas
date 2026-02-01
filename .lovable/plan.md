
## Plano: Adicionar Duplicação de Automações com Seleção de Destino

### Resumo

Adicionar funcionalidade para duplicar automações já criadas, permitindo que o usuário escolha o novo escopo (destino) onde a automação duplicada será aplicada. A automação clonada será criada desativada para evitar execuções acidentais.

---

### O que será implementado

1. **Botão de duplicar** no card de cada automação (ícone de cópia)
2. **Diálogo de seleção de destino** onde o usuário escolhe o novo escopo
3. **Hook de duplicação** no `useAutomations.ts`
4. **Automação clonada desativada** com prefixo "CLONE -" na descrição

---

### Interface do Usuário

No card de cada automação (`AutomationCard.tsx`):
- Novo botão com ícone `Copy` ao lado do botão de editar
- Ao clicar, abre um diálogo para selecionar o destino
- Usuário pode escolher: Workspace, Space, Pasta ou Lista
- Após confirmar, a automação é duplicada no destino escolhido

---

### Fluxo de Uso

1. Usuário clica no ícone de duplicar em uma automação
2. Abre diálogo "Duplicar Automação"
3. Usuário seleciona o novo escopo (destino)
4. Sistema cria cópia da automação:
   - Mesmas configurações (trigger, action, action_config)
   - Novo escopo selecionado
   - Descrição com prefixo "CLONE - "
   - Estado: desativada (enabled: false)
5. Toast de confirmação é exibido

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAutomations.ts` | Adicionar hook `useDuplicateAutomation` |
| `src/components/automations/AutomationCard.tsx` | Adicionar botão de duplicar + diálogo de destino |
| `src/components/automations/DuplicateAutomationDialog.tsx` | **Novo arquivo** - Diálogo para seleção de destino |

---

### Seção Técnica

#### 1. Novo hook `useDuplicateAutomation` (useAutomations.ts)

```typescript
interface DuplicateAutomationParams {
  automation: Automation;
  targetScopeType: AutomationScopeType;
  targetScopeId?: string;
}

export const useDuplicateAutomation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ automation, targetScopeType, targetScopeId }: DuplicateAutomationParams) => {
      const cloneDescription = automation.description 
        ? `CLONE - ${automation.description}` 
        : 'CLONE';

      const { data, error } = await supabase
        .from('automations')
        .insert({
          workspace_id: automation.workspace_id,
          description: cloneDescription,
          trigger: automation.trigger,
          action_type: automation.action_type,
          action_config: automation.action_config,
          scope_type: targetScopeType,
          scope_id: targetScopeId || null,
          enabled: false, // Sempre criar desativada
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automação duplicada! (desativada)');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar automação');
      console.error(error);
    },
  });
};
```

#### 2. Novo componente `DuplicateAutomationDialog.tsx`

```tsx
import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScopeSelector } from './ScopeSelector';
import { useDuplicateAutomation, type Automation, type AutomationScope } from '@/hooks/useAutomations';
import { Copy } from 'lucide-react';

interface DuplicateAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation: Automation;
  workspaceId: string;
}

export function DuplicateAutomationDialog({ 
  open, 
  onOpenChange, 
  automation,
  workspaceId 
}: DuplicateAutomationDialogProps) {
  const [scope, setScope] = useState<{ scopeType: AutomationScope; scopeId?: string }>({ 
    scopeType: automation.scope_type,
    scopeId: automation.scope_id || undefined
  });
  
  const duplicateAutomation = useDuplicateAutomation();

  const handleDuplicate = async () => {
    await duplicateAutomation.mutateAsync({
      automation,
      targetScopeType: scope.scopeType,
      targetScopeId: scope.scopeId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Automação
          </DialogTitle>
          <DialogDescription>
            Selecione o destino para a cópia de "{automation.description || 'Automação'}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScopeSelector
            workspaceId={workspaceId}
            value={scope}
            onChange={setScope}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDuplicate}
            disabled={duplicateAutomation.isPending}
          >
            {duplicateAutomation.isPending ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Atualização do `AutomationCard.tsx`

```tsx
import { Copy } from 'lucide-react';
import { DuplicateAutomationDialog } from './DuplicateAutomationDialog';

// Dentro do componente:
const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

// No JSX, após o botão de editar:
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-muted-foreground hover:text-foreground"
  onClick={() => setDuplicateDialogOpen(true)}
  title="Duplicar automação"
>
  <Copy className="h-4 w-4" />
</Button>

// Após o AdvancedAutomationBuilder:
<DuplicateAutomationDialog
  open={duplicateDialogOpen}
  onOpenChange={setDuplicateDialogOpen}
  automation={automation}
  workspaceId={automation.workspace_id}
/>
```

---

### Comportamento da Duplicação

| Campo | Comportamento |
|-------|---------------|
| Descrição | Prefixo "CLONE - " adicionado |
| Gatilho (trigger) | Copiado integralmente |
| Ação (action_type) | Copiada integralmente |
| Configuração (action_config) | Copiada integralmente |
| Escopo | Definido pelo usuário no diálogo |
| Status | Sempre desativada (enabled: false) |

---

### Resultado Esperado

1. Botão de duplicar visível em cada card de automação
2. Ao clicar, diálogo abre com seletor de escopo
3. Escopo inicial = mesmo da automação original
4. Usuário pode mudar para qualquer escopo desejado
5. Automação duplicada criada desativada
6. Toast confirma a operação
