import { useState } from 'react';
import { ChevronRight, Star, BookOpen, FileText, Archive, Users, PanelLeftClose, PanelLeft, Plus, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentFilter, Document, DocumentFolder } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { DocFolderTreeItem } from './DocFolderTreeItem';
import { DocTreeItem } from './DocTreeItem';

interface FilterItem {
  id: DocumentFilter;
  label: string;
  icon: React.ElementType;
  color?: string;
}

const filterItems: FilterItem[] = [
  { id: 'all', label: 'Todos os Docs', icon: FileText },
  { id: 'created', label: 'Criados por mim', icon: Users },
  { id: 'favorites', label: 'Favoritos', icon: Star, color: 'text-yellow-500' },
];

interface DocsHubSidebarProps {
  currentFilter: DocumentFilter;
  onFilterChange: (filter: DocumentFilter) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Document tree props
  documents: Document[];
  folders: DocumentFolder[];
  onOpenDoc: (doc: Document) => void;
  onToggleFavorite?: (doc: Document) => void;
  onArchiveDoc?: (doc: Document) => void;
  onDeleteDoc?: (doc: Document) => void;
  onCreateDoc?: () => void;
  onCreateDocInFolder?: (folderId: string) => void;
  onCreateFolder?: () => void;
  onRenameFolder?: (folder: DocumentFolder) => void;
  onDeleteFolder?: (folder: DocumentFolder) => void;
}

export const DocsHubSidebar = ({
  currentFilter,
  onFilterChange,
  isCollapsed,
  onToggleCollapse,
  documents,
  folders,
  onOpenDoc,
  onToggleFavorite,
  onArchiveDoc,
  onDeleteDoc,
  onCreateDoc,
  onCreateDocInFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: DocsHubSidebarProps) => {
  const [wikisOpen, setWikisOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const wikiDocs = documents.filter(d => d.is_wiki && !d.is_archived);
  const archivedDocs = documents.filter(d => d.is_archived);
  const rootFolders = folders.filter(f => !f.parent_folder_id);
  const looseDocs = documents.filter(
    d => !d.folder_id && !d.is_wiki && !d.is_archived
  );

  const getSubFolders = (parentId: string) =>
    folders.filter(f => f.parent_folder_id === parentId);

  const getFolderDocs = (folderId: string) =>
    documents.filter(d => d.folder_id === folderId && !d.is_archived);

  return (
    <div
      className={cn(
        'border-r bg-muted/30 p-3 space-y-4 transition-all duration-300 flex flex-col overflow-y-auto',
        isCollapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <div className={cn('flex', isCollapsed ? 'justify-center' : 'justify-end')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-0.5">
        {filterItems.map((item) => (
          <Tooltip key={item.id} delayDuration={isCollapsed ? 0 : 1000}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onFilterChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isCollapsed && 'justify-center px-2',
                  currentFilter === item.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-4 w-4 flex-shrink-0', item.color)} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">{item.label}</TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>

      {!isCollapsed && <Separator />}

      {/* Categories: Wikis & Archived */}
      {!isCollapsed && (
        <div className="space-y-0.5">
          {/* Wikis */}
          <Collapsible open={wikisOpen} onOpenChange={setWikisOpen}>
            <div className="flex items-center w-full group">
              <CollapsibleTrigger className="p-1 hover:bg-muted rounded-md">
                <ChevronRight className={cn('h-3 w-3 transition-transform', wikisOpen && 'rotate-90')} />
              </CollapsibleTrigger>
              <button
                onClick={() => {
                  setWikisOpen(!wikisOpen);
                  onFilterChange('wikis');
                }}
                className={cn(
                  'flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-sm',
                  currentFilter === 'wikis'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <BookOpen className="h-4 w-4 text-purple-500" />
                <span>Wikis</span>
                <span className="ml-auto text-xs text-muted-foreground">{wikiDocs.length}</span>
              </button>
            </div>
            <CollapsibleContent className="ml-4">
              {wikiDocs.map((doc) => (
                <DocTreeItem
                  key={doc.id}
                  doc={doc}
                  onOpen={onOpenDoc}
                  onToggleFavorite={onToggleFavorite}
                  onArchive={onArchiveDoc}
                  onDelete={onDeleteDoc}
                />
              ))}
              {wikiDocs.length === 0 && (
                <p className="text-xs text-muted-foreground px-6 py-2">Nenhuma wiki</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Archived */}
          <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
            <div className="flex items-center w-full group">
              <CollapsibleTrigger className="p-1 hover:bg-muted rounded-md">
                <ChevronRight className={cn('h-3 w-3 transition-transform', archivedOpen && 'rotate-90')} />
              </CollapsibleTrigger>
              <button
                onClick={() => {
                  setArchivedOpen(!archivedOpen);
                  onFilterChange('archived');
                }}
                className={cn(
                  'flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-sm',
                  currentFilter === 'archived'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span>Arquivados</span>
                <span className="ml-auto text-xs text-muted-foreground">{archivedDocs.length}</span>
              </button>
            </div>
            <CollapsibleContent className="ml-4">
              {archivedDocs.map((doc) => (
                <DocTreeItem
                  key={doc.id}
                  doc={doc}
                  onOpen={onOpenDoc}
                  onArchive={onArchiveDoc}
                  onDelete={onDeleteDoc}
                />
              ))}
              {archivedDocs.length === 0 && (
                <p className="text-xs text-muted-foreground px-6 py-2">Nenhum arquivado</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {!isCollapsed && <Separator />}

      {/* Document Tree */}
      {!isCollapsed && (
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Documentos
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onCreateDoc && (
                  <DropdownMenuItem onClick={onCreateDoc}>
                    <FileText className="mr-2 h-4 w-4" />
                    Novo Documento
                  </DropdownMenuItem>
                )}
                {onCreateFolder && (
                  <DropdownMenuItem onClick={onCreateFolder}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Nova Pasta
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Folders */}
          {rootFolders.map((folder) => (
            <DocFolderTreeItem
              key={folder.id}
              folder={folder}
              documents={getFolderDocs(folder.id)}
              subFolders={getSubFolders(folder.id)}
              allFolders={folders}
              allDocuments={documents}
              onOpenDoc={onOpenDoc}
              onToggleFavorite={onToggleFavorite}
              onArchiveDoc={onArchiveDoc}
              onDeleteDoc={onDeleteDoc}
              onCreateDocInFolder={onCreateDocInFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}

          {/* Loose documents */}
          {looseDocs.map((doc) => (
            <DocTreeItem
              key={doc.id}
              doc={doc}
              onOpen={onOpenDoc}
              onToggleFavorite={onToggleFavorite}
              onArchive={onArchiveDoc}
              onDelete={onDeleteDoc}
            />
          ))}

          {rootFolders.length === 0 && looseDocs.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              Nenhum documento ainda
            </p>
          )}
        </div>
      )}
    </div>
  );
};
