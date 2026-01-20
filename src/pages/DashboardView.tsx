import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Settings, Share2, RefreshCw, Filter, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboard, useUpdateDashboard, useDashboardStats, DashboardCard } from '@/hooks/useDashboards';
import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { AddCardModal } from '@/components/dashboards/AddCardModal';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useDashboard(id);
  const { data: stats } = useDashboardStats(id);
  const updateDashboard = useUpdateDashboard();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleBack = () => {
    navigate('/dashboards');
  };

  const handleStartEditName = () => {
    setEditedName(dashboard?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!dashboard || !editedName.trim()) return;
    
    await updateDashboard.mutateAsync({
      id: dashboard.id,
      name: editedName.trim(),
    });
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleAddCard = async (card: DashboardCard) => {
    if (!dashboard) return;

    const newCards = [...(dashboard.config.cards || []), card];
    await updateDashboard.mutateAsync({
      id: dashboard.id,
      config: { ...dashboard.config, cards: newCards },
    });
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<DashboardCard>) => {
    if (!dashboard) return;

    const newCards = dashboard.config.cards.map(card =>
      card.id === cardId ? { ...card, ...updates } : card
    );
    await updateDashboard.mutateAsync({
      id: dashboard.id,
      config: { ...dashboard.config, cards: newCards },
    });
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!dashboard) return;

    const newCards = dashboard.config.cards.filter(card => card.id !== cardId);
    await updateDashboard.mutateAsync({
      id: dashboard.id,
      config: { ...dashboard.config, cards: newCards },
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Painel não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O painel que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={handleBack}>Voltar para Painéis</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-9 w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelEditName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{dashboard.name}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleStartEditName}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button onClick={() => setAddCardModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Card
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Editor */}
      <div className="flex-1 overflow-auto p-6">
        <DashboardEditor
          cards={dashboard.config.cards || []}
          stats={stats}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
        />
      </div>

      {/* Add Card Modal */}
      <AddCardModal
        open={addCardModalOpen}
        onOpenChange={setAddCardModalOpen}
        onAddCard={handleAddCard}
        workspaceId={dashboard.workspace_id}
      />
    </div>
  );
};

export default DashboardView;
