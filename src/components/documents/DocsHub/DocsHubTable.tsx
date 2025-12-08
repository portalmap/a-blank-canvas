import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, BookOpen, Star, MoreHorizontal, Archive, Trash2, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocTagBadge } from './DocTagBadge';
import { Document } from '@/hooks/useDocuments';

interface DocsHubTableProps {
  documents: Document[];
  onOpen: (doc: Document) => void;
  onToggleFavorite: (doc: Document) => void;
  onArchive: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

export const DocsHubTable = ({
  documents,
  onOpen,
  onToggleFavorite,
  onArchive,
  onDelete,
}: DocsHubTableProps) => {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg">Nenhum documento encontrado</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Crie um novo documento para começar
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50%]">Título</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Criado por</TableHead>
            <TableHead>Atualizado</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow 
              key={doc.id} 
              className="cursor-pointer group"
              onClick={() => onOpen(doc)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{doc.emoji || '📄'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{doc.title}</span>
                    {doc.is_wiki && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        <BookOpen className="h-3 w-3" />
                        Wiki
                      </span>
                    )}
                    {doc.isFavorited && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {doc.tags?.slice(0, 3).map((tag) => (
                    <DocTagBadge key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                  {(doc.tags?.length || 0) > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{(doc.tags?.length || 0) - 3}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={doc.creator?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {doc.creator?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                    {doc.creator?.full_name || 'Usuário'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(doc.updated_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(doc); }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(doc); }}>
                      <Star className={`h-4 w-4 mr-2 ${doc.isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      {doc.isFavorited ? 'Remover favorito' : 'Favoritar'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(doc); }}>
                      <Archive className="h-4 w-4 mr-2" />
                      {doc.is_archived ? 'Restaurar' : 'Arquivar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
