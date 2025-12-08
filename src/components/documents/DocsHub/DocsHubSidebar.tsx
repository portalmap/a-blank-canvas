import { Clock, Star, BookOpen, FileText, Archive, Users, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentFilter, Document } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarItem {
  id: DocumentFilter;
  label: string;
  icon: React.ElementType;
  color?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'all', label: 'Todos os Docs', icon: FileText },
  { id: 'created', label: 'Criados por mim', icon: Users },
  { id: 'favorites', label: 'Favoritos', icon: Star, color: 'text-yellow-500' },
  { id: 'wikis', label: 'Wikis', icon: BookOpen, color: 'text-purple-500' },
  { id: 'archived', label: 'Arquivados', icon: Archive, color: 'text-muted-foreground' },
];

interface DocsHubSidebarProps {
  currentFilter: DocumentFilter;
  onFilterChange: (filter: DocumentFilter) => void;
  recentDocs: Document[];
  onOpenDoc: (doc: Document) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const DocsHubSidebar = ({
  currentFilter,
  onFilterChange,
  recentDocs,
  onOpenDoc,
  isCollapsed,
  onToggleCollapse,
}: DocsHubSidebarProps) => {
  return (
    <div 
      className={cn(
        "border-r bg-muted/30 p-4 space-y-6 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <div className={cn("flex", isCollapsed ? "justify-center" : "justify-end")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="space-y-1">
        {sidebarItems.map((item) => (
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
              <TooltipContent side="right">
                {item.label}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>

      {/* Recent Documents - only show when expanded */}
      {!isCollapsed && recentDocs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Clock className="h-3 w-3" />
            Recentes
          </div>
          <div className="space-y-1">
            {recentDocs.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                onClick={() => onOpenDoc(doc)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors truncate"
              >
                <span className="text-base">{doc.emoji || '📄'}</span>
                <span className="truncate">{doc.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
