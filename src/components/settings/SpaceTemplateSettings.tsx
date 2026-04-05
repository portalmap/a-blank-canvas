import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpaceTemplateList } from './SpaceTemplateList';
import { SpaceTemplateEditor } from './SpaceTemplateEditor';
import { FolderTemplateEditor } from './FolderTemplateEditor';
import { ListTemplateEditor } from './ListTemplateEditor';
import type { TemplateType } from '@/hooks/useSpaceTemplates';

export const SpaceTemplateSettings = () => {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [activeType, setActiveType] = useState<TemplateType>('space');

  if (isCreatingTemplate || editingTemplateId) {
    const editorProps = {
      templateId: editingTemplateId || undefined,
      onClose: () => {
        setEditingTemplateId(null);
        setIsCreatingTemplate(false);
      },
    };

    if (activeType === 'folder') return <FolderTemplateEditor {...editorProps} />;
    if (activeType === 'list') return <ListTemplateEditor {...editorProps} />;
    return <SpaceTemplateEditor {...editorProps} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Templates</CardTitle>
          <CardDescription>
            Crie templates reutilizáveis de Spaces, Pastas e Listas com estrutura pré-definida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeType} onValueChange={(v) => setActiveType(v as TemplateType)}>
            <TabsList className="mb-4">
              <TabsTrigger value="space">Spaces</TabsTrigger>
              <TabsTrigger value="folder">Pastas</TabsTrigger>
              <TabsTrigger value="list">Listas</TabsTrigger>
            </TabsList>

            <TabsContent value="space">
              <SpaceTemplateList
                type="space"
                onEdit={setEditingTemplateId}
                onCreate={() => setIsCreatingTemplate(true)}
              />
            </TabsContent>

            <TabsContent value="folder">
              <SpaceTemplateList
                type="folder"
                onEdit={setEditingTemplateId}
                onCreate={() => setIsCreatingTemplate(true)}
              />
            </TabsContent>

            <TabsContent value="list">
              <SpaceTemplateList
                type="list"
                onEdit={setEditingTemplateId}
                onCreate={() => setIsCreatingTemplate(true)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
