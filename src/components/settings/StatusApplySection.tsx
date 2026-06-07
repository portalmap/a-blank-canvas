import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  ChevronRight, 
  ChevronDown,
  Folder,
  List,
  Layout
} from 'lucide-react';
import { useStatusTemplates, useApplyStatusTemplate } from '@/hooks/useStatusTemplates';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';
import { toast } from 'sonner';

interface StatusApplySectionProps {
  workspaceId: string;
}

type ApplicationMode = 'synchronized' | 'copy';

export function StatusApplySection({ workspaceId }: StatusApplySectionProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>('synchronized');
  const [applyToWorkspace, setApplyToWorkspace] = useState(false);
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const { data: templates } = useStatusTemplates(workspaceId);
  const { data: spaces } = useSpaces(workspaceId);
  const { data: folders } = useFoldersForWorkspace(workspaceId);
  const { data: lists } = useListsForWorkspace(workspaceId);
  const applyTemplate = useApplyStatusTemplate();

  const toggleExpand = (type: 'space' | 'folder', id: string) => {
    if (type === 'space') {
      setExpandedSpaces(prev =>
        prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
    } else {
      setExpandedFolders(prev =>
        prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      );
    }
  };

  const toggleSelection = (type: 'space' | 'folder' | 'list', id: string) => {
    if (type === 'space') {
      setSelectedSpaces(prev =>
        prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
    } else if (type === 'folder') {
      setSelectedFolders(prev =>
        prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      );
    } else {
      setSelectedLists(prev =>
        prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
      );
    }
  };

  const handleApply = async () => {
    if (!selectedTemplateId) {
      toast.error('Selecione um modelo');
      return;
    }

    const hasSelections = applyToWorkspace || 
      selectedSpaces.length > 0 || 
      selectedFolders.length > 0 || 
      selectedLists.length > 0;

    if (!hasSelections) {
      toast.error('Selecione pelo menos um local para aplicar');
      return;
    }

    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplateId,
        workspaceId: applyToWorkspace ? workspaceId : undefined,
        spaceIds: selectedSpaces,
        folderIds: selectedFolders,
        listIds: selectedLists,
        synchronized: applicationMode === 'synchronized',
      });

      // Reset selections
      setApplyToWorkspace(false);
      setSelectedSpaces([]);
      setSelectedFolders([]);
      setSelectedLists([]);
      
      toast.success(
        applicationMode === 'synchronized'
          ? 'Modelo aplicado e sincronizado!'
          : 'Cópia do modelo aplicada!'
      );
    } catch (error) {
      toast.error('Erro ao aplicar modelo');
      console.error(error);
    }
  };

  const getFoldersForSpace = (spaceId: string) => 
    folders?.filter(f => f.space_id === spaceId) || [];

  const getListsForFolder = (folderId: string) =>
    lists?.filter(l => l.folder_id === folderId) || [];

  const getListsDirectlyInSpace = (spaceId: string) =>
    lists?.filter(l => l.space_id === spaceId && !l.folder_id) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Aplicar Modelo em Locais
        </CardTitle>
        <CardDescription>
          Selecione um modelo e escolha onde deseja aplicá-lo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selector */}
        <div className="space-y-2">
          <Label>Modelo a aplicar</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Application Mode */}
        <div className="space-y-3">
          <Label>Tipo de aplicação</Label>
          <RadioGroup
            value={applicationMode}
            onValueChange={(value: ApplicationMode) => setApplicationMode(value)}
            className="space-y-2"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
              <RadioGroupItem value="synchronized" id="synchronized" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="synchronized" className="font-medium cursor-pointer">
                  Sincronizado
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando o modelo for atualizado, todos os locais vinculados receberão as mudanças automaticamente.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
              <RadioGroupItem value="copy" id="copy" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="copy" className="font-medium cursor-pointer">
                  Cópia Independente
                </Label>
                <p className="text-sm text-muted-foreground">
                  Cria uma cópia dos status do modelo. Alterações futuras no modelo não afetarão esses locais.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Location Selection */}
        <div className="space-y-3">
          <Label>Onde aplicar</Label>
          <ScrollArea className="h-64 rounded-lg border p-3">
            <div className="space-y-2">
              {/* Workspace option */}
              <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                <Checkbox
                  id="apply-workspace"
                  checked={applyToWorkspace}
                  onCheckedChange={(checked) => setApplyToWorkspace(!!checked)}
                />
                <Label htmlFor="apply-workspace" className="flex items-center gap-2 cursor-pointer">
                  <Layout className="h-4 w-4 text-primary" />
                  Todo o Workspace
                </Label>
              </div>

              {/* Spaces tree */}
              {spaces?.map((space) => (
                <div key={space.id} className="space-y-1">
                  <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                    <button
                      onClick={() => toggleExpand('space', space.id)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      {expandedSpaces.includes(space.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <Checkbox
                      id={`space-${space.id}`}
                      checked={selectedSpaces.includes(space.id)}
                      onCheckedChange={() => toggleSelection('space', space.id)}
                    />
                    <Label htmlFor={`space-${space.id}`} className="flex items-center gap-2 cursor-pointer">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: space.color || '#94a3b8' }}
                      />
                      {space.name}
                    </Label>
                  </div>

                  {expandedSpaces.includes(space.id) && (
                    <div className="ml-6 space-y-1">
                      {/* Folders in space */}
                      {getFoldersForSpace(space.id).map((folder) => (
                        <div key={folder.id} className="space-y-1">
                          <div className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                            <button
                              onClick={() => toggleExpand('folder', folder.id)}
                              className="p-0.5 hover:bg-muted rounded"
                            >
                              {expandedFolders.includes(folder.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <Checkbox
                              id={`folder-${folder.id}`}
                              checked={selectedFolders.includes(folder.id)}
                              onCheckedChange={() => toggleSelection('folder', folder.id)}
                            />
                            <Label htmlFor={`folder-${folder.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              {folder.name}
                            </Label>
                          </div>

                          {expandedFolders.includes(folder.id) && (
                            <div className="ml-6 space-y-1">
                              {getListsForFolder(folder.id).map((list) => (
                                <div
                                  key={list.id}
                                  className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                                >
                                  <div className="w-4" />
                                  <Checkbox
                                    id={`list-${list.id}`}
                                    checked={selectedLists.includes(list.id)}
                                    onCheckedChange={() => toggleSelection('list', list.id)}
                                  />
                                  <Label htmlFor={`list-${list.id}`} className="flex items-center gap-2 cursor-pointer">
                                    <List className="h-4 w-4 text-muted-foreground" />
                                    {list.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Lists directly in space */}
                      {getListsDirectlyInSpace(space.id).map((list) => (
                        <div
                          key={list.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                        >
                          <div className="w-4" />
                          <Checkbox
                            id={`list-${list.id}`}
                            checked={selectedLists.includes(list.id)}
                            onCheckedChange={() => toggleSelection('list', list.id)}
                          />
                          <Label htmlFor={`list-${list.id}`} className="flex items-center gap-2 cursor-pointer">
                            <List className="h-4 w-4 text-muted-foreground" />
                            {list.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Apply Button */}
        <Button 
          onClick={handleApply}
          disabled={!selectedTemplateId || applyTemplate.isPending}
          className="w-full"
        >
          {applyTemplate.isPending ? 'Aplicando...' : 'Aplicar Modelo'}
        </Button>
      </CardContent>
    </Card>
  );
}
