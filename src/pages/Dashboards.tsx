import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboards, Dashboard } from '@/hooks/useDashboards';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardsSidebar } from '@/components/dashboards/DashboardsSidebar';
import { DashboardsTable } from '@/components/dashboards/DashboardsTable';
import { QuickAccessCards } from '@/components/dashboards/QuickAccessCards';
import { CreateDashboardDialog } from '@/components/dashboards/CreateDashboardDialog';

const Dashboards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboards = [], isLoading } = useDashboards();
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared' | 'private'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filter dashboards based on selected filter
  const filteredDashboards = dashboards.filter((dashboard) => {
    switch (filter) {
      case 'mine':
        return dashboard.created_by_user_id === user?.id;
      case 'shared':
        // For now, show all that are not created by user (placeholder for shared logic)
        return dashboard.created_by_user_id !== user?.id;
      case 'private':
        // Placeholder - would need permission check
        return dashboard.created_by_user_id === user?.id;
      default:
        return true;
    }
  });

  const handleDashboardClick = (dashboard: Dashboard) => {
    navigate(`/dashboards/${dashboard.id}`);
  };

  const handleCreateSuccess = (dashboardId: string) => {
    navigate(`/dashboards/${dashboardId}`);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <DashboardsSidebar
        dashboards={dashboards}
        filter={filter}
        onFilterChange={setFilter}
        onDashboardClick={handleDashboardClick}
        currentUserId={user?.id}
      />

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Painéis</h1>
              <p className="text-sm text-muted-foreground">
                Visualize métricas e acompanhe o desempenho
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Painel
          </Button>
        </div>

        {/* Quick Access Cards */}
        <QuickAccessCards 
          dashboards={dashboards} 
          currentUserId={user?.id} 
        />

        {/* Dashboards Table */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Todos os Painéis</h2>
          <DashboardsTable 
            dashboards={filteredDashboards} 
            isLoading={isLoading} 
          />
        </div>
      </div>

      {/* Create Dialog */}
      <CreateDashboardDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default Dashboards;
