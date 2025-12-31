import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Building2 } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useSpaces } from "@/hooks/useSpaces";
import { useMoveFolder } from "@/hooks/useMoveFolder";
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

interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: {
    id: string;
    name: string;
    space_id: string;
  };
  workspaceId: string;
}

type NavigationLevel = 'workspace' | 'space';

export function MoveFolderDialog({ open, onOpenChange, folder, workspaceId }: MoveFolderDialogProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('workspace');

  const { data: workspaces } = useWorkspaces();
  const { data: spaces } = useSpaces(selectedWorkspaceId || undefined);
  const moveFolder = useMoveFolder();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedWorkspaceId(workspaceId);
      setSelectedSpaceId(null);
      setCurrentLevel('space');
    }
  }, [open, workspaceId]);

  const selectedWorkspace = workspaces?.find(w => w.id === selectedWorkspaceId);
  const selectedSpace = spaces?.find(s => s.id === selectedSpaceId);

  const handleWorkspaceSelect = (wId: string) => {
    setSelectedWorkspaceId(wId);
    setSelectedSpaceId(null);
    setCurrentLevel('space');
  };

  const handleSpaceSelect = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
  };

  const handleBack = () => {
    if (currentLevel === 'space') {
      setSelectedWorkspaceId(null);
      setSelectedSpaceId(null);
      setCurrentLevel('workspace');
    }
  };

  const handleMove = async () => {
    if (!selectedSpaceId) return;

    await moveFolder.mutateAsync({
      folderId: folder.id,
      spaceId: selectedSpaceId,
    });

    onOpenChange(false);
  };

  const isSameLocation = selectedSpaceId === folder.space_id;
  const canMove = selectedSpaceId && !isSameLocation && !moveFolder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover Pasta</DialogTitle>
          <DialogDescription>
            Selecione o Space de destino para "{folder.name}"
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
                  <BreadcrumbPage>{selectedWorkspace.name}</BreadcrumbPage>
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
                variant={selectedSpaceId === space.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleSpaceSelect(space.id)}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                {space.name}
                {space.id === folder.space_id && (
                  <span className="ml-2 text-xs text-muted-foreground">(atual)</span>
                )}
              </Button>
            ))}

            {currentLevel === 'space' && spaces?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum Space disponível
              </p>
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
            {moveFolder.isPending ? "Movendo..." : "Mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
