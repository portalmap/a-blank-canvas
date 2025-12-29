import { AutomationCard } from './AutomationCard';
import { useAutomations } from '@/hooks/useAutomations';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';

interface AutomationsListProps {
  workspaceId: string;
}

export function AutomationsList({ workspaceId }: AutomationsListProps) {
  const { data: automations, isLoading } = useAutomations(workspaceId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!automations || automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Zap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Nenhuma automação configurada</h3>
        <p className="text-muted-foreground mt-1 max-w-sm">
          Crie sua primeira automação para automatizar tarefas no seu workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Todas as Automações ({automations.length})
      </h3>
      <div className="space-y-2">
        {automations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
      </div>
    </div>
  );
}
