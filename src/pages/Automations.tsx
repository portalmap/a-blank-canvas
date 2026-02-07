import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Zap, UserPlus, Eye } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { AutomationsList } from '@/components/automations/AutomationsList';
import { AutomationsFilters, AutomationsFilterState } from '@/components/automations/AutomationsFilters';
import { AdvancedAutomationBuilder } from '@/components/automations/advanced/AdvancedAutomationBuilder';
import { useAutomations } from '@/hooks/useAutomations';

const Automations = () => {
  const { activeWorkspace } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<AutomationsFilterState>(() => {
    const initialScopeType = searchParams.get('scopeType') || 'all';
    const initialScopeId = searchParams.get('scopeId') || null;
    return {
      scopeType: initialScopeType as AutomationsFilterState['scopeType'],
      scopeId: initialScopeId,
      searchTerm: '',
    };
  });
  const { data: automations = [] } = useAutomations(activeWorkspace?.id);

  if (!activeWorkspace) {
    return (
      <div className="flex-1 p-6">
        <p className="text-muted-foreground">Selecione um workspace para ver as automações.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Automações
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure regras automáticas para otimizar seu fluxo de trabalho
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {/* Quick Actions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Atribuição Automática</h3>
              <p className="text-sm text-muted-foreground">
                Atribua responsáveis automaticamente quando tarefas são criadas
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure por Workspace, Space, Folder ou Lista. As atribuições são cumulativas.
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">Seguir Automaticamente</h3>
              <p className="text-sm text-muted-foreground">
                Adicione seguidores automaticamente para acompanhar tarefas
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Líderes e gestores podem acompanhar todas as tarefas de uma área automaticamente.
          </p>
        </div>
      </div>

      {/* Filters */}
      <AutomationsFilters
        workspaceId={activeWorkspace.id}
        filters={filters}
        onChange={setFilters}
        automations={automations}
      />

      {/* Automations List */}
      <AutomationsList workspaceId={activeWorkspace.id} filters={filters} />

      {/* Create Dialog */}
      <AdvancedAutomationBuilder
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={activeWorkspace.id}
      />
    </div>
  );
};

export default Automations;
