import { useState } from 'react';
import { Folder, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Document, DocumentFolder } from '@/hooks/useDocuments';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  folders: DocumentFolder[];
  onMove: (docId: string, folderId: string | null, isWiki: boolean) => void;
  isLoading?: boolean;
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  document,
  folders,
  onMove,
  isLoading,
}: MoveDocumentDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');

  const handleMove = () => {
    if (!document) return;
    const folderId = selectedFolderId === 'none' ? null : selectedFolderId;
    const targetFolder = folders.find(f => f.id === folderId);
    const isWiki = targetFolder ? targetFolder.is_wiki : false;
    onMove(document.id, folderId, isWiki);
  };

  const wikiF = folders.filter(f => f.is_wiki);
  const normalF = folders.filter(f => !f.is_wiki);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover Documento</DialogTitle>
          <DialogDescription>
            Selecione a pasta de destino para "{document?.title}"
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-64 overflow-y-auto">
          <RadioGroup value={selectedFolderId} onValueChange={setSelectedFolderId}>
            <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
              <RadioGroupItem value="none" id="folder-none" />
              <Label htmlFor="folder-none" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Sem pasta (raiz)</span>
              </Label>
            </div>

            {wikiF.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 pt-3 pb-1">
                  Pastas Wiki
                </p>
                {wikiF.map(f => (
                  <div key={f.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                    <RadioGroupItem value={f.id} id={`folder-${f.id}`} />
                    <Label htmlFor={`folder-${f.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                      <Folder className="h-4 w-4" style={{ color: f.color || undefined }} />
                      <span>{f.name}</span>
                    </Label>
                  </div>
                ))}
              </>
            )}

            {normalF.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 pt-3 pb-1">
                  Pastas
                </p>
                {normalF.map(f => (
                  <div key={f.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                    <RadioGroupItem value={f.id} id={`folder-${f.id}`} />
                    <Label htmlFor={`folder-${f.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                      <Folder className="h-4 w-4" style={{ color: f.color || undefined }} />
                      <span>{f.name}</span>
                    </Label>
                  </div>
                ))}
              </>
            )}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleMove} disabled={isLoading}>
            {isLoading ? 'Movendo...' : 'Mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
