import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBadge } from '@/components/ui/badge-variant';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
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

export const TaskKanbanView = ({ tasks, statuses }: TaskKanbanViewProps) => {
  const sortedStatuses = [...statuses].sort((a, b) => a.order_index - b.order_index);

  const getTasksByStatus = (statusId: string) => {
    return tasks.filter((task) => task.status_id === statusId);
  };

  return (
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
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="p-4 pb-3">
                        <CardTitle className="text-sm font-medium">
                          {task.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        <PriorityBadge priority={task.priority} />
                        {task.due_date && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
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
  );
};