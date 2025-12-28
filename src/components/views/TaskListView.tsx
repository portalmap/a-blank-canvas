import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, GitBranch, MoreHorizontal, FolderInput, Archive, Trash2 } from 'lucide-react';
import { TaskMoveDialog } from '@/components/tasks/TaskMoveDialog';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useDeleteTask, useArchiveTask } from '@/hooks/useTasks';
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
  workspaceId: string;
  listId: string;
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

export const TaskListView = ({ tasks, workspaceId, listId }: TaskListViewProps) => {
  const navigate = useNavigate();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const deleteTask = useDeleteTask();
  const archiveTask = useArchiveTask();

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

  const handleDelete = () => {
    if (deleteTaskId) {
      deleteTask.mutate(deleteTaskId);
      setDeleteTaskId(null);
    }
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
          onClick={() => navigate(`/task/${task.id}`)}
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
          <TableCell onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setMoveTaskId(task.id)}>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Mover
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => archiveTask.mutate(task.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteTaskId(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <TableHead className="w-12">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mainTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            ) : (
              mainTasks.map((task) => renderTaskRow(task))
            )}
          </TableBody>
        </Table>
      </div>

      <TaskMoveDialog
        taskId={moveTaskId}
        open={!!moveTaskId}
        onOpenChange={(open) => !open && setMoveTaskId(null)}
        workspaceId={workspaceId}
        currentListId={listId}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
