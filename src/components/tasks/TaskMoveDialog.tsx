import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSpaces } from '@/hooks/useSpaces';
import { useFolders } from '@/hooks/useFolders';
import { useLists } from '@/hooks/useLists';
import { useMoveTask } from '@/hooks/useTasks';
import { Loader2 } from 'lucide-react';

interface TaskMoveDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  currentListId: string;
}

export const TaskMoveDialog = ({
  taskId,
  open,
  onOpenChange,
  workspaceId,
  currentListId,
}: TaskMoveDialogProps) => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedListId, setSelectedListId] = useState<string>('');

  const { data: spaces, isLoading: spacesLoading } = useSpaces(workspaceId);
  const { data: folders } = useFolders(selectedSpaceId || undefined);
  const { data: spaceLists } = useLists({ spaceId: selectedSpaceId || undefined });
  const { data: folderLists } = useLists({ folderId: selectedFolderId && selectedFolderId !== "none" ? selectedFolderId : undefined });
  
  const moveTask = useMoveTask();

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSpaceId('');
      setSelectedFolderId('');
      setSelectedListId('');
    }
  }, [open]);

  // Reset folder and list when space changes
  useEffect(() => {
    setSelectedFolderId('');
    setSelectedListId('');
  }, [selectedSpaceId]);

  // Reset list when folder changes
  useEffect(() => {
    setSelectedListId('');
  }, [selectedFolderId]);

  const handleMove = async () => {
    if (!taskId || !selectedListId) return;

    await moveTask.mutateAsync({
      id: taskId,
      listId: selectedListId,
      workspaceId: workspaceId,
    });

    onOpenChange(false);
  };

  // Combine lists from space and folder
  const availableLists = selectedFolderId && selectedFolderId !== "none"
    ? folderLists || []
    : spaceLists?.filter(l => !l.folder_id) || [];

  const isValid = selectedListId && selectedListId !== currentListId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover Tarefa</DialogTitle>
        </DialogHeader>

        {spacesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Espaço</Label>
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um espaço" />
                </SelectTrigger>
                <SelectContent>
                  {spaces?.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSpaceId && folders && folders.length > 0 && (
              <div className="space-y-2">
                <Label>Pasta (opcional)</Label>
                <Select value={selectedFolderId} onValueChange={(value) => setSelectedFolderId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma pasta</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSpaceId && (
              <div className="space-y-2">
                <Label>Lista</Label>
                <Select value={selectedListId} onValueChange={setSelectedListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma lista" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLists.map((list) => (
                      <SelectItem 
                        key={list.id} 
                        value={list.id}
                        disabled={list.id === currentListId}
                      >
                        {list.name} {list.id === currentListId && '(atual)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={!isValid || moveTask.isPending}
          >
            {moveTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
