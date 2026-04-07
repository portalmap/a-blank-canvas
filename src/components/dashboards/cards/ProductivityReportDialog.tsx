import { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ProductivityDetailsReport, ProductivityTaskDetail } from '@/hooks/useProductivityDetailsReport';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Clock, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ProductivityReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ProductivityDetailsReport | null;
  isLoading: boolean;
  title?: string;
}

const classificationConfig = {
  early: { label: 'Antecipadas', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2, dot: 'bg-green-500' },
  on_time: { label: 'No Prazo', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock, dot: 'bg-blue-500' },
  late: { label: 'Atrasadas', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, dot: 'bg-red-500' },
  no_due_date: { label: 'Sem Prazo', color: 'text-muted-foreground', bg: 'bg-muted', icon: HelpCircle, dot: 'bg-muted-foreground' },
};

const TaskRow = ({ task, onNavigate }: { task: ProductivityTaskDetail; onNavigate: (id: string) => void }) => {
  const config = classificationConfig[task.classification];
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group"
      onClick={() => onNavigate(task.id)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full flex-shrink-0', config.dot)} />
          <span className="text-sm font-medium truncate">{task.title}</span>
          {task.isTransferred && (
            <Badge variant="outline" className="text-xs flex-shrink-0">Transferida</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pl-4">
          {task.userName && <span>{task.userName}</span>}
          {task.eventDate && (
            <span>
              {task.isTransferred ? 'Transferida' : 'Concluída'}: {format(new Date(task.eventDate), "dd/MM/yy HH:mm", { locale: ptBR })}
            </span>
          )}
          {task.dueDate && (
            <span>Prazo: {format(new Date(task.dueDate), "dd/MM/yy", { locale: ptBR })}</span>
          )}
          {task.daysFromDue != null && (
            <span className={cn(task.daysFromDue > 0 ? 'text-red-500' : 'text-green-500')}>
              {task.daysFromDue > 0 ? `+${task.daysFromDue}d` : `${task.daysFromDue}d`}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
};

const ProductivityReportDialogComponent = ({
  open,
  onOpenChange,
  report,
  isLoading,
  title = 'Relatório de Produtividade',
}: ProductivityReportDialogProps) => {
  const navigate = useNavigate();

  const handleNavigate = (taskId: string) => {
    onOpenChange(false);
    navigate(`/tasks/${taskId}`);
  };

  const tasksByClassification = (classification: string) =>
    report?.tasks.filter(t => t.classification === classification) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Carregando relatório...</div>
          </div>
        ) : report ? (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(classificationConfig).map(([key, config]) => {
                const count = key === 'early' ? report.summary.early
                  : key === 'on_time' ? report.summary.onTime
                  : key === 'late' ? report.summary.late
                  : report.summary.noDueDate;
                const Icon = config.icon;
                return (
                  <div key={key} className={cn('rounded-lg p-3 text-center', config.bg)}>
                    <Icon className={cn('h-4 w-4 mx-auto mb-1', config.color)} />
                    <div className={cn('text-xl font-bold', config.color)}>{count}</div>
                    <div className="text-xs text-muted-foreground">{config.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">Todas ({report.summary.total})</TabsTrigger>
                <TabsTrigger value="early">Antecipadas ({report.summary.early})</TabsTrigger>
                <TabsTrigger value="on_time">No Prazo ({report.summary.onTime})</TabsTrigger>
                <TabsTrigger value="late">Atrasadas ({report.summary.late})</TabsTrigger>
                <TabsTrigger value="no_due_date">Sem Prazo ({report.summary.noDueDate})</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-2">
                <TabsContent value="all" className="m-0 space-y-1">
                  {report.tasks.map(task => (
                    <TaskRow key={`${task.id}-${task.isTransferred}-${task.eventDate}`} task={task} onNavigate={handleNavigate} />
                  ))}
                  {report.tasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhuma tarefa encontrada no período.</p>
                  )}
                </TabsContent>
                {['early', 'on_time', 'late', 'no_due_date'].map(cls => (
                  <TabsContent key={cls} value={cls} className="m-0 space-y-1">
                    {tasksByClassification(cls).map(task => (
                      <TaskRow key={`${task.id}-${task.isTransferred}-${task.eventDate}`} task={task} onNavigate={handleNavigate} />
                    ))}
                    {tasksByClassification(cls).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Nenhuma tarefa nesta categoria.</p>
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export const ProductivityReportDialog = memo(ProductivityReportDialogComponent);
