import { LayoutDashboard, User, Share2, Lock, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dashboard } from '@/hooks/useDashboards';

interface DashboardsSidebarProps {
  dashboards: Dashboard[];
  filter: 'all' | 'mine' | 'shared' | 'private';
  onFilterChange: (filter: 'all' | 'mine' | 'shared' | 'private') => void;
  onDashboardClick: (dashboard: Dashboard) => void;
  currentUserId?: string;
}

const filterOptions = [
  { id: 'all', label: 'Todos', icon: LayoutDashboard },
  { id: 'mine', label: 'Criados por mim', icon: User },
  { id: 'shared', label: 'Compartilhados', icon: Share2 },
  { id: 'private', label: 'Privados', icon: Lock },
] as const;

export const DashboardsSidebar = ({
  dashboards,
  filter,
  onFilterChange,
  onDashboardClick,
  currentUserId,
}: DashboardsSidebarProps) => {
  // Get recent dashboards (last 5 updated)
  const recentDashboards = [...dashboards]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <aside className="w-64 border-r border-border bg-muted/30 p-4 flex flex-col gap-6">
      {/* Filters */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Filtros
        </h3>
        <nav className="space-y-1">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                filter === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Favorites */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star className="h-3 w-3" />
          Favoritos
        </h3>
        <div className="space-y-1">
          {dashboards.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Nenhum favorito ainda
            </p>
          ) : (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Funcionalidade em breve
            </p>
          )}
        </div>
      </div>

      {/* Recent */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Recentes
        </h3>
        <div className="space-y-1">
          {recentDashboards.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Nenhum painel recente
            </p>
          ) : (
            recentDashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                onClick={() => onDashboardClick(dashboard)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors truncate"
              >
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{dashboard.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
