import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpaceTemplateList } from './SpaceTemplateList';
import { SpaceTemplateEditor } from './SpaceTemplateEditor';

export const SpaceTemplateSettings = () => {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { data: workspaces } = useWorkspaces();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces?.find(w => w.id === workspaceId);
    if (workspace) {
      setActiveWorkspace(workspace);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Selecione um Workspace</CardTitle>
            <CardDescription>
              Escolha um workspace para gerenciar os templates de Space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleWorkspaceChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecione um workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces?.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreatingTemplate || editingTemplateId) {
    return (
      <SpaceTemplateEditor
        workspaceId={activeWorkspace.id}
        templateId={editingTemplateId || undefined}
        onClose={() => {
          setEditingTemplateId(null);
          setIsCreatingTemplate(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Space</CardTitle>
          <CardDescription>
            Crie templates com estrutura pré-definida de pastas, listas e tarefas para reutilizar ao criar novos Spaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspaces && workspaces.length > 1 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Workspace atual
              </label>
              <Select value={activeWorkspace.id} onValueChange={handleWorkspaceChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <SpaceTemplateList
            workspaceId={activeWorkspace.id}
            onEdit={setEditingTemplateId}
            onCreate={() => setIsCreatingTemplate(true)}
          />
        </CardContent>
      </Card>
    </div>
  );
};
