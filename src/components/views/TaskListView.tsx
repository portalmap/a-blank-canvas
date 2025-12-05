import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { useSubtasks } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  list_id: string;
  workspace_id: string;
  parent_id?: string | null;
  completed_at?: string | null;
  status?: {
    name: string;
    color: string | null;
  };
  assignee?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TaskListViewProps {
  tasks: Task[];
}

const SubtaskCount = ({ parentId }: { parentId: string }) => {
  const { data: subtasks } = useSubtasks(parentId);
  const count = subtasks?.length || 0;
  const completed = subtasks?.filter(s => s.completed_at).length || 0;

  if (count === 0) return null;

  return (
    <Badge variant="outline" className="ml-2 text-xs">
      <GitBranch className="h-3 w-3 mr-1" />
      {completed}/{count}
    </Badge>
  );
};

export const TaskListView = ({ tasks }: TaskListViewProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const isOverdue = (dueDate: string | null, completedAt?: string | null) => {
    if (!dueDate || completedAt) return false;
    return new Date(dueDate) < new Date();
  };

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Filtrar apenas tarefas principais (sem parent_id)
  const mainTasks = tasks.filter(t => !t.parent_id);

  const renderTaskRow = (task: Task, isSubtask = false) => {
    const isExpanded = expandedTasks.has(task.id);
    const subtasks = tasks.filter(t => t.parent_id === task.id);
    const hasSubtasks = subtasks.length > 0;

    return (
      <>
        <TableRow 
          key={task.id} 
          className={cn(
            "cursor-pointer hover:bg-muted/50",
            isSubtask && "bg-muted/20"
          )}
          onClick={() => setSelectedTask(task)}
        >
          <TableCell className={cn("font-medium", isSubtask && "pl-10")}>
            <div className="flex items-center">
              {!isSubtask && hasSubtasks && (
                <button
                  onClick={(e) => toggleExpand(task.id, e)}
                  className="mr-2 p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!isSubtask && !hasSubtasks && <div className="w-7" />}
              <span className={cn(task.completed_at && "line-through text-muted-foreground")}>
                {task.title}
              </span>
              {!isSubtask && <SubtaskCount parentId={task.id} />}
            </div>
          </TableCell>
          <TableCell>
            <StatusBadge status={task.status?.name || 'Sem status'} />
          </TableCell>
          <TableCell>
            <PriorityBadge priority={task.priority} />
          </TableCell>
          <TableCell>
            {task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
          </TableCell>
          <TableCell>
            {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
          </TableCell>
          <TableCell>
            {isOverdue(task.due_date, task.completed_at) ? (
              <span className="text-destructive font-medium">Sim</span>
            ) : (
              <span className="text-muted-foreground">Não</span>
            )}
          </TableCell>
        </TableRow>
        {isExpanded && subtasks.map(subtask => renderTaskRow(subtask, true))}
      </>
    );
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead>Atrasada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mainTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            ) : (
              mainTasks.map((task) => renderTaskRow(task))
            )}
          </TableBody>
        </Table>
      </div>

      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </>
  );
};
