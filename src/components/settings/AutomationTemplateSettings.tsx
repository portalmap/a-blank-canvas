import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AutomationTemplateList } from './AutomationTemplateList';
import { SpaceTemplateEditor } from './SpaceTemplateEditor';

export const AutomationTemplateSettings = () => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  if (editingTemplateId) {
    return (
      <SpaceTemplateEditor
        templateId={editingTemplateId}
        onClose={() => setEditingTemplateId(null)}
      />
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
