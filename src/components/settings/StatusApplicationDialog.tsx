import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Folder, List, Layout } from 'lucide-react';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';
import { useApplyStatusTemplate } from '@/hooks/useStatusTemplates';

interface StatusApplicationDialogProps {
  templateId: string | null;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusApplicationDialog({ 
  templateId, 
  workspaceId, 
  open, 
  onOpenChange 
}: StatusApplicationDialogProps) {
  const [selectedSpaces, setSelectedSpaces] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { data: spaces } = useSpaces(workspaceId);
  const { data: folders } = useFoldersForWorkspace(workspaceId);
  const { data: lists } = useListsForWorkspace(workspaceId);
  const applyTemplate = useApplyStatusTemplate();

  const toggleSpace = (spaceId: string) => {
    const newSelected = new Set(selectedSpaces);
    if (newSelected.has(spaceId)) {
      newSelected.delete(spaceId);
    } else {
      newSelected.add(spaceId);
    }
    setSelectedSpaces(newSelected);
  };

  const toggleFolder = (folderId: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderId)) {
      newSelected.delete(folderId);
    } else {
      newSelected.add(folderId);
    }
    setSelectedFolders(newSelected);
  };

  const toggleList = (listId: string) => {
    const newSelected = new Set(selectedLists);
    if (newSelected.has(listId)) {
      newSelected.delete(listId);
    } else {
      newSelected.add(listId);
    }
    setSelectedLists(newSelected);
  };

  const toggleExpandSpace = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId);
    } else {
      newExpanded.add(spaceId);
    }
    setExpandedSpaces(newExpanded);
  };

  const toggleExpandFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleApply = async () => {
    if (!templateId) return;

    await applyTemplate.mutateAsync({
      templateId,
      spaceIds: Array.from(selectedSpaces),
      folderIds: Array.from(selectedFolders),
      listIds: Array.from(selectedLists),
    });

    setSelectedSpaces(new Set());
    setSelectedFolders(new Set());
    setSelectedLists(new Set());
    onOpenChange(false);
  };

  const getFoldersForSpace = (spaceId: string) => 
    folders?.filter(f => f.space_id === spaceId) || [];

  const getListsForSpace = (spaceId: string) => 
    lists?.filter(l => l.space_id === spaceId && !l.folder_id) || [];

  const getListsForFolder = (folderId: string) => 
    lists?.filter(l => l.folder_id === folderId) || [];

  const totalSelected = selectedSpaces.size + selectedFolders.size + selectedLists.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar Modelo em Locais</DialogTitle>
          <DialogDescription>
            Selecione onde deseja aplicar este modelo de status
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-1">
            {spaces?.map((space) => {
              const spaceFolders = getFoldersForSpace(space.id);
              const spaceLists = getListsForSpace(space.id);
              const hasChildren = spaceFolders.length > 0 || spaceLists.length > 0;
              const isExpanded = expandedSpaces.has(space.id);

              return (
                <div key={space.id}>
                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent">
                    {hasChildren && (
                      <button
                        onClick={() => toggleExpandSpace(space.id)}
                        className="p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {!hasChildren && <div className="w-5" />}
                    
                    <Checkbox
                      id={`space-${space.id}`}
                      checked={selectedSpaces.has(space.id)}
                      onCheckedChange={() => toggleSpace(space.id)}
                    />
                    <Layout className="h-4 w-4 text-muted-foreground" />
                    <Label 
                      htmlFor={`space-${space.id}`}
                      className="flex-1 cursor-pointer font-medium"
                    >
                      {space.name}
                    </Label>
                  </div>

                  {isExpanded && (
                    <div className="ml-6 border-l pl-2">
                      {spaceFolders.map((folder) => {
                        const folderLists = getListsForFolder(folder.id);
                        const hasFolderChildren = folderLists.length > 0;
                        const isFolderExpanded = expandedFolders.has(folder.id);

                        return (
                          <div key={folder.id}>
                            <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent">
                              {hasFolderChildren && (
                                <button
                                  onClick={() => toggleExpandFolder(folder.id)}
                                  className="p-0.5"
                                >
                                  {isFolderExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {!hasFolderChildren && <div className="w-5" />}
                              
                              <Checkbox
                                id={`folder-${folder.id}`}
                                checked={selectedFolders.has(folder.id)}
                                onCheckedChange={() => toggleFolder(folder.id)}
                              />
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              <Label 
                                htmlFor={`folder-${folder.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                {folder.name}
                              </Label>
                            </div>

                            {isFolderExpanded && (
                              <div className="ml-6 border-l pl-2">
                                {folderLists.map((list) => (
                                  <div
                                    key={list.id}
                                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent"
                                  >
                                    <div className="w-5" />
                                    <Checkbox
                                      id={`list-${list.id}`}
                                      checked={selectedLists.has(list.id)}
                                      onCheckedChange={() => toggleList(list.id)}
                                    />
                                    <List className="h-4 w-4 text-muted-foreground" />
                                    <Label 
                                      htmlFor={`list-${list.id}`}
                                      className="flex-1 cursor-pointer"
                                    >
                                      {list.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {spaceLists.map((list) => (
                        <div
                          key={list.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent"
                        >
                          <div className="w-5" />
                          <Checkbox
                            id={`list-${list.id}`}
                            checked={selectedLists.has(list.id)}
                            onCheckedChange={() => toggleList(list.id)}
                          />
                          <List className="h-4 w-4 text-muted-foreground" />
                          <Label 
                            htmlFor={`list-${list.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            {list.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply}
            disabled={totalSelected === 0 || applyTemplate.isPending}
          >
            Aplicar em {totalSelected} {totalSelected === 1 ? 'local' : 'locais'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
