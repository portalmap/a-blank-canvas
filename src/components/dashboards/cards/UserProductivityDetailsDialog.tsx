import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUserProductivityDetails, TaskDetail } from '@/hooks/useUserProductivityDetails';
import { UserProductivityStats } from '@/hooks/useProductivityRanking';

interface UserProductivityDetailsDialogProps {
  user: UserProductivityStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate?: string;
  endDate?: string;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getScoreColor = (score: number): string => {
  if (score >= 150) return 'text-green-500';
  if (score >= 100) return 'text-blue-500';
  if (score >= 75) return 'text-yellow-500';
  return 'text-red-500';
};

const getProgressColor = (score: number): string => {
  if (score >= 150) return 'bg-green-500';
  if (score >= 100) return 'bg-blue-500';
  if (score >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
};

interface TaskItemProps {
  task: TaskDetail;
  onClick: () => void;
}

const TaskItem = ({ task, onClick }: TaskItemProps) => {
  const getClassificationLabel = () => {
    switch (task.classification) {
      case 'early':
        return (
          <span className="text-green-600 text-xs">
            {task.daysFromDue} dias antes do prazo
          </span>
        );
      case 'on_time':
        if (task.daysFromDue === 0) {
          return <span className="text-blue-600 text-xs">No dia do prazo</span>;
        }
        return (
          <span className="text-blue-600 text-xs">
            {task.daysFromDue} dias antes do prazo
          </span>
        );
      case 'late':
        return (
          <span className="text-red-600 text-xs">
            {task.daysFromDue} dias atrasada
          </span>
        );
      case 'no_due_date':
        return <span className="text-muted-foreground text-xs">Sem prazo definido</span>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
    >
      <p className="font-medium text-sm truncate">{task.title}</p>
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {format(parseISO(task.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(parseISO(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        )}
      </div>
      <div className="mt-1">{getClassificationLabel()}</div>
    </div>
  );
};

const TaskList = ({ tasks, emptyMessage, onTaskClick }: { 
  tasks: TaskDetail[]; 
  emptyMessage: string;
  onTaskClick: (taskId: string) => void;
}) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <TaskItem 
          key={task.id} 
          task={task} 
          onClick={() => onTaskClick(task.id)}
        />
      ))}
    </div>
  );
};

const UserProductivityDetailsDialogComponent = ({
  user,
  open,
  onOpenChange,
  startDate,
  endDate,
}: UserProductivityDetailsDialogProps) => {
  const navigate = useNavigate();
  const { data, isLoading } = useUserProductivityDetails({
    userId: user?.userId || null,
    startDate,
    endDate,
  });

  const handleTaskClick = (taskId: string) => {
    onOpenChange(false);
    navigate(`/tasks/${taskId}`);
  };

  if (!user) return null;

  const progressValue = data ? Math.min(data.summary.score, 200) / 2 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.userName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{user.userName}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Detalhes de produtividade
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Resumo */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Score de Produtividade</span>
                <span className={cn("text-2xl font-bold", getScoreColor(data.summary.score))}>
                  {data.summary.score}%
                </span>
              </div>
              
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
                <div 
                  className={cn("h-full rounded-full transition-all", getProgressColor(data.summary.score))}
                  style={{ width: `${progressValue}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-green-500/10 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-600">{data.summary.early}</p>
                  <p className="text-xs text-muted-foreground">Adiantadas</p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-600">{data.summary.onTime}</p>
                  <p className="text-xs text-muted-foreground">No Prazo</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2">
                  <p className="text-lg font-bold text-red-600">{data.summary.late}</p>
                  <p className="text-xs text-muted-foreground">Atrasadas</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-lg font-bold text-muted-foreground">{data.summary.noDueDate}</p>
                  <p className="text-xs text-muted-foreground">Sem Prazo</p>
                </div>
              </div>
            </div>

            {/* Tabs com lista de tarefas */}
            <Tabs defaultValue="early" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="early" className="text-xs">
                  <Clock className="h-3 w-3 mr-1 text-green-500" />
                  Adiantadas ({data.summary.early})
                </TabsTrigger>
                <TabsTrigger value="ontime" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-blue-500" />
                  No Prazo ({data.summary.onTime})
                </TabsTrigger>
                <TabsTrigger value="late" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
                  Atrasadas ({data.summary.late})
                </TabsTrigger>
                <TabsTrigger value="nodue" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Sem Prazo ({data.summary.noDueDate})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="early" className="mt-0">
                  <TaskList 
                    tasks={data.earlyTasks} 
                    emptyMessage="Nenhuma tarefa adiantada"
                    onTaskClick={handleTaskClick}
                  />
                </TabsContent>
                <TabsContent value="ontime" className="mt-0">
                  <TaskList 
                    tasks={data.onTimeTasks} 
                    emptyMessage="Nenhuma tarefa no prazo"
                    onTaskClick={handleTaskClick}
                  />
                </TabsContent>
                <TabsContent value="late" className="mt-0">
                  <TaskList 
                    tasks={data.lateTasks} 
                    emptyMessage="Nenhuma tarefa atrasada"
                    onTaskClick={handleTaskClick}
                  />
                </TabsContent>
                <TabsContent value="nodue" className="mt-0">
                  <TaskList 
                    tasks={data.noDueDateTasks} 
                    emptyMessage="Nenhuma tarefa sem prazo"
                    onTaskClick={handleTaskClick}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Total */}
            <div className="mt-4 pt-3 border-t text-center">
              <Badge variant="outline">
                Total: {data.summary.total} tarefas concluídas
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
            <p>Nenhum dado disponível</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const UserProductivityDetailsDialog = memo(UserProductivityDetailsDialogComponent);
