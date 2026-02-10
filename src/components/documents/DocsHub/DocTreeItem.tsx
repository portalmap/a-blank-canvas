import { MoreHorizontal, Star, Archive, Trash2, ExternalLink, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Document } from '@/hooks/useDocuments';

interface DocTreeItemProps {
  doc: Document;
  onOpen: (doc: Document) => void;
  onToggleFavorite?: (doc: Document) => void;
  onArchive?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onMove?: (doc: Document) => void;
  depth?: number;
}

export function DocTreeItem({ doc, onOpen, onToggleFavorite, onArchive, onDelete, onMove, depth = 0 }: DocTreeItemProps) {
  return (
    <div
      className="flex items-center w-full group"
      style={{ paddingLeft: `${depth * 12}px` }}
    >
      <button
        onClick={() => onOpen(doc)}
        className={cn(
          'flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-muted rounded-md text-sm truncate min-w-0'
        )}
      >
        <span className="text-base flex-shrink-0">{doc.emoji || '📄'}</span>
        <span className="truncate">{doc.title}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen(doc)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir
          </DropdownMenuItem>
          {onToggleFavorite && (
            <DropdownMenuItem onClick={() => onToggleFavorite(doc)}>
              <Star className={cn('mr-2 h-4 w-4', doc.isFavorited && 'fill-yellow-500 text-yellow-500')} />
              {doc.isFavorited ? 'Remover Favorito' : 'Favoritar'}
            </DropdownMenuItem>
          )}
          {onMove && (
            <DropdownMenuItem onClick={() => onMove(doc)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Mover para...
            </DropdownMenuItem>
          )}
          {onArchive && (
            <DropdownMenuItem onClick={() => onArchive(doc)}>
              <Archive className="mr-2 h-4 w-4" />
              {doc.is_archived ? 'Restaurar' : 'Arquivar'}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(doc)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
