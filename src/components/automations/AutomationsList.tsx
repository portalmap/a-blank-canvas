import { useMemo } from 'react';
import { AutomationCard } from './AutomationCard';
import { useAutomations } from '@/hooks/useAutomations';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import type { AutomationsFilterState } from './AutomationsFilters';

interface AutomationsListProps {
  workspaceId: string;
  filters?: AutomationsFilterState;
}

export function AutomationsList({ workspaceId, filters }: AutomationsListProps) {
  const { data: automations, isLoading } = useAutomations(workspaceId);

  const filteredAutomations = useMemo(() => {
    if (!automations) return [];

    return automations.filter((automation) => {
      // Filter by scope type
      if (filters?.scopeType && filters.scopeType !== 'all') {
        if (automation.scope_type !== filters.scopeType) return false;

        // Filter by specific item
        if (filters.scopeId && automation.scope_id !== filters.scopeId) return false;
      }

      // Filter by search term
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const description = automation.description?.toLowerCase() || '';
        if (!description.includes(searchLower)) return false;
      }

      return true;
    });
  }, [automations, filters]);

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

  if (filteredAutomations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Zap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Nenhuma automação encontrada</h3>
        <p className="text-muted-foreground mt-1 max-w-sm">
          Tente ajustar os filtros para ver mais resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {filters?.scopeType === 'all' || !filters?.scopeType
          ? `Todas as Automações (${filteredAutomations.length})`
          : `Automações Filtradas (${filteredAutomations.length})`}
      </h3>
      <div className="space-y-2">
        {filteredAutomations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
      </div>
    </div>
  );
}
