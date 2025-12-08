import { Clock, Star, BookOpen, FileText, Archive, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentFilter, Document } from '@/hooks/useDocuments';

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
}

export const DocsHubSidebar = ({
  currentFilter,
  onFilterChange,
  recentDocs,
  onOpenDoc,
}: DocsHubSidebarProps) => {
  return (
    <div className="w-64 border-r bg-muted/30 p-4 space-y-6">
      {/* Main Navigation */}
      <div className="space-y-1">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onFilterChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              currentFilter === item.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className={cn('h-4 w-4', item.color)} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Recent Documents */}
      {recentDocs.length > 0 && (
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
