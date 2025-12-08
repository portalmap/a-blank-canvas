import { DashboardCard } from '@/hooks/useDashboards';
import { PieChartCard } from './cards/PieChartCard';
import { BarChartCard } from './cards/BarChartCard';
import { LineChartCard } from './cards/LineChartCard';
import { CalculationCard } from './cards/CalculationCard';
import { TaskListCard } from './cards/TaskListCard';
import { PriorityBreakdownCard } from './cards/PriorityBreakdownCard';
import { NotesCard } from './cards/NotesCard';
import { LayoutDashboard } from 'lucide-react';

interface DashboardEditorProps {
  cards: DashboardCard[];
  stats: any;
  onUpdateCard: (cardId: string, updates: Partial<DashboardCard>) => void;
  onDeleteCard: (cardId: string) => void;
}

export const DashboardEditor = ({
  cards,
  stats,
  onUpdateCard,
  onDeleteCard,
}: DashboardEditorProps) => {
  if (cards.length === 0) {
    return (
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
    );
  }

  const renderCard = (card: DashboardCard) => {
    const commonProps = {
      title: card.title,
      onDelete: () => onDeleteCard(card.id),
      onEdit: () => onUpdateCard(card.id, {}),
    };

    switch (card.type) {
      case 'pie_chart':
        return (
          <PieChartCard
            key={card.id}
            {...commonProps}
            data={stats?.byStatus || []}
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
                ? stats?.byPriority || []
                : card.config.groupBy === 'assignee'
                ? stats?.byAssignee || []
                : stats?.byStatus || []
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
            value = stats?.total || 0;
            break;
          case 'completed':
            value = stats?.completed || 0;
            break;
          case 'overdue':
            value = stats?.overdue || 0;
            break;
          case 'on_track':
            value = stats?.onTrack || 0;
            break;
        }
        return (
          <CalculationCard
            key={card.id}
            {...commonProps}
            value={value}
            suffix={suffix}
            metric={card.config.metric}
            total={stats?.total}
          />
        );
      case 'overdue_tasks':
      case 'task_list':
        return (
          <TaskListCard
            key={card.id}
            {...commonProps}
            tasks={stats?.overdueTasks || []}
            type={card.type === 'overdue_tasks' ? 'overdue' : 'all'}
          />
        );
      case 'priority_breakdown':
        return (
          <PriorityBreakdownCard
            key={card.id}
            {...commonProps}
            data={stats?.byPriority || []}
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
      default:
        return null;
    }
  };

  // Simple grid layout for cards
  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {cards.map((card) => {
        const colSpan = card.position.w || 4;
        const rowSpan = card.position.h || 2;

        return (
          <div
            key={card.id}
            className="min-h-[200px]"
            style={{
              gridColumn: `span ${Math.min(colSpan, 12)}`,
              gridRow: `span ${rowSpan}`,
            }}
          >
            {renderCard(card)}
          </div>
        );
      })}
    </div>
  );
};
