import { useState, useEffect } from 'react';
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

  // Reset scope when dialog opens with a different automation
  useEffect(() => {
    if (open) {
      setScope({
        scopeType: automation.scope_type,
        scopeId: automation.scope_id || undefined
      });
    }
  }, [open, automation]);

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
