import { useMemo } from 'react';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PriorityBadge } from '@/components/ui/badge-variant';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string | null;
  due_date: string | null;
}

interface TaskSprintViewProps {
  tasks: Task[];
}

export const TaskSprintView = ({ tasks }: TaskSprintViewProps) => {
  const tasksWithDates = tasks.filter((task) => task.start_date && task.due_date);

  const dateRange = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date();
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
    }

    const dates = tasksWithDates.flatMap((task) => [
      new Date(task.start_date!),
      new Date(task.due_date!),
    ]);

    return {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }, [tasksWithDates]);

  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const dayWidth = 120; // pixels per day

  const getTaskPosition = (task: Task) => {
    const start = new Date(task.start_date!);
    const end = new Date(task.due_date!);
    
    const daysFromStart = differenceInDays(start, dateRange.start);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: daysFromStart * dayWidth,
      width: duration * dayWidth,
    };
  };

  return (
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
              {tasksWithDates.map((task, index) => {
                const position = getTaskPosition(task);

                return (
                  <div
                    key={task.id}
                    className="relative h-16"
                  >
                    <div
                      className="absolute h-full bg-primary/10 border-l-4 border-primary rounded-r-lg p-2 hover:bg-primary/20 transition-colors cursor-pointer"
                      style={{
                        left: position.left,
                        width: position.width,
                      }}
                    >
                      <div className="flex items-center justify-between h-full">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <PriorityBadge priority={task.priority} />
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
  );
};