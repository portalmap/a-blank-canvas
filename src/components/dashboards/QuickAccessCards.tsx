import { useNavigate } from 'react-router-dom';
import { Clock, Star, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dashboard } from '@/hooks/useDashboards';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QuickAccessCardsProps {
  dashboards: Dashboard[];
  currentUserId?: string;
}

export const QuickAccessCards = ({ dashboards, currentUserId }: QuickAccessCardsProps) => {
  const navigate = useNavigate();

  // Get recent dashboards (last 3 updated)
  const recentDashboards = [...dashboards]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  // Get dashboards created by current user
  const myDashboards = dashboards
    .filter(d => d.created_by_user_id === currentUserId)
    .slice(0, 3);

  const handleClick = (dashboard: Dashboard) => {
    navigate(`/dashboards/${dashboard.id}`);
  };

  const renderDashboardList = (items: Dashboard[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((dashboard) => (
          <button
            key={dashboard.id}
            onClick={() => handleClick(dashboard)}
            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{dashboard.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(dashboard.updated_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Recent */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderDashboardList(recentDashboards, 'Nenhum painel recente')}
        </CardContent>
      </Card>

      {/* Favorites (placeholder) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            Favoritos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Favoritos em breve
          </p>
        </CardContent>
      </Card>

      {/* Created by me */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Criados por mim
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderDashboardList(myDashboards, 'Nenhum painel criado')}
        </CardContent>
      </Card>
    </div>
  );
};
