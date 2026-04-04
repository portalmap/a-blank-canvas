import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, Send } from 'lucide-react';
import { AutomationTemplateList } from './AutomationTemplateList';
import { TemplateAutomationsSection } from './TemplateAutomationsSection';
import { ApplyTemplateAutomationsDialog } from './ApplyTemplateAutomationsDialog';
import { useSpaceTemplate } from '@/hooks/useSpaceTemplates';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Skeleton } from '@/components/ui/skeleton';

export const AutomationTemplateSettings = () => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const { activeWorkspace } = useWorkspace();

  const { data: template, isLoading: templateLoading } = useSpaceTemplate(editingTemplateId || undefined);

  if (editingTemplateId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditingTemplateId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          {templateLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {template?.name}
            </h3>
          )}
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={() => setApplyTemplateId(editingTemplateId)}>
              <Send className="h-4 w-4 mr-1" />
              Aplicar em Spaces
            </Button>
          </div>
        </div>

        {templateLoading ? (
          <Card>
            <CardContent className="py-8">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : template && activeWorkspace ? (
          <TemplateAutomationsSection
            templateId={editingTemplateId}
            folders={(template.folders || []) as any}
            lists={(template.lists || []) as any}
            workspaceId={activeWorkspace.id}
          />
        ) : null}

        {applyTemplateId && (
          <ApplyTemplateAutomationsDialog
            open={!!applyTemplateId}
            onOpenChange={(open) => { if (!open) setApplyTemplateId(null); }}
            templateId={applyTemplateId}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Automação</CardTitle>
          <CardDescription>
            Gerencie automações nos templates de Space e aplique-as em massa nos Spaces existentes que seguem o mesmo padrão de estrutura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutomationTemplateList
            onEdit={setEditingTemplateId}
          />
        </CardContent>
      </Card>
    </div>
  );
};
