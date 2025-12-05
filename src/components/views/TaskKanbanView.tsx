import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/ui/badge-variant';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, GitBranch } from 'lucide-react';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { useSubtasks } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  start_date: string | null;
  list_id: string;
  workspace_id: string;
  parent_id?: string | null;
  completed_at?: string | null;
  assignee_id?: string | null;
  status?: {
    name: string;
    color: string | null;
  };
  assignee?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Status {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
}

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: Status[];
}

const SubtaskBadge = ({ parentId }: { parentId: string }) => {
  const { data: subtasks } = useSubtasks(parentId);
  const count = subtasks?.length || 0;
  const completed = subtasks?.filter(s => s.completed_at).length || 0;

  if (count === 0) return null;

  return (
    <Badge variant="outline" className="text-xs">
      <GitBranch className="h-3 w-3 mr-1" />
      {completed}/{count}
    </Badge>
  );
};

export const TaskKanbanView = ({ tasks, statuses }: TaskKanbanViewProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sortedStatuses = [...statuses].sort((a, b) => a.order_index - b.order_index);

  // Filtrar apenas tarefas principais (sem parent_id)
  const mainTasks = tasks.filter(t => !t.parent_id);

  const getTasksByStatus = (statusId: string) => {
    return mainTasks.filter((task) => task.status_id === statusId);
  };

  const isOverdue = (dueDate: string | null, completedAt?: string | null) => {
    if (!dueDate || completedAt) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStatuses.map((status) => {
          const statusTasks = getTasksByStatus(status.id);

          return (
            <div
              key={status.id}
              className="flex-shrink-0 w-80"
            >
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{status.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {statusTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {statusTasks.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma tarefa
                    </div>
                  ) : (
                    statusTasks.map((task) => (
                      <Card
                        key={task.id}
                        className={cn(
                          "cursor-pointer hover:shadow-md transition-shadow",
                          task.completed_at && "opacity-60"
                        )}
                        onClick={() => setSelectedTask(task)}
                      >
                        <CardHeader className="p-4 pb-3">
                          <CardTitle className={cn(
                            "text-sm font-medium",
                            task.completed_at && "line-through"
                          )}>
                            {task.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <PriorityBadge priority={task.priority} />
                            <SubtaskBadge parentId={task.id} />
                          </div>
                          {task.due_date && (
                            <div className={cn(
                              "flex items-center gap-2 text-xs",
                              isOverdue(task.due_date, task.completed_at) 
                                ? "text-destructive" 
                                : "text-muted-foreground"
                            )}>
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                              {isOverdue(task.due_date, task.completed_at) && (
                                <span className="font-medium">Atrasada</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </>
  );
};
