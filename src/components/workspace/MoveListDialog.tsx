import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Folder, LayoutGrid, Building2 } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useSpaces } from "@/hooks/useSpaces";
import { useFolders } from "@/hooks/useFolders";
import { useMoveList } from "@/hooks/useMoveList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MoveListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: {
    id: string;
    name: string;
    workspace_id: string;
    space_id: string;
    folder_id?: string | null;
  };
}

type NavigationLevel = 'workspace' | 'space' | 'folder';

export function MoveListDialog({ open, onOpenChange, list }: MoveListDialogProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('workspace');

  const { data: workspaces } = useWorkspaces();
  const { data: spaces } = useSpaces(selectedWorkspaceId || undefined);
  const { data: folders } = useFolders(selectedSpaceId || undefined);
  const moveList = useMoveList();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedWorkspaceId(list.workspace_id);
      setSelectedSpaceId(null);
      setSelectedFolderId(null);
      setCurrentLevel('space');
    }
  }, [open, list.workspace_id]);

  const selectedWorkspace = workspaces?.find(w => w.id === selectedWorkspaceId);
  const selectedSpace = spaces?.find(s => s.id === selectedSpaceId);
  const selectedFolder = folders?.find(f => f.id === selectedFolderId);

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setSelectedSpaceId(null);
    setSelectedFolderId(null);
    setCurrentLevel('space');
  };

  const handleSpaceSelect = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedFolderId(null);
    setCurrentLevel('folder');
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleBack = () => {
    if (currentLevel === 'folder') {
      setSelectedSpaceId(null);
      setSelectedFolderId(null);
      setCurrentLevel('space');
    } else if (currentLevel === 'space') {
      setSelectedWorkspaceId(null);
      setCurrentLevel('workspace');
    }
  };

  const handleMove = async () => {
    if (!selectedWorkspaceId || !selectedSpaceId) return;

    await moveList.mutateAsync({
      listId: list.id,
      workspaceId: selectedWorkspaceId,
      spaceId: selectedSpaceId,
      folderId: selectedFolderId,
    });

    onOpenChange(false);
  };

  const isSameLocation = 
    selectedWorkspaceId === list.workspace_id && 
    selectedSpaceId === list.space_id && 
    selectedFolderId === (list.folder_id || null);

  const canMove = selectedWorkspaceId && selectedSpaceId && !isSameLocation && !moveList.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover Lista</DialogTitle>
          <DialogDescription>
            Selecione o destino para "{list.name}"
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                className="cursor-pointer"
                onClick={() => {
                  setSelectedWorkspaceId(null);
                  setSelectedSpaceId(null);
                  setSelectedFolderId(null);
                  setCurrentLevel('workspace');
                }}
              >
                Workspaces
              </BreadcrumbLink>
            </BreadcrumbItem>
            {selectedWorkspace && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {currentLevel === 'space' ? (
                    <BreadcrumbPage>{selectedWorkspace.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedSpaceId(null);
                        setSelectedFolderId(null);
                        setCurrentLevel('space');
                      }}
                    >
                      {selectedWorkspace.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {selectedSpace && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedSpace.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Navigation */}
        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-2">
            {currentLevel !== 'workspace' && (
              <Button
                variant="ghost"
                className="w-full justify-start mb-2"
                onClick={handleBack}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}

            {currentLevel === 'workspace' && workspaces?.map(workspace => (
              <Button
                key={workspace.id}
                variant="ghost"
                className="w-full justify-between"
                onClick={() => handleWorkspaceSelect(workspace.id)}
              >
                <div className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" />
                  {workspace.name}
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}

            {currentLevel === 'space' && spaces?.map(space => (
              <Button
                key={space.id}
                variant="ghost"
                className="w-full justify-between"
                onClick={() => handleSpaceSelect(space.id)}
              >
                <div className="flex items-center">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  {space.name}
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}

            {currentLevel === 'folder' && (
              <>
                {/* Option to place directly in space (no folder) */}
                <Button
                  key="no-folder"
                  variant={selectedFolderId === null && selectedSpaceId ? "secondary" : "ghost"}
                  className="w-full justify-start mb-2"
                  onClick={() => handleFolderSelect(null)}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Raiz do Space (sem pasta)
                </Button>

                {folders?.map(folder => (
                  <Button
                    key={folder.id}
                    variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleFolderSelect(folder.id)}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    {folder.name}
                  </Button>
                ))}

                {folders?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma pasta neste Space
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={!canMove}
          >
            {moveList.isPending ? "Movendo..." : "Mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
