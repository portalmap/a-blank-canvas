import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpaceTemplateList } from './SpaceTemplateList';
import { SpaceTemplateEditor } from './SpaceTemplateEditor';

export const SpaceTemplateSettings = () => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

  if (isCreatingTemplate || editingTemplateId) {
    return (
      <SpaceTemplateEditor
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
            Crie templates globais com estrutura pré-definida de pastas, listas e tarefas para reutilizar ao criar novos Spaces em qualquer workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpaceTemplateList
            onEdit={setEditingTemplateId}
            onCreate={() => setIsCreatingTemplate(true)}
          />
        </CardContent>
      </Card>
    </div>
  );
};
