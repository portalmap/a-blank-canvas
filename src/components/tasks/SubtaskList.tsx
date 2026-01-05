import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Plus, ChevronDown, ChevronRight, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { useSubtasks, useCreateSubtask } from '@/hooks/useSubtasks';
import { useDefaultStatus } from '@/hooks/useStatuses';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { cn } from '@/lib/utils';
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

interface Task {
  id: string;
  title: string;
  list_id: string;
  workspace_id: string;
  status_id: string;
}

interface Status {
  id: string;
  name: string;
  color: string | null;
}

interface SubtaskListProps {
  parentTask: Task;
  statuses: Status[];
}

export const SubtaskList = ({ parentTask, statuses }: SubtaskListProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskToDelete, setSubtaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const navigate = useNavigate();

  const { data: subtasks, isLoading } = useSubtasks(parentTask.id);
  const { data: defaultStatus } = useDefaultStatus(parentTask.workspace_id);
  const createSubtask = useCreateSubtask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createActivity = useCreateTaskActivity();

  const handleDeleteSubtask = async () => {
    if (!subtaskToDelete) return;
    
    await deleteTask.mutateAsync({
      id: subtaskToDelete.id,
      taskTitle: subtaskToDelete.title,
    });
    
    setSubtaskToDelete(null);
  };

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim() || !defaultStatus) return;

    await createSubtask.mutateAsync({
      parentId: parentTask.id,
      workspaceId: parentTask.workspace_id,
      listId: parentTask.list_id,
      statusId: defaultStatus.id,
      title: newSubtaskTitle,
    });

    setNewSubtaskTitle('');
    setIsAdding(false);
  };

  const handleToggleComplete = async (subtask: any) => {
    const isCompleting = !subtask.completed_at;
    const newCompletedAt = isCompleting ? new Date().toISOString() : null;
    const subtaskTitle = subtask.title;
    const subtaskId = subtask.id;
    
    try {
      await updateTask.mutateAsync({
        id: subtaskId,
        completedAt: newCompletedAt,
      });
      
      // Registrar atividade na tarefa pai
      await createActivity.mutateAsync({
        taskId: parentTask.id,
        activityType: isCompleting ? 'subtask.completed' : 'subtask.uncompleted',
        metadata: {
          subtask_id: subtaskId,
          subtask_title: subtaskTitle,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar subtarefa:', error);
    }
  };

  const completedCount = subtasks?.filter(s => s.completed_at).length || 0;
  const totalCount = subtasks?.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Subtarefas
          {totalCount > 0 && (
            <span className="text-muted-foreground">
              ({completedCount}/{totalCount})
            </span>
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {totalCount > 0 && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {subtasks?.map((subtask) => {
                const status = statuses.find(s => s.id === subtask.status_id);
                return (
                  <div
                    key={subtask.id}
                    className={cn(
                      "group flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 cursor-pointer",
                      subtask.completed_at && "opacity-60"
                    )}
                    onClick={() => navigate(`/task/${subtask.id}`)}
                  >
                    <Checkbox 
                      checked={!!subtask.completed_at}
                      onCheckedChange={() => handleToggleComplete(subtask)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      subtask.completed_at && "line-through"
                    )}>
                      {subtask.title}
                    </span>
                    <StatusBadge status={status?.name || 'Sem status'} />
                    <PriorityBadge priority={subtask.priority} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubtaskToDelete({ id: subtask.id, title: subtask.title });
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}

              {isAdding && (
                <div className="flex items-center gap-2 p-2 border rounded-md">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Nome da subtarefa..."
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubtask();
                      if (e.key === 'Escape') setIsAdding(false);
                    }}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleCreateSubtask}
                    disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                  >
                    {createSubtask.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Criar'
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsAdding(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {!isAdding && subtasks?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma subtarefa
                </p>
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog open={!!subtaskToDelete} onOpenChange={(open) => !open && setSubtaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir subtarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A subtarefa "{subtaskToDelete?.title}" será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubtask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTask.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
