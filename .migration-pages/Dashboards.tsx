import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboards, Dashboard } from '@/hooks/useDashboards';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { DashboardsSidebar } from '@/components/dashboards/DashboardsSidebar';
import { DashboardsTable } from '@/components/dashboards/DashboardsTable';
import { QuickAccessCards } from '@/components/dashboards/QuickAccessCards';
import { CreateDashboardDialog } from '@/components/dashboards/CreateDashboardDialog';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWorkspaceSelected, isValidatingWorkspace } = useWorkspace();
  const { data: dashboards = [], isLoading } = useDashboards();
  const [filter, setFilter] = useState<'all' | 'mine' | 'shared' | 'private'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Loading state while validating workspace
  if (isValidatingWorkspace) {
    return (
      <div className="flex h-full">
        <div className="w-64 border-r p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // No workspace selected
  if (!isWorkspaceSelected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Nenhum workspace selecionado</h2>
          <p className="text-muted-foreground mb-4">
            Selecione um workspace no menu lateral para visualizar e criar painéis.
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Ir para o início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <DashboardsSidebar
        dashboards={dashboards}
        filter={filter}
        onFilterChange={setFilter}
        onDashboardClick={handleDashboardClick}
        currentUserId={user?.id}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
