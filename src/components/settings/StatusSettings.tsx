import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { StatusTemplateList } from './StatusTemplateList';
import { StatusTemplateEditor } from './StatusTemplateEditor';
import { WorkspaceStatusList } from './WorkspaceStatusList';

export function StatusSettings() {
  const { activeWorkspace } = useWorkspace();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  if (!activeWorkspace) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Selecione um workspace para gerenciar status
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
            <CardTitle className="text-lg">Status do Workspace</CardTitle>
            <CardDescription>
              Status padrão aplicados a todo o workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceStatusList workspaceId={activeWorkspace.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
