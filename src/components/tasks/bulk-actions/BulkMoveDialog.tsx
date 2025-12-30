import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSpaces } from "@/hooks/useSpaces";
import { useFolders } from "@/hooks/useFolders";
import { useLists } from "@/hooks/useLists";
import { useBulkMoveTasks } from "@/hooks/useBulkTaskActions";
import { ChevronRight, Folder, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
  workspaceId: string;
  onSuccess: () => void;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  taskIds,
  workspaceId,
  onSuccess,
}: BulkMoveDialogProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const { data: spaces } = useSpaces(workspaceId);
  const { data: folders } = useFolders(selectedSpaceId || undefined);
  const { data: lists } = useLists({ spaceId: selectedSpaceId || undefined, folderId: selectedFolderId || undefined });
  const moveTasks = useBulkMoveTasks();

  const handleMove = () => {
    if (!selectedListId) return;
    moveTasks.mutate(
      { taskIds, listId: selectedListId, workspaceId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  };

  const handleReset = () => {
    setSelectedSpaceId(null);
    setSelectedFolderId(null);
    setSelectedListId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover {taskIds.length} tarefa(s)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Workspace</span>
            {selectedSpaceId && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span>{spaces?.find(s => s.id === selectedSpaceId)?.name}</span>
              </>
            )}
            {selectedFolderId && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span>{folders?.find(f => f.id === selectedFolderId)?.name}</span>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {!selectedSpaceId ? (
              // Show spaces
              <div className="divide-y">
                {spaces?.map((space) => (
                  <button
                    key={space.id}
                    onClick={() => setSelectedSpaceId(space.id)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-accent text-left"
                  >
                    <LayoutGrid className="h-4 w-4" style={{ color: space.color || undefined }} />
                    <span className="flex-1">{space.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              // Show folders and lists
              <div className="divide-y">
                {/* Back button */}
                <button
                  onClick={() => {
                    if (selectedFolderId) {
                      setSelectedFolderId(null);
                      setSelectedListId(null);
                    } else {
                      setSelectedSpaceId(null);
                    }
                  }}
                  className="w-full flex items-center gap-2 p-3 hover:bg-accent text-left text-muted-foreground"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <span>Voltar</span>
                </button>

                {/* Folders */}
                {!selectedFolderId && folders?.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-accent text-left"
                  >
                    <Folder className="h-4 w-4" />
                    <span className="flex-1">{folder.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}

                {/* Lists */}
                {lists?.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={cn(
                      "w-full flex items-center gap-2 p-3 hover:bg-accent text-left",
                      selectedListId === list.id && "bg-primary/10"
                    )}
                  >
                    <List className="h-4 w-4" />
                    <span className="flex-1">{list.name}</span>
                    {selectedListId === list.id && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMove}
              disabled={!selectedListId || moveTasks.isPending}
            >
              {moveTasks.isPending ? "Movendo..." : "Mover"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
