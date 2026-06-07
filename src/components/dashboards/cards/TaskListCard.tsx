import { memo } from 'react';
import { MoreHorizontal, Trash2, Move, Maximize2, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
}

interface TaskListCardProps {
  title: string;
  tasks: Task[];
  type: 'overdue' | 'all';
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-500',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-500',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-500',
};

const TaskListCardComponent = ({
  title,
  tasks,
  type,
  onDelete,
  onEdit,
  onExpand,
}: TaskListCardProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {type === 'overdue' && <AlertTriangle className="h-4 w-4 text-destructive" />}
          {title}
          {tasks.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {tasks.length}
            </Badge>
          )}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Move className="mr-2 h-4 w-4" />
              Redimensionar
            </DropdownMenuItem>
            {onExpand && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExpand(); }}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expandir
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
            <Clock className="h-8 w-8 mb-2 opacity-50" />
            <p>{type === 'overdue' ? 'Nenhuma tarefa atrasada!' : 'Sem tarefas'}</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        Atrasada há {formatDistanceToNow(new Date(task.due_date), {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={cn('text-xs shrink-0', priorityColors[task.priority])}
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
          )}
      </CardContent>
    </Card>
  );
};

export const TaskListCard = memo(TaskListCardComponent);
