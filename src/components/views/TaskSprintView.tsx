import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, startOfMonth, endOfMonth, startOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { PriorityBadge } from '@/components/ui/badge-variant';
import { Badge } from '@/components/ui/badge';
import { useSubtasks } from '@/hooks/useSubtasks';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string | null;
  due_date: string | null;
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

interface TaskSprintViewProps {
  tasks: Task[];
}

const SubtaskProgress = ({ parentId }: { parentId: string }) => {
  const { data: subtasks } = useSubtasks(parentId);
  const count = subtasks?.length || 0;
  const completed = subtasks?.filter(s => s.completed_at).length || 0;

  if (count === 0) return null;

  const percent = Math.round((completed / count) * 100);

  return (
    <Badge variant="outline" className="text-xs">
      <GitBranch className="h-3 w-3 mr-1" />
      {percent}%
    </Badge>
  );
};

export const TaskSprintView = ({ tasks }: TaskSprintViewProps) => {
  const navigate = useNavigate();

  // Filtrar apenas tarefas principais (sem parent_id)
  const mainTasks = tasks.filter(t => !t.parent_id);
  const tasksWithDates = mainTasks.filter((task) => task.start_date && task.due_date);

  const dateRange = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date();
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
    }

    const dates = tasksWithDates.flatMap((task) => [
      parseLocalDate(task.start_date!)!,
      parseLocalDate(task.due_date!)!,
    ]);

    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }, [tasksWithDates]);

  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const dayWidth = 120; // pixels per day

  const getTaskPosition = (task: Task) => {
    const start = parseLocalDate(task.start_date!)!;
    const end = parseLocalDate(task.due_date!)!;
    
    const daysFromStart = differenceInDays(start, dateRange.start);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: daysFromStart * dayWidth,
      width: duration * dayWidth,
    };
  };

  const isOverdue = (dueDate: string | null, completedAt?: string | null) => {
    if (!dueDate || completedAt) return false;
    const due = startOfDay(parseLocalDate(dueDate)!);
    const today = startOfDay(new Date());
    return isBefore(due, today);
  };

  return (
    <>
      <div className="border rounded-lg p-4 bg-card">
        {tasksWithDates.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhuma tarefa com datas definidas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="relative"
              style={{ minWidth: totalDays * dayWidth }}
            >
              {/* Timeline header */}
              <div className="flex border-b mb-4 pb-2">
                {Array.from({ length: totalDays }).map((_, index) => {
                  const date = new Date(dateRange.start);
                  date.setDate(date.getDate() + index);
                  
                  return (
                    <div
                      key={index}
                      className="text-xs text-muted-foreground text-center"
                      style={{ width: dayWidth, minWidth: dayWidth }}
                    >
                      {format(date, 'dd/MM', { locale: ptBR })}
                    </div>
                  );
                })}
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                {tasksWithDates.map((task) => {
                  const position = getTaskPosition(task);
                  const overdue = isOverdue(task.due_date, task.completed_at);

                  return (
                    <div
                      key={task.id}
                      className="relative h-16"
                    >
                      <div
                        className={cn(
                          "absolute h-full rounded-r-lg p-2 transition-colors cursor-pointer",
                          overdue 
                            ? "bg-destructive/10 border-l-4 border-destructive hover:bg-destructive/20"
                            : "bg-primary/10 border-l-4 border-primary hover:bg-primary/20",
                          task.completed_at && "opacity-60"
                        )}
                        style={{
                          left: position.left,
                          width: position.width,
                        }}
                        onClick={() => navigate(`/task/${task.id}`)}
                      >
                        <div className="flex items-center justify-between h-full">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              task.completed_at && "line-through"
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <PriorityBadge priority={task.priority} />
                              <SubtaskProgress parentId={task.id} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
