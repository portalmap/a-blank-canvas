import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { StatusTemplateList } from './StatusTemplateList';
import { StatusTemplateEditor } from './StatusTemplateEditor';
import { WorkspaceStatusList } from './WorkspaceStatusList';
import { StatusApplySection } from './StatusApplySection';

export function StatusSettings() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces?.find(w => w.id === workspaceId);
    if (workspace) {
      setActiveWorkspace({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
      });
    }
  };

  // Show workspace selector if no active workspace
  if (!activeWorkspace) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Selecione um Workspace
            </CardTitle>
            <CardDescription>
              Escolha um workspace para gerenciar os status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWorkspaces ? (
              <div className="text-sm text-muted-foreground">Carregando workspaces...</div>
            ) : workspaces && workspaces.length > 0 ? (
              <Select onValueChange={handleWorkspaceChange}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecione um workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum workspace encontrado. Crie um workspace primeiro.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreatingTemplate || editingTemplateId) {
    return (
      <StatusTemplateEditor
        workspaceId={activeWorkspace.id}
        templateId={editingTemplateId}
        onClose={() => {
          setEditingTemplateId(null);
          setIsCreatingTemplate(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Workspace Atual</CardTitle>
            </div>
            {workspaces && workspaces.length > 1 && (
              <Select value={activeWorkspace.id} onValueChange={handleWorkspaceChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <CardDescription>
            Gerencie os status padrão e modelos para: <strong>{activeWorkspace.name}</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Modelos de Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Modelos de Status</CardTitle>
              <CardDescription>
                Crie modelos reutilizáveis para aplicar em diferentes locais
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsCreatingTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo modelo
            </Button>
          </CardHeader>
          <CardContent>
            <StatusTemplateList
              workspaceId={activeWorkspace.id}
              onEdit={setEditingTemplateId}
            />
          </CardContent>
        </Card>

        {/* Status do Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Padrão do Workspace</CardTitle>
            <CardDescription>
              Status base que se aplicam a todo o workspace quando não há customização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceStatusList workspaceId={activeWorkspace.id} />
          </CardContent>
        </Card>
      </div>

      {/* Aplicar Modelo */}
      <StatusApplySection workspaceId={activeWorkspace.id} />
    </div>
  );
}
