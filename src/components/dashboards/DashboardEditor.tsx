import { useMemo, memo, useState } from 'react';
import { DashboardCard } from '@/hooks/useDashboards';
import { useProductivityStats } from '@/hooks/useProductivityStats';
import { useProductivityRanking } from '@/hooks/useProductivityRanking';
import { PieChartCard } from './cards/PieChartCard';
import { BarChartCard } from './cards/BarChartCard';
import { LineChartCard } from './cards/LineChartCard';
import { CalculationCard } from './cards/CalculationCard';
import { TaskListCard } from './cards/TaskListCard';
import { PriorityBreakdownCard } from './cards/PriorityBreakdownCard';
import { NotesCard } from './cards/NotesCard';
import { ProductivityCard, ProductivityScopeInfo } from './cards/ProductivityCard';
import { ProductivityRankingCard } from './cards/ProductivityRankingCard';
import { CardResizeDialog } from './CardResizeDialog';
import { ExpandedCardDialog } from './ExpandedCardDialog';
import { LayoutDashboard } from 'lucide-react';
import { useSpaces } from '@/hooks/useSpaces';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface DashboardEditorProps {
  cards: DashboardCard[];
  stats: any;
  onUpdateCard: (cardId: string, updates: Partial<DashboardCard>) => void;
  onDeleteCard: (cardId: string) => void;
}

const DashboardEditorComponent = ({
  cards,
  stats,
  onUpdateCard,
  onDeleteCard,
}: DashboardEditorProps) => {
  const [resizingCardId, setResizingCardId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  // Memoize stats to prevent re-renders
  const memoizedStats = useMemo(() => ({
    byStatus: stats?.byStatus || [],
    byPriority: stats?.byPriority || [],
    byAssignee: stats?.byAssignee || [],
    overdueTasks: stats?.overdueTasks || [],
    total: stats?.total || 0,
    completed: stats?.completed || 0,
    overdue: stats?.overdue || 0,
    onTrack: stats?.onTrack || 0,
  }), [stats]);
  const resizingCard = cards.find(c => c.id === resizingCardId);
  const expandedCard = cards.find(c => c.id === expandedCardId);

  const renderDialogs = () => (
    <>
      <CardResizeDialog
        card={resizingCard}
        open={!!resizingCardId}
        onOpenChange={(open) => !open && setResizingCardId(null)}
        onSave={(w, h) => {
          if (resizingCard) {
            onUpdateCard(resizingCard.id, { 
              position: { ...resizingCard.position, w, h } 
            });
          }
          setResizingCardId(null);
        }}
      />
      <ExpandedCardDialog
        title={expandedCard?.title || ''}
        open={!!expandedCardId}
        onOpenChange={(open) => !open && setExpandedCardId(null)}
      >
        {expandedCard && renderCard(expandedCard, true)}
      </ExpandedCardDialog>
    </>
  );

  if (cards.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Painel vazio</h3>
          <p className="text-muted-foreground max-w-sm">
            Clique em "Adicionar Card" para começar a criar seu painel personalizado
            com gráficos, métricas e listas de tarefas.
          </p>
        </div>
        {renderDialogs()}
      </>
    );
  }

  const renderCard = (card: DashboardCard, isExpanded = false) => {
    const commonProps = {
      title: card.title,
      onDelete: () => onDeleteCard(card.id),
      onEdit: () => setResizingCardId(card.id),
      onExpand: () => setExpandedCardId(card.id),
      isExpanded,
    };

    switch (card.type) {
      case 'pie_chart':
        return (
          <PieChartCard
            key={card.id}
            {...commonProps}
            data={memoizedStats.byStatus}
            groupBy={card.config.groupBy}
          />
        );
      case 'bar_chart':
        return (
          <BarChartCard
            key={card.id}
            {...commonProps}
            data={
              card.config.groupBy === 'priority'
                ? memoizedStats.byPriority
                : card.config.groupBy === 'assignee'
                ? memoizedStats.byAssignee
                : memoizedStats.byStatus
            }
            groupBy={card.config.groupBy}
          />
        );
      case 'line_chart':
        return (
          <LineChartCard
            key={card.id}
            {...commonProps}
            data={[]} // Would need time-series data
            timeRange={card.config.timeRange}
          />
        );
      case 'calculation':
        let value = 0;
        let suffix = '';
        switch (card.config.metric) {
          case 'total':
            value = memoizedStats.total;
            break;
          case 'completed':
            value = memoizedStats.completed;
            break;
          case 'overdue':
            value = memoizedStats.overdue;
            break;
          case 'on_track':
            value = memoizedStats.onTrack;
            break;
        }
        return (
          <CalculationCard
            key={card.id}
            {...commonProps}
            value={value}
            suffix={suffix}
            metric={card.config.metric}
            total={memoizedStats.total}
          />
        );
      case 'overdue_tasks':
      case 'task_list':
        return (
          <TaskListCard
            key={card.id}
            {...commonProps}
            tasks={memoizedStats.overdueTasks}
            type={card.type === 'overdue_tasks' ? 'overdue' : 'all'}
          />
        );
      case 'priority_breakdown':
        return (
          <PriorityBreakdownCard
            key={card.id}
            {...commonProps}
            data={memoizedStats.byPriority}
          />
        );
      case 'notes':
        return (
          <NotesCard
            key={card.id}
            {...commonProps}
            content={card.config.content || ''}
            onUpdateContent={(content) => 
              onUpdateCard(card.id, { config: { ...card.config, content } })
            }
          />
        );
      case 'productivity':
        return (
          <ProductivityCardWrapper
            key={card.id}
            card={card}
            commonProps={commonProps}
          />
        );
      case 'productivity_ranking':
        return (
          <ProductivityRankingCardWrapper
            key={card.id}
            card={card}
            commonProps={commonProps}
          />
        );
      default:
        return null;
    }
  };

  // Simple grid layout for cards
  return (
    <>
      <div className="grid grid-cols-12 gap-4">
        {cards.map((card) => {
          const colSpan = card.position.w || 4;
          const rowSpan = card.position.h || 2;

          return (
            <div
              key={card.id}
              style={{
                gridColumn: `span ${Math.min(colSpan, 12)}`,
                height: `${rowSpan * 150}px`,
              }}
            >
              {renderCard(card)}
            </div>
          );
        })}
      </div>
      {renderDialogs()}
    </>
  );
};
// Wrapper component for ProductivityCard to use hooks
const ProductivityCardWrapper = ({ 
  card, 
  commonProps 
}: { 
  card: DashboardCard; 
  commonProps: { title: string; onDelete: () => void; onEdit: () => void; onExpand: () => void; isExpanded: boolean } 
}) => {
  const { activeWorkspace } = useWorkspace();
  
  // Suporta tanto userIds quanto userId (para compatibilidade)
  const effectiveUserIds = card.config.userIds || (card.config.userId ? [card.config.userId] : undefined);
  
  const { data: productivityStats, isLoading } = useProductivityStats({
    scope: card.config.scope || 'workspace',
    spaceId: card.config.spaceId,
    userIds: effectiveUserIds,
  });
  
  const { data: spaces = [] } = useSpaces(activeWorkspace?.id);
  const { data: members = [] } = useWorkspaceMembers(activeWorkspace?.id);

  // Construir scopeInfo baseado na configuração do card
  const scopeInfo: ProductivityScopeInfo | undefined = useMemo(() => {
    const scope = card.config.scope || 'workspace';
    
    switch (scope) {
      case 'workspace':
        return { scope, label: 'Workspace', details: 'Todas as tarefas' };
      case 'my_tasks':
        return { scope, label: 'Minhas Tarefas' };
      case 'space': {
        const spaceName = spaces.find(s => s.id === card.config.spaceId)?.name;
        return { scope, label: 'Space', details: spaceName };
      }
      case 'user': {
        const userIds = effectiveUserIds || [];
        if (userIds.length === 0) {
          return { scope, label: 'Por Usuário', details: 'Nenhum selecionado' };
        }
        if (userIds.length === members.length && members.length > 0) {
          return { scope, label: 'Por Usuário', details: 'Todos' };
        }
        const names = userIds
          .map(id => members.find(m => m.user_id === id)?.profile?.full_name)
          .filter(Boolean) as string[];
        
        if (names.length <= 2) {
          return { scope, label: 'Por Usuário', details: names.join(', ') };
        }
        return { scope, label: 'Por Usuário', details: `${names.slice(0, 2).join(', ')} +${names.length - 2}` };
      }
      default:
        return undefined;
    }
  }, [card.config, spaces, members, effectiveUserIds]);

  return (
    <ProductivityCard
      {...commonProps}
      stats={productivityStats || null}
      isLoading={isLoading}
      scopeInfo={scopeInfo}
    />
  );
};

// Wrapper component for ProductivityRankingCard to use hooks
const ProductivityRankingCardWrapper = ({ 
  card: _card, 
  commonProps 
}: { 
  card: DashboardCard; 
  commonProps: { title: string; onDelete: () => void; onEdit: () => void; onExpand: () => void; isExpanded: boolean } 
}) => {
  const { data: rankingData, isLoading } = useProductivityRanking();

  return (
    <ProductivityRankingCard
      {...commonProps}
      data={rankingData || null}
      isLoading={isLoading}
    />
  );
};

export const DashboardEditor = memo(DashboardEditorComponent);
