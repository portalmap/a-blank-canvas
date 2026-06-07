import { useState } from "react";
import { Check } from "lucide-react";
import { useSpaces } from "@/hooks/useSpaces";
import { useFolders } from "@/hooks/useFolders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'folder' | 'list' | 'task';
  itemName: string;
  workspaceId: string;
  currentSpaceId?: string;
  onDuplicate: (targetSpaceIds: string[], targetFolderId?: string | null) => Promise<void>;
  isPending?: boolean;
}

export function DuplicateDialog({
  open,
  onOpenChange,
  type,
  itemName,
  workspaceId,
  currentSpaceId,
  onDuplicate,
  isPending = false,
}: DuplicateDialogProps) {
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: spaces } = useSpaces(workspaceId);
  
  // For lists, we can optionally select a folder
  const selectedSingleSpaceId = selectedSpaceIds.length === 1 ? selectedSpaceIds[0] : null;
  const { data: folders } = useFolders(selectedSingleSpaceId || undefined);

  const typeLabels = {
    folder: 'Pasta',
    list: 'Lista',
    task: 'Tarefa',
  };

  const handleSpaceToggle = (spaceId: string) => {
    setSelectedSpaceIds(prev => {
      if (prev.includes(spaceId)) {
        return prev.filter(id => id !== spaceId);
      }
      return [...prev, spaceId];
    });
    // Reset folder selection when space selection changes
    setSelectedFolderId(null);
  };

  const handleDuplicate = async () => {
    if (selectedSpaceIds.length === 0) return;
    
    setIsLoading(true);
    try {
      await onDuplicate(selectedSpaceIds, selectedFolderId);
      onOpenChange(false);
      setSelectedSpaceIds([]);
      setSelectedFolderId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedSpaceIds([]);
    setSelectedFolderId(null);
  };

  const loading = isLoading || isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar {typeLabels[type]}</DialogTitle>
          <DialogDescription>
            Selecione os Spaces de destino para duplicar "{itemName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Spaces de destino</Label>
            <ScrollArea className="h-[200px] border rounded-md p-3">
              <div className="space-y-2">
                {spaces?.map((space) => (
                  <div
                    key={space.id}
                    className="flex items-center space-x-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => handleSpaceToggle(space.id)}
                  >
                    <Checkbox
                      id={`space-${space.id}`}
                      checked={selectedSpaceIds.includes(space.id)}
                      onCheckedChange={() => handleSpaceToggle(space.id)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {space.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: space.color }}
                        />
                      )}
                      <Label
                        htmlFor={`space-${space.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {space.name}
                        {space.id === currentSpaceId && (
                          <span className="text-muted-foreground text-xs ml-2">(atual)</span>
                        )}
                      </Label>
                    </div>
                    {selectedSpaceIds.includes(space.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
                {(!spaces || spaces.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum space encontrado
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Folder selection only for lists with single space selected */}
          {type === 'list' && selectedSpaceIds.length === 1 && folders && folders.length > 0 && (
            <div className="space-y-2">
              <Label>Pasta destino (opcional)</Label>
              <Select
                value={selectedFolderId || "none"}
                onValueChange={(value) => setSelectedFolderId(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pasta (raiz do Space)</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={selectedSpaceIds.length === 0 || loading}
          >
            {loading ? 'Duplicando...' : `Duplicar para ${selectedSpaceIds.length} Space${selectedSpaceIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
