import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Target, Maximize2, Search } from 'lucide-react';
import { LocationTree } from '@/components/settings/LocationTree';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');


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

  const selectionCount =
    (applyToWorkspace ? 1 : 0) +
    selectedSpaces.length +
    selectedFolders.length +
    selectedLists.length;

  const clearSelection = () => {
    setApplyToWorkspace(false);
    setSelectedSpaces([]);
    setSelectedFolders([]);
    setSelectedLists([]);
  };

  const expandAll = () => {
    setExpandedSpaces((spaces || []).map((s) => s.id));
    setExpandedFolders((folders || []).map((f) => f.id));
  };

  const collapseAll = () => {
    setExpandedSpaces([]);
    setExpandedFolders([]);
  };


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
          <div className="flex items-center justify-between gap-2">
            <Label>Onde aplicar</Label>
            <div className="flex items-center gap-2">
              {selectionCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectionCount} {selectionCount === 1 ? 'local selecionado' : 'locais selecionados'}
                </span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Maximize2 className="h-4 w-4 mr-1.5" />
                Expandir
              </Button>
            </div>
          </div>
          <ScrollArea className="h-64 rounded-lg border p-3">
            <LocationTree
              idPrefix="inline"
              density="compact"
              spaces={spaces || []}
              folders={folders || []}
              lists={lists || []}
              applyToWorkspace={applyToWorkspace}
              onToggleWorkspace={setApplyToWorkspace}
              selectedSpaces={selectedSpaces}
              selectedFolders={selectedFolders}
              selectedLists={selectedLists}
              expandedSpaces={expandedSpaces}
              expandedFolders={expandedFolders}
              onToggleExpand={toggleExpand}
              onToggleSelection={toggleSelection}
            />
          </ScrollArea>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Onde aplicar o modelo</DialogTitle>
              <DialogDescription>
                Selecione o workspace, spaces, pastas ou listas que receberão as etapas do modelo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar space, pasta ou lista..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={expandAll}>
                  Expandir tudo
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={collapseAll}>
                  Recolher tudo
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[55vh] rounded-lg border p-3">
              <LocationTree
                idPrefix="modal"
                density="comfortable"
                search={search}
                spaces={spaces || []}
                folders={folders || []}
                lists={lists || []}
                applyToWorkspace={applyToWorkspace}
                onToggleWorkspace={setApplyToWorkspace}
                selectedSpaces={selectedSpaces}
                selectedFolders={selectedFolders}
                selectedLists={selectedLists}
                expandedSpaces={expandedSpaces}
                expandedFolders={expandedFolders}
                onToggleExpand={toggleExpand}
                onToggleSelection={toggleSelection}
              />
            </ScrollArea>

            <DialogFooter className="sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectionCount} {selectionCount === 1 ? 'local selecionado' : 'locais selecionados'}
                </span>
                {selectionCount > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                    Limpar seleção
                  </Button>
                )}
              </div>
              <Button type="button" onClick={() => setDialogOpen(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


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
