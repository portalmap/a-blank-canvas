import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountEntry, AccountSpaceEntry, AccountTaskEntry } from '@/hooks/useAccountProductivity';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Clock, AlertTriangle, HelpCircle } from 'lucide-react';

interface AccountReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountEntry;
  spaces: AccountSpaceEntry[];
  tasks: AccountTaskEntry[];
}

const classificationConfig = {
  early: { label: 'Antecipadas', color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle2, dot: 'bg-green-500' },
  on_time: { label: 'No Prazo', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock, dot: 'bg-blue-500' },
  late: { label: 'Atrasadas', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, dot: 'bg-red-500' },
  no_due_date: { label: 'Sem Prazo', color: 'text-muted-foreground', bg: 'bg-muted', icon: HelpCircle, dot: 'bg-muted-foreground' },
};

const getScoreColor = (score: number): string => {
  if (score >= 150) return 'text-green-600 dark:text-green-400';
  if (score >= 100) return 'text-blue-600 dark:text-blue-400';
  if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const TaskRow = ({ task, onNavigate }: { task: AccountTaskEntry; onNavigate: (id: string) => void }) => {
  const config = classificationConfig[task.classification];
  const daysFromDue = task.dueDate && task.completedAt
    ? differenceInCalendarDays(new Date(task.completedAt), new Date(task.dueDate))
    : null;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group"
      onClick={() => onNavigate(task.id)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full flex-shrink-0', config.dot)} />
          <span className="text-sm font-medium truncate">{task.title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pl-4">
          <span>{task.spaceName}</span>
          {task.completedAt && (
            <span>
              Concluída: {format(new Date(task.completedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
            </span>
          )}
          {task.dueDate && (
            <span>Prazo: {format(new Date(task.dueDate), "dd/MM/yy", { locale: ptBR })}</span>
          )}
          {daysFromDue != null && (
            <span className={cn(daysFromDue > 0 ? 'text-red-500' : 'text-green-500')}>
              {daysFromDue > 0 ? `+${daysFromDue}d` : `${daysFromDue}d`}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
};

export const AccountReportDialog = ({
  open,
  onOpenChange,
  account,
  spaces,
  tasks,
}: AccountReportDialogProps) => {
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  const handleNavigate = (taskId: string) => {
    onOpenChange(false);
    navigate(`/task/${taskId}`);
  };

  const earlyTasks = tasks.filter(t => t.classification === 'early');
  const onTimeTasks = tasks.filter(t => t.classification === 'on_time');
  const lateTasks = tasks.filter(t => t.classification === 'late');
  const noDueDateTasks = tasks.filter(t => t.classification === 'no_due_date');

  const counts = {
    early: earlyTasks.length,
    on_time: onTimeTasks.length,
    late: lateTasks.length,
    no_due_date: noDueDateTasks.length,
  };

  const tasksByClassification = (cls: string) => {
    if (cls === 'early') return earlyTasks;
    if (cls === 'on_time') return onTimeTasks;
    if (cls === 'late') return lateTasks;
    return noDueDateTasks;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={account.avatarUrl || undefined} />
              <AvatarFallback>{account.userName?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <span>Relatório Account — {account.userName}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {account.spaceCount} space{account.spaceCount !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {account.totalTasks} tarefa{account.totalTasks !== 1 ? 's' : ''}
                </Badge>
                <span className={cn('text-sm font-bold', getScoreColor(account.productivityScore))}>
                  {account.productivityScore}%
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(classificationConfig).map(([key, config]) => {
              const count = counts[key as keyof typeof counts];
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
              <TabsTrigger value="all">Todas ({tasks.length})</TabsTrigger>
              <TabsTrigger value="spaces">Spaces ({spaces.length})</TabsTrigger>
              <TabsTrigger value="early">Antecipadas ({counts.early})</TabsTrigger>
              <TabsTrigger value="on_time">No Prazo ({counts.on_time})</TabsTrigger>
              <TabsTrigger value="late">Atrasadas ({counts.late})</TabsTrigger>
              <TabsTrigger value="no_due_date">Sem Prazo ({counts.no_due_date})</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-2">
              <TabsContent value="all" className="m-0 space-y-1">
                {tasks.map(task => (
                  <TaskRow key={task.id} task={task} onNavigate={handleNavigate} />
                ))}
                {tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhuma tarefa encontrada.</p>
                )}
              </TabsContent>

              <TabsContent value="spaces" className="m-0 space-y-3">
                {spaces.map((space) => (
                  <div key={space.spaceId} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: space.spaceColor || '#94a3b8' }}
                        />
                        <span className="font-medium text-sm">{space.spaceName}</span>
                      </div>
                      <span className={cn('text-sm font-bold', getScoreColor(space.avgScore))}>
                        {space.avgScore}%
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>{space.early} antecipadas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>{space.onTime} no prazo</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span>{space.late} atrasadas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                        <span>{space.noDueDate} sem prazo</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {space.total} tarefas
                    </p>
                  </div>
                ))}
                {spaces.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum space.</p>
                )}
              </TabsContent>

              {['early', 'on_time', 'late', 'no_due_date'].map(cls => (
                <TabsContent key={cls} value={cls} className="m-0 space-y-1">
                  {tasksByClassification(cls).map(task => (
                    <TaskRow key={task.id} task={task} onNavigate={handleNavigate} />
                  ))}
                  {tasksByClassification(cls).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhuma tarefa nesta categoria.</p>
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
