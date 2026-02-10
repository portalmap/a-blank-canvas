import { useState } from 'react';
import { ChevronRight, Folder, MoreHorizontal, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Document, DocumentFolder } from '@/hooks/useDocuments';
import { DocTreeItem } from './DocTreeItem';

interface DocFolderTreeItemProps {
  folder: DocumentFolder;
  documents: Document[];
  subFolders: DocumentFolder[];
  allFolders: DocumentFolder[];
  allDocuments: Document[];
  onOpenDoc: (doc: Document) => void;
  onToggleFavorite?: (doc: Document) => void;
  onArchiveDoc?: (doc: Document) => void;
  onDeleteDoc?: (doc: Document) => void;
  onCreateDocInFolder?: (folderId: string) => void;
  onRenameFolder?: (folder: DocumentFolder) => void;
  onDeleteFolder?: (folder: DocumentFolder) => void;
  depth?: number;
}

export function DocFolderTreeItem({
  folder,
  documents,
  subFolders,
  allFolders,
  allDocuments,
  onOpenDoc,
  onToggleFavorite,
  onArchiveDoc,
  onDeleteDoc,
  onCreateDocInFolder,
  onRenameFolder,
  onDeleteFolder,
  depth = 0,
}: DocFolderTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getSubFolders = (parentId: string) =>
    allFolders.filter((f) => f.parent_folder_id === parentId);

  const getFolderDocs = (folderId: string) =>
    allDocuments.filter((d) => d.folder_id === folderId && !d.is_archived);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="flex items-center w-full group"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <CollapsibleTrigger className="p-1 hover:bg-muted rounded-md">
          <ChevronRight
            className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
          />
        </CollapsibleTrigger>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-muted rounded-md text-sm truncate min-w-0"
        >
          <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" style={{ color: folder.color || undefined }} />
          <span className="truncate font-medium">{folder.name}</span>
        </button>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onCreateDocInFolder && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onCreateDocInFolder(folder.id);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCreateDocInFolder && (
                <DropdownMenuItem onClick={() => onCreateDocInFolder(folder.id)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Novo Documento
                </DropdownMenuItem>
              )}
              {onRenameFolder && (
                <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Renomear
                </DropdownMenuItem>
              )}
              {onDeleteFolder && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteFolder(folder)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Pasta
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CollapsibleContent className="ml-2">
        {/* Sub-folders */}
        {subFolders.map((sf) => (
          <DocFolderTreeItem
            key={sf.id}
            folder={sf}
            documents={getFolderDocs(sf.id)}
            subFolders={getSubFolders(sf.id)}
            allFolders={allFolders}
            allDocuments={allDocuments}
            onOpenDoc={onOpenDoc}
            onToggleFavorite={onToggleFavorite}
            onArchiveDoc={onArchiveDoc}
            onDeleteDoc={onDeleteDoc}
            onCreateDocInFolder={onCreateDocInFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            depth={depth + 1}
          />
        ))}

        {/* Documents in this folder */}
        {documents.map((doc) => (
          <DocTreeItem
            key={doc.id}
            doc={doc}
            onOpen={onOpenDoc}
            onToggleFavorite={onToggleFavorite}
            onArchive={onArchiveDoc}
            onDelete={onDeleteDoc}
            depth={depth + 1}
          />
        ))}

        {subFolders.length === 0 && documents.length === 0 && (
          <p className="text-xs text-muted-foreground px-6 py-2" style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}>
            Pasta vazia
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
